import { NotFoundError } from '../../../../../lib/errors';
import { OfferModel, OfferStatus } from './offer.model';
import { OFFER_STRIP_DEFAULTS, OFFER_STRIP_KEY, OfferStripModel } from './offerStrip.model';

// ─── Offer strip (singleton) ─────────────────────────────────────────────────

export async function getOfferStrip() {
  const strip = await OfferStripModel.findOne({ key: OFFER_STRIP_KEY });
  // Nothing saved yet — hand back the defaults so the admin form starts from
  // what the site already shows instead of blank fields.
  return strip ?? { key: OFFER_STRIP_KEY, ...OFFER_STRIP_DEFAULTS };
}

// Status stays in the public payload so the site can hide an INACTIVE strip,
// and still tell that apart from "API unreachable" (where it falls back).
export async function getPublicOfferStrip() {
  const strip = await OfferStripModel.findOne({ key: OFFER_STRIP_KEY }).select('-_id -key -createdAt -updatedAt -__v');
  return strip ?? OFFER_STRIP_DEFAULTS;
}

export async function updateOfferStrip(data: Record<string, unknown>) {
  return OfferStripModel.findOneAndUpdate(
    { key: OFFER_STRIP_KEY },
    { $set: data, $setOnInsert: { key: OFFER_STRIP_KEY } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

// ─── Offer cards ("Exclusive Deals") ─────────────────────────────────────────

interface ListOffersParams {
  q?: string;
  status?: OfferStatus;
}

export async function listOffers(params: ListOffersParams) {
  const filter: Record<string, unknown> = {};

  if (params.status) filter.status = params.status;
  if (params.q) {
    const escapedQuery = params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escapedQuery, $options: 'i' } },
      { description: { $regex: escapedQuery, $options: 'i' } },
      { couponCode: { $regex: escapedQuery, $options: 'i' } },
    ];
  }

  return OfferModel.find(filter).sort({ sortOrder: 1, createdAt: 1 });
}

export async function listPublicOffers() {
  return OfferModel.find({ status: 'ACTIVE' })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select('-status');
}

export async function getOffer(id: string) {
  const offer = await OfferModel.findById(id);
  if (!offer) throw new NotFoundError('Offer not found');
  return offer;
}

export async function createOffer(data: Record<string, unknown>) {
  return OfferModel.create(data);
}

export async function updateOffer(id: string, data: Record<string, unknown>) {
  const offer = await OfferModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!offer) throw new NotFoundError('Offer not found');
  return offer;
}

export async function deleteOffer(id: string) {
  const offer = await OfferModel.findByIdAndDelete(id);
  if (!offer) throw new NotFoundError('Offer not found');
}
