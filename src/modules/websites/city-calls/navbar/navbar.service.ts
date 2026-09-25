import { ConflictError, NotFoundError } from '../../../../lib/errors';
import { NavbarMenuModel } from './navbarMenu.model';
import { NavbarServiceModel } from './navbarService.model';

// ── Menus ──────────────────────────────────────────────────────────────────

export async function listNavbarMenus() {
  return NavbarMenuModel.find().sort({ sortOrder: 1, createdAt: 1 });
}

export async function getNavbarMenu(id: string) {
  const menu = await NavbarMenuModel.findById(id);
  if (!menu) throw new NotFoundError('Navbar menu not found');
  return menu;
}

export async function createNavbarMenu(data: Record<string, unknown>) {
  const existing = await NavbarMenuModel.findOne({ slug: data.slug });
  if (existing) throw new ConflictError('A navbar menu with this slug already exists', 'DUPLICATE_RECORD');
  return NavbarMenuModel.create(data);
}

export async function updateNavbarMenu(id: string, data: Record<string, unknown>) {
  if (typeof data.slug === 'string') {
    const existing = await NavbarMenuModel.findOne({ slug: data.slug, _id: { $ne: id } });
    if (existing) throw new ConflictError('A navbar menu with this slug already exists', 'DUPLICATE_RECORD');
  }
  const menu = await NavbarMenuModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!menu) throw new NotFoundError('Navbar menu not found');
  return menu;
}

export async function deleteNavbarMenu(id: string) {
  const menu = await NavbarMenuModel.findByIdAndDelete(id);
  if (!menu) throw new NotFoundError('Navbar menu not found');
  await NavbarServiceModel.deleteMany({ menuId: id });
}

// ── Services (per-menu navlinks) ─────────────────────────────────────────

export async function listNavbarServices(menuId: string) {
  return NavbarServiceModel.find({ menuId }).sort({ sortOrder: 1, createdAt: 1 });
}

export async function getNavbarService(id: string) {
  const service = await NavbarServiceModel.findById(id);
  if (!service) throw new NotFoundError('Navlink not found');
  return service;
}

export async function createNavbarService(data: Record<string, unknown>) {
  const menu = await NavbarMenuModel.findById(data.menuId);
  if (!menu) throw new NotFoundError('Navbar menu not found');
  return NavbarServiceModel.create(data);
}

export async function updateNavbarService(id: string, data: Record<string, unknown>) {
  const service = await NavbarServiceModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!service) throw new NotFoundError('Navlink not found');
  return service;
}

export async function deleteNavbarService(id: string) {
  const service = await NavbarServiceModel.findByIdAndDelete(id);
  if (!service) throw new NotFoundError('Navlink not found');
}

// ── Public (website navbar) ──────────────────────────────────────────────

export async function listPublicNavbarMenus() {
  const menus = await NavbarMenuModel.find({ status: 'ACTIVE' }).sort({ sortOrder: 1 }).lean();
  const services = await NavbarServiceModel.find({
    menuId: { $in: menus.map((m) => m._id) },
    status: 'ACTIVE',
  })
    .sort({ sortOrder: 1 })
    .lean();

  const servicesByMenu = new Map<string, typeof services>();
  for (const service of services) {
    const key = service.menuId.toString();
    const list = servicesByMenu.get(key) ?? [];
    list.push(service);
    servicesByMenu.set(key, list);
  }

  return menus.map((menu) => ({
    id: menu._id.toString(),
    name: menu.name,
    slug: menu.slug,
    services: (servicesByMenu.get(menu._id.toString()) ?? []).map((s) => ({
      id: s._id.toString(),
      name: s.name,
      image: s.image ?? null,
      path: s.path,
    })),
  }));
}
