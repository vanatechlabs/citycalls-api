import { NotFoundError } from '../../../lib/errors';
import { HelpNowBannerModel, HelpNowBannerStatus } from './helpNowBanner.model';

interface ListHelpNowBannersParams {
  q?: string;
  status?: HelpNowBannerStatus;
}

export async function listHelpNowBanners(params: ListHelpNowBannersParams) {
  const filter: Record<string, unknown> = {};

  if (params.status) filter.status = params.status;
  if (params.q) {
    const escapedQuery = params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { tagLine: { $regex: escapedQuery, $options: 'i' } },
      { titleLine1: { $regex: escapedQuery, $options: 'i' } },
      { titleLine2: { $regex: escapedQuery, $options: 'i' } },
      { description: { $regex: escapedQuery, $options: 'i' } },
    ];
  }

  return HelpNowBannerModel.find(filter).sort({ sortOrder: 1, createdAt: 1 });
}

// What the customer app shows: active banners that have an image.
export async function listPublicHelpNowBanners() {
  return HelpNowBannerModel.find({ status: 'ACTIVE', image: { $exists: true, $ne: '' } })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select('-status');
}

export async function getHelpNowBanner(id: string) {
  const banner = await HelpNowBannerModel.findById(id);
  if (!banner) throw new NotFoundError('HelpNow banner not found');
  return banner;
}

export async function createHelpNowBanner(data: Record<string, unknown>) {
  return HelpNowBannerModel.create(data);
}

export async function updateHelpNowBanner(id: string, data: Record<string, unknown>) {
  const banner = await HelpNowBannerModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!banner) throw new NotFoundError('HelpNow banner not found');
  return banner;
}

export async function deleteHelpNowBanner(id: string) {
  const banner = await HelpNowBannerModel.findByIdAndDelete(id);
  if (!banner) throw new NotFoundError('HelpNow banner not found');
}
