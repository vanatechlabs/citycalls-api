import { Types } from 'mongoose';
import { ActorSnapshot } from '../../../../../lib/actor';
import { NotFoundError } from '../../../../../lib/errors';
import {
  PACKAGE_DEFAULTS, PACKAGES_SECTION_DEFAULTS, PACKAGES_SECTION_KEY, PackagesSectionModel, PopularPackageModel,
} from './popularPackages.model';
import { CreatePackageInput, UpdatePackageInput, UpdatePackagesSectionInput } from './popularPackages.validation';

const SORT = { sortOrder: 1, createdAt: 1 } as const;

// First admin open creates the section and the website's current packages,
// so the admin page starts filled in. Runs once (tracked by `seeded`).
async function ensureSeeded() {
  const section = await PackagesSectionModel.findOneAndUpdate(
    { key: PACKAGES_SECTION_KEY },
    { $setOnInsert: { key: PACKAGES_SECTION_KEY, ...PACKAGES_SECTION_DEFAULTS, seeded: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  // Claim the seeding atomically so two first opens can't both insert.
  const claimed = await PackagesSectionModel.findOneAndUpdate(
    { _id: section._id, seeded: false },
    { $set: { seeded: true } },
    { new: true }
  );
  if (claimed && (await PopularPackageModel.estimatedDocumentCount()) === 0) {
    await PopularPackageModel.insertMany(PACKAGE_DEFAULTS.map((pkg) => ({ ...pkg })));
  }
  return claimed ?? section;
}

export async function getAdminPopularPackages() {
  await ensureSeeded();
  const [section, packages] = await Promise.all([
    PackagesSectionModel.findOne({ key: PACKAGES_SECTION_KEY }).select('-key -__v -seeded').lean(),
    PopularPackageModel.find().sort(SORT).select('-__v').lean(),
  ]);
  return { section, packages };
}

// Before the admin page is first opened, the website keeps showing defaults.
export async function getPublicPopularPackages() {
  const section = await PackagesSectionModel.findOne({ key: PACKAGES_SECTION_KEY })
    .select('-_id -key -__v -updatedBy -createdAt -updatedAt')
    .lean();
  if (!section?.seeded) {
    return {
      section: PACKAGES_SECTION_DEFAULTS,
      packages: PACKAGE_DEFAULTS.map((pkg, i) => ({ _id: `default-${i}`, ...pkg })),
    };
  }
  const packages = await PopularPackageModel.find({ status: 'ACTIVE' })
    .sort(SORT)
    .select('name duration price image imageAlt featured sortOrder')
    .lean();
  const publicSection: Partial<typeof section> = { ...section };
  delete publicSection.seeded;
  return { section: publicSection, packages };
}

export async function updatePackagesSection(data: UpdatePackagesSectionInput, actor: ActorSnapshot) {
  await ensureSeeded();
  return PackagesSectionModel.findOneAndUpdate(
    { key: PACKAGES_SECTION_KEY },
    { $set: { ...data, updatedBy: actor } },
    { new: true, runValidators: true }
  )
    .select('-key -__v -seeded')
    .lean();
}

export async function createPackage(data: CreatePackageInput, actor: ActorSnapshot) {
  const created = await PopularPackageModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Package not found');
}

export async function updatePackage(id: string, data: UpdatePackageInput, actor: ActorSnapshot) {
  assertId(id);
  const updated = await PopularPackageModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Package not found');
  return updated;
}

export async function deletePackage(id: string) {
  assertId(id);
  const deleted = await PopularPackageModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Package not found');
}
