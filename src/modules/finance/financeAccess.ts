import { AccessTokenPayload } from '../../lib/jwt';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { getDataScope } from '../../lib/permissionCache';
import { isCustomerRole, resolveOwnCustomerId } from '../../lib/ownCustomerScope';
import { ServiceRequestModel } from '../service-requests/serviceRequests.model';

export async function financeFilter(actor: AccessTokenPayload): Promise<Record<string, unknown>> {
  if (isCustomerRole(actor.role)) return { customerId: await resolveOwnCustomerId(actor.sub) ?? null };
  if (['EMPLOYEE', 'TECHNICIAN', 'VENDOR_TECHNICIAN', 'VENDOR_OWNER', 'VENDOR_MANAGER'].includes(actor.role)) {
    const vendor = actor.role.startsWith('VENDOR_');
    const jobs = await ServiceRequestModel.find({
      assigneeType: vendor ? 'VENDOR' : 'EMPLOYEE',
      assigneeId: (vendor ? actor.vendorId : actor.employeeId) ?? null,
      ...(actor.role === 'VENDOR_TECHNICIAN' ? { vendorTechnicianUserId: actor.sub } : {}),
    }).select('_id');
    return { serviceRequestId: { $in: jobs.map(job => job._id) } };
  }
  const scope = getDataScope(actor.role, 'finance', 'view');
  if (scope === 'BRANCH') return { branchId: actor.branchId ?? null };
  if (scope !== 'ALL') throw new ForbiddenError('Finance scope is not supported for this account');
  return {};
}

export async function assertFinanceAccess(record: { customerId?: unknown; branchId?: unknown; serviceRequestId?: unknown }, actor?: AccessTokenPayload): Promise<void> {
  if (!actor) throw new ForbiddenError('Authentication required');
  const filter = await financeFilter(actor);
  if ('customerId' in filter && (!filter.customerId || record.customerId?.toString() !== filter.customerId.toString())) throw new NotFoundError('Financial document not found');
  if ('branchId' in filter && (!filter.branchId || record.branchId?.toString() !== filter.branchId.toString())) throw new NotFoundError('Financial document not found');
  if ('serviceRequestId' in filter) {
    const ids = (filter.serviceRequestId as { $in: unknown[] }).$in;
    if (!record.serviceRequestId || !ids.some(id => id?.toString() === record.serviceRequestId?.toString())) throw new NotFoundError('Financial document not found');
  }
}

export function assertFinanceStaff(actor: AccessTokenPayload): void {
  if (isCustomerRole(actor.role)) throw new ForbiddenError('Customers cannot record collections or author financial documents');
}
