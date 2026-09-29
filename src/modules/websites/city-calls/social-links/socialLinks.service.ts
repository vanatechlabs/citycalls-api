import { ActorSnapshot } from '../../../../lib/actor';
import { SOCIAL_LINKS_KEY, SocialLinksModel } from './socialLinks.model';

// null until the admin saves the Social Media page once.
export async function getSocialLinks() {
  return SocialLinksModel.findOne({ key: SOCIAL_LINKS_KEY }).select('-key -__v').lean();
}

export async function getPublicSocialLinks() {
  return SocialLinksModel.findOne({ key: SOCIAL_LINKS_KEY }).select('-_id -key -__v -updatedBy -createdAt').lean();
}

export async function updateSocialLinks(data: Record<string, unknown>, actor: ActorSnapshot) {
  return SocialLinksModel.findOneAndUpdate(
    { key: SOCIAL_LINKS_KEY },
    { ...data, updatedBy: actor },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .select('-key -__v')
    .lean();
}
