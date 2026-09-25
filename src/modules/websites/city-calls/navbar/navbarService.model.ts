import { Document, Schema, model, Types } from 'mongoose';
import { NAVBAR_STATUSES, NavbarStatus } from './navbarMenu.model';

export interface INavbarService extends Document {
  menuId: Types.ObjectId;
  name: string;
  image?: string;
  path: string;
  sortOrder: number;
  status: NavbarStatus;
  createdAt: Date;
  updatedAt: Date;
}

const navbarServiceSchema = new Schema<INavbarService>(
  {
    menuId: { type: Schema.Types.ObjectId, ref: 'CityCallsNavbarMenu', required: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    // Attached immediately after creation by the shared file-upload flow,
    // once the new service link's Mongo id is available — same pattern as
    // HeroSlide's `image` field.
    image: { type: String, trim: true },
    path: { type: String, required: true, trim: true, maxlength: 300 },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: NAVBAR_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

navbarServiceSchema.index({ menuId: 1, status: 1, sortOrder: 1 });

export const NavbarServiceModel = model<INavbarService>('CityCallsNavbarService', navbarServiceSchema, 'navbarservices');
