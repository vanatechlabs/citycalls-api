import mongoose from 'mongoose';
import { CampaignModel, ICampaign } from './campaigns.model';
import { NotificationTemplateModel } from '../notifications/notificationTemplates.model';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { buildPaginationMeta } from '../../lib/apiResponse';
import { isEmailEnabled, sendEmail } from '../../lib/emailAdapter';
import { isWhatsAppEnabled, sendWhatsApp } from '../../lib/whatsappAdapter';
import { logActivity } from '../../lib/auditLog';
import { AccessTokenPayload } from '../../lib/jwt';
import { resolveCampaignAudience, summarizeAudience } from './campaignAudience.service';
import { CampaignRecipientModel } from './campaignRecipients.model';
import { env } from '../../config/env';

const PRESETS = { FESTIVAL: () => env.aisensy.festivalCampaign, INDEPENDENCE_DAY: () => env.aisensy.independenceDayCampaign };
interface CreateCampaignInput {
  name: string; channel: 'WHATSAPP' | 'EMAIL'; templateId?: string;
  providerCampaignName?: string; campaignPreset?: keyof typeof PRESETS;
  templateParams?: string[]; contentType?: ICampaign['contentType'];
  media?: { fileId?: string; url: string; filename: string } | null;
  carouselCards?: Array<{ cardIndex: number; imageUrl: string }>;
  audienceFilter: { recipientTypes: ICampaign['audienceFilter']['recipientTypes']; tags?: string[]; segments?: string[]; customerType?: string; roles?: string[]; branchIds?: string[]; vendorIds?: string[]; excludeMobiles?: string[]; manualMobiles?: string[] };
  scheduledAt?: Date | null;
}
function futureSchedule(date?: Date | null) {
  if (date && new Date(date).getTime() <= Date.now()) throw new ConflictError('Choose a future schedule time', 'SCHEDULE_IN_PAST');
}
async function validateContent(campaign: Pick<ICampaign, 'channel' | 'templateId' | 'providerCampaignName' | 'contentType' | 'media' | 'carouselCards' | 'templateParams'>) {
  if (campaign.channel === 'EMAIL') {
    const template = campaign.templateId ? await NotificationTemplateModel.findById(campaign.templateId) : null;
    if (!template || template.channel !== 'EMAIL' || !template.active) throw new ConflictError('Select an active email template', 'TEMPLATE_CHANNEL_MISMATCH');
    return;
  }
  if (!campaign.providerCampaignName?.trim()) throw new ConflictError('Enter the exact live AiSensy API campaign name', 'AISENSY_CAMPAIGN_NAME_MISSING');
  if (campaign.templateParams.some(value => !value.trim())) throw new ConflictError('Remove empty parameter rows or enter their values', 'EMPTY_TEMPLATE_PARAM');
  const publicUrl = (value: string) => {
    let url: URL;
    try { url = new URL(value); } catch { throw new ConflictError('Enter a valid public HTTPS media URL', 'MEDIA_URL_NOT_PUBLIC'); }
    if (url.protocol !== 'https:' || /^(localhost|127\.|0\.|\[?::1\]?)/i.test(url.hostname)) throw new ConflictError('Media needs a public HTTPS URL accessible by AiSensy', 'MEDIA_URL_NOT_PUBLIC');
  };
  const cards = campaign.carouselCards ?? [];
  if (cards.length) {
    if (cards.length < 2 || cards.length > 10) throw new ConflictError('Carousel needs 2-10 cards', 'INVALID_CAROUSEL');
    cards.forEach((card, index) => {
      if (card.cardIndex !== index) throw new ConflictError('Carousel card indexes must be consecutive and ordered', 'INVALID_CAROUSEL');
      publicUrl(card.imageUrl);
    });
    if (campaign.media?.url) throw new ConflictError('Use either a single attachment or carousel cards', 'CONFLICTING_MEDIA');
  }
  if (campaign.media?.url) publicUrl(campaign.media.url);
  if (campaign.contentType === 'CAROUSEL' && !cards.length) throw new ConflictError('Upload carousel cards before saving', 'CAROUSEL_REQUIRED');
  if (campaign.contentType && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(campaign.contentType) && !campaign.media?.url) throw new ConflictError('Upload or link the selected attachment before saving', 'MEDIA_REQUIRED');
  if (campaign.contentType && campaign.contentType !== 'CAROUSEL' && cards.length) throw new ConflictError('Remove carousel cards when using another content type', 'CONFLICTING_MEDIA');
  if (campaign.contentType === 'TEXT' && campaign.media?.url) throw new ConflictError('Remove the attachment for a text-only campaign', 'CONFLICTING_MEDIA');
}
export async function createCampaign(input: CreateCampaignInput, actor: AccessTokenPayload) {
  const preset = input.campaignPreset ? PRESETS[input.campaignPreset]() : undefined;
  if (input.campaignPreset && !preset) throw new ConflictError('AiSensy preset is not configured', 'CAMPAIGN_PRESET_NOT_CONFIGURED');
  futureSchedule(input.scheduledAt);
  const campaign = new CampaignModel({ ...input, templateId: input.templateId || undefined, providerCampaignName: preset || input.providerCampaignName?.trim(), templateParams: input.templateParams ?? [], scheduledAt: input.scheduledAt || undefined, status: input.scheduledAt ? 'SCHEDULED' : 'DRAFT', createdBy: actor.sub });
  await validateContent(campaign);
  return campaign.save();
}
export async function listCampaigns(params: { page: number; limit: number; status?: string; channel?: string }) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.channel) filter.channel = params.channel;
  const [items, total] = await Promise.all([CampaignModel.find(filter).skip((params.page - 1) * params.limit).limit(params.limit).sort({ createdAt: -1 }), CampaignModel.countDocuments(filter)]);
  return { items, meta: buildPaginationMeta(params.page, params.limit, total) };
}
export async function getCampaign(id: string) {
  const campaign = await CampaignModel.findById(id);
  if (!campaign) throw new NotFoundError('Campaign not found');
  return campaign;
}
export async function previewCampaignAudience(id: string) { return summarizeAudience(await resolveCampaignAudience(await getCampaign(id))); }
async function assertReady(campaign: ICampaign) {
  await validateContent(campaign);
  if (campaign.channel === 'WHATSAPP' && !isWhatsAppEnabled()) throw new ConflictError('AiSensy is not configured or enabled', 'WHATSAPP_INTEGRATION_DISABLED');
  if (campaign.channel === 'EMAIL' && !isEmailEnabled()) throw new ConflictError('Email integration is not configured or enabled', 'EMAIL_INTEGRATION_DISABLED');
}
async function queueCampaign(id: string, actor?: AccessTokenPayload) {
  const source = await getCampaign(id);
  if (!['DRAFT', 'SCHEDULED'].includes(source.status)) throw new ConflictError('Only draft or scheduled campaigns can be sent', 'CAMPAIGN_ALREADY_SENT');
  await assertReady(source);
  const audience = await resolveCampaignAudience(source);
  const eligible = audience.filter(recipient => recipient.eligible);
  if (!eligible.length) throw new ConflictError('No eligible recipients after contact, consent, exclusion and duplicate checks', 'EMPTY_CAMPAIGN_AUDIENCE');
  const session = await mongoose.startSession();
  let queued: ICampaign | null = null;
  try {
    await session.withTransaction(async () => {
      queued = await CampaignModel.findOneAndUpdate({ _id: id, status: source.status, updatedAt: source.updatedAt }, { $set: { status: 'SENDING', stats: { sent: 0, delivered: 0, read: 0, failed: 0 } }, $unset: { lastError: 1, nextQueueAttemptAt: 1 } }, { session, new: true });
      if (!queued) throw new ConflictError('Campaign changed or was already queued. Refresh and try again.', 'CAMPAIGN_CHANGED');
      if (await CampaignRecipientModel.exists({ campaignId: id, attemptCount: { $gt: 0 } }).session(session)) throw new ConflictError('Existing delivery attempts need review; duplicate this campaign for a new send', 'CAMPAIGN_ALREADY_SENT');
      await CampaignRecipientModel.deleteMany({ campaignId: id }, { session });
      for (let offset = 0; offset < eligible.length; offset += 1000) {
        await CampaignRecipientModel.insertMany(eligible.slice(offset, offset + 1000).map(recipient => ({ campaignId: id, recipientType: recipient.recipientType, recipientId: recipient.recipientId, name: recipient.name, destination: source.channel === 'WHATSAPP' ? recipient.mobile : recipient.email, status: 'QUEUED' })), { session });
      }
    });
  } finally { await session.endSession(); }
  if (actor) await logActivity({ entityType: 'CAMPAIGN', entityId: id, user: actor, action: 'QUEUED', module: 'marketing', newValue: { matchedRecords: audience.length, queuedRecipients: eligible.length } }).catch(error => console.error('[campaigns] queue audit failed', error));
  return queued!;
}
export async function sendCampaignNow(id: string, actor: AccessTokenPayload) { return queueCampaign(id, actor); }
function renderCampaignParam(value: string, name: string, campaignName: string) {
  return value.replaceAll('{{firstName}}', name.trim().split(/\s+/)[0] || 'Customer').replaceAll('{{fullName}}', name || 'Customer').replaceAll('{{campaignName}}', campaignName);
}
async function deliverNextRecipient(): Promise<boolean> {
  const recipient = await CampaignRecipientModel.findOneAndUpdate({ status: 'QUEUED' }, { $set: { status: 'SENDING' }, $inc: { attemptCount: 1 } }, { new: true, sort: { queuedAt: 1 } });
  if (!recipient) return false;
  try {
    const campaign = await CampaignModel.findById(recipient.campaignId);
    if (!campaign || campaign.status !== 'SENDING') { recipient.status = 'SKIPPED'; recipient.failureReason = 'Campaign cancelled or removed'; }
    else {
      if (campaign.channel === 'WHATSAPP') {
        if (!campaign.providerCampaignName) throw new Error('AiSensy campaign name is missing');
        const result = await sendWhatsApp({ to: recipient.destination, campaignName: campaign.providerCampaignName, userName: recipient.name, variables: campaign.templateParams.map(value => renderCampaignParam(value, recipient.name, campaign.name)), media: campaign.media?.url ? { url: campaign.media.url, filename: campaign.media.filename } : undefined, carouselCards: campaign.carouselCards?.length ? campaign.carouselCards : undefined });
        recipient.providerResponse = result.response;
      } else {
        const template = await NotificationTemplateModel.findById(campaign.templateId);
        if (!template || !template.active || template.channel !== 'EMAIL') throw new Error('Active email template not found');
        await sendEmail({ to: recipient.destination, subject: renderCampaignParam(template.subjectTemplate ?? campaign.name, recipient.name, campaign.name), html: renderCampaignParam(template.bodyTemplate, recipient.name, campaign.name) });
      }
      recipient.status = 'SENT'; recipient.sentAt = new Date();
    }
  } catch (error) { recipient.status = 'FAILED'; recipient.failureReason = (error instanceof Error ? error.message : 'Delivery failed').slice(0, 1000); }
  await recipient.save();
  return true;
}
export async function processQueuedCampaignRecipients(limit = 100): Promise<number> {
  // Interrupted sends are ambiguous: never automatically resend and risk duplicates.
  await CampaignRecipientModel.updateMany({ status: 'SENDING', updatedAt: { $lt: new Date(Date.now() - 5 * 60000) } }, { $set: { status: 'FAILED', failureReason: 'Delivery outcome unknown after interrupted send. Check AiSensy before resending.' } });
  let processed = 0;
  for (let offset = 0; offset < limit; offset += 5) {
    const results = await Promise.all(Array.from({ length: Math.min(5, limit - offset) }, () => deliverNextRecipient()));
    processed += results.filter(Boolean).length;
    if (results.every(result => !result)) break;
  }
  await completeFinishedCampaigns();
  return processed;
}
async function completeFinishedCampaigns() {
  const campaigns = await CampaignModel.find({ status: { $in: ['SENDING', 'CANCELLED'] } });
  for (const campaign of campaigns) {
    const counts = await CampaignRecipientModel.aggregate<{ _id: string; count: number }>([{ $match: { campaignId: campaign._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
    const count = (status: string) => counts.find(item => item._id === status)?.count ?? 0;
    const stats = { sent: count('SENT') + count('DELIVERED') + count('READ'), delivered: count('DELIVERED') + count('READ'), read: count('READ'), failed: count('FAILED') };
    await CampaignModel.updateOne({ _id: campaign._id, status: campaign.status }, { $set: { stats, ...(campaign.status === 'SENDING' && !count('QUEUED') && !count('SENDING') ? { status: 'COMPLETED' } : {}) } });
  }
}
export async function queueDueScheduledCampaigns(): Promise<number> {
  const due = await CampaignModel.find({ status: 'SCHEDULED', scheduledAt: { $lte: new Date() }, $or: [{ nextQueueAttemptAt: { $exists: false } }, { nextQueueAttemptAt: { $lte: new Date() } }] }).limit(20);
  let queued = 0;
  for (const campaign of due) {
    try { await queueCampaign(campaign.id); queued += await CampaignRecipientModel.countDocuments({ campaignId: campaign._id }); }
    catch (error) { await CampaignModel.updateOne({ _id: campaign._id, status: 'SCHEDULED', updatedAt: campaign.updatedAt }, { $set: { lastError: (error instanceof Error ? error.message : 'Scheduling failed').slice(0, 1000), nextQueueAttemptAt: new Date(Date.now() + 60000) } }); }
  }
  return queued;
}
export async function duplicateCampaign(id: string, actor: AccessTokenPayload) {
  const source = await getCampaign(id);
  return CampaignModel.create({ name: `${source.name} (Copy)`, channel: source.channel, templateId: source.templateId, providerCampaignName: source.providerCampaignName, templateParams: source.templateParams, contentType: source.contentType, media: source.media, carouselCards: source.carouselCards, audienceFilter: source.audienceFilter, status: 'DRAFT', createdBy: actor.sub });
}
export async function updateCampaign(id: string, data: Record<string, unknown>) {
  const campaign = await getCampaign(id);
  if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) throw new ConflictError('Only draft or scheduled campaigns can be edited', 'CAMPAIGN_NOT_EDITABLE');
  const originalUpdatedAt = campaign.updatedAt;
  Object.assign(campaign, data);
  if (Object.prototype.hasOwnProperty.call(data, 'scheduledAt')) { futureSchedule(data.scheduledAt as Date | null); campaign.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt as Date) : undefined; campaign.status = data.scheduledAt ? 'SCHEDULED' : 'DRAFT'; }
  if (data.media === null) campaign.media = undefined;
  await validateContent(campaign);
  await campaign.validate();
  const values = campaign.toObject() as unknown as Record<string, unknown>;
  delete values._id; delete values.__v; delete values.lastError; delete values.nextQueueAttemptAt;
  if (!campaign.scheduledAt) delete values.scheduledAt;
  if (!campaign.media?.url) delete values.media;
  const updated = await CampaignModel.findOneAndUpdate({ _id: id, status: { $in: ['DRAFT', 'SCHEDULED'] }, updatedAt: originalUpdatedAt }, { $set: values, $unset: { lastError: 1, nextQueueAttemptAt: 1, ...(!campaign.scheduledAt ? { scheduledAt: 1 } : {}), ...(!campaign.media?.url ? { media: 1 } : {}) } }, { new: true, runValidators: true });
  if (!updated) throw new ConflictError('Campaign changed or started sending. Refresh and try again.', 'CAMPAIGN_CHANGED');
  return updated;
}
export async function cancelCampaign(id: string) {
  const campaign = await CampaignModel.findOneAndUpdate({ _id: id, status: { $in: ['DRAFT', 'SCHEDULED', 'SENDING'] } }, { $set: { status: 'CANCELLED' } }, { new: true });
  if (!campaign) throw new ConflictError('Campaign is already finished or cancelled', 'CAMPAIGN_NOT_CANCELLABLE');
  await CampaignRecipientModel.updateMany({ campaignId: id, status: 'QUEUED' }, { $set: { status: 'SKIPPED', failureReason: 'Campaign cancelled' } });
  return campaign;
}
export async function listCampaignRecipients(id: string, page: number, limit: number) {
  await getCampaign(id);
  const [items, total] = await Promise.all([CampaignRecipientModel.find({ campaignId: id }).select('-providerResponse').sort({ queuedAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit), CampaignRecipientModel.countDocuments({ campaignId: id })]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
export async function deleteCampaign(id: string) {
  if (await CampaignRecipientModel.exists({ campaignId: id, status: 'SENDING' })) throw new ConflictError('Wait for in-flight recipients to finish before deleting delivery history', 'CAMPAIGN_DELIVERY_IN_FLIGHT');
  const campaign = await CampaignModel.findOneAndDelete({ _id: id, status: { $in: ['DRAFT', 'COMPLETED', 'CANCELLED'] } });
  if (!campaign) throw new ConflictError('Cancel a scheduled/sending campaign before deleting it', 'CAMPAIGN_NOT_DELETABLE');
  await CampaignRecipientModel.deleteMany({ campaignId: id });
}
