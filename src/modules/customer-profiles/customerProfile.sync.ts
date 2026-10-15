import { EnquiryCounterModel } from '../enquiries/enquiry.model';
import { CityCallsCustomerModel, CustomerActivitySource, ICityCallsCustomer } from './customerProfile.model';

// Keeps a CityCalls customer profile for every mobile number that books a
// Service Call, is noted as a Call Enquiry or sends a website enquiry.

// "+91 98765-43210" / "098765 43210" / "919876543210" → "9876543210".
// Anything that isn't an Indian 10-digit mobile gives ''.
export function normalizePhone(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const digits = String(value).replace(/\D/g, '');
  const local = digits.length > 10 && /^(91|0)/.test(digits) ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : '';
}

export interface CustomerContact {
  phone: string;
  name?: string;
  email?: string;
  altPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // When the call / enquiry happened — the newest one's details win.
  at: Date;
  source: CustomerActivitySource;
  // A new call / enquiry (not an edit or the backfill): also brings back a
  // profile that was removed from All Customers.
  isNew?: boolean;
}

const COUNTER_ID = 'CITYCALLS_CUSTOMER';

export function formatCustomerCode(seq: number) {
  return `CC-${String(seq).padStart(6, '0')}`;
}

async function nextCustomerCode() {
  const counter = await EnquiryCounterModel.findOneAndUpdate({ _id: COUNTER_ID }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return formatCustomerCode(counter.seq);
}

const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

// Only the fields this record actually has (an enquiry with no email
// mustn't wipe the email a service call saved).
function detailsOf(contact: CustomerContact) {
  const details: Record<string, string> = {};
  const put = (key: string, value?: string, max = 300) => {
    const clean = value?.trim();
    if (clean) details[key] = clean.slice(0, max);
  };
  put('name', contact.name, 120);
  put('email', contact.email?.toLowerCase(), 160);
  put('altPhone', normalizePhone(contact.altPhone) || undefined, 15);
  put('address', contact.address);
  put('city', contact.city, 80);
  put('state', contact.state, 80);
  put('pincode', contact.pincode, 6);
  return details;
}

// Creates or updates the profile for this contact's mobile number. Never
// throws for bad data (an unusable number is skipped) so it can't break the
// booking / enquiry that triggered it. Returns the profile, or null.
export async function recordCustomerContact(contact: CustomerContact): Promise<ICityCallsCustomer | null> {
  const phone = normalizePhone(contact.phone);
  if (!phone) return null;
  const at = contact.at instanceof Date && !Number.isNaN(contact.at.getTime()) ? contact.at : new Date();
  const details = detailsOf(contact);

  for (let attempt = 0; attempt < 3; attempt++) {
    // Newer than (or as new as) what we have → its details become current.
    const newer = await CityCallsCustomerModel.findOneAndUpdate(
      { phone, lastSeenAt: { $lte: at } },
      {
        $set: { ...details, lastSeenAt: at, lastSource: contact.source },
        $min: { firstSeenAt: at },
        ...(contact.isNew ? { $unset: { deletedAt: 1, deletedBy: 1 } } : {}),
      },
      { new: true }
    );
    if (newer) return newer;

    // Older activity → only fills in what the profile doesn't have yet.
    const existing = await CityCallsCustomerModel.findOne({ phone });
    if (existing) {
      const missing = Object.fromEntries(
        Object.entries(details).filter(([key]) => !existing.get(key))
      );
      return CityCallsCustomerModel.findOneAndUpdate(
        { phone },
        { $set: missing, $min: { firstSeenAt: at } },
        { new: true }
      );
    }

    try {
      return await CityCallsCustomerModel.create({
        ...details,
        name: details.name || 'Customer',
        phone,
        customerCode: await nextCustomerCode(),
        firstSeenAt: at,
        lastSeenAt: at,
        lastSource: contact.source,
      });
    } catch (error) {
      // Another request created this number at the same moment — go again.
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  return CityCallsCustomerModel.findOne({ phone });
}

// Fire-and-forget wrapper for the create / update paths of other modules:
// a profile problem is logged, never surfaced to the person saving.
export async function syncCustomerSafely(contact: CustomerContact) {
  try {
    await recordCustomerContact(contact);
  } catch (error) {
    console.error('[customer-profiles] could not update the customer profile', error);
  }
}

type RegistrationLike = {
  phone: string; fullName?: string; email?: string; altPhone?: string; address?: string;
  city?: string; state?: string; pincode?: string; createdAt?: Date;
};
export function contactFromRegistration(r: RegistrationLike): CustomerContact {
  return {
    phone: r.phone, name: r.fullName, email: r.email, altPhone: r.altPhone, address: r.address,
    city: r.city, state: r.state, pincode: r.pincode, at: r.createdAt ?? new Date(), source: 'SERVICE_CALL',
  };
}

export function contactFromCallEnquiry(e: { phone: string; name?: string; createdAt?: Date }): CustomerContact {
  return { phone: e.phone, name: e.name, at: e.createdAt ?? new Date(), source: 'CALL_ENQUIRY' };
}

export function contactFromWebsiteEnquiry(e: { phone: string; name?: string; email?: string; createdAt?: Date }): CustomerContact {
  return { phone: e.phone, name: e.name, email: e.email, at: e.createdAt ?? new Date(), source: 'WEBSITE_ENQUIRY' };
}
