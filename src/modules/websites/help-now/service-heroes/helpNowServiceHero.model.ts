import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';
import { HELP_NOW_SERVICE_SLUGS, HelpNowServiceSlug } from '../bookings/helpNowPricing';
import { SERVICE_HERO_STATUSES, ServiceHeroContent } from './helpNowServiceHero.validation';

// One document per Help Now service page, created the first time its hero is
// saved; a service with none shows the website's built-in hero.
export interface IHelpNowServiceHero extends Document, ServiceHeroContent {
  slug: HelpNowServiceSlug;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const featureSchema = new Schema(
  { title: { type: String, required: true }, subtitle: { type: String, default: '' } },
  { _id: false }
);

const helpNowServiceHeroSchema = new Schema<IHelpNowServiceHero>(
  {
    slug: { type: String, enum: HELP_NOW_SERVICE_SLUGS, required: true, unique: true },
    subheading: { type: String, default: '' },
    heading: { type: String, required: true },
    highlight: { type: String, default: '' },
    description: { type: String, default: '' },
    features: { type: [featureSchema], default: [] },
    image: { type: String, default: '' },
    imageAlt: { type: String, default: '' },
    status: { type: String, enum: SERVICE_HERO_STATUSES, default: 'ACTIVE' },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const HelpNowServiceHeroModel = model<IHelpNowServiceHero>(
  'HelpNowServiceHero',
  helpNowServiceHeroSchema,
  'helpNowServiceHeroes'
);
