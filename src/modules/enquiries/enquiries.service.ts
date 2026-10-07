import { z } from 'zod';
import { ActorSnapshot } from '../../lib/actor';
import { NotFoundError } from '../../lib/errors';
import { isWhatsAppEnabled, sendWhatsApp } from '../../lib/whatsappAdapter';
import { env } from '../../config/env';
import { EnquiryCounterModel, EnquiryModel, EnquiryStatus, EnquiryType } from './enquiry.model';
import { publicContactEnquirySchema, publicQuickBookingSchema } from './enquiries.validation';

const PREFIX: Record<EnquiryType, string> = { QUICK_BOOKING: 'QB', CONTACT: 'CE' };

async function nextReference(type: EnquiryType) {
  const counter = await EnquiryCounterModel.findOneAndUpdate(
    { _id: type },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${PREFIX[type]}-${String(counter.seq).padStart(6, '0')}`;
}

export async function createQuickBooking(data: z.infer<typeof publicQuickBookingSchema>) {
  const services = data.serviceName.split(',').map((s) => s.trim()).filter(Boolean);
  const enquiry = await EnquiryModel.create({
    type: 'QUICK_BOOKING',
    referenceNo: await nextReference('QUICK_BOOKING'),
    name: data.name,
    phone: data.phone,
    services,
    servicePath: data.servicePath,
    message: data.message,
    page: data.page,
  });
  // Runs in the background — the visitor's booking never waits on WhatsApp.
  void sendEnquiryWhatsApp(enquiry._id.toString(), {
    campaignName: env.aisensy.quickBookingCampaign,
    mediaUrl: env.aisensy.quickBookingMediaUrl,
    name: data.name,
    phone: data.phone,
    referenceNo: enquiry.referenceNo,
    params: quickBookingWhatsAppParams({ name: data.name, services, referenceNo: enquiry.referenceNo }),
  });
  // Only what the thank-you screen needs.
  return { referenceNo: enquiry.referenceNo, serviceName: data.serviceName };
}

const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || 'there';

// AiSensy campaign "CityCalls Booking Received" (approved template):
//   {{1}} first name · {{2}} services · {{3}} reference no.
export function quickBookingWhatsAppParams(input: { name: string; services: string[]; referenceNo: string }) {
  const services = input.services.length ? input.services.join(', ') : 'your service';
  return [firstNameOf(input.name), services, input.referenceNo];
}

// AiSensy campaign "CItyCalls Contact Enquire" (approved template):
//   {{1}} first name · {{2}} service / subject · {{3}} reference no.
export function contactEnquiryWhatsAppParams(input: { name: string; subject?: string; referenceNo: string }) {
  return [firstNameOf(input.name), input.subject?.trim() || 'your request', input.referenceNo];
}

// Sends the "we got your request" WhatsApp (CityCalls banner as the header
// image) and saves the result on the enquiry, so admin can see whether the
// customer got it. Never throws.
async function sendEnquiryWhatsApp(
  enquiryId: string,
  input: { campaignName: string; mediaUrl: string; name: string; phone: string; referenceNo: string; params: string[] }
) {
  let whatsapp: { status: 'SENT' | 'FAILED' | 'SKIPPED'; at: Date; error?: string };
  if (!isWhatsAppEnabled()) {
    whatsapp = { status: 'SKIPPED', at: new Date() };
  } else {
    try {
      await sendWhatsApp({
        to: input.phone,
        campaignName: input.campaignName,
        userName: input.name,
        variables: input.params,
        source: 'website-enquiry',
        media: { url: input.mediaUrl, filename: 'citycalls.jpg' },
      });
      whatsapp = { status: 'SENT', at: new Date() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[enquiries] WhatsApp "${input.campaignName}" failed for ${input.referenceNo}: ${message}`);
      whatsapp = { status: 'FAILED', at: new Date(), error: message.slice(0, 500) };
    }
  }
  await EnquiryModel.updateOne({ _id: enquiryId }, { $set: { whatsapp } }).catch((error: unknown) => {
    console.error('[enquiries] could not save WhatsApp status', error);
  });
}

export async function createContactEnquiry(data: z.infer<typeof publicContactEnquirySchema>) {
  const enquiry = await EnquiryModel.create({
    type: 'CONTACT',
    referenceNo: await nextReference('CONTACT'),
    ...data,
  });
  void sendEnquiryWhatsApp(enquiry._id.toString(), {
    campaignName: env.aisensy.contactEnquiryCampaign,
    mediaUrl: env.aisensy.contactEnquiryMediaUrl,
    name: data.name,
    phone: data.phone,
    referenceNo: enquiry.referenceNo,
    params: contactEnquiryWhatsAppParams({ name: data.name, subject: data.subject, referenceNo: enquiry.referenceNo }),
  });
  return { referenceNo: enquiry.referenceNo };
}

export function listEnquiries(type: EnquiryType) {
  return EnquiryModel.find({ type }).sort({ createdAt: -1 }).limit(5000).lean();
}

// Sidebar badges: enquiries still waiting for a call, per type.
export async function pendingCounts() {
  const rows = await EnquiryModel.aggregate<{ _id: EnquiryType; count: number }>([
    { $match: { status: 'PENDING' } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  const counts: Record<EnquiryType, number> = { QUICK_BOOKING: 0, CONTACT: 0 };
  rows.forEach((r) => (counts[r._id] = r.count));
  return counts;
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus, actor: ActorSnapshot) {
  const enquiry = await EnquiryModel.findByIdAndUpdate(
    id,
    { status, statusUpdatedBy: actor, statusUpdatedAt: new Date() },
    { new: true, runValidators: true }
  ).lean();
  if (!enquiry) throw new NotFoundError('Enquiry not found');
  return enquiry;
}

export async function deleteEnquiry(id: string) {
  const enquiry = await EnquiryModel.findByIdAndDelete(id);
  if (!enquiry) throw new NotFoundError('Enquiry not found');
}
