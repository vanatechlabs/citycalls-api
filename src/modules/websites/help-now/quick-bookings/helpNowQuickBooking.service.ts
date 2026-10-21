import { env } from '../../../../config/env';
import { ActorSnapshot } from '../../../../lib/actor';
import { NotFoundError } from '../../../../lib/errors';
import { isWhatsAppEnabled, sendWhatsApp } from '../../../../lib/whatsappAdapter';
import { contactFromWebsiteEnquiry, syncCustomerSafely } from '../../../customer-profiles/customerProfile.sync';
import { quickBookingWhatsAppParams } from '../../../enquiries/enquiries.service';
import {
  HelpNowCounterModel, HelpNowQuickBookingModel, HelpNowQuickBookingStatus,
} from './helpNowQuickBooking.model';
import { PublicHelpNowQuickBookingInput } from './helpNowQuickBooking.validation';

async function nextReference() {
  const counter = await HelpNowCounterModel.findOneAndUpdate(
    { _id: 'QUICK_BOOKING' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `HQ-${String(counter.seq).padStart(6, '0')}`;
}

export async function createHelpNowQuickBooking(data: PublicHelpNowQuickBookingInput) {
  const booking = await HelpNowQuickBookingModel.create({
    referenceNo: await nextReference(),
    name: data.name,
    phone: data.phone,
    services: data.services,
    message: data.message,
    page: data.page,
  });
  // Customer Section: this mobile's profile (made on the first request).
  await syncCustomerSafely({ ...contactFromWebsiteEnquiry(booking), isNew: true });
  // Runs in the background — the visitor never waits on WhatsApp.
  void sendReceivedWhatsApp(booking._id.toString(), {
    name: data.name,
    phone: data.phone,
    referenceNo: booking.referenceNo,
    params: quickBookingWhatsAppParams({ name: data.name, services: data.services, referenceNo: booking.referenceNo }),
  });
  // Only what the thank-you screen needs.
  return { referenceNo: booking.referenceNo, services: booking.services };
}

// The same "booking received" WhatsApp as City Calls' Quick Book, saved on
// the booking so admin can see whether it went out. Never throws.
async function sendReceivedWhatsApp(
  bookingId: string,
  input: { name: string; phone: string; referenceNo: string; params: string[] }
) {
  let whatsapp: { status: 'SENT' | 'FAILED' | 'SKIPPED'; at: Date; error?: string };
  if (!isWhatsAppEnabled()) {
    whatsapp = { status: 'SKIPPED', at: new Date() };
  } else {
    try {
      await sendWhatsApp({
        to: input.phone,
        campaignName: env.aisensy.quickBookingCampaign,
        userName: input.name,
        variables: input.params,
        source: 'helpnow-quick-booking',
        media: { url: env.aisensy.quickBookingMediaUrl, filename: 'citycalls.jpg' },
      });
      whatsapp = { status: 'SENT', at: new Date() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[help-now] quick booking WhatsApp failed for ${input.referenceNo}: ${message}`);
      whatsapp = { status: 'FAILED', at: new Date(), error: message.slice(0, 500) };
    }
  }
  await HelpNowQuickBookingModel.updateOne({ _id: bookingId }, { $set: { whatsapp } }).catch((error: unknown) => {
    console.error('[help-now] could not save quick booking WhatsApp status', error);
  });
}

export function listHelpNowQuickBookings() {
  return HelpNowQuickBookingModel.find().sort({ createdAt: -1 }).limit(5000).lean();
}

// Sidebar badge: requests still waiting for a call.
export async function pendingHelpNowQuickBookings() {
  return { pending: await HelpNowQuickBookingModel.countDocuments({ status: 'PENDING' }) };
}

export async function updateHelpNowQuickBookingStatus(id: string, status: HelpNowQuickBookingStatus, actor: ActorSnapshot) {
  const booking = await HelpNowQuickBookingModel.findByIdAndUpdate(
    id,
    { status, statusUpdatedBy: actor, statusUpdatedAt: new Date() },
    { new: true, runValidators: true }
  ).lean();
  if (!booking) throw new NotFoundError('Quick booking not found');
  return booking;
}

export async function deleteHelpNowQuickBooking(id: string) {
  const booking = await HelpNowQuickBookingModel.findByIdAndDelete(id);
  if (!booking) throw new NotFoundError('Quick booking not found');
}
