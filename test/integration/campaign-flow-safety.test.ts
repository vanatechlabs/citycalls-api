import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';
import campaignRoutes from '../../src/modules/marketing/campaigns.routes';
import { errorHandler } from '../../src/middleware/error.middleware';
import { signAccessToken } from '../../src/lib/jwt';
import { env } from '../../src/config/env';
import { CampaignModel } from '../../src/modules/marketing/campaigns.model';
import { CampaignRecipientModel } from '../../src/modules/marketing/campaignRecipients.model';
import { CustomerModel } from '../../src/modules/customers/customers.model';
import { NotificationTemplateModel } from '../../src/modules/notifications/notificationTemplates.model';
import { sendCampaignNow, processQueuedCampaignRecipients, queueDueScheduledCampaigns } from '../../src/modules/marketing/campaigns.service';
import { runCampaignSchedulerOnce } from '../../src/jobs/campaignScheduler';
import { assertFileAllowed } from '../../src/lib/fileStorage';
import { parseCampaignNumbers, scheduleInputIndia, scheduleIsoIndia } from '../../../citycalls-admin/src/lib/campaignForm';

jest.mock('../../src/lib/auditLog', () => ({ logActivity: jest.fn(async () => undefined) }));
jest.mock('../../src/lib/permissionCache', () => ({ getDataScope: (role: string) => role === 'SUPER_ADMIN' ? 'ALL' : undefined }));

describe('Campaign HTTP, transaction, scheduler and provider-boundary flow', () => {
  jest.setTimeout(180000);
  let db: MongoMemoryReplSet;
  const actor = { sub: new Types.ObjectId().toString(), role: 'SUPER_ADMIN' as const };
  const app = express(); app.use(express.json({ limit: '2mb' }), campaignRoutes, errorHandler);
  let token: string;
  const originalFetch = global.fetch;
  const provider = jest.fn();
  const numbers = (count: number) => Array.from({ length: count }, (_, i) => String(9000000000 + i));
  const input = (extra: Record<string, unknown> = {}) => ({ name: 'Test campaign', channel: 'WHATSAPP', providerCampaignName: 'Exact Live Campaign', templateParams: [], audienceFilter: { recipientTypes: ['MANUAL'], manualMobiles: ['9876543210'] }, ...extra });
  const post = (path: string, data?: unknown) => request(app).post(path).set('Authorization', `Bearer ${token}`).send(data);
  const patch = (id: string, data: unknown) => request(app).patch(`/campaigns/${id}`).set('Authorization', `Bearer ${token}`).send(data);
  const create = async (extra: Record<string, unknown> = {}) => { const res = await post('/campaigns', input(extra)); expect(res.status).toBe(201); return res.body.data; };
  beforeAll(async () => {
    // This disposable database is unrelated to local/production MongoDB.
    db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(db.getUri());
    await Promise.all([CampaignModel.init(), CampaignRecipientModel.init(), CustomerModel.init(), NotificationTemplateModel.init()]);
    env.aisensy.enabled = true; env.aisensy.apiKey = 'test-key-never-sent';
    token = signAccessToken(actor);
    global.fetch = provider;
  });
  afterAll(async () => { global.fetch = originalFetch; await mongoose.disconnect(); await db?.stop(); });
  beforeEach(async () => {
    await Promise.all([CampaignModel.deleteMany({}), CampaignRecipientModel.deleteMany({}), CustomerModel.deleteMany({}), NotificationTemplateModel.deleteMany({})]);
    provider.mockReset(); provider.mockImplementation(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    env.aisensy.enabled = true;
  });
  it('keeps omitted params empty and needs no unrelated local WhatsApp template', async () => {
    const created = await create({ templateParams: undefined });
    expect(created.templateParams).toEqual([]); expect(created.templateId).toBeUndefined();
    await post(`/campaigns/${created._id}/send`).expect(200);
    await processQueuedCampaignRecipients();
    expect(JSON.parse(provider.mock.calls[0][1].body).templateParams).toEqual([]);
    expect((await CampaignModel.findById(created._id))?.status).toBe('COMPLETED');
  });
  it('handles 501 numbers end to end without request-size or recipient caps', async () => {
    const created = await create({ audienceFilter: { recipientTypes: ['MANUAL'], manualMobiles: numbers(501) } });
    await post(`/campaigns/${created._id}/send`).expect(200);
    expect(await CampaignRecipientModel.countDocuments()).toBe(501);
    expect(await processQueuedCampaignRecipients(501)).toBe(501);
    expect(provider).toHaveBeenCalledTimes(501);
    expect((await CampaignModel.findById(created._id))?.stats.sent).toBe(501);
  });
  it('creates and queues 5001 recipients in transactional chunks', async () => {
    const created = await create({ audienceFilter: { recipientTypes: ['MANUAL'], manualMobiles: numbers(5001) } });
    await post(`/campaigns/${created._id}/send`).expect(200);
    expect(await CampaignRecipientModel.countDocuments({ campaignId: created._id })).toBe(5001);
  });
  it('deduplicates country-code variants and excludes normalized numbers', async () => {
    const created = await create({ audienceFilter: { recipientTypes: ['MANUAL'], manualMobiles: ['9876543210', '+91 9876543210', '9123456789', 'invalid'], excludeMobiles: ['+919123456789'] } });
    const preview = await request(app).get(`/campaigns/${created._id}/audience-preview`).set('Authorization', `Bearer ${token}`);
    expect(preview.body.data).toMatchObject({ eligible: 1, duplicatesRemoved: 1, manuallyExcluded: 1, noContact: 1 });
  });
  it('does not let an unconsented record suppress a consented duplicate', async () => {
    await CustomerModel.create([{ name: 'No consent', contacts: [{ mobile: '9876543210' }], consent: { whatsapp: 'REVOKED' } }, { name: 'Consented', contacts: [{ mobile: '9876543210' }], consent: { whatsapp: 'GRANTED' } }]);
    const created = await create({ audienceFilter: { recipientTypes: ['CUSTOMER'] } });
    await post(`/campaigns/${created._id}/send`).expect(200);
    expect(await CampaignRecipientModel.countDocuments()).toBe(1);
    expect((await CampaignRecipientModel.findOne())?.name).toBe('Consented');
  });
  it('never queues the same recipients twice during concurrent send clicks', async () => {
    const created = await create();
    const result = await Promise.allSettled([sendCampaignNow(created._id, actor), sendCampaignNow(created._id, actor)]);
    expect(result.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(await CampaignRecipientModel.countDocuments()).toBe(1);
  });
  it('saves, edits and clears a schedule and rejects past dates', async () => {
    await post('/campaigns', input({ scheduledAt: new Date(Date.now() - 60000).toISOString() })).expect(409);
    const created = await create();
    const date = new Date(Date.now() + 3600000).toISOString();
    const edited = await patch(created._id, { scheduledAt: date });
    expect(edited.status).toBe(200); expect(edited.body.data.status).toBe('SCHEDULED');
    expect(await queueDueScheduledCampaigns()).toBe(0);
    await patch(created._id, { scheduledAt: null }).expect(200);
    const saved = await CampaignModel.findById(created._id);
    expect(saved?.status).toBe('DRAFT'); expect(saved?.scheduledAt).toBeUndefined();
  });
  it('runs a due scheduled campaign through the actual scheduler cycle exactly once', async () => {
    const created = await create({ scheduledAt: new Date(Date.now() + 3600000).toISOString() });
    await CampaignModel.updateOne({ _id: created._id }, { $set: { scheduledAt: new Date(Date.now() - 60000) } });
    await Promise.all([runCampaignSchedulerOnce(), runCampaignSchedulerOnce()]);
    await runCampaignSchedulerOnce();
    expect(provider).toHaveBeenCalledTimes(1);
    expect((await CampaignModel.findById(created._id))?.status).toBe('COMPLETED');
  });
  it('shows scheduler configuration errors and retries after configuration is restored', async () => {
    const created = await create({ scheduledAt: new Date(Date.now() + 3600000).toISOString() });
    await CampaignModel.updateOne({ _id: created._id }, { $set: { scheduledAt: new Date(Date.now() - 60000) } });
    env.aisensy.enabled = false;
    await queueDueScheduledCampaigns();
    const failed = await CampaignModel.findById(created._id);
    expect(failed?.status).toBe('SCHEDULED'); expect(failed?.lastError).toMatch(/not configured/);
    env.aisensy.enabled = true;
    await CampaignModel.updateOne({ _id: created._id }, { $unset: { nextQueueAttemptAt: 1 } });
    await runCampaignSchedulerOnce();
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it.each(['IMAGE', 'VIDEO', 'DOCUMENT'])('sends %s attachments and preserves commas inside parameters', async contentType => {
    const created = await create({ contentType, templateParams: ['Hello, friend'], media: { url: 'https://example.com/asset.pdf', filename: 'asset.pdf' } });
    await post(`/campaigns/${created._id}/send`).expect(200); await processQueuedCampaignRecipients();
    const payload = JSON.parse(provider.mock.calls[0][1].body);
    expect(payload.media.filename).toBe('asset.pdf'); expect(payload.templateParams).toEqual(['Hello, friend']);
  });
  it('sends individual carousel images in card order', async () => {
    const created = await create({ contentType: 'CAROUSEL', carouselCards: [{ cardIndex: 0, imageUrl: 'https://example.com/a.jpg' }, { cardIndex: 1, imageUrl: 'https://example.com/b.jpg' }] });
    await post(`/campaigns/${created._id}/send`).expect(200); await processQueuedCampaignRecipients();
    const payload = JSON.parse(provider.mock.calls[0][1].body);
    expect(payload.carouselCards.map((card: { card_index: number }) => card.card_index)).toEqual([0, 1]);
    expect(payload.carouselCards[1].components[0].parameters[0].image.link).toBe('https://example.com/b.jpg');
  });
  it('clears old attachment/params on edit and prevents editing after queueing', async () => {
    const created = await create({ contentType: 'IMAGE', templateParams: ['old'], media: { url: 'https://example.com/a.jpg', filename: 'a.jpg' } });
    await patch(created._id, { contentType: 'TEXT', media: null, templateParams: [], carouselCards: [] }).expect(200);
    expect((await CampaignModel.findById(created._id))?.media?.url).toBeUndefined();
    await post(`/campaigns/${created._id}/send`).expect(200);
    await patch(created._id, { name: 'Late edit' }).expect(409);
  });
  it('rejects mixed media, invalid carousel indexes, empty params and private media URLs', async () => {
    await post('/campaigns', input({ templateParams: [''] })).expect(409);
    await post('/campaigns', input({ media: { url: 'http://localhost/a.jpg', filename: 'a.jpg' } })).expect(409);
    await post('/campaigns', input({ contentType: 'CAROUSEL', carouselCards: [{ cardIndex: 0, imageUrl: 'https://example.com/a.jpg' }] })).expect(409);
    await post('/campaigns', input({ carouselCards: [{ cardIndex: 0, imageUrl: 'https://example.com/a.jpg' }, { cardIndex: 0, imageUrl: 'https://example.com/b.jpg' }] })).expect(409);
  });
  it('cancels remaining recipients and cannot send cancelled campaigns', async () => {
    const created = await create(); await post(`/campaigns/${created._id}/send`).expect(200);
    await post(`/campaigns/${created._id}/cancel`).expect(200);
    await processQueuedCampaignRecipients(); expect(provider).not.toHaveBeenCalled();
    expect((await CampaignRecipientModel.findOne())?.status).toBe('SKIPPED');
    await post(`/campaigns/${created._id}/send`).expect(409);
  });
  it('records provider errors per recipient and completes with a failed count', async () => {
    provider.mockImplementation(async () => new Response('Rejected', { status: 400 }));
    const created = await create(); await post(`/campaigns/${created._id}/send`).expect(200);
    await processQueuedCampaignRecipients();
    expect((await CampaignModel.findById(created._id))?.stats.failed).toBe(1);
    const log = await request(app).get(`/campaigns/${created._id}/recipients`).set('Authorization', `Bearer ${token}`);
    expect(log.body.data[0].failureReason).toMatch(/400/); expect(log.body.data[0].providerResponse).toBeUndefined();
  });
  it('recovers stale sending attempts without automatically resending ambiguous messages', async () => {
    const created = await create(); await post(`/campaigns/${created._id}/send`).expect(200);
    await CampaignRecipientModel.collection.updateOne({ campaignId: new Types.ObjectId(created._id) }, { $set: { status: 'SENDING', updatedAt: new Date(Date.now() - 600000) } });
    await processQueuedCampaignRecipients(); expect(provider).not.toHaveBeenCalled();
    expect((await CampaignRecipientModel.findOne())?.failureReason).toMatch(/unknown/);
  });
  it('duplicates content but resets schedule and send status', async () => {
    const created = await create({ scheduledAt: new Date(Date.now() + 3600000).toISOString() });
    const copy = await post(`/campaigns/${created._id}/duplicate`);
    expect(copy.status).toBe(201); expect(copy.body.data.status).toBe('DRAFT'); expect(copy.body.data.scheduledAt).toBeUndefined();
  });
  it('accepts documents only within marketing upload restrictions', () => {
    expect(() => assertFileAllowed('MARKETING_MEDIA', 'application/pdf', 1000)).not.toThrow();
    expect(() => assertFileAllowed('MARKETING_MEDIA', 'application/x-msdownload', 1000)).toThrow();
    expect(() => assertFileAllowed('MARKETING_MEDIA', 'application/pdf', 21 * 1024 * 1024)).toThrow();
  });
  it('normalizes bulk paste/import and round-trips IST schedules regardless of host timezone', () => {
    const parsed = parseCampaignNumbers('9876543210, +91 98765 43210\n9123456789;bad');
    expect(parsed.numbers).toEqual(['919876543210', '919123456789']); expect(parsed.duplicates).toBe(1); expect(parsed.invalid).toEqual(['bad']);
    expect(scheduleIsoIndia('2027-01-01T10:00')).toBe('2027-01-01T04:30:00.000Z');
    expect(scheduleInputIndia('2027-01-01T04:30:00.000Z')).toBe('2027-01-01T10:00');
  });
});
