import { PageBackgroundModel } from '../backgrounds/pageBackground.model';
import { NavbarMenuModel } from '../navbar/navbarMenu.model';
import { NavbarServiceModel } from '../navbar/navbarService.model';
import { ServicePageModel } from '../pages/servicePage.model';
import { SeoMetaModel } from '../seo/seoMeta.model';
import { STATIC_WEBSITE_PAGES } from '../seo/seoMeta.service';

export interface SitemapEntry {
  path: string;
  lastModified: Date;
}

// Every public page of the website: the fixed routes plus each active
// service link under an active Navbar List menu. nextfrontend's
// app/sitemap.ts turns this into /sitemap.xml, so a navlink added (or
// switched off) in admin shows up there without a redeploy.
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const [menus, services, servicePages, seoMetas, backgrounds] = await Promise.all([
    NavbarMenuModel.find({ status: 'ACTIVE' }).sort({ sortOrder: 1, createdAt: 1 }).select('_id').lean(),
    NavbarServiceModel.find({ status: 'ACTIVE' }).sort({ sortOrder: 1, createdAt: 1 }).select('path menuId updatedAt').lean(),
    ServicePageModel.find({ status: 'ACTIVE' }).select('navServiceId updatedAt').lean(),
    SeoMetaModel.find({ status: 'ACTIVE' }).select('pagePath updatedAt').lean(),
    PageBackgroundModel.find({ status: 'ACTIVE' }).select('pagePath updatedAt').lean(),
  ]);

  // A page counts as changed when its link, content, SEO or background was.
  const changedAt = new Map<string, Date>();
  const touch = (path: string, date: Date) => {
    const key = path.toLowerCase();
    const current = changedAt.get(key);
    if (!current || date > current) changedAt.set(key, date);
  };
  for (const meta of seoMetas) touch(meta.pagePath, meta.updatedAt);
  for (const background of backgrounds) touch(background.pagePath, background.updatedAt);

  // Menu by menu, in navbar order.
  const menuOrder = new Map(menus.map((m, index) => [m._id.toString(), index]));
  const liveServices = services
    .filter((s) => menuOrder.has(s.menuId.toString()))
    .sort((a, b) => menuOrder.get(a.menuId.toString())! - menuOrder.get(b.menuId.toString())!);
  const pageUpdatedAt = new Map(servicePages.map((p) => [p.navServiceId.toString(), p.updatedAt]));
  for (const service of liveServices) {
    touch(service.path, service.updatedAt);
    const contentUpdatedAt = pageUpdatedAt.get(service._id.toString());
    if (contentUpdatedAt) touch(service.path, contentUpdatedAt);
  }

  // Fixed routes with no admin edits yet still need a date.
  const fallbackDate = new Date('2026-01-01T00:00:00.000Z');
  const paths = [...STATIC_WEBSITE_PAGES.map((p) => p.path), ...liveServices.map((s) => s.path)];
  return [...new Set(paths.map((p) => p.toLowerCase()))].map((path) => ({
    path,
    lastModified: changedAt.get(path) ?? fallbackDate,
  }));
}
