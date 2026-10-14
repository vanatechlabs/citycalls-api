import { ServiceModel } from './catalog.model';
import { BranchModel } from '../organization/organization.model';
import { MasterModel } from '../config/master.model';
import { NotFoundError } from '../../lib/errors';
import { buildPaginationMeta } from '../../lib/apiResponse';
import { resolveVerticalCategoryIds } from '../../lib/verticals';

// Brands ride on the generic Masters engine (masterType: 'BRAND'), same as
// every other master list â€” this just gives the admin UI's brand-management
// screen a friendlier response shape than the raw generic /masters/BRAND one.
export async function listBrands() {
  const brands = await MasterModel.find({ masterType: 'BRAND' }).sort({ sortOrder: 1, label: 1 }).lean();
  return brands.map((b) => ({
    id: b._id.toString(),
    key: b.key,
    name: b.label,
    status: b.active ? 'Active' : 'Inactive',
  }));
}

interface ListParams {
  page: number;
  limit: number;
  active?: boolean;
  categoryId?: string;
  productTypeId?: string;
  q?: string;
  vertical?: string;
}

export async function listServices(params: ListParams) {
  const filter: Record<string, unknown> = {};
  if (params.active !== undefined) filter.active = params.active;
  if (params.categoryId && params.categoryId.trim()) {
    filter.categoryId = params.categoryId.trim();
  } else if (params.vertical) {
    filter.categoryId = { $in: await resolveVerticalCategoryIds(params.vertical) };
  }
  if (params.productTypeId) filter.applicableProductTypeIds = params.productTypeId;

  if (params.q && params.q.trim()) {
    const escaped = params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    ServiceModel.find(filter).skip(skip).limit(params.limit).sort({ name: 1 }),
    ServiceModel.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(params.page, params.limit, total) };
}

export async function getService(id: string) {
  const service = await ServiceModel.findById(id);
  if (!service) throw new NotFoundError('Service not found');
  return service;
}
export async function getServiceDiagnostics(id: string) {
  const service = await ServiceModel.findById(id)
    .populate('complaintTypeIds', 'key label')
    .populate('symptomIds', 'key label')
    .populate('defectIds', 'key label')
    .populate('solutionTypeIds', 'key label meta')
    .populate('applicableProductTypeIds', 'key label parentId');
  if (!service) throw new NotFoundError('Service not found');
  return {
    complaintTypes: service.complaintTypeIds,
    symptoms: service.symptomIds,
    defects: service.defectIds,
    solutionTypes: service.solutionTypeIds,
    productTypes: service.applicableProductTypeIds,
  };
}

export async function createService(data: Record<string, unknown>) {
  return ServiceModel.create(data);
}

export async function updateService(id: string, data: Record<string, unknown>) {
  const service = await ServiceModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!service) throw new NotFoundError('Service not found');
  return service;
}

// Moves many services to one category in a single call — the fix for a batch
// of services that were filed under the wrong category. Validates the target
// is a real SERVICE_CATEGORY master first so a typo'd id can't orphan them.
export async function bulkChangeCategory(ids: string[], categoryId: string) {
  const category = await MasterModel.findOne({ _id: categoryId, masterType: 'SERVICE_CATEGORY' }).select('_id');
  if (!category) throw new NotFoundError('Category not found');
  const result = await ServiceModel.updateMany({ _id: { $in: ids } }, { $set: { categoryId } });
  return { matched: result.matchedCount, modified: result.modifiedCount };
}

// Beauty & Salon and Help Now are plain book-and-go services with no
// complaint/symptom/defect/solution chain, but older data still has them
// linked. One call clears those links for every service in those categories
// (matched by category key, or the BEAUTY vertical) - safe to run repeatedly.
const CATEGORY_KEYS_WITHOUT_DIAGNOSTICS = ['BEAUTY_SALOON', 'HELP_NOW'];

export async function clearUnusedDiagnosticLinks() {
  const categories = await MasterModel.find({
    masterType: 'SERVICE_CATEGORY',
    $or: [{ key: { $in: CATEGORY_KEYS_WITHOUT_DIAGNOSTICS } }, { 'meta.vertical': 'BEAUTY' }],
  }).select('_id');
  const result = await ServiceModel.updateMany(
    {
      categoryId: { $in: categories.map((c) => c._id) },
      $or: [
        { complaintTypeIds: { $not: { $size: 0 } } },
        { symptomIds: { $not: { $size: 0 } } },
        { defectIds: { $not: { $size: 0 } } },
        { solutionTypeIds: { $not: { $size: 0 } } },
      ],
    },
    { $set: { complaintTypeIds: [], symptomIds: [], defectIds: [], solutionTypeIds: [] } }
  );
  return { categories: categories.length, cleared: result.modifiedCount };
}

export async function deleteService(id: string) {
  const service = await ServiceModel.findByIdAndDelete(id);
  if (!service) throw new NotFoundError('Service not found');
}

// Per docs/06-complete-workflow-document.md Stage 1: check pin-code coverage
// before allowing the customer app to progress past service selection.
export async function checkCoverage(serviceId: string, pinCode: string) {
  const service = await ServiceModel.findById(serviceId);
  if (!service || !service.active) {
    return { serviceable: false, reason: 'SERVICE_NOT_ACTIVE' };
  }

  const branch = await BranchModel.findOne({
    active: true,
    'coverage.pinCodes': pinCode,
    serviceCategoryIds: service.categoryId,
  }).select('_id name code');

  if (!branch) {
    return { serviceable: false, reason: 'PIN_CODE_NOT_SERVICEABLE' };
  }

  return { serviceable: true, branchId: branch._id, branchName: branch.name };
}
