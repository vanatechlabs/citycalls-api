import { Schema, model, Document, Types } from 'mongoose';

// Roles beyond the built-in ROLES enum (users.types.ts). The built-in set
// stays a compile-time literal union everywhere it's used for privileged,
// closed-set business logic (status-transition bypass lists, dispatch-chain
// arrays, etc. — see e.g. serviceRequests.service.ts's ADMIN_BYPASS) — that
// logic is deliberately NOT extended to custom roles: a custom role only
// ever gets the module/action grants explicitly assigned to it through the
// normal RolePermissionModel mechanism (same as any built-in role), never
// the hardcoded elevated bypasses. New custom roles are safe-by-default:
// zero permissions until an admin grants some.
export interface ICustomRole extends Document {
  slug: string; // UPPER_SNAKE_CASE — stored as the `role` value on User/RolePermission
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customRoleSchema = new Schema<ICustomRole>(
  {
    slug: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const CustomRoleModel = model<ICustomRole>('CustomRole', customRoleSchema);
