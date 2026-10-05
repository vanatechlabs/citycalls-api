import { randomInt } from 'crypto';
import { Types } from 'mongoose';
import { InvalidTransitionError, NotFoundError } from '../../lib/errors';
import { NavbarMenuModel } from '../websites/city-calls/navbar/navbarMenu.model';
import { NavbarServiceModel } from '../websites/city-calls/navbar/navbarService.model';
import { UserModel } from '../users/users.model';
import {
  REGISTRATION_STATUSES, REGISTRATION_TRANSITIONS, RegistrationActor, RegistrationModel,
  RegistrationSource, RegistrationStatus,
} from './registration.model';

// Shared with other modules; re-exported so the controller keeps one import.
export { resolveActor } from '../../lib/actor';

// REG-260929-4821 style: date for easy reading over the phone, random tail
// for uniqueness. Retries on the (rare) unique-index collision.
function buildRegistrationNo() {
  const now = new Date();
  const date = [now.getFullYear() % 100, now.getMonth() + 1, now.getDate()]
    .map((n) => String(n).padStart(2, '0'))
    .join('');
  return `REG-${date}-${randomInt(1000, 10000)}`;
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

async function insertRegistration(data: Record<string, unknown>, source: RegistrationSource, actor: RegistrationActor) {
  const now = new Date();
  for (let attempt = 0; ; attempt++) {
    try {
      return await RegistrationModel.create({
        ...data,
        registrationNo: buildRegistrationNo(),
        source,
        status: 'NEW',
        statusHistory: [{ to: 'NEW', by: actor, at: now }],
        createdBy: actor,
        updatedBy: actor,
        // Website and admin entries alike stay unread (sidebar count + popup
        // for every admin) until someone opens them.
      });
    } catch (error) {
      if (!isDuplicateKeyError(error) || attempt >= 4) throw error;
    }
  }
}

export async function createRegistration(data: Record<string, unknown>, actor: RegistrationActor) {
  return insertRegistration(data, 'ADMIN', actor);
}

const WEBSITE_ACTOR: RegistrationActor = { name: 'Website' };

// Website booking form. The service comes in as its page slug and is matched
// to the Navbar List link at /services/<slug> for id, name and category.
export async function createWebsiteRegistration(
  data: Record<string, unknown> & { serviceSlug: string; serviceName: string }
) {
  const { serviceSlug, serviceName, ...rest } = data;
  const navService = await NavbarServiceModel.findOne({ path: `/services/${serviceSlug}` }).lean();
  const menu = navService ? await NavbarMenuModel.findById(navService.menuId).select('name').lean() : null;

  const registration = await insertRegistration(
    {
      ...rest,
      serviceId: navService?._id,
      serviceName: navService?.name ?? serviceName,
      serviceCategory: menu?.name,
    },
    'WEBSITE',
    WEBSITE_ACTOR
  );
  // Only what the customer needs to see on the thank-you screen.
  return { registrationNo: registration.registrationNo, serviceName: registration.serviceName };
}

// Unread = not yet opened in admin. Sidebar badges use byCategory (and
// newByCategory on each "New Call" link); the popup uses latest to announce
// new ones.
export async function getUnreadRegistrations() {
  const filter = { viewedAt: { $exists: false } };
  const [byCategoryRows, latest] = await Promise.all([
    RegistrationModel.aggregate<{ _id: { category: string | null; status: RegistrationStatus }; count: number }>([
      { $match: filter },
      { $group: { _id: { category: '$serviceCategory', status: '$status' }, count: { $sum: 1 } } },
    ]),
    RegistrationModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('registrationNo fullName phone serviceName serviceCategory source createdBy createdAt')
      .lean(),
  ]);

  const byCategory: Record<string, number> = {};
  const newByCategory: Record<string, number> = {};
  for (const row of byCategoryRows) {
    const category = row._id.category ?? 'Uncategorised';
    byCategory[category] = (byCategory[category] ?? 0) + row.count;
    if (row._id.status === 'NEW') newByCategory[category] = (newByCategory[category] ?? 0) + row.count;
  }
  const sum = (counts: Record<string, number>) => Object.values(counts).reduce((total, n) => total + n, 0);
  return { total: sum(byCategory), byCategory, newTotal: sum(newByCategory), newByCategory, latest };
}

// Opening a list page marks the unread rows it shows as read.
export async function markRegistrationsViewed(ids: string[], actor: RegistrationActor) {
  const result = await RegistrationModel.updateMany(
    { _id: { $in: ids }, viewedAt: { $exists: false } },
    { $set: { viewedAt: new Date(), viewedBy: actor } }
  );
  return { updated: result.modifiedCount };
}

// First open in admin marks it read; later opens change nothing.
export async function markRegistrationViewed(id: string, actor: RegistrationActor) {
  const registration = await RegistrationModel.findOneAndUpdate(
    { _id: id, viewedAt: { $exists: false } },
    { $set: { viewedAt: new Date(), viewedBy: actor } },
    { new: true }
  );
  if (registration) return registration;
  const existing = await RegistrationModel.findById(id);
  if (!existing) throw new NotFoundError('Registration not found');
  return existing;
}

interface RegistrationFilterParams {
  q?: string;
  source?: RegistrationSource;
  serviceCategory?: string;
  serviceId?: string;
  from?: string;
  to?: string;
}

interface ListRegistrationsParams extends RegistrationFilterParams {
  status?: RegistrationStatus;
  page: number;
  limit: number;
}

// The business runs on India time, so "today" and date filters are IST
// calendar days regardless of the server's own timezone.
const IST_OFFSET_MS = 330 * 60 * 1000;

function istDayStart(day: string) {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - IST_OFFSET_MS);
}

function istTodayStart() {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return istDayStart(istNow.toISOString().slice(0, 10));
}

function buildFilter(params: RegistrationFilterParams) {
  const filter: Record<string, unknown> = {};

  if (params.source) filter.source = params.source;
  if (params.serviceCategory) filter.serviceCategory = params.serviceCategory;
  // Cast explicitly — this filter also feeds aggregate(), which doesn't cast.
  if (params.serviceId) filter.serviceId = new Types.ObjectId(params.serviceId);
  if (params.from || params.to) {
    const createdAt: Record<string, Date> = {};
    if (params.from) createdAt.$gte = istDayStart(params.from);
    if (params.to) createdAt.$lt = new Date(istDayStart(params.to).getTime() + 24 * 60 * 60 * 1000);
    filter.createdAt = createdAt;
  }
  if (params.q) {
    const escapedQuery = params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['registrationNo', 'fullName', 'phone', 'email', 'serviceName', 'city', 'couponCode'].map((field) => ({
      [field]: { $regex: escapedQuery, $options: 'i' },
    }));
  }

  return filter;
}

export async function listRegistrations(params: ListRegistrationsParams) {
  const filter = buildFilter(params);
  if (params.status) filter.status = params.status;

  const [items, total] = await Promise.all([
    RegistrationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean(),
    RegistrationModel.countDocuments(filter),
  ]);

  // "Updated By" shows the person's current role under their name; the
  // snapshot only keeps the name, so look roles up for this page's rows.
  const updaterIds = [...new Set(items.map((r) => r.updatedBy?.userId?.toString()).filter(Boolean))];
  const users = updaterIds.length ? await UserModel.find({ _id: { $in: updaterIds } }).select('role').lean() : [];
  const roleById = new Map(users.map((u) => [u._id.toString(), u.role]));
  const withRoles = items.map((r) => {
    const role = r.updatedBy?.userId && roleById.get(r.updatedBy.userId.toString());
    return role ? { ...r, updatedBy: { ...r.updatedBy!, role } } : r;
  });

  return { items: withRoles, total, page: params.page, limit: params.limit };
}

export async function getRegistrationStats(params: RegistrationFilterParams) {
  const filter = buildFilter(params);

  // Category tab counts ignore the category / service filters themselves, so
  // every tab keeps showing its own number while another tab is selected.
  const crossCategoryFilter = buildFilter({ ...params, serviceCategory: undefined, serviceId: undefined });

  const [byStatusRows, byCategoryRows, today, couponApplied, categories] = await Promise.all([
    RegistrationModel.aggregate<{ _id: RegistrationStatus; count: number }>([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    RegistrationModel.aggregate<{ _id: { category: string | null; status: RegistrationStatus }; count: number }>([
      { $match: crossCategoryFilter },
      { $group: { _id: { category: '$serviceCategory', status: '$status' }, count: { $sum: 1 } } },
    ]),
    RegistrationModel.countDocuments({ ...filter, createdAt: { ...(filter.createdAt as object), $gte: istTodayStart() } }),
    RegistrationModel.countDocuments({ ...filter, couponCode: { $nin: [null, ''] } }),
    // Every category ever used, unfiltered, for the list's category dropdown.
    RegistrationModel.distinct('serviceCategory'),
  ]);

  const byStatus = Object.fromEntries(REGISTRATION_STATUSES.map((s) => [s, 0])) as Record<RegistrationStatus, number>;
  for (const row of byStatusRows) byStatus[row._id] = row.count;

  // { "Home Appliance": { NEW: 3, ACTIVE: 1, PENDING: 0, ... }, ... }
  const byCategory: Record<string, Record<RegistrationStatus, number>> = {};
  for (const row of byCategoryRows) {
    const category = row._id.category ?? 'Uncategorised';
    byCategory[category] ??= Object.fromEntries(REGISTRATION_STATUSES.map((s) => [s, 0])) as Record<RegistrationStatus, number>;
    byCategory[category][row._id.status] = row.count;
  }

  return {
    total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
    today,
    couponApplied,
    byStatus,
    byCategory,
    categories: (categories as (string | null)[]).filter((c): c is string => !!c).sort(),
  };
}

export async function bulkDeleteRegistrations(ids: string[]) {
  const result = await RegistrationModel.deleteMany({ _id: { $in: ids } });
  return { deleted: result.deletedCount };
}

export async function getRegistration(id: string) {
  const registration = await RegistrationModel.findById(id);
  if (!registration) throw new NotFoundError('Registration not found');
  return registration;
}

export async function updateRegistration(id: string, data: Record<string, unknown>, actor: RegistrationActor) {
  const registration = await RegistrationModel.findByIdAndUpdate(id, { ...data, updatedBy: actor }, {
    new: true,
    runValidators: true,
  });
  if (!registration) throw new NotFoundError('Registration not found');
  return registration;
}

// Moves a call to another status with a note; only the moves in
// REGISTRATION_TRANSITIONS are allowed.
export async function transitionRegistration(
  id: string,
  to: RegistrationStatus,
  note: string,
  actor: RegistrationActor,
) {
  const registration = await RegistrationModel.findById(id);
  if (!registration) throw new NotFoundError('Registration not found');

  const from = registration.status;
  const allowed = REGISTRATION_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) throw new InvalidTransitionError(from, allowed);

  const now = new Date();
  registration.lastNote = { note, by: actor, at: now };
  registration.status = to;
  registration.statusHistory.push({ from, to, note, by: actor, at: now });
  registration.updatedBy = actor;
  return registration.save();
}

export async function deleteRegistration(id: string) {
  const registration = await RegistrationModel.findByIdAndDelete(id);
  if (!registration) throw new NotFoundError('Registration not found');
}
