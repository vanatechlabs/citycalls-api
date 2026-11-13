import { ServiceRequestModel } from './serviceRequests.model';
import { VendorTechnicianModel } from '../vendors/vendors.model';
import { UserModel } from '../users/users.model';
import { AccessTokenPayload } from '../../lib/jwt';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors';
import { logActivity } from '../../lib/auditLog';
import { trigger } from '../../lib/notifications';

export async function allocateVendorTechnician(jobId: string, technicianUserId: string | null, actor: AccessTokenPayload, reason?: string) {
  const job = await ServiceRequestModel.findById(jobId);
  if (!job || job.assigneeType !== 'VENDOR' || !job.assigneeId) throw new NotFoundError('Vendor job not found');
  const privileged = ['ADMIN', 'SUPER_ADMIN'].includes(actor.role);
  if (!privileged && (!['VENDOR_OWNER', 'VENDOR_MANAGER'].includes(actor.role) || actor.vendorId !== job.assigneeId.toString())) throw new ForbiddenError('Only this vendor’s owner/manager can allocate the job');
  if (['SERVICE_COMPLETED', 'CUSTOMER_CONFIRMATION_PENDING', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID', 'CLOSED', 'CANCELLED'].includes(job.status)) throw new ConflictError('Completed jobs cannot be reallocated', 'JOB_NOT_ALLOCATABLE');
  if (job.vendorTechnicianUserId && !reason?.trim() && ['TECHNICIAN_EN_ROUTE', 'TECHNICIAN_ARRIVED', 'INSPECTION_STARTED', 'WORK_STARTED', 'WORK_IN_PROGRESS'].includes(job.status)) throw new ConflictError('Give a reason before changing a technician on an active visit', 'REASSIGN_REASON_REQUIRED');
  if (technicianUserId) {
    const [membership, user] = await Promise.all([
      VendorTechnicianModel.exists({ userId: technicianUserId, vendorId: job.assigneeId, active: true }),
      UserModel.exists({ _id: technicianUserId, vendorId: job.assigneeId, role: 'VENDOR_TECHNICIAN', status: 'ACTIVE' }),
    ]);
    if (!membership || !user) throw new ConflictError('Choose an active technician belonging to this vendor', 'INVALID_TECHNICIAN');
  }
  const previous = job.vendorTechnicianUserId;
  job.vendorTechnicianUserId = technicianUserId as never;
  await job.save();
  await logActivity({ entityType: 'SERVICE_REQUEST', entityId: jobId, user: actor, action: 'TECHNICIAN_ALLOCATED', module: 'service-requests', oldValue: { technicianUserId: previous }, newValue: { technicianUserId }, reason });
  if (technicianUserId) await trigger('SERVICE_REQUEST_ASSIGNED', { recipient: { userId: technicianUserId }, variables: { serviceRequestId: jobId } });
  return job;
}
