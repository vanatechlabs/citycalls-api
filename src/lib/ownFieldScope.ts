import { Types } from 'mongoose';
import { ServiceRequestModel } from '../modules/service-requests/serviceRequests.model';
import { AccessTokenPayload } from './jwt';
import { NotFoundError } from './errors';

// OWN scope for field roles on records that hang off a Service Request
// (estimates, proforma invoices, invoices, payments): "records for jobs
// assigned to me". Mirrors serviceRequests.service.ts's listServiceRequests /
// assertOwnServiceRequestAccess — employees own jobs assigned to their
// Employee record; vendor staff own jobs assigned to their Vendor company
// (there's no per-technician sub-assignment for vendor jobs).
//
// Before this, OWN scope on finance was only enforced for customers, so an
// EMPLOYEE/TECHNICIAN/VENDOR_TECHNICIAN could list or open any company's
// estimates and invoices.
const EMPLOYEE_ROLES = ['EMPLOYEE', 'TECHNICIAN'];
const VENDOR_ROLES = ['VENDOR_OWNER', 'VENDOR_MANAGER', 'VENDOR_TECHNICIAN'];

export function isFieldRole(role: string): boolean {
  return EMPLOYEE_ROLES.includes(role) || VENDOR_ROLES.includes(role);
}

function ownAssigneeFilter(user: AccessTokenPayload): { assigneeType: string; assigneeId: string | null } {
  if (EMPLOYEE_ROLES.includes(user.role)) {
    return { assigneeType: 'EMPLOYEE', assigneeId: user.employeeId ?? null };
  }
  return { assigneeType: 'VENDOR', assigneeId: user.vendorId ?? null };
}

function appliesTo(scope: string | undefined, user: AccessTokenPayload | undefined): user is AccessTokenPayload {
  return scope === 'OWN' && !!user && isFieldRole(user.role);
}

/** Ids of the Service Requests an OWN-scoped field user is assigned to. */
export async function ownServiceRequestIds(user: AccessTokenPayload): Promise<Types.ObjectId[]> {
  const filter = ownAssigneeFilter(user);
  if (!filter.assigneeId) return [];
  return ServiceRequestModel.find(filter).distinct('_id');
}

/**
 * Narrows a list query's [filter] to the caller's own jobs. A requested
 * serviceRequestId that isn't theirs simply yields no results.
 */
export async function restrictToOwnJobs(
  filter: Record<string, unknown>,
  scope: string | undefined,
  user: AccessTokenPayload | undefined,
  requestedServiceRequestId?: string
): Promise<void> {
  if (!appliesTo(scope, user)) return;
  let ids = await ownServiceRequestIds(user);
  if (requestedServiceRequestId) {
    ids = ids.filter((id) => id.toString() === requestedServiceRequestId);
  }
  filter.serviceRequestId = { $in: ids };
}

/**
 * Throws 404 (not 403 — don't confirm the id exists) unless the record's
 * Service Request is assigned to the OWN-scoped field caller. No-op for
 * everyone else.
 */
export async function assertOwnFieldRecord(
  serviceRequestId: unknown,
  scope: string | undefined,
  user: AccessTokenPayload | undefined
): Promise<void> {
  if (!appliesTo(scope, user)) return;
  const id = (serviceRequestId as { toString(): string } | undefined | null)?.toString();
  if (!id) throw new NotFoundError('Record not found');
  const owned = await ServiceRequestModel.exists({ _id: id, ...ownAssigneeFilter(user) });
  if (!owned) throw new NotFoundError('Record not found');
}
