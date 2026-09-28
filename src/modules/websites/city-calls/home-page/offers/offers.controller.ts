import { NextFunction, Response } from 'express';
import { sendSuccess, paramAsString } from '../../../../../lib/apiResponse';
import { ScopedRequest } from '../../../../../middleware/permission.middleware';
import * as offersService from './offers.service';

export async function getOfferStripHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const strip = await offersService.getOfferStrip();
    sendSuccess(res, strip, 'Offer strip fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getPublicOfferStripHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const strip = await offersService.getPublicOfferStrip();
    sendSuccess(res, strip, 'Offer strip fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateOfferStripHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const strip = await offersService.updateOfferStrip(req.body);
    sendSuccess(res, strip, 'Offer strip updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function listOffersHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const offers = await offersService.listOffers(req.query as never);
    sendSuccess(res, offers, 'Offers fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function listPublicOffersHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const offers = await offersService.listPublicOffers();
    sendSuccess(res, offers, 'Offers fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getOfferHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const offer = await offersService.getOffer(paramAsString(req.params.id));
    sendSuccess(res, offer, 'Offer fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createOfferHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const offer = await offersService.createOffer(req.body);
    sendSuccess(res, offer, 'Offer created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateOfferHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const offer = await offersService.updateOffer(paramAsString(req.params.id), req.body);
    sendSuccess(res, offer, 'Offer updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteOfferHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await offersService.deleteOffer(paramAsString(req.params.id));
    sendSuccess(res, null, 'Offer deleted successfully');
  } catch (error) {
    next(error);
  }
}
