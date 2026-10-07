import { MasterModel, MasterType } from './master.model';
import { Model } from 'mongoose';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { logActivity } from '../../lib/auditLog';
import { AccessTokenPayload } from '../../lib/jwt';
import { ServiceModel } from '../catalog/catalog.model';
import { CustomerProductModel } from '../customers/customers.model';
import { VendorModel } from '../vendors/vendors.model';
import { BranchModel } from '../organization/organization.model';
import { EstimateModel } from '../finance/estimates.model';
import { ProformaInvoiceModel } from '../finance/proformaInvoices.model';
import { InvoiceModel } from '../finance/invoices.model';
import { ServiceVisitModel } from '../field-execution/serviceVisits.model';
import { FileModel } from '../files/files.model';
import { deleteFile as deleteStoredFile } from '../files/files.service';
import { buildPaginationMeta } from '../../lib/apiResponse';

interface ListParams {
  page: number;
  limit: number;
  active?: boolean;
  parentId?: string;
}

export async function listMasters(masterType: MasterType, params: ListParams) {
  const filter: Record<string, unknown> = { masterType };
  if (params.active !== undefined) filter.active = params.active;
  if (params.parentId) filter.parentId = params.parentId;

  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    MasterModel.find(filter).sort({ sortOrder: 1, label: 1 }).skip(skip).limit(params.limit),
    MasterModel.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(params.page, params.limit, total) };
}

// Keys are unique per master type (master.model.ts index). Checked up front
// so the admin gets a clear 409 instead of a raw duplicate-key 500.
async function assertKeyAvailable(masterType: MasterType, key: unknown, excludeId?: string) {
  if (typeof key !== 'string') return;
  const existing = await MasterModel.findOne({
    masterType,
    key,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (existing) {
    throw new ConflictError(`System key "${key}" is already used by "${existing.label}"`, 'DUPLICATE_KEY');
  }
}

export async function createMaster(masterType: MasterType, data: Record<string, unknown>) {
  await assertKeyAvailable(masterType, data.key);
  return MasterModel.create({ ...data, masterType });
}

export async function updateMaster(masterType: MasterType, id: string, data: Record<string, unknown>) {
  await assertKeyAvailable(masterType, data.key, id);
  const master = await MasterModel.findOneAndUpdate({ _id: id, masterType }, data, {
    new: true,
    runValidators: true,
  });
  if (!master) throw new NotFoundError('Master entry not found');
  return master;
}

// Every field across the app that stores a Master _id. A master that is
// still referenced from any of these can't be hard-deleted — that would leave
// dangling ids behind (e.g. a Service whose category no longer exists). The
// admin is told what is using it so they can reassign or deactivate instead.
const MASTER_REFERENCES: { model: Model<any>; field: string; label: string }[] = [
  { model: MasterModel, field: 'parentId', label: 'child master entries' },
  { model: ServiceModel, field: 'categoryId', label: 'services (category)' },
  { model: ServiceModel, field: 'subCategoryId', label: 'services (sub-category)' },
  { model: ServiceModel, field: 'applicableBrandIds', label: 'services (brand)' },
  { model: ServiceModel, field: 'applicableProductTypeIds', label: 'services (product type)' },
  { model: ServiceModel, field: 'complaintTypeIds', label: 'services (complaint type)' },
  { model: ServiceModel, field: 'symptomIds', label: 'services (symptom)' },
  { model: ServiceModel, field: 'defectIds', label: 'services (defect)' },
  { model: ServiceModel, field: 'solutionTypeIds', label: 'services (solution type)' },
  { model: ServiceModel, field: 'taxRateId', label: 'services (tax rate)' },
  { model: CustomerProductModel, field: 'brandId', label: 'customer products (brand)' },
  { model: CustomerProductModel, field: 'productTypeId', label: 'customer products (product type)' },
  { model: VendorModel, field: 'brandsHandled', label: 'vendors (brand)' },
  { model: VendorModel, field: 'productTypesHandled', label: 'vendors (product type)' },
  { model: BranchModel, field: 'serviceCategoryIds', label: 'branches' },
  { model: EstimateModel, field: 'items.partId', label: 'estimates (part)' },
  { model: EstimateModel, field: 'items.taxRateId', label: 'estimates (tax rate)' },
  { model: ProformaInvoiceModel, field: 'items.partId', label: 'proforma invoices (part)' },
  { model: ProformaInvoiceModel, field: 'items.taxRateId', label: 'proforma invoices (tax rate)' },
  { model: InvoiceModel, field: 'items.partId', label: 'invoices (part)' },
  { model: InvoiceModel, field: 'items.taxRateId', label: 'invoices (tax rate)' },
  { model: ServiceVisitModel, field: 'parts.partId', label: 'service visits (part)' },
];

// Permanently removes a master entry (and its attached images). Refuses with
// 409 while anything still references it — deactivating via PATCH
// { active: false } is the way to retire an entry that is in use.
export async function deleteMaster(masterType: MasterType, id: string, actor: AccessTokenPayload) {
  const master = await MasterModel.findOne({ _id: id, masterType });
  if (!master) throw new NotFoundError('Master entry not found');

  const usage = await Promise.all(
    MASTER_REFERENCES.map(async (ref) => ({
      label: ref.label,
      count: await ref.model.countDocuments({ [ref.field]: master._id }),
    }))
  );
  const inUse = usage.filter((u) => u.count > 0);
  if (inUse.length > 0) {
    const where = inUse.map((u) => `${u.count} ${u.label}`).join(', ');
    throw new ConflictError(
      `"${master.label}" is in use by ${where}. Remove or reassign those first, or set it to Inactive instead.`,
      'MASTER_IN_USE'
    );
  }

  const files = await FileModel.find({ entityType: 'MASTER', entityId: master._id, deletedAt: { $exists: false } });
  for (const file of files) {
    await deleteStoredFile(file.id, actor);
  }

  await MasterModel.deleteOne({ _id: master._id });

  await logActivity({
    entityType: 'MASTER',
    entityId: master.id,
    user: actor,
    action: 'MASTER_DELETED',
    module: 'config',
    oldValue: { masterType: master.masterType, key: master.key, label: master.label },
  });

  return master;
}
