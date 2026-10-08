import { NotFoundError } from '../../../lib/errors';
import { SalonBannerModel, SalonBannerStatus } from './salonBanner.model';

interface ListSalonBannersParams {
  q?: string;
  status?: SalonBannerStatus;
}

export async function listSalonBanners(params: ListSalonBannersParams) {
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

  return SalonBannerModel.find(filter).sort({ sortOrder: 1, createdAt: 1 });
}

// What the customer app shows: active banners that have an image.
export async function listPublicSalonBanners() {
  return SalonBannerModel.find({ status: 'ACTIVE', image: { $exists: true, $ne: '' } })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select('-status');
}

export async function getSalonBanner(id: string) {
  const banner = await SalonBannerModel.findById(id);
  if (!banner) throw new NotFoundError('Salon banner not found');
  return banner;
}

export async function createSalonBanner(data: Record<string, unknown>) {
  return SalonBannerModel.create(data);
}

export async function updateSalonBanner(id: string, data: Record<string, unknown>) {
  const banner = await SalonBannerModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!banner) throw new NotFoundError('Salon banner not found');
  return banner;
}

export async function deleteSalonBanner(id: string) {
  const banner = await SalonBannerModel.findByIdAndDelete(id);
  if (!banner) throw new NotFoundError('Salon banner not found');
}
