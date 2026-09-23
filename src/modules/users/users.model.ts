import { Schema, model, Document, Types } from 'mongoose';
import { Role, USER_STATUSES, UserStatus } from './users.types';

export interface IUser extends Document {
  name: string;
  email?: string;
  mobile: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  branchId?: Types.ObjectId;
  subBranchId?: Types.ObjectId;
  teamId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  communicationConsent: {
    whatsappMarketing: 'GRANTED' | 'REVOKED' | 'NOT_ASKED';
    emailMarketing: 'GRANTED' | 'REVOKED' | 'NOT_ASKED';
  };
  lastLoginAt?: Date;
  // Unset on the bootstrap Super Admin created directly by the seed script
  // (not through this model's create flow) — shown as "System (seed)" on
  // the frontend, not backfilled.
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Not enum-restricted to ROLES here — a user may also hold a custom role
    // (customRoles.model.ts). Validity (built-in ROLES OR an existing
    // CustomRole slug) is checked at the service layer, in
    // users.service.ts's assertValidRole(), before this is ever written.
    role: { type: String, required: true },
    status: { type: String, enum: USER_STATUSES, default: 'ACTIVE' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    subBranchId: { type: Schema.Types.ObjectId, ref: 'SubBranch' },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    communicationConsent: {
      whatsappMarketing: { type: String, enum: ['GRANTED', 'REVOKED', 'NOT_ASKED'], default: 'NOT_ASKED' },
      emailMarketing: { type: String, enum: ['GRANTED', 'REVOKED', 'NOT_ASKED'], default: 'NOT_ASKED' },
    },
    lastLoginAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ branchId: 1 });

export const UserModel = model<IUser>('User', userSchema);
