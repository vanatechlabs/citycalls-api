import { Types } from 'mongoose';
import { ActorSnapshot } from '../../../../lib/actor';
import { NotFoundError } from '../../../../lib/errors';
import { OurServiceModel } from '../home-page/our-services/ourServices.model';
import { CreateOurServiceInput, UpdateOurServiceInput } from '../home-page/our-services/ourServices.validation';
import { NavbarMenuModel } from '../navbar/navbarMenu.model';
import { NavbarServiceModel } from '../navbar/navbarService.model';
import { AllServiceCardModel } from './allServices.model';

const SORT = { sortOrder: 1, createdAt: 1 } as const;

// A card's path and category (Navbar List menu) follow its live link, so
// renaming or moving a link in Navbar List also updates the card.
async function withLiveLinks<T extends { navServiceId?: Types.ObjectId; path: string }>(cards: T[]) {
  const ids = cards.map((c) => c.navServiceId).filter(Boolean);
  const links = ids.length ? await NavbarServiceModel.find({ _id: { $in: ids } }).select('path menuId').lean() : [];
  const menus = links.length ? await NavbarMenuModel.find({ _id: { $in: links.map((l) => l.menuId) } }).select('name').lean() : [];
  const menuName = new Map(menus.map((m) => [m._id.toString(), m.name]));
  const linkById = new Map(links.map((l) => [l._id.toString(), l]));
  return cards.map((c) => {
    const link = c.navServiceId ? linkById.get(c.navServiceId.toString()) : undefined;
    return { ...c, path: link?.path || c.path, category: link ? menuName.get(link.menuId.toString()) ?? '' : '' };
  });
}

export async function listAdminCards() {
  const cards = await AllServiceCardModel.find().sort(SORT).select('-__v').lean();
  return withLiveLinks(cards);
}

// For the website (once it is decided where they show): active cards only.
export async function listPublicCards() {
  const cards = await AllServiceCardModel.find({ status: 'ACTIVE' })
    .sort(SORT)
    .select('navServiceId name path shortDescription image imageAlt priceText sortOrder')
    .lean();
  return (await withLiveLinks(cards)).map(({ navServiceId: _navServiceId, ...card }) => card);
}

export async function createCard(data: CreateOurServiceInput, actor: ActorSnapshot) {
  const created = await AllServiceCardModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Service card not found');
}

export async function updateCard(id: string, data: UpdateOurServiceInput, actor: ActorSnapshot) {
  assertId(id);
  const updated = await AllServiceCardModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Service card not found');
  return updated;
}

export async function deleteCard(id: string) {
  assertId(id);
  const deleted = await AllServiceCardModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Service card not found');
}

// "Add all from Navbar List": a card for every Navbar List service that has
// none yet, in navbar order. Description, price and image are copied from
// that service's home page (Our Services) card when it has one.
export async function importFromNavbar(actor: ActorSnapshot) {
  const [menus, services, existing, homeCards] = await Promise.all([
    NavbarMenuModel.find().sort({ sortOrder: 1, createdAt: 1 }).select('_id').lean(),
    NavbarServiceModel.find().sort({ sortOrder: 1, createdAt: 1 }).select('name path menuId').lean(),
    AllServiceCardModel.find().select('navServiceId path sortOrder').lean(),
    OurServiceModel.find().select('navServiceId path shortDescription image imageAlt priceText').lean(),
  ]);
  const menuOrder = new Map(menus.map((m, i) => [m._id.toString(), i]));
  const taken = new Set(existing.flatMap((c) => [c.navServiceId?.toString(), c.path]).filter(Boolean));
  let sortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), -1) + 1;

  const missing = services
    .filter((s) => !taken.has(s._id.toString()) && !taken.has(s.path))
    .sort((a, b) => (menuOrder.get(a.menuId.toString()) ?? 999) - (menuOrder.get(b.menuId.toString()) ?? 999));
  const docs = missing.map((s) => {
    const home = homeCards.find((c) => c.navServiceId?.toString() === s._id.toString() || c.path === s.path);
    return {
      navServiceId: s._id,
      name: s.name,
      path: s.path,
      shortDescription: home?.shortDescription ?? '',
      image: home?.image ?? '',
      imageAlt: home?.imageAlt || `${s.name} by CityCalls`,
      priceText: home?.priceText ?? '',
      sortOrder: sortOrder++,
      status: 'ACTIVE' as const,
      createdBy: actor,
      updatedBy: actor,
    };
  });
  if (docs.length) await AllServiceCardModel.insertMany(docs);
  return { created: docs.length };
}
