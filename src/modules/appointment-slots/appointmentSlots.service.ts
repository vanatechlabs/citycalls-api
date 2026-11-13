import { ClientSession } from 'mongoose';
import { indiaDay, indiaDayRange } from '../../lib/indiaDate';
import { MasterModel } from '../config/master.model';
import { BranchModel } from '../organization/organization.model';
import { ServiceRequestModel } from '../service-requests/serviceRequests.model';
import { NotFoundError, ConflictError } from '../../lib/errors';

// Per docs/manish/08-customer-app-functional-plan.md §2's
// GET /appointment-slots?branchId=&date= — per-branch capacity (not
// per-technician, no vendor app/technician-scheduling system exists yet),
// checked against the shared APPOINTMENT_SLOT master list.

const dayRange = indiaDayRange;

function branchOpenInIndia(date: Date, branch: { holidays: Date[]; workingHours: { day: number; closed?: boolean; openTime?: string; closeTime?: string }[] }) {
  const day = indiaDay(date);
  if (branch.holidays.some(holiday => indiaDay(holiday) === day)) return false;
  if (!branch.workingHours.length) return true;
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const rule = branch.workingHours.find(item => item.day === weekday);
  return Boolean(rule && !rule.closed && rule.openTime && rule.closeTime);
}

function slotHasStarted(date: Date, startTime?: string) {
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) return false;
  return new Date(`${indiaDay(date)}T${startTime}:00+05:30`).getTime() <= Date.now();
}

export interface SlotAvailability {
  key: string;
  label: string;
  startTime?: string;
  endTime?: string;
  capacity: number;
  booked: number;
  remaining: number;
  available: boolean;
}

export async function getAppointmentSlots(branchId: string, date: Date): Promise<{ dayClosed: boolean; slots: SlotAvailability[] }> {
  const branch = await BranchModel.findById(branchId);
  if (!branch || !branch.active) throw new NotFoundError('Branch not found');

  if (!branchOpenInIndia(date, branch)) {
    return { dayClosed: true, slots: [] };
  }

  const masters = await MasterModel.find({ masterType: 'APPOINTMENT_SLOT', active: true }).sort({ sortOrder: 1 });
  const { start, end } = dayRange(date);

  const counts = await ServiceRequestModel.aggregate<{ _id: string; count: number }>([
    { $match: { branchId: branch._id, scheduledDate: { $gte: start, $lt: end }, scheduledSlot: { $ne: null }, status: { $ne: 'CANCELLED' } } },
    { $group: { _id: '$scheduledSlot', count: { $sum: 1 } } },
  ]);
  const bookedByLabel = new Map(counts.map((c) => [c._id, c.count]));

  const capacity = branch.dailyCapacityPerSlot;
  const slots: SlotAvailability[] = masters.map((m) => {
    const booked = bookedByLabel.get(m.label) ?? 0;
    const remaining = Math.max(0, capacity - booked);
    return {
      key: m.key,
      label: m.label,
      startTime: (m.meta as { startTime?: string } | undefined)?.startTime,
      endTime: (m.meta as { endTime?: string } | undefined)?.endTime,
      capacity,
      booked,
      remaining,
      available: remaining > 0 && !slotHasStarted(date, (m.meta as { startTime?: string } | undefined)?.startTime),
    };
  });

  return { dayClosed: false, slots };
}

// Re-checked server-side at write time (service-request creation and
// reschedule) — the listing above is advisory for the client's UI, this is
// the actual enforcement point that closes the race between two customers
// booking the same last-open slot.
export async function assertSlotAvailable(branchId: string, date: Date, slotLabel: string, excludeId?: string, session?: ClientSession): Promise<void> {
  const branch = session ? await BranchModel.findOneAndUpdate({ _id: branchId, active: true }, { $inc: { schedulingVersion: 1 } }, { new: true, session }) : await BranchModel.findById(branchId);
  if (!branch || !branch.active) throw new NotFoundError('Active branch not found');
  if (indiaDay(date) < indiaDay(new Date())) throw new ConflictError('Choose today or a future date', 'PAST_DATE');
  const master = await MasterModel.findOne({ masterType: 'APPOINTMENT_SLOT', active: true, label: slotLabel }).session(session ?? null);
  if (!master) throw new ConflictError('Choose an available appointment slot', 'INVALID_SLOT');
  if (slotHasStarted(date, (master.meta as { startTime?: string }).startTime)) throw new ConflictError('This time slot has already started', 'SLOT_PAST');

  if (!branchOpenInIndia(date, branch)) {
    throw new ConflictError('This branch is closed on the selected date', 'SLOT_DAY_CLOSED');
  }

  const { start, end } = dayRange(date);
  const booked = await ServiceRequestModel.countDocuments({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    branchId: branch._id,
    scheduledDate: { $gte: start, $lt: end },
    scheduledSlot: slotLabel,
    status: { $ne: 'CANCELLED' },
  }).session(session ?? null);

  if (booked >= branch.dailyCapacityPerSlot) {
    throw new ConflictError('This time slot is fully booked, please pick another', 'SLOT_FULL');
  }
}
