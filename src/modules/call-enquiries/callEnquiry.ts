import { Document, Schema, Types, model } from 'mongoose';
import { z } from 'zod';
import { ActorSnapshot, actorSnapshotSchema } from '../../lib/actor';
import { NotFoundError } from '../../lib/errors';
import { EnquiryCounterModel } from '../enquiries/enquiry.model';
import { contactFromCallEnquiry, syncCustomerSafely } from '../customer-profiles/customerProfile.sync';

// Call Enquiry Section: someone phones only to ask about a service. Staff
// note who called, for which service and where they heard of CityCalls; if
// they later want the service, the enquiry is moved to a Service Call
// (a registration) and marked Converted.

export const CALL_ENQUIRY_SOURCES = ['Just Dial', 'Instagram', 'Facebook', 'Google', 'Website', 'WhatsApp', 'Referral', 'Other'] as const;
export type CallEnquirySource = (typeof CALL_ENQUIRY_SOURCES)[number];

export const CALL_ENQUIRY_STATUSES = ['OPEN', 'CONVERTED', 'CLOSED'] as const;
export type CallEnquiryStatus = (typeof CALL_ENQUIRY_STATUSES)[number];

export interface ICallEnquiry extends Document {
  enquiryNo: string;
  name: string;
  phone: string;
  // The service asked about — a Navbar List link (name / menu copied so the
  // row still reads right if the link is later renamed or removed). Not set
  // for an "Other" service, which is just typed in as serviceName.
  serviceId?: Types.ObjectId;
  serviceName: string;
  serviceCategory?: string;
  // Every service asked about, when more than one was picked. serviceName /
  // serviceCategory above hold them joined ("AC Service, Sofa Shampooing")
  // for the list, search and export; serviceId is the first one's link.
  services: { serviceId?: Types.ObjectId; name: string; category?: string }[];
  source: CallEnquirySource;
  // Who referred them, or what "Other" was.
  sourceDetail?: string;
  remarks?: string;
  status: CallEnquiryStatus;
  // Set when it was moved to a Service Call.
  registrationId?: Types.ObjectId;
  registrationNo?: string;
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const callEnquirySchema = new Schema<ICallEnquiry>(
  {
    enquiryNo: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 15 },
    serviceId: { type: Schema.Types.ObjectId, ref: 'CityCallsNavbarService' },
    serviceName: { type: String, required: true, trim: true, maxlength: 600 },
    serviceCategory: { type: String, trim: true, maxlength: 300 },
    services: {
      type: [
        new Schema(
          {
            serviceId: { type: Schema.Types.ObjectId, ref: 'CityCallsNavbarService' },
            name: { type: String, required: true, trim: true, maxlength: 150 },
            category: { type: String, trim: true, maxlength: 120 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    source: { type: String, enum: CALL_ENQUIRY_SOURCES, required: true },
    sourceDetail: { type: String, trim: true, maxlength: 120 },
    remarks: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: CALL_ENQUIRY_STATUSES, default: 'OPEN' },
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration' },
    registrationNo: { type: String, trim: true, maxlength: 40 },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);
callEnquirySchema.index({ createdAt: -1 });
callEnquirySchema.index({ phone: 1 });

export const CallEnquiryModel = model<ICallEnquiry>('CallEnquiry', callEnquirySchema, 'callEnquiries');

// ─── Validation ────────────────────────────────────────────────────────────
const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), 'Invalid id');
const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

const MAX_ENQUIRY_SERVICES = 20;
const serviceItem = z.object({
  serviceId: objectId.optional(),
  name: z.string().trim().min(1, 'Service name is required').max(150),
  category: z.string().trim().max(120).optional(),
}).strict();

const fields = {
  name: z.string().trim().min(2, 'Name is required').max(120),
  phone,
  serviceId: objectId.optional(),
  serviceName: z.string().trim().min(1, 'Service is required').max(600),
  serviceCategory: z.string().trim().max(300).optional(),
  services: z.array(serviceItem).min(1, 'Select at least one service').max(MAX_ENQUIRY_SERVICES).optional(),
  source: z.enum(CALL_ENQUIRY_SOURCES),
  sourceDetail: z.string().trim().max(120).optional(),
  remarks: z.string().trim().max(500).optional(),
};

export const createCallEnquirySchema = z.object(fields).strict();

// Partial update. Moving it to a Service Call sends status CONVERTED with the
// registration it became.
export const updateCallEnquirySchema = z.object({
  name: fields.name.optional(),
  phone: fields.phone.optional(),
  // null = changed to an "Other" (typed) service, so the navbar link is dropped.
  serviceId: objectId.nullable().optional(),
  serviceName: fields.serviceName.optional(),
  serviceCategory: fields.serviceCategory,
  services: fields.services,
  source: fields.source.optional(),
  sourceDetail: fields.sourceDetail,
  remarks: fields.remarks,
  status: z.enum(CALL_ENQUIRY_STATUSES).optional(),
  registrationId: objectId.optional(),
  registrationNo: z.string().trim().max(40).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export type CreateCallEnquiryInput = z.infer<typeof createCallEnquirySchema>;
export type UpdateCallEnquiryInput = z.infer<typeof updateCallEnquirySchema>;

// ─── Service ───────────────────────────────────────────────────────────────
async function nextEnquiryNo() {
  const counter = await EnquiryCounterModel.findOneAndUpdate({ _id: 'CALL_ENQUIRY' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `CQ-${String(counter.seq).padStart(6, '0')}`;
}

// Newest first. The list page filters (dates, source, status, search) in the browser.
export function listCallEnquiries() {
  return CallEnquiryModel.find().sort({ createdAt: -1 }).limit(5000).select('-__v').lean();
}

export async function getCallEnquiry(id: string) {
  const enquiry = Types.ObjectId.isValid(id) ? await CallEnquiryModel.findById(id).select('-__v').lean() : null;
  if (!enquiry) throw new NotFoundError('Enquiry not found');
  return enquiry;
}

export async function createCallEnquiry(data: CreateCallEnquiryInput, actor: ActorSnapshot) {
  const created = await CallEnquiryModel.create({ ...data, enquiryNo: await nextEnquiryNo(), createdBy: actor, updatedBy: actor });
  await syncCustomerSafely({ ...contactFromCallEnquiry(created), isNew: true });
  return created.toObject();
}

export async function updateCallEnquiry(id: string, data: UpdateCallEnquiryInput, actor: ActorSnapshot) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Enquiry not found');
  const { serviceId, ...rest } = data;
  const change = serviceId === null
    ? { $set: { ...rest, updatedBy: actor }, $unset: { serviceId: 1 } }
    : { $set: { ...rest, ...(serviceId ? { serviceId } : {}), updatedBy: actor } };
  const updated = await CallEnquiryModel.findByIdAndUpdate(id, change, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Enquiry not found');
  if (data.name !== undefined || data.phone !== undefined) await syncCustomerSafely(contactFromCallEnquiry(updated));
  return updated;
}

export async function deleteCallEnquiry(id: string) {
  const deleted = Types.ObjectId.isValid(id) ? await CallEnquiryModel.findByIdAndDelete(id) : null;
  if (!deleted) throw new NotFoundError('Enquiry not found');
}
