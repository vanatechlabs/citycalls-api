import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';
import { HELP_NOW_HOME_SECTIONS, HelpNowHomeSection } from './helpNowHome.validation';

// One document per Help Now home-page section; `content` is validated by that
// section's schema (helpNowHome.validation.ts) before every save.
export interface IHelpNowHomeSection extends Document {
  key: HelpNowHomeSection;
  content: Record<string, unknown>;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const helpNowHomeSectionSchema = new Schema<IHelpNowHomeSection>(
  {
    key: { type: String, enum: HELP_NOW_HOME_SECTIONS, required: true, unique: true },
    content: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true, minimize: false }
);

export const HelpNowHomeSectionModel = model<IHelpNowHomeSection>(
  'HelpNowHomeSection',
  helpNowHomeSectionSchema,
  'helpNowHomeSections'
);
