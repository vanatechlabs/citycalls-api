import { NextFunction, Response } from 'express';
import { sendSuccess } from '../../../../lib/apiResponse';
import { ScopedRequest } from '../../../../middleware/permission.middleware';
import * as helpNowBookingsService from './helpNowBookings.service';
import { requestHelpNowOtp, verifyHelpNowOtp } from './helpNowOtp';
import { publicHelpNowCoupons } from './helpNowPricing';

export async function listHelpNowCouponsHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, publicHelpNowCoupons(), 'Coupons fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function quoteHelpNowBookingHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const quote = helpNowBookingsService.getHelpNowQuote(req.body);
    sendSuccess(res, quote, 'Price calculated successfully');
  } catch (error) {
    next(error);
  }
}

export async function createHelpNowBookingHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const result = await helpNowBookingsService.createHelpNowBooking(req.body);
    sendSuccess(res, result, result.paymentRequired ? 'Payment order created' : 'Booking received successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function confirmHelpNowPaymentHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const booking = await helpNowBookingsService.confirmHelpNowPayment(req.body);
    sendSuccess(res, booking, 'Payment confirmed and booking received');
  } catch (error) {
    next(error);
  }
}

export async function requestHelpNowOtpHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await requestHelpNowOtp(req.body.phone), 'OTP sent on WhatsApp');
  } catch (error) {
    next(error);
  }
}

export async function verifyHelpNowOtpHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await verifyHelpNowOtp(req.body.phone, req.body.otp), 'Phone number verified');
  } catch (error) {
    next(error);
  }
}
