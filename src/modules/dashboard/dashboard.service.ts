import { Types } from 'mongoose';
import { CallModel } from '../calls/calls.model';
import { LeadModel } from '../leads/leads.model';
import { ServiceRequestModel } from '../service-requests/serviceRequests.model';
import { InvoiceModel } from '../finance/invoices.model';
import { DataScope } from '../users/users.types';
import { AccessTokenPayload } from '../../lib/jwt';

export interface RangeStatsParams {
  startDate?: Date;
  endDate?: Date;
}

interface RangeCounts {
  calls: number;
  leads: number;
  serviceRequests: number;
  revenue: number;
  from: Date;
  to: Date;
}

// Same {scope, user} -> $match prefix as reports.service's branchMatch — a
// BRANCH-scoped caller is pinned to their own branch, ALL scope sees everything.
function branchMatch(scope: DataScope, user: AccessTokenPayload): Record<string, unknown> {
  if (scope === 'BRANCH') {
    return user.branchId ? { branchId: new Types.ObjectId(user.branchId) } : {};
  }
  return {};
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Monday-start week, matching the ISO week convention used elsewhere in the
// admin's date pickers.
function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diffFromMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffFromMonday);
  return d;
}

async function countsForRange(scope: DataScope, user: AccessTokenPayload, from: Date, to: Date): Promise<RangeCounts> {
  const match = { ...branchMatch(scope, user), createdAt: { $gte: from, $lte: to } };

  const [calls, leads, serviceRequests, revenueAgg] = await Promise.all([
    CallModel.countDocuments(match),
    LeadModel.countDocuments(match),
    ServiceRequestModel.countDocuments(match),
    InvoiceModel.aggregate([{ $match: match }, { $group: { _id: null, collected: { $sum: '$amountPaid' } } }]),
  ]);

  return { calls, leads, serviceRequests, revenue: revenueAgg[0]?.collected ?? 0, from, to };
}

// Powers the dashboard's TODAY / THIS WEEK / CUSTOM DATE panel — one call
// computes all three ranges together (each hitting the same 4 collections)
// instead of the frontend firing off three separate round trips per range.
export async function getRangeStats(scope: DataScope, user: AccessTokenPayload, params: RangeStatsParams) {
  const now = new Date();
  // "today"/"this week" boundaries are always computed server-side (not
  // trusted from the client) so they can't drift across browser timezones.
  const todayFrom = startOfDay(now);
  const weekFrom = startOfWeek(now);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const customFrom = params.startDate ? startOfDay(params.startDate) : monthStart;
  const customTo = params.endDate ? endOfDay(params.endDate) : now;

  const [today, thisWeek, custom] = await Promise.all([
    countsForRange(scope, user, todayFrom, now),
    countsForRange(scope, user, weekFrom, now),
    countsForRange(scope, user, customFrom, customTo),
  ]);

  return { today, thisWeek, custom };
}
