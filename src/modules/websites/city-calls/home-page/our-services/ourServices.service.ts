import { Types } from 'mongoose';
import { ActorSnapshot } from '../../../../../lib/actor';
import { NotFoundError } from '../../../../../lib/errors';
import { NavbarServiceModel } from '../../navbar/navbarService.model';
import {
  OUR_SERVICE_DEFAULTS, OUR_SERVICES_SECTION_DEFAULTS, OUR_SERVICES_SECTION_KEY, OurServiceModel, OurServicesSectionModel,
} from './ourServices.model';
import { CreateOurServiceInput, UpdateOurServiceInput, UpdateOurServicesSectionInput } from './ourServices.validation';

const SORT = { sortOrder: 1, createdAt: 1 } as const;

// First admin open creates the section and the website's current 12 cards
// (linked to their Navbar List links where one has the same path).
async function ensureSeeded() {
  const section = await OurServicesSectionModel.findOneAndUpdate(
    { key: OUR_SERVICES_SECTION_KEY },
    { $setOnInsert: { key: OUR_SERVICES_SECTION_KEY, ...OUR_SERVICES_SECTION_DEFAULTS, seeded: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const claimed = await OurServicesSectionModel.findOneAndUpdate(
    { _id: section._id, seeded: false },
    { $set: { seeded: true } },
    { new: true }
  );
  if (claimed && (await OurServiceModel.estimatedDocumentCount()) === 0) {
    const links = await NavbarServiceModel.find({ path: { $in: OUR_SERVICE_DEFAULTS.map((c) => c.path) } }).select('path').lean();
    const idByPath = new Map(links.map((l) => [l.path, l._id]));
    await OurServiceModel.insertMany(OUR_SERVICE_DEFAULTS.map((card) => ({ ...card, navServiceId: idByPath.get(card.path) })));
  }
}

// A card's website path follows its Navbar List link, so fixing a link's
// path in Navbar List also fixes the card.
async function withLivePaths<T extends { navServiceId?: Types.ObjectId; path: string }>(cards: T[]) {
  const ids = cards.map((c) => c.navServiceId).filter(Boolean);
  if (!ids.length) return cards;
  const links = await NavbarServiceModel.find({ _id: { $in: ids } }).select('path').lean();
  const pathById = new Map(links.map((l) => [l._id.toString(), l.path]));
  return cards.map((c) => ({ ...c, path: (c.navServiceId && pathById.get(c.navServiceId.toString())) || c.path }));
}

export async function getAdminOurServices() {
  await ensureSeeded();
  const [section, cards] = await Promise.all([
    OurServicesSectionModel.findOne({ key: OUR_SERVICES_SECTION_KEY }).select('-key -__v -seeded').lean(),
    OurServiceModel.find().sort(SORT).select('-__v').lean(),
  ]);
  return { section, services: await withLivePaths(cards) };
}

// Before the admin page is first opened, the website keeps its defaults.
export async function getPublicOurServices() {
  const section = await OurServicesSectionModel.findOne({ key: OUR_SERVICES_SECTION_KEY })
    .select('-_id -key -__v -updatedBy -createdAt -updatedAt')
    .lean();
  if (!section?.seeded) {
    return {
      section: OUR_SERVICES_SECTION_DEFAULTS,
      services: OUR_SERVICE_DEFAULTS.map(({ status: _status, ...card }, i) => ({ _id: `default-${i}`, ...card })),
    };
  }
  const cards = await OurServiceModel.find({ status: 'ACTIVE' })
    .sort(SORT)
    .select('navServiceId name path shortDescription image imageAlt priceText sortOrder')
    .lean();
  const publicSection: Partial<typeof section> = { ...section };
  delete publicSection.seeded;
  const services = (await withLivePaths(cards)).map(({ navServiceId: _navServiceId, ...card }) => card);
  return { section: publicSection, services };
}

export async function updateOurServicesSection(data: UpdateOurServicesSectionInput, actor: ActorSnapshot) {
  await ensureSeeded();
  return OurServicesSectionModel.findOneAndUpdate(
    { key: OUR_SERVICES_SECTION_KEY },
    { $set: { ...data, updatedBy: actor } },
    { new: true, runValidators: true }
  )
    .select('-key -__v -seeded')
    .lean();
}

export async function createOurService(data: CreateOurServiceInput, actor: ActorSnapshot) {
  const created = await OurServiceModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Service card not found');
}

export async function updateOurService(id: string, data: UpdateOurServiceInput, actor: ActorSnapshot) {
  assertId(id);
  const updated = await OurServiceModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Service card not found');
  return updated;
}

export async function deleteOurService(id: string) {
  assertId(id);
  const deleted = await OurServiceModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Service card not found');
}
