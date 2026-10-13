import { ActorSnapshot } from '../../../../lib/actor';
import { ConflictError, NotFoundError, ValidationError } from '../../../../lib/errors';
import { NavbarMenuModel } from '../navbar/navbarMenu.model';
import { NavbarServiceModel } from '../navbar/navbarService.model';
import { PageParallaxModel } from './pageParallax.model';

export interface ParallaxPageGroup {
  group: string;
  pages: {
    path: string;
    name: string;
    // Navlink or menu switched off in Navbar List.
    inactive?: boolean;
    // Set when this page already has a parallax entry.
    parallaxId?: string;
  }[];
}

// Every service page from Navbar List, one group per menu — a new navlink
// shows up here as soon as it's added.
export async function listParallaxPageOptions(): Promise<ParallaxPageGroup[]> {
  const [menus, services, entries] = await Promise.all([
    NavbarMenuModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    NavbarServiceModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    PageParallaxModel.find().select('pagePath').lean(),
  ]);
  const idByPath = new Map(entries.map((e) => [e.pagePath, e._id.toString()]));

  const groups: ParallaxPageGroup[] = [];
  for (const menu of menus) {
    const pages = services
      .filter((s) => s.menuId.toString() === menu._id.toString())
      .map((s) => ({
        path: s.path,
        name: s.name,
        inactive: menu.status !== 'ACTIVE' || s.status !== 'ACTIVE',
        parallaxId: idByPath.get(s.path.toLowerCase()),
      }));
    if (pages.length > 0) groups.push({ group: menu.name, pages });
  }
  return groups;
}

// Display name + menu for a path, for the Parallax List ("AC Service" · "Home Appliance").
async function pageLookup() {
  const [menus, services] = await Promise.all([
    NavbarMenuModel.find().select('name').lean(),
    NavbarServiceModel.find().select('path name menuId').lean(),
  ]);
  const menuNames = new Map(menus.map((m) => [m._id.toString(), m.name]));
  const pages = new Map(
    services.map((s) => [s.path.toLowerCase(), { pageName: s.name, menuName: menuNames.get(s.menuId.toString()) }] as const)
  );
  return (path: string) => pages.get(path) ?? { pageName: path, menuName: undefined };
}

export async function listPageParallax() {
  const [items, lookup] = await Promise.all([PageParallaxModel.find().sort({ updatedAt: -1 }).lean(), pageLookup()]);
  return items.map((item) => ({ ...item, ...lookup(item.pagePath) }));
}

export async function getPageParallax(id: string) {
  const entry = await PageParallaxModel.findById(id).lean();
  if (!entry) throw new NotFoundError('Parallax image not found');
  const lookup = await pageLookup();
  return { ...entry, ...lookup(entry.pagePath) };
}

export async function getPublicPageParallax(path: string) {
  return PageParallaxModel.findOne({ pagePath: path.toLowerCase(), status: 'ACTIVE' })
    .select('-createdBy -updatedBy -status -__v')
    .lean();
}

export async function createPageParallax(data: Record<string, unknown> & { pagePath: string }, actor: ActorSnapshot) {
  const exists = await PageParallaxModel.exists({ pagePath: data.pagePath.toLowerCase() });
  if (exists) throw new ConflictError('This page already has a parallax image — edit it from Parallax List', 'PAGE_PARALLAX_EXISTS');
  return PageParallaxModel.create({ ...data, createdBy: actor, updatedBy: actor });
}

export async function updatePageParallax(id: string, data: Record<string, unknown>, actor: ActorSnapshot) {
  const entry = await PageParallaxModel.findById(id);
  if (!entry) throw new NotFoundError('Parallax image not found');
  // An update may send only one of heading / highlight, so re-check the pair
  // against what's stored.
  const heading = (data.heading as string | undefined) ?? entry.heading;
  const highlight = (data.highlight as string | undefined) ?? entry.highlight;
  if (highlight && !heading.includes(highlight)) {
    throw new ValidationError([{ field: 'highlight', code: 'VALIDATION_ERROR', message: 'Highlight text must be part of the heading' }]);
  }
  entry.set({ ...data, updatedBy: actor });
  return entry.save();
}

export async function deletePageParallax(id: string) {
  const entry = await PageParallaxModel.findByIdAndDelete(id);
  if (!entry) throw new NotFoundError('Parallax image not found');
}
