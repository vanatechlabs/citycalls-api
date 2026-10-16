import { Document, Schema, Types, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';
import { OUR_SERVICE_STATUSES, OurServiceStatus } from '../home-page/our-services/ourServices.model';

// Admin → Pages Section → All Services: a card for every service (picked
// from Navbar List) with image, short description and price — separate from
// the home page's Our Services cards. Where they show on the website is
// decided later; the public endpoint is ready for it.
export interface AllServiceCardContent {
  navServiceId?: Types.ObjectId;
  name: string;
  // Fallback when the Navbar List link is gone; the live link's path wins.
  path: string;
  shortDescription: string;
  image: string;
  imageAlt: string;
  priceText: string;
  sortOrder: number;
  status: OurServiceStatus;
}

export interface IAllServiceCard extends Document, AllServiceCardContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const allServiceCardSchema = new Schema<IAllServiceCard>(
  {
    navServiceId: { type: Schema.Types.ObjectId, ref: 'CityCallsNavbarService' },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    path: { type: String, required: true, trim: true, maxlength: 300 },
    shortDescription: { type: String, trim: true, maxlength: 200, default: '' },
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    imageAlt: { type: String, trim: true, maxlength: 200, default: '' },
    priceText: { type: String, trim: true, maxlength: 60, default: '' },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: OUR_SERVICE_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

allServiceCardSchema.index({ status: 1, sortOrder: 1 });
allServiceCardSchema.index({ navServiceId: 1 });

export const AllServiceCardModel = model<IAllServiceCard>('CityCallsAllServiceCard', allServiceCardSchema, 'cityCallsAllServiceCards');
