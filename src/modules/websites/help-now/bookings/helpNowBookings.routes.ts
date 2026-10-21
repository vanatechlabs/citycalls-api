import { Router } from 'express';
import { validate } from '../../../../middleware/validate.middleware';
import { otpRateLimit, publicApiRateLimit, publicBookingRateLimit } from '../../../../middleware/rateLimit.middleware';
import * as controller from './helpNowBookings.controller';
import {
  createHelpNowBookingSchema,
  helpNowQuoteSchema,
  requestHelpNowOtpSchema,
  verifyHelpNowOtpSchema,
  verifyHelpNowPaymentSchema,
} from './helpNowBookings.validation';

// Help Now service-page booking form — all public.
const router = Router();
const basePath = '/public/websites/help-now/bookings';

router.get(`${basePath}/coupons`, publicApiRateLimit, controller.listHelpNowCouponsHandler);
router.post(`${basePath}/quote`, publicApiRateLimit, validate(helpNowQuoteSchema), controller.quoteHelpNowBookingHandler);
router.post(basePath, publicBookingRateLimit, validate(createHelpNowBookingSchema), controller.createHelpNowBookingHandler);
router.post(
  `${basePath}/verify-payment`,
  publicApiRateLimit,
  validate(verifyHelpNowPaymentSchema),
  controller.confirmHelpNowPaymentHandler
);
router.post(`${basePath}/otp/request`, otpRateLimit, validate(requestHelpNowOtpSchema), controller.requestHelpNowOtpHandler);
router.post(`${basePath}/otp/verify`, otpRateLimit, validate(verifyHelpNowOtpSchema), controller.verifyHelpNowOtpHandler);

export default router;
