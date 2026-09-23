import { NotFoundError } from '../../../../../lib/errors';
import { HeroSlideModel, HeroSlideStatus } from './heroSlide.model';

interface ListHeroSlidesParams {
  q?: string;
  status?: HeroSlideStatus;
}

export async function listHeroSlides(params: ListHeroSlidesParams) {
  const filter: Record<string, unknown> = {};

  if (params.status) filter.status = params.status;
  if (params.q) {
    const escapedQuery = params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { subtitle: { $regex: escapedQuery, $options: 'i' } },
      { titleLine1: { $regex: escapedQuery, $options: 'i' } },
      { titleLine2: { $regex: escapedQuery, $options: 'i' } },
      { description: { $regex: escapedQuery, $options: 'i' } },
    ];
  }

  return HeroSlideModel.find(filter).sort({ sortOrder: 1, createdAt: 1 });
}

export async function listPublicHeroSlides() {
  return HeroSlideModel.find({ status: 'ACTIVE', image: { $exists: true, $ne: '' } })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select('-status');
}

export async function getHeroSlide(id: string) {
  const slide = await HeroSlideModel.findById(id);
  if (!slide) throw new NotFoundError('Hero slide not found');
  return slide;
}

export async function createHeroSlide(data: Record<string, unknown>) {
  return HeroSlideModel.create(data);
}

export async function updateHeroSlide(id: string, data: Record<string, unknown>) {
  const slide = await HeroSlideModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!slide) throw new NotFoundError('Hero slide not found');
  return slide;
}

export async function deleteHeroSlide(id: string) {
  const slide = await HeroSlideModel.findByIdAndDelete(id);
  if (!slide) throw new NotFoundError('Hero slide not found');
}
