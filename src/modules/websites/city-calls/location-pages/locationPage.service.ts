import { Types } from 'mongoose';
import { ActorSnapshot } from '../../../../lib/actor';
import { ConflictError, NotFoundError, ValidationError } from '../../../../lib/errors';
import { cleanBlogHtml } from '../blogs/blogs.service';
import { NavbarMenuModel } from '../navbar/navbarMenu.model';
import { NavbarServiceModel } from '../navbar/navbarService.model';
import { LocationPageModel, LocationPageType } from './locationPage.model';
import { CreateLocationPageInput, UpdateLocationPageInput } from './locationPage.validation';

// The home page's entry in "Select Page" — named for what it sells, like
// Design House's "Interior Design Company", so its pages read
// "Home Services in Noida".
export const HOME_TARGET = { serviceName: 'Home Services', servicePath: '/', menuName: '' };

export interface LocationPageOption {
  // 'HOME' or the Navbar List service link's id.
  value: string;
  pageType: LocationPageType;
  name: string;
  path: string;
  // Navlink or its menu switched off in Navbar List.
  inactive?: boolean;
}

export interface LocationPageOptionGroup {
  group: string;
  pages: LocationPageOption[];
}

// Admin "Select Page": the home page, then every Navbar List service grouped by menu.
export async function listPageOptions(): Promise<LocationPageOptionGroup[]> {
  const [menus, services] = await Promise.all([
    NavbarMenuModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    NavbarServiceModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
  ]);
  const groups: LocationPageOptionGroup[] = [
    { group: 'Home Page', pages: [{ value: 'HOME', pageType: 'HOME', name: HOME_TARGET.serviceName, path: '/' }] },
  ];
  for (const menu of menus) {
    const pages = services
      .filter((s) => s.menuId.toString() === menu._id.toString())
      .map((s) => ({
        value: s._id.toString(),
        pageType: 'SERVICE' as const,
        name: s.name,
        path: s.path,
        ...(menu.status !== 'ACTIVE' || s.status !== 'ACTIVE' ? { inactive: true } : {}),
      }));
    if (pages.length > 0) groups.push({ group: menu.name, pages });
  }
  return groups;
}

// Name / path / menu copied from the page's target.
async function resolveTarget(pageType: LocationPageType, navServiceId?: string | null) {
  if (pageType === 'HOME') return HOME_TARGET;
  const service = navServiceId && Types.ObjectId.isValid(navServiceId) ? await NavbarServiceModel.findById(navServiceId).lean() : null;
  if (!service) {
    throw new ValidationError([{ field: 'navServiceId', code: 'NOT_FOUND', message: 'Please select the service page' }]);
  }
  const menu = await NavbarMenuModel.findById(service.menuId).select('name').lean();
  return { serviceName: service.name, servicePath: service.path, menuName: menu?.name ?? '' };
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Location page not found');
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const clash = await LocationPageModel.findOne({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select('_id').lean();
  if (clash) throw new ConflictError('Another location page already uses this URL — please change it.', 'SLUG_TAKEN');
}

// ── Admin ──────────────────────────────────────────────────────────────────
const LIST_FIELDS = 'pageType navServiceId serviceName servicePath menuName location slug title status createdAt updatedAt createdBy updatedBy';

export function listAdminLocationPages() {
  return LocationPageModel.find().sort({ createdAt: -1 }).select(LIST_FIELDS).lean();
}

export async function getAdminLocationPage(id: string) {
  assertId(id);
  const page = await LocationPageModel.findById(id).select('-__v').lean();
  if (!page) throw new NotFoundError('Location page not found');
  return page;
}

export async function createLocationPage(data: CreateLocationPageInput, actor: ActorSnapshot) {
  await assertSlugFree(data.slug);
  const { navServiceId, ...rest } = data;
  const target = await resolveTarget(data.pageType, navServiceId);
  const created = await LocationPageModel.create({
    ...rest,
    ...target,
    ...(data.pageType === 'SERVICE' ? { navServiceId } : {}),
    content: cleanBlogHtml(data.content),
    createdBy: actor,
    updatedBy: actor,
  });
  return created.toObject();
}

export async function updateLocationPage(id: string, data: UpdateLocationPageInput, actor: ActorSnapshot) {
  assertId(id);
  const existing = await LocationPageModel.findById(id).select('pageType navServiceId').lean();
  if (!existing) throw new NotFoundError('Location page not found');
  if (data.slug) await assertSlugFree(data.slug, id);

  const { navServiceId, ...rest } = data;
  const set: Record<string, unknown> = { ...rest, updatedBy: actor };
  const unset: Record<string, 1> = {};
  if (data.content !== undefined) set.content = cleanBlogHtml(data.content);

  // Page changed → copy the new target's name / path / menu.
  if (data.pageType !== undefined || navServiceId !== undefined) {
    const pageType = data.pageType ?? existing.pageType;
    const serviceId = navServiceId !== undefined ? navServiceId : existing.navServiceId?.toString();
    Object.assign(set, await resolveTarget(pageType, serviceId));
    if (pageType === 'SERVICE') set.navServiceId = serviceId;
    else unset.navServiceId = 1;
  }

  const updated = await LocationPageModel.findByIdAndUpdate(
    id,
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true, runValidators: true }
  )
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Location page not found');
  return updated;
}

export async function deleteLocationPage(id: string) {
  assertId(id);
  const deleted = await LocationPageModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Location page not found');
}

// ── Website ────────────────────────────────────────────────────────────────
const LINK_FIELDS = 'slug location serviceName servicePath pageType title updatedAt';

// Published pages, optionally only those for one page (e.g. ?path=/services/ac-service).
export function listPublicLocationPages(path?: string) {
  const filter: Record<string, unknown> = { status: 'PUBLISHED' };
  if (path) filter.servicePath = path.replace(/\/+$/, '') || '/';
  return LocationPageModel.find(filter).sort({ location: 1 }).select(LINK_FIELDS).lean();
}

// The page plus links for internal linking: the same page in other cities,
// and other pages for the same city.
export async function getPublicLocationPage(slug: string) {
  const page = await LocationPageModel.findOne({ slug: slug.toLowerCase(), status: 'PUBLISHED' })
    .select('-__v -createdBy -updatedBy -status')
    .lean();
  if (!page) throw new NotFoundError('Location page not found');

  const [otherCities, sameCity] = await Promise.all([
    LocationPageModel.find({ status: 'PUBLISHED', servicePath: page.servicePath, _id: { $ne: page._id } })
      .sort({ location: 1 })
      .limit(60)
      .select(LINK_FIELDS)
      .lean(),
    LocationPageModel.find({
      status: 'PUBLISHED',
      location: { $regex: `^${page.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      _id: { $ne: page._id },
    })
      .sort({ serviceName: 1 })
      .limit(60)
      .select(LINK_FIELDS)
      .lean(),
  ]);
  return { ...page, otherCities, sameCity };
}
