import { ActorSnapshot } from '../../../../lib/actor';
import { ConflictError, NotFoundError } from '../../../../lib/errors';
import { NavbarMenuModel } from '../navbar/navbarMenu.model';
import { NavbarServiceModel } from '../navbar/navbarService.model';
import { SeoMetaModel, SeoMetaStatus } from './seoMeta.model';

// nextfrontend's fixed routes (src/app/(site)/*). Service pages come from
// Navbar List below, so a new navlink is SEO-able as soon as it's added.
export const STATIC_WEBSITE_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About Us' },
  { path: '/blogs', name: 'Blogs' },
  { path: '/contact', name: 'Contact Us' },
];

export interface SeoPageOption {
  path: string;
  name: string;
  // Navlink or menu switched off in Navbar List (page may not be linked).
  inactive?: boolean;
  // Set when this page already has an SEO entry.
  seoMetaId?: string;
}

export interface SeoPageGroup {
  group: string;
  pages: SeoPageOption[];
}

// Every page SEO can be written for, grouped for the admin dropdown:
// "Website Pages", then one group per Navbar List menu.
export async function listSeoPageOptions(): Promise<SeoPageGroup[]> {
  const [menus, services, metas] = await Promise.all([
    NavbarMenuModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    NavbarServiceModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    SeoMetaModel.find().select('pagePath').lean(),
  ]);
  const metaIdByPath = new Map(metas.map((m) => [m.pagePath, m._id.toString()]));
  const withMeta = (page: Omit<SeoPageOption, 'seoMetaId'>): SeoPageOption => ({
    ...page,
    seoMetaId: metaIdByPath.get(page.path.toLowerCase()),
  });

  const groups: SeoPageGroup[] = [{ group: 'Website Pages', pages: STATIC_WEBSITE_PAGES.map(withMeta) }];
  for (const menu of menus) {
    const pages = services
      .filter((s) => s.menuId.toString() === menu._id.toString())
      .map((s) => withMeta({ path: s.path, name: s.name, inactive: menu.status !== 'ACTIVE' || s.status !== 'ACTIVE' }));
    if (pages.length > 0) groups.push({ group: menu.name, pages });
  }
  return groups;
}

// Display name for a path, for the Meta List ("AC Service", "Home"...).
async function pageNameLookup() {
  const services = await NavbarServiceModel.find().select('path name').lean();
  const names = new Map<string, string>([
    ...STATIC_WEBSITE_PAGES.map((p) => [p.path, p.name] as [string, string]),
    ...services.map((s) => [s.path.toLowerCase(), s.name] as [string, string]),
  ]);
  return (path: string) => names.get(path) ?? path;
}

interface ListSeoMetaParams {
  q?: string;
  status?: SeoMetaStatus;
}

export async function listSeoMeta(params: ListSeoMetaParams) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;

  const [items, nameOf] = await Promise.all([
    SeoMetaModel.find(filter).sort({ updatedAt: -1 }).lean(),
    pageNameLookup(),
  ]);
  const rows = items.map((item) => ({ ...item, pageName: nameOf(item.pagePath) }));

  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter((r) => [r.pageName, r.pagePath, r.metaTitle ?? ''].some((v) => v.toLowerCase().includes(q)));
}

export async function getSeoMeta(id: string) {
  const meta = await SeoMetaModel.findById(id).lean();
  if (!meta) throw new NotFoundError('SEO entry not found');
  const nameOf = await pageNameLookup();
  return { ...meta, pageName: nameOf(meta.pagePath) };
}

export async function getPublicSeoMeta(path: string) {
  return SeoMetaModel.findOne({ pagePath: path.toLowerCase(), status: 'ACTIVE' })
    .select('-createdBy -updatedBy -status -__v')
    .lean();
}

export async function createSeoMeta(data: Record<string, unknown> & { pagePath: string }, actor: ActorSnapshot) {
  const exists = await SeoMetaModel.exists({ pagePath: data.pagePath.toLowerCase() });
  if (exists) throw new ConflictError('This page already has SEO — edit it from Meta List', 'SEO_META_EXISTS');
  return SeoMetaModel.create({ ...data, createdBy: actor, updatedBy: actor });
}

export async function updateSeoMeta(id: string, data: Record<string, unknown>, actor: ActorSnapshot) {
  const meta = await SeoMetaModel.findByIdAndUpdate(id, { ...data, updatedBy: actor }, { new: true, runValidators: true });
  if (!meta) throw new NotFoundError('SEO entry not found');
  return meta;
}

export async function deleteSeoMeta(id: string) {
  const meta = await SeoMetaModel.findByIdAndDelete(id);
  if (!meta) throw new NotFoundError('SEO entry not found');
}
