import { ActorSnapshot } from '../../../../lib/actor';
import { ConflictError, NotFoundError, ValidationError } from '../../../../lib/errors';
import { NavbarMenuModel } from '../navbar/navbarMenu.model';
import { NavbarServiceModel } from '../navbar/navbarService.model';
import { PageBackgroundModel, PageBackgroundStatus } from './pageBackground.model';

export interface BackgroundPageOption {
  path: string;
  name: string;
  // Navlink or menu switched off in Navbar List (page may not be linked).
  inactive?: boolean;
  // Set when this page already has a background entry.
  backgroundId?: string;
}

export interface BackgroundPageGroup {
  group: string;
  pages: BackgroundPageOption[];
}

// Website pages outside Navbar List that also show a background hero (not
// the individual blog posts — those use their own feature image).
const OTHER_PAGES_GROUP = 'Other Pages';
const OTHER_PAGES: { path: string; name: string }[] = [{ path: '/blogs', name: 'Blogs' }];

// Every service page from Navbar List, one group per menu — these are the
// pages that render the background hero, so a new navlink shows up here as
// soon as it's added — plus the other pages above.
export async function listBackgroundPageOptions(): Promise<BackgroundPageGroup[]> {
  const [menus, services, backgrounds] = await Promise.all([
    NavbarMenuModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    NavbarServiceModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    PageBackgroundModel.find().select('pagePath').lean(),
  ]);
  const idByPath = new Map(backgrounds.map((b) => [b.pagePath, b._id.toString()]));

  const groups: BackgroundPageGroup[] = [];
  for (const menu of menus) {
    const pages = services
      .filter((s) => s.menuId.toString() === menu._id.toString())
      .map((s) => ({
        path: s.path,
        name: s.name,
        inactive: menu.status !== 'ACTIVE' || s.status !== 'ACTIVE',
        backgroundId: idByPath.get(s.path.toLowerCase()),
      }));
    if (pages.length > 0) groups.push({ group: menu.name, pages });
  }
  groups.push({
    group: OTHER_PAGES_GROUP,
    pages: OTHER_PAGES.map((p) => ({ ...p, backgroundId: idByPath.get(p.path) })),
  });
  return groups;
}

// Display name + menu for a path, for the BG List ("AC Service" · "Home Appliance").
async function pageLookup() {
  const [menus, services] = await Promise.all([
    NavbarMenuModel.find().select('name').lean(),
    NavbarServiceModel.find().select('path name menuId').lean(),
  ]);
  const menuNames = new Map(menus.map((m) => [m._id.toString(), m.name]));
  const pages = new Map([
    ...services.map((s) => [s.path.toLowerCase(), { pageName: s.name, menuName: menuNames.get(s.menuId.toString()) }] as const),
    ...OTHER_PAGES.map((p) => [p.path, { pageName: p.name, menuName: OTHER_PAGES_GROUP }] as const),
  ]);
  return (path: string) => pages.get(path) ?? { pageName: path, menuName: undefined };
}

interface ListPageBackgroundParams {
  q?: string;
  status?: PageBackgroundStatus;
}

export async function listPageBackgrounds(params: ListPageBackgroundParams) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;

  const [items, lookup] = await Promise.all([
    PageBackgroundModel.find(filter).sort({ updatedAt: -1 }).lean(),
    pageLookup(),
  ]);
  const rows = items.map((item) => ({ ...item, ...lookup(item.pagePath) }));

  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter((r) => [r.pageName, r.pagePath, r.heading].some((v) => v.toLowerCase().includes(q)));
}

export async function getPageBackground(id: string) {
  const background = await PageBackgroundModel.findById(id).lean();
  if (!background) throw new NotFoundError('Background not found');
  const lookup = await pageLookup();
  return { ...background, ...lookup(background.pagePath) };
}

export async function getPublicPageBackground(path: string) {
  return PageBackgroundModel.findOne({ pagePath: path.toLowerCase(), status: 'ACTIVE' })
    .select('-createdBy -updatedBy -status -__v')
    .lean();
}

export async function createPageBackground(data: Record<string, unknown> & { pagePath: string }, actor: ActorSnapshot) {
  const exists = await PageBackgroundModel.exists({ pagePath: data.pagePath.toLowerCase() });
  if (exists) throw new ConflictError('This page already has a background — edit it from BG List', 'PAGE_BACKGROUND_EXISTS');
  return PageBackgroundModel.create({ ...data, createdBy: actor, updatedBy: actor });
}

export async function updatePageBackground(id: string, data: Record<string, unknown>, actor: ActorSnapshot) {
  const background = await PageBackgroundModel.findById(id);
  if (!background) throw new NotFoundError('Background not found');
  // An update may send only one of heading / highlight, so re-check the pair
  // against what's stored.
  const heading = (data.heading as string | undefined) ?? background.heading;
  const highlight = (data.highlight as string | undefined) ?? background.highlight;
  if (highlight && !heading.includes(highlight)) {
    throw new ValidationError([{ field: 'highlight', code: 'VALIDATION_ERROR', message: 'Highlight text must be part of the heading' }]);
  }
  background.set({ ...data, updatedBy: actor });
  return background.save();
}

export async function deletePageBackground(id: string) {
  const background = await PageBackgroundModel.findByIdAndDelete(id);
  if (!background) throw new NotFoundError('Background not found');
}
