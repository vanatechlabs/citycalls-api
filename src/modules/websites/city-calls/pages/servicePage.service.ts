import { ConflictError, NotFoundError } from '../../../../lib/errors';
import { NavbarMenuModel } from '../navbar/navbarMenu.model';
import { NavbarServiceModel } from '../navbar/navbarService.model';
import { ServicePageModel } from './servicePage.model';

export async function listServicePageOptions() {
  const menus = await NavbarMenuModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  const services = await NavbarServiceModel.find({ menuId: { $in: menus.map((menu) => menu._id) } })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
  const pages = await ServicePageModel.find({ navServiceId: { $in: services.map((service) => service._id) } })
    .select('_id navServiceId slug status')
    .lean();
  const pageByService = new Map(pages.map((page) => [page.navServiceId.toString(), page]));

  return menus.map((menu) => ({
    id: menu._id.toString(),
    name: menu.name,
    slug: menu.slug,
    services: services
      .filter((service) => service.menuId.toString() === menu._id.toString())
      .map((service) => {
        const page = pageByService.get(service._id.toString());
        return {
          id: service._id.toString(),
          name: service.name,
          path: service.path,
          defaultSlug: service.path.split('/').filter(Boolean).pop() || service._id.toString(),
          status: service.status,
          page: page
            ? { id: page._id.toString(), slug: page.slug, status: page.status }
            : null,
        };
      }),
  }));
}

export async function getServicePageByNavService(navServiceId: string) {
  return ServicePageModel.findOne({ navServiceId });
}

export async function upsertServicePage(navServiceId: string, data: Record<string, unknown>) {
  const navService = await NavbarServiceModel.findById(navServiceId);
  if (!navService) throw new NotFoundError('Navbar service page option not found');

  const slug = String(data.slug);
  const conflictingPage = await ServicePageModel.findOne({ slug, navServiceId: { $ne: navServiceId } });
  if (conflictingPage) throw new ConflictError('A service page with this slug already exists', 'DUPLICATE_RECORD');

  const page = await ServicePageModel.findOneAndUpdate(
    { navServiceId },
    { ...data, navServiceId, menuId: navService.menuId },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const websitePath = `/services/${slug}`;
  if (navService.path !== websitePath) {
    navService.path = websitePath;
    await navService.save();
  }

  return page;
}

export async function getPublicServicePage(slug: string) {
  const page = await ServicePageModel.findOne({ slug, status: 'ACTIVE' }).lean();
  if (!page) throw new NotFoundError('Service page not found');

  const navService = await NavbarServiceModel.findById(page.navServiceId).select('name image status').lean();
  if (!navService || navService.status !== 'ACTIVE') throw new NotFoundError('Service page not found');

  return {
    ...page,
    id: page._id.toString(),
    serviceName: navService.name,
    serviceImage: navService.image ?? null,
  };
}
