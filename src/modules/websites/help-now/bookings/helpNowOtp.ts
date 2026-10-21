import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Document, Schema, model } from 'mongoose';
import { env } from '../../../../config/env';
import { AppError, ValidationError } from '../../../../lib/errors';
import { isWhatsAppEnabled, otpCopyCodeButton, sendWhatsApp } from '../../../../lib/whatsappAdapter';

// Phone verification for the Help Now booking form. The OTP goes out on
// WhatsApp (the login-OTP template); a correct code returns a short-lived
// token, and a booking is accepted only with a token for each number on it.

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const TOKEN_PURPOSE = 'helpnow-booking-phone';
const TOKEN_TTL = '2h';

interface IHelpNowPhoneOtp extends Document {
  phone: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
}

const helpNowPhoneOtpSchema = new Schema<IHelpNowPhoneOtp>(
  {
    phone: { type: String, required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
helpNowPhoneOtpSchema.index({ phone: 1, createdAt: -1 });
helpNowPhoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const HelpNowPhoneOtpModel = model<IHelpNowPhoneOtp>('HelpNowPhoneOtp', helpNowPhoneOtpSchema, 'helpNowPhoneOtps');

const hashOtp = (phone: string, otp: string) => crypto.createHash('sha256').update(`${phone}:${otp}`).digest('hex');

export async function requestHelpNowOtp(phone: string) {
  const last = await HelpNowPhoneOtpModel.findOne({ phone }).sort({ createdAt: -1 }).lean();
  if (last && Date.now() - last.createdAt.getTime() < RESEND_AFTER_MS) {
    const wait = Math.ceil((RESEND_AFTER_MS - (Date.now() - last.createdAt.getTime())) / 1000);
    throw new AppError(429, `Please wait ${wait} seconds before asking for another OTP.`, [
      { field: 'phone', code: 'OTP_TOO_SOON', message: `Please wait ${wait} seconds before asking for another OTP.` },
    ]);
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const record = await HelpNowPhoneOtpModel.create({ phone, otpHash: hashOtp(phone, otp), expiresAt: new Date(Date.now() + OTP_TTL_MS) });

  if (isWhatsAppEnabled() && env.aisensy.loginOtpCampaign) {
    try {
      await sendWhatsApp({
        to: phone,
        campaignName: env.aisensy.loginOtpCampaign,
        variables: [otp],
        buttons: otpCopyCodeButton(otp),
        source: 'helpnow-booking-otp',
      });
    } catch (error) {
      await HelpNowPhoneOtpModel.deleteOne({ _id: record._id });
      console.error('[help-now] booking OTP WhatsApp failed', error);
      const message = 'Could not send the OTP right now. Please try again.';
      throw new AppError(502, message, [{ field: 'phone', code: 'OTP_SEND_FAILED', message }]);
    }
  } else if (env.nodeEnv === 'production') {
    await HelpNowPhoneOtpModel.deleteOne({ _id: record._id });
    const message = 'Phone verification is unavailable right now. Please call us to book.';
    throw new AppError(503, message, [{ field: 'phone', code: 'OTP_UNAVAILABLE', message }]);
  } else {
    console.log(`[dev] Help Now booking OTP for ${phone}: ${otp}`);
  }

  return { expiresInSeconds: OTP_TTL_MS / 1000, resendAfterSeconds: RESEND_AFTER_MS / 1000 };
}

export async function verifyHelpNowOtp(phone: string, otp: string) {
  const invalid = (message: string, code = 'OTP_INVALID') => new ValidationError([{ field: 'otp', code, message }]);
  const record = await HelpNowPhoneOtpModel.findOne({ phone }).sort({ createdAt: -1 });
  if (!record || record.verified || record.expiresAt < new Date()) {
    throw invalid('OTP expired. Please request a new one.', 'OTP_EXPIRED');
  }
  if (record.attempts >= MAX_ATTEMPTS) throw invalid('Too many wrong attempts. Please request a new OTP.', 'OTP_LOCKED');

  const expected = Buffer.from(record.otpHash);
  const given = Buffer.from(hashOtp(phone, otp));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    record.attempts += 1;
    await record.save();
    throw invalid('Incorrect OTP. Please check and try again.');
  }

  record.verified = true;
  await record.save();
  return { token: jwt.sign({ phone, purpose: TOKEN_PURPOSE }, env.jwtAccessSecret, { expiresIn: TOKEN_TTL }) };
}

// True when `token` came from verifying exactly this phone number.
export function isPhoneVerified(phone: string, token: string | undefined) {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as { phone?: string; purpose?: string };
    return payload.purpose === TOKEN_PURPOSE && payload.phone === phone;
  } catch {
    return false;
  }
}
