import { CallEnquiryModel } from '../call-enquiries/callEnquiry';
import { EnquiryModel } from '../enquiries/enquiry.model';
import { RegistrationModel, RegistrationStatus } from '../registrations/registration.model';
import { ActorSnapshot } from '../../lib/actor';
import { NotFoundError } from '../../lib/errors';
import { CityCallsCustomerModel, ICityCallsCustomer } from './customerProfile.model';
import {
  contactFromCallEnquiry, contactFromRegistration, contactFromWebsiteEnquiry, normalizePhone, recordCustomerContact,
} from './customerProfile.sync';

// Customer Section: the top-bar search, All Customers and the customer
// profile. Counts and history are read live from Service Calls
// (registrations), Call Enquiries and website enquiries by mobile number.

const OPEN_STATUSES: RegistrationStatus[] = ['NEW', 'ACTIVE', 'PENDING', 'REOPENED'];
// Profiles still in All Customers (not removed).
const LIVE = { deletedAt: null };
const TIME_ZONE = 'Asia/Kolkata';

// NEW = no service yet (only enquiries), then by how many service calls they've had.
export type CustomerKind = 'NEW' | 'FIRST_TIME' | 'REPEAT' | 'LOYAL';
export function customerKind(services: number): CustomerKind {
  if (services <= 0) return 'NEW';
  if (services === 1) return 'FIRST_TIME';
  return services >= 5 ? 'LOYAL' : 'REPEAT';
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// What the search text looks like: a mobile (part), or words / an ID.
export function parseSearch(raw: string) {
  const q = raw.trim().slice(0, 100);
  const compact = q.replace(/[\s+\-()]/g, '');
  let digits = q.replace(/\D/g, '');
  // "+91 98765…" / "9198765…" (12 digits) / "098765…" (11) → the mobile part.
  if (/^\s*\+\s*91/.test(q) || (digits.length > 10 && digits.startsWith('91'))) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  // Only digits (≥ 4 of them) → also search mobiles.
  const phonePart = digits.length >= 4 && /^\d+$/.test(compact) ? digits.slice(0, 10) : '';
  return { q, rx: new RegExp(escapeRegex(q), 'i'), phonePart, phoneRx: phonePart ? new RegExp(escapeRegex(phonePart)) : null };
}

// ── Per-phone counts (for lists / search results) ──────────────────────────
interface PhoneStats {
  services: number;
  completed: number;
  open: number;
  cancelled: number;
  reopens: number;
  lastServiceAt?: Date;
  // Call Enquiries / website enquiries (Quick Booking + Contact).
  enquiries: number;
  webEnquiries: number;
}

async function statsForPhones(phones: string[]): Promise<Map<string, PhoneStats>> {
  const stats = new Map<string, PhoneStats>();
  if (phones.length === 0) return stats;
  const [registrations, callEnquiries, webEnquiries] = await Promise.all([
    RegistrationModel.aggregate<{ _id: string; total: number; completed: number; open: number; cancelled: number; reopens: number; last: Date }>([
      { $match: { phone: { $in: phones } } },
      {
        $group: {
          _id: '$phone',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
          open: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
          reopens: {
            $sum: {
              $size: { $filter: { input: { $ifNull: ['$statusHistory', []] }, as: 'h', cond: { $eq: ['$$h.to', 'REOPENED'] } } },
            },
          },
          last: { $max: '$createdAt' },
        },
      },
    ]),
    CallEnquiryModel.aggregate<{ _id: string; count: number }>([
      { $match: { phone: { $in: phones } } },
      { $group: { _id: '$phone', count: { $sum: 1 } } },
    ]),
    EnquiryModel.aggregate<{ _id: string; count: number }>([
      { $match: { phone: { $in: phones } } },
      { $group: { _id: '$phone', count: { $sum: 1 } } },
    ]),
  ]);
  for (const phone of phones) stats.set(phone, { ...EMPTY_STATS });
  for (const r of registrations) {
    Object.assign(stats.get(r._id)!, {
      services: r.total - r.cancelled,
      completed: r.completed,
      open: r.open,
      cancelled: r.cancelled,
      reopens: r.reopens,
      lastServiceAt: r.last,
    });
  }
  for (const e of callEnquiries) stats.get(e._id)!.enquiries = e.count;
  for (const e of webEnquiries) stats.get(e._id)!.webEnquiries = e.count;
  return stats;
}

const EMPTY_STATS: PhoneStats = { services: 0, completed: 0, open: 0, cancelled: 0, reopens: 0, enquiries: 0, webEnquiries: 0 };

const CUSTOMER_FIELDS = 'customerCode phone name email city state firstSeenAt lastSeenAt lastSource';

function withStats(customer: Pick<ICityCallsCustomer, 'phone'> & Record<string, unknown>, stats?: PhoneStats) {
  const s = stats ?? EMPTY_STATS;
  return { ...customer, stats: s, kind: customerKind(s.services) };
}

// ── Top-bar search ─────────────────────────────────────────────────────────
const SEARCH_LIMIT = 8;

export interface SearchMatch {
  // What the text matched, e.g. "Reg No CC2026100705" / "Mobile" / "Name".
  matchedOn: string;
  exact: boolean;
}

// Finds customers by CityCalls ID, mobile, name, email, a Service Call's
// registration number, a Call Enquiry number or a website enquiry's
// reference (Quick Booking / Contact). A number found only on a call /
// enquiry (no profile yet) gets its profile made on the spot; removed
// profiles stay out.
export async function searchCustomers(raw: string) {
  const { q, rx, phonePart, phoneRx } = parseSearch(raw);
  if (q.length < 2) return [];
  const upper = q.toUpperCase();

  const [customers, registrations, callEnquiries, webEnquiries] = await Promise.all([
    CityCallsCustomerModel.find({
      ...LIVE,
      $or: [
        { customerCode: rx }, { name: rx }, { email: rx },
        ...(phoneRx ? [{ phone: phoneRx }, { altPhone: phoneRx }] : []),
      ],
    }).sort({ lastSeenAt: -1 }).limit(SEARCH_LIMIT).select(CUSTOMER_FIELDS).lean(),
    RegistrationModel.find({
      $or: [
        { registrationNo: rx }, { email: rx }, { fullName: rx },
        ...(phoneRx ? [{ phone: phoneRx }, { altPhone: phoneRx }] : []),
      ],
    }).sort({ createdAt: -1 }).limit(SEARCH_LIMIT).select('registrationNo phone fullName email altPhone address city state pincode createdAt').lean(),
    CallEnquiryModel.find({ $or: [{ enquiryNo: rx }, ...(phoneRx ? [{ phone: phoneRx }] : [])] })
      .sort({ createdAt: -1 }).limit(5).select('enquiryNo phone name createdAt').lean(),
    EnquiryModel.find({ $or: [{ referenceNo: rx }, { email: rx }, ...(phoneRx ? [{ phone: phoneRx }] : [])] })
      .sort({ createdAt: -1 }).limit(5).select('referenceNo phone name email createdAt').lean(),
  ]);

  const matches = new Map<string, SearchMatch>();
  const note = (phone: string, matchedOn: string, exact: boolean) => {
    const current = matches.get(phone);
    if (!current || (exact && !current.exact)) matches.set(phone, { matchedOn, exact });
  };
  for (const c of customers) {
    if (c.customerCode === upper) note(c.phone, 'CityCalls ID', true);
    else if (phonePart && c.phone === phonePart) note(c.phone, 'Mobile', true);
    else if (rx.test(c.customerCode)) note(c.phone, 'CityCalls ID', false);
    else if (phoneRx && (phoneRx.test(c.phone) || phoneRx.test(c.altPhone ?? ''))) note(c.phone, 'Mobile', false);
    else if (rx.test(c.name)) note(c.phone, 'Name', c.name.toLowerCase() === q.toLowerCase());
    else note(c.phone, 'Email', c.email === q.toLowerCase());
  }
  for (const r of registrations) {
    if (rx.test(r.registrationNo)) note(r.phone, `Reg No ${r.registrationNo}`, r.registrationNo.toUpperCase() === upper);
    else if (r.email && rx.test(r.email)) note(r.phone, 'Email', r.email === q.toLowerCase());
    else if (phoneRx) note(r.phone, 'Mobile', r.phone === phonePart);
    else note(r.phone, 'Name', false);
  }
  for (const e of callEnquiries) {
    note(e.phone, rx.test(e.enquiryNo) ? `Enquiry ${e.enquiryNo}` : 'Mobile', e.enquiryNo.toUpperCase() === upper || e.phone === phonePart);
  }
  for (const e of webEnquiries) {
    if (rx.test(e.referenceNo)) note(e.phone, `Enquiry ${e.referenceNo}`, e.referenceNo.toUpperCase() === upper);
    else if (e.email && rx.test(e.email)) note(e.phone, 'Email', e.email === q.toLowerCase());
    else note(e.phone, 'Mobile', e.phone === phonePart);
  }

  // Numbers found only on calls / enquiries: load (or make) their profiles.
  const found = new Map(customers.map((c) => [c.phone, c as Record<string, unknown> & { phone: string; lastSeenAt: Date }]));
  const missing = [...matches.keys()].filter((phone) => !found.has(phone));
  if (missing.length) {
    const more = await CityCallsCustomerModel.find({ phone: { $in: missing } }).select(`${CUSTOMER_FIELDS} deletedAt`).lean();
    const removed = new Set(more.filter((c) => c.deletedAt).map((c) => c.phone));
    for (const c of more) if (!c.deletedAt) found.set(c.phone, c);
    for (const phone of missing.filter((p) => !found.has(p) && !removed.has(p))) {
      const registration = registrations.find((r) => r.phone === phone);
      const callEnquiry = callEnquiries.find((e) => e.phone === phone);
      const webEnquiry = webEnquiries.find((e) => e.phone === phone);
      const contact = registration ? contactFromRegistration(registration)
        : callEnquiry ? contactFromCallEnquiry(callEnquiry)
        : webEnquiry ? contactFromWebsiteEnquiry(webEnquiry) : null;
      const made = contact ? await recordCustomerContact(contact) : null;
      if (made && !made.deletedAt) found.set(made.phone, made.toObject());
    }
  }

  const ordered = [...matches.entries()]
    .filter(([phone]) => found.has(phone))
    .sort(([pa, a], [pb, b]) => Number(b.exact) - Number(a.exact) || found.get(pb)!.lastSeenAt.getTime() - found.get(pa)!.lastSeenAt.getTime())
    .slice(0, SEARCH_LIMIT);
  const stats = await statsForPhones(ordered.map(([phone]) => phone));
  return ordered.map(([phone, match]) => {
    const { customerCode, name, email, city, lastSeenAt } = found.get(phone)! as unknown as ICityCallsCustomer;
    return { ...withStats({ customerCode, phone, name, email, city, lastSeenAt }, stats.get(phone)), ...match };
  });
}

// ── All Customers ──────────────────────────────────────────────────────────
export interface ListCustomersParams {
  q?: string;
  page: number;
  limit: number;
  sort: 'recent' | 'oldest' | 'name';
  from?: string;
  to?: string;
  dateField?: 'lastSeenAt' | 'firstSeenAt';
}

// "2026-10-01".."2026-10-15" → whole days in India time.
export function dateRangeFilter(from?: string, to?: string) {
  if (!from && !to) return null;
  return {
    ...(from ? { $gte: new Date(`${from}T00:00:00.000+05:30`) } : {}),
    ...(to ? { $lte: new Date(`${to}T23:59:59.999+05:30`) } : {}),
  };
}

const SORTS = { recent: { lastSeenAt: -1 }, oldest: { firstSeenAt: 1 }, name: { name: 1 } } as const;

export async function listCustomers({ q, page, limit, sort, from, to, dateField = 'lastSeenAt' }: ListCustomersParams) {
  const range = dateRangeFilter(from, to);
  const base = { ...LIVE, ...(range ? { [dateField]: range } : {}) };
  let filter: Record<string, unknown> = { ...base };
  if (q && q.trim().length >= 1) {
    const { rx, phoneRx } = parseSearch(q);
    // A Service Call / Call Enquiry / website enquiry number finds its customer too.
    const [regPhones, callPhones, webPhones] = await Promise.all([
      RegistrationModel.distinct('phone', { registrationNo: rx }),
      CallEnquiryModel.distinct('phone', { enquiryNo: rx }),
      EnquiryModel.distinct('phone', { referenceNo: rx }),
    ]);
    const byNumber = [...new Set([...regPhones, ...callPhones, ...webPhones])].slice(0, 200);
    filter = {
      ...base,
      $or: [
        { customerCode: rx }, { name: rx }, { email: rx }, { city: rx },
        ...(phoneRx ? [{ phone: phoneRx }, { altPhone: phoneRx }] : []),
        ...(byNumber.length ? [{ phone: { $in: byNumber } }] : []),
      ],
    };
  }
  const [total, customers] = await Promise.all([
    CityCallsCustomerModel.countDocuments(filter),
    CityCallsCustomerModel.find(filter)
      .sort({ ...SORTS[sort], _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(`${CUSTOMER_FIELDS} pincode createdAt`)
      .lean(),
  ]);
  const stats = await statsForPhones(customers.map((c) => c.phone));
  return {
    items: customers.map((c) => withStats(c, stats.get(c.phone))),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

// Numbers for the cards above All Customers.
export async function getCustomerSummary() {
  const monthStart = startOfMonthInIndia(new Date());
  const removedPhones = await CityCallsCustomerModel.distinct('phone', { deletedAt: { $ne: null } });
  const [total, newThisMonth, byPhone] = await Promise.all([
    CityCallsCustomerModel.countDocuments(LIVE),
    CityCallsCustomerModel.countDocuments({ ...LIVE, firstSeenAt: { $gte: monthStart } }),
    RegistrationModel.aggregate<{ _id: null; withService: number; repeat: number; loyal: number }>([
      { $match: { status: { $ne: 'CANCELLED' }, ...(removedPhones.length ? { phone: { $nin: removedPhones } } : {}) } },
      { $group: { _id: '$phone', count: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          withService: { $sum: 1 },
          repeat: { $sum: { $cond: [{ $gte: ['$count', 2] }, 1, 0] } },
          loyal: { $sum: { $cond: [{ $gte: ['$count', 5] }, 1, 0] } },
        },
      },
    ]),
  ]);
  const services = byPhone[0] ?? { withService: 0, repeat: 0, loyal: 0 };
  return {
    total,
    newThisMonth,
    withService: services.withService,
    repeat: services.repeat,
    loyal: services.loyal,
    // Only enquired so far.
    enquiryOnly: Math.max(0, total - services.withService),
  };
}

// First day of this month, midnight India time.
function startOfMonthInIndia(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  return new Date(`${year}-${month}-01T00:00:00+05:30`);
}

// "2026-09" for a date, in India time.
export function monthKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(date);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}

// ── Profile ────────────────────────────────────────────────────────────────
// By CityCalls ID ("CC-000123") or mobile number.
async function findCustomer(key: string) {
  const phone = normalizePhone(key);
  const customer = phone
    ? await CityCallsCustomerModel.findOne({ ...LIVE, phone }).select('-deletedAt -deletedBy').lean()
    : await CityCallsCustomerModel.findOne({ ...LIVE, customerCode: key.trim().toUpperCase() }).select('-deletedAt -deletedBy').lean();
  if (!customer) throw new NotFoundError('Customer not found');
  return customer;
}

type CountRow = { count: number; completed: number; reopens: number; lastAt?: Date };

export async function getCustomerProfile(key: string) {
  const customer = await findCustomer(key);
  const phone = customer.phone;

  const [registrations, callEnquiries, websiteEnquiries] = await Promise.all([
    RegistrationModel.find({ phone })
      .sort({ createdAt: -1 })
      .select('registrationNo source fullName email address city state pincode serviceName serviceCategory brand applianceType capacity issues status statusHistory preferredDate timeSlot couponCode createdAt')
      .lean(),
    CallEnquiryModel.find({ phone }).sort({ createdAt: -1 }).select('enquiryNo name serviceName serviceCategory source status registrationId registrationNo remarks createdAt').lean(),
    EnquiryModel.find({ phone }).sort({ createdAt: -1 }).select('referenceNo type services subject status createdAt').lean(),
  ]);

  const services = registrations.map((r) => {
    const history = r.statusHistory ?? [];
    const reopens = history.filter((h) => h.to === 'REOPENED').length;
    const closed = [...history].reverse().find((h) => h.to === 'CLOSED');
    return {
      _id: r._id,
      registrationNo: r.registrationNo,
      source: r.source,
      serviceName: r.serviceName,
      serviceCategory: r.serviceCategory ?? '',
      brand: r.brand ?? '',
      applianceType: r.applianceType ?? '',
      issues: r.issues ?? [],
      status: r.status,
      reopens,
      createdAt: r.createdAt,
      preferredDate: r.preferredDate,
      timeSlot: r.timeSlot,
      closedAt: r.status === 'CLOSED' ? closed?.at : undefined,
      couponCode: r.couponCode,
      city: r.city,
    };
  });
  const active = services.filter((s) => s.status !== 'CANCELLED');

  // Times each service / category / brand was booked (cancelled calls left out).
  const group = (keyOf: (s: (typeof services)[number]) => string) => {
    const rows = new Map<string, CountRow & { name: string; category?: string }>();
    for (const s of active) {
      const name = keyOf(s).trim();
      if (!name) continue;
      const row = rows.get(name.toLowerCase()) ?? { name, category: s.serviceCategory, count: 0, completed: 0, reopens: 0 };
      row.count++;
      if (s.status === 'CLOSED') row.completed++;
      row.reopens += s.reopens;
      if (!row.lastAt || s.createdAt > row.lastAt) row.lastAt = s.createdAt;
      rows.set(name.toLowerCase(), row);
    }
    return [...rows.values()].sort((a, b) => b.count - a.count || (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));
  };

  const months = new Map<string, number>();
  for (const s of active) months.set(monthKey(s.createdAt), (months.get(monthKey(s.createdAt)) ?? 0) + 1);

  // Every address they've used, newest first.
  const addresses = new Map<string, { address: string; city: string; state: string; pincode: string; lastUsedAt: Date; times: number }>();
  for (const r of registrations) {
    const k = `${r.address}|${r.pincode}`.toLowerCase();
    const row = addresses.get(k);
    if (row) row.times++;
    else addresses.set(k, { address: r.address, city: r.city, state: r.state, pincode: r.pincode, lastUsedAt: r.createdAt, times: 1 });
  }

  const dates = active.map((s) => s.createdAt.getTime());
  const stats = {
    services: active.length,
    completed: active.filter((s) => s.status === 'CLOSED').length,
    open: active.filter((s) => OPEN_STATUSES.includes(s.status)).length,
    cancelled: services.length - active.length,
    reopens: active.reduce((sum, s) => sum + s.reopens, 0),
    reopenedServices: active.filter((s) => s.reopens > 0).length,
    callEnquiries: callEnquiries.length,
    websiteEnquiries: websiteEnquiries.length,
    firstServiceAt: dates.length ? new Date(Math.min(...dates)) : undefined,
    lastServiceAt: dates.length ? new Date(Math.max(...dates)) : undefined,
  };

  return {
    customer,
    kind: customerKind(stats.services),
    stats,
    byService: group((s) => s.serviceName),
    byCategory: group((s) => s.serviceCategory).map(({ name, count, completed, reopens, lastAt }) => ({ name, count, completed, reopens, lastAt })),
    byBrand: group((s) => s.brand).map(({ name, count, lastAt }) => ({ name, count, lastAt })),
    byMonth: [...months.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([month, count]) => ({ month, count })),
    addresses: [...addresses.values()].sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime()),
    services,
    callEnquiries,
    websiteEnquiries,
  };
}

// All Customers → Delete: takes the profile off the list (and out of the
// search). Their service calls and enquiries are kept; a new call or
// enquiry from the same mobile brings the profile back.
export async function deleteCustomer(key: string, actor: ActorSnapshot) {
  const customer = await findCustomer(key);
  await CityCallsCustomerModel.updateOne({ _id: customer._id }, { $set: { deletedAt: new Date(), deletedBy: actor } });
}
