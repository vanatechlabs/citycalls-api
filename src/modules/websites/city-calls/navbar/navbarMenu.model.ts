import { Document, Schema, model } from 'mongoose';

export const NAVBAR_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type NavbarStatus = (typeof NAVBAR_STATUSES)[number];

export interface INavbarMenu extends Document {
  name: string;
  slug: string;
  sortOrder: number;
  status: NavbarStatus;
  createdAt: Date;
  updatedAt: Date;
}

const navbarMenuSchema = new Schema<INavbarMenu>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 100 },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: NAVBAR_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

navbarMenuSchema.index({ status: 1, sortOrder: 1 });

export const NavbarMenuModel = model<INavbarMenu>('CityCallsNavbarMenu', navbarMenuSchema, 'navbarmenus');
