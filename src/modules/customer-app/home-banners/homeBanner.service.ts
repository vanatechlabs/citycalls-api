import { NotFoundError } from '../../../lib/errors';
import { HomeBannerModel, HomeBannerStatus } from './homeBanner.model';

interface ListHomeBannersParams {
  q?: string;
  status?: HomeBannerStatus;
}

export async function listHomeBanners(params: ListHomeBannersParams) {
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

  return HomeBannerModel.find(filter).sort({ sortOrder: 1, createdAt: 1 });
}

// What the customer app shows: active banners that have an image.
export async function listPublicHomeBanners() {
  return HomeBannerModel.find({ status: 'ACTIVE', image: { $exists: true, $ne: '' } })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select('-status');
}

export async function getHomeBanner(id: string) {
  const banner = await HomeBannerModel.findById(id);
  if (!banner) throw new NotFoundError('Home banner not found');
  return banner;
}

export async function createHomeBanner(data: Record<string, unknown>) {
  return HomeBannerModel.create(data);
}

export async function updateHomeBanner(id: string, data: Record<string, unknown>) {
  const banner = await HomeBannerModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!banner) throw new NotFoundError('Home banner not found');
  return banner;
}

export async function deleteHomeBanner(id: string) {
  const banner = await HomeBannerModel.findByIdAndDelete(id);
  if (!banner) throw new NotFoundError('Home banner not found');
}
