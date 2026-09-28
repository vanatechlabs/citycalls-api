import { Document, Schema, Types, model } from 'mongoose';

// Lifecycle: every registration starts PENDING, is moved to ACTIVE (with a
// note) once the team picks it up, and to COMPLETED (with a note) when done.
export const REGISTRATION_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

// The only allowed moves, and which stage note each one records.
export const REGISTRATION_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus | null> = {
  PENDING: 'ACTIVE',
  ACTIVE: 'COMPLETED',
  COMPLETED: null,
};

// Who did something, snapshotted so the name still shows if the user is
// later renamed or removed.
export interface RegistrationActor {
  userId?: Types.ObjectId;
  name: string;
}

export interface StageNote {
  note: string;
  by: RegistrationActor;
  at: Date;
}

export interface StatusHistoryEntry {
  from?: RegistrationStatus;
  to: RegistrationStatus;
  note?: string;
  by: RegistrationActor;
  at: Date;
}

export const REGISTRATION_SOURCES = ['ADMIN', 'WEBSITE'] as const;
export type RegistrationSource = (typeof REGISTRATION_SOURCES)[number];

export const ISSUE_FREQUENCIES = ['Always', 'Sometimes', 'Occasionally', 'Once'] as const;

export interface IRegistration extends Document {
  registrationNo: string;
  source: RegistrationSource;

  // Personal information — same fields as nextfrontend's BookingModal Step1.
  fullName: string;
  email: string;
  phone: string;
  altPhone?: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  language?: string;
  heardFrom?: string;
  referenceName?: string;
  instructions?: string;

  // Service picked from the navbar service links (Navbar List). Name and
  // category are copied in so the booking still reads correctly if that
  // navlink is later renamed or deleted.
  serviceId?: Types.ObjectId;
  serviceName: string;
  serviceCategory?: string;

  // Issue details — same fields as BookingModal Step2.
  brand?: string;
  modelNumber?: string;
  applianceType?: string;
  capacity?: string;
  issues: string[];
  issueDescription: string;
  photos: string[];
  issueFrequency?: string;
  safetyConcern?: string;

  // Schedule — BookingModal Step3.
  preferredDate?: Date;
  timeSlot?: string;

  couponCode?: string;
  status: RegistrationStatus;
  // Note written when moving PENDING → ACTIVE, and ACTIVE → COMPLETED.
  activationNote?: StageNote;
  completionNote?: StageNote;
  statusHistory: StatusHistoryEntry[];
  // Service-specific answers that have no dedicated field (e.g. "Outdoor
  // unit accessible?: Yes", "Approx. AC age: 1–3 years") — website bookings.
  extraDetails: { label: string; value: string }[];
  // Unread until someone opens it in admin; drives the sidebar badges and
  // the new-registration popup. Admin-created ones start read.
  viewedAt?: Date;
  viewedBy?: RegistrationActor;
  createdBy?: RegistrationActor;
  // Last person to change anything (edit or status move) — "Updated By".
  updatedBy?: RegistrationActor;
  createdAt: Date;
  updatedAt: Date;
}

const actorSchema = new Schema<RegistrationActor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const stageNoteSchema = new Schema<StageNote>(
  {
    note: { type: String, required: true, trim: true, maxlength: 1000 },
    by: { type: actorSchema, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const statusHistorySchema = new Schema<StatusHistoryEntry>(
  {
    from: { type: String, enum: REGISTRATION_STATUSES },
    to: { type: String, enum: REGISTRATION_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    by: { type: actorSchema, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const registrationSchema = new Schema<IRegistration>(
  {
    registrationNo: { type: String, required: true, unique: true },
    source: { type: String, enum: REGISTRATION_SOURCES, default: 'ADMIN' },

    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 15 },
    altPhone: { type: String, trim: true, maxlength: 15 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    pincode: { type: String, required: true, trim: true, maxlength: 6 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    language: { type: String, trim: true, maxlength: 40 },
    heardFrom: { type: String, trim: true, maxlength: 60 },
    referenceName: { type: String, trim: true, maxlength: 120 },
    instructions: { type: String, trim: true, maxlength: 300 },

    serviceId: { type: Schema.Types.ObjectId, ref: 'CityCallsNavbarService' },
    serviceName: { type: String, required: true, trim: true, maxlength: 150 },
    serviceCategory: { type: String, trim: true, maxlength: 120 },

    brand: { type: String, trim: true, maxlength: 80 },
    modelNumber: { type: String, trim: true, maxlength: 80 },
    applianceType: { type: String, trim: true, maxlength: 80 },
    capacity: { type: String, trim: true, maxlength: 80 },
    issues: { type: [String], default: [] },
    issueDescription: { type: String, required: true, trim: true, maxlength: 500 },
    photos: { type: [String], default: [] },
    issueFrequency: { type: String, enum: ISSUE_FREQUENCIES },
    safetyConcern: { type: String, trim: true, maxlength: 80 },

    preferredDate: { type: Date },
    timeSlot: { type: String, trim: true, maxlength: 40 },

    couponCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
    status: { type: String, enum: REGISTRATION_STATUSES, default: 'PENDING' },
    activationNote: { type: stageNoteSchema },
    completionNote: { type: stageNoteSchema },
    statusHistory: { type: [statusHistorySchema], default: [] },
    extraDetails: {
      type: [new Schema({ label: { type: String, trim: true, maxlength: 80 }, value: { type: String, trim: true, maxlength: 200 } }, { _id: false })],
      default: [],
    },
    viewedAt: { type: Date },
    viewedBy: { type: actorSchema },
    createdBy: { type: actorSchema },
    updatedBy: { type: actorSchema },
  },
  { timestamps: true }
);

registrationSchema.index({ status: 1, createdAt: -1 });
registrationSchema.index({ phone: 1 });
registrationSchema.index({ viewedAt: 1, createdAt: -1 });

export const RegistrationModel = model<IRegistration>('Registration', registrationSchema, 'registrations');
