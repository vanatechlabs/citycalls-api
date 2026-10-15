import { CallEnquiryModel } from '../call-enquiries/callEnquiry';
import { EnquiryModel } from '../enquiries/enquiry.model';
import { RegistrationModel } from '../registrations/registration.model';
import { CustomerProfilesMetaModel } from './customerProfile.model';
import {
  contactFromCallEnquiry, contactFromRegistration, contactFromWebsiteEnquiry, recordCustomerContact,
} from './customerProfile.sync';

// ── One-time backfill ───────────────────────────────────────────────────────
const BACKFILL_ID = 'backfill';
const BACKFILL_VERSION = 1;

// Turns every existing call / enquiry into profiles, oldest first, so the
// latest details win. Runs once (in the background after the server
// starts); new records keep profiles up to date from then on.
export async function backfillCustomerProfiles() {
  const done = await CustomerProfilesMetaModel.findById(BACKFILL_ID).lean();
  if (done && done.version >= BACKFILL_VERSION) return;

  const started = Date.now();
  const [registrations, callEnquiries, enquiries] = await Promise.all([
    RegistrationModel.find().select('phone fullName email altPhone address city state pincode createdAt').lean(),
    CallEnquiryModel.find().select('phone name createdAt').lean(),
    EnquiryModel.find().select('phone name email createdAt').lean(),
  ]);
  const contacts = [
    ...registrations.map(contactFromRegistration),
    ...callEnquiries.map(contactFromCallEnquiry),
    ...enquiries.map(contactFromWebsiteEnquiry),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  for (const contact of contacts) await recordCustomerContact(contact);

  await CustomerProfilesMetaModel.updateOne(
    { _id: BACKFILL_ID },
    { $set: { version: BACKFILL_VERSION, at: new Date() } },
    { upsert: true }
  );
  console.log(`[customer-profiles] built profiles from ${contacts.length} calls / enquiries in ${Date.now() - started} ms`);
}
