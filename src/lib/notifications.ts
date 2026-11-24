import { NotificationTemplateModel, NotificationModel, NotificationChannel } from '../modules/notifications/notificationTemplates.model';
import { UserModel } from '../modules/users/users.model';
import { CustomerModel } from '../modules/customers/customers.model';
import { EmployeeModel } from '../modules/employees/employees.model';
import { isEmailEnabled, sendEmail } from './emailAdapter';
import { campaignNameForTrigger, isOtpTrigger, otpCopyCodeButton, isWhatsAppEnabled, sendWhatsApp } from './whatsappAdapter';
import { isPushEnabled, sendPush } from './pushAdapter';
import { emitNotificationNew } from '../realtime';
import { env } from '../config/env';
import { serviceBookingWhatsAppParams } from '../modules/registrations/registrations.service';
import { serviceNotificationDefaults } from './serviceNotificationDefaults';

export interface TriggerRecipient {
  userId?: string;
  customerId?: string;
  mobile?: string;
  email?: string;
}

export interface TriggerContext {
  recipient: TriggerRecipient;
  variables: Record<string, unknown>;
  // Deliver only on these channels (default: every active template). Used
  // where SMS/WhatsApp to every recipient would cost money for little value.
  channels?: NotificationChannel[];
}

function renderTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

interface ResolvedContact {
  name?: string;
  userId?: string;
  mobile?: string;
  email?: string;
  customerId?: string;
  employeeId?: string;
  // Set when fcmTokens came from the User document (vendor staff).
  userTokensId?: string;
  fcmTokens?: string[];
}

async function resolveContact(recipient: TriggerRecipient): Promise<ResolvedContact> {
  const resolved: ResolvedContact = {
    userId: recipient.userId,
    mobile: recipient.mobile,
    email: recipient.email,
    customerId: recipient.customerId,
  };

  if (recipient.userId && (!resolved.mobile || !resolved.email)) {
    const user = await UserModel.findById(recipient.userId).lean();
    if (user) {
      resolved.name = user.name;
      resolved.mobile = resolved.mobile ?? user.mobile;
      resolved.email = resolved.email ?? user.email;
    }
  }

  if (recipient.customerId) {
    const customer = await CustomerModel.findById(recipient.customerId).lean();
    if (customer) {
      resolved.name = customer.name;
      const primaryContact = customer.contacts.find((c) => c.isPrimary) ?? customer.contacts[0];
      resolved.mobile = resolved.mobile ?? primaryContact?.mobile;
      resolved.email = resolved.email ?? customer.email;
      resolved.userId = resolved.userId ?? customer.userId?.toString();
      resolved.fcmTokens = customer.fcmTokens;
    }
  }
  if (!resolved.name && resolved.mobile) {
    const customerByMobile = await CustomerModel.findOne({ 'contacts.mobile': resolved.mobile }).lean();
    if (customerByMobile) {
      resolved.name = customerByMobile.name;
      resolved.customerId = resolved.customerId ?? customerByMobile._id.toString();
      resolved.userId = resolved.userId ?? customerByMobile.userId?.toString();
      resolved.fcmTokens = resolved.fcmTokens ?? customerByMobile.fcmTokens;
    } else {
      const userByMobile = await UserModel.findOne({ mobile: resolved.mobile }).lean();
      if (userByMobile) {
        resolved.name = userByMobile.name;
        resolved.userId = resolved.userId ?? userByMobile._id.toString();
        resolved.email = resolved.email ?? userByMobile.email;
      }
    }
  }

  if (!resolved.fcmTokens && resolved.userId) {
    const employee = await EmployeeModel.findOne({ userId: resolved.userId }).lean();
    if (employee) {
      resolved.employeeId = employee._id.toString();
      resolved.fcmTokens = employee.fcmTokens;
    }
  }

  // Vendor staff have neither a Customer nor an Employee record — their
  // tokens live on the User (POST /auth/me/fcm-token).
  if ((!resolved.fcmTokens || resolved.fcmTokens.length === 0) && resolved.userId && !resolved.customerId && !resolved.employeeId) {
    const user = await UserModel.findById(resolved.userId).select('fcmTokens').lean();
    if (user?.fcmTokens?.length) {
      resolved.fcmTokens = user.fcmTokens;
      resolved.userTokensId = resolved.userId;
    }
  }

  return resolved;
}
export async function trigger(triggerKey: string, context: TriggerContext, options?: { requireWhatsApp?: boolean }): Promise<void> {
  try {
    for (const defaults of serviceNotificationDefaults[triggerKey] ?? []) {
      try {
        await NotificationTemplateModel.updateOne({ triggerKey, channel: defaults.channel }, {
          $setOnInsert: { ...defaults, triggerKey, active: true },
        }, { upsert: true });
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }
    const templates = await NotificationTemplateModel.find({ triggerKey, active: true });
    if (options?.requireWhatsApp && !templates.some(template => template.channel === 'WHATSAPP')) throw new Error('Completion WhatsApp template is inactive or missing');
    if (templates.length === 0) return; // no template registered for this trigger yet — not an error, just nothing configured

    const contact = await resolveContact(context.recipient);

    for (const template of templates) {
      if (context.channels && !context.channels.includes(template.channel)) continue;
      await deliverOne(template.channel, template._id.toString(), triggerKey, contact, template, context.variables);
    }
  } catch (err) {
    console.error(`[notifications] trigger('${triggerKey}') failed unexpectedly`, err);
    if (options?.requireWhatsApp) throw err;
  }
}

async function deliverOne(
  channel: NotificationChannel,
  templateId: string,
  triggerKey: string,
  contact: ResolvedContact,
  template: { bodyTemplate: string; subjectTemplate?: string; variables?: string[] },
  variables: Record<string, unknown>
): Promise<string> {
  const body = renderTemplate(template.bodyTemplate, variables);
  const subject = template.subjectTemplate ? renderTemplate(template.subjectTemplate, variables) : undefined;

  const notification = await NotificationModel.create({
    templateId,
    triggerKey,
    channel,
    recipientUserId: contact.userId,
    recipientMobile: contact.mobile,
    recipientEmail: contact.email,
    subject,
    // Never persist an authentication/completion secret in notification history.
    body: isOtpTrigger(triggerKey) ? renderTemplate(template.bodyTemplate, { ...variables, otp: '[hidden]' }) : body,
    status: 'PENDING',
  });

  try {
    switch (channel) {
      case 'IN_APP': {
        if (!contact.userId) {
          notification.status = 'FAILED';
          notification.failureReason = 'No recipient userId to deliver an in-app notification to';
          break;
        }
        notification.status = 'SENT';
        notification.sentAt = new Date();
        emitNotificationNew(contact.userId, { notificationId: notification._id.toString(), triggerKey, body });
        break;
      }
      case 'EMAIL': {
        if (!isEmailEnabled()) {
          notification.status = 'SKIPPED_INTEGRATION_DISABLED';
        } else if (!contact.email) {
          notification.status = 'FAILED';
          notification.failureReason = 'No recipient email address available';
        } else {
          await sendEmail({ to: contact.email, subject: subject ?? triggerKey, html: body });
          notification.status = 'SENT';
          notification.sentAt = new Date();
        }
        break;
      }
      case 'WHATSAPP': {
        if (!isWhatsAppEnabled()) {
          notification.status = 'SKIPPED_INTEGRATION_DISABLED';
        } else if (!contact.mobile) {
          notification.status = 'FAILED';
          notification.failureReason = 'No recipient mobile number available';
        } else {
          const campaignName = campaignNameForTrigger(triggerKey);
          if (!campaignName) {
            throw new Error(`No AiSensy API campaign configured for trigger ${triggerKey}`);
          }
          const otpFlow = isOtpTrigger(triggerKey);
          const otpValue = String(variables.otp ?? '');
          const bookingFlow = triggerKey === 'SERVICE_REQUEST_CREATED';
          const templateParams = bookingFlow ? serviceBookingWhatsAppParams({
            fullName: contact.name || 'Customer', serviceName: String(variables.serviceName ?? 'Service'),
            issues: Array.isArray(variables.symptoms) ? variables.symptoms.map(String) : [],
            issueDescription: String(variables.notes ?? ''),
            preferredDate: variables.scheduledDate ? new Date(String(variables.scheduledDate)) : undefined,
            timeSlot: variables.scheduledSlot ? String(variables.scheduledSlot) : undefined,
            registrationNo: String(variables.number ?? ''),
          }) : otpFlow
            ? [otpValue]
            : (template.variables ?? []).map((key) => String(variables[key] ?? ''));
          await sendWhatsApp({
            to: contact.mobile,
            campaignName,
            userName: contact.name,
            variables: templateParams,
            buttons: otpFlow ? otpCopyCodeButton(otpValue) : undefined,
            ...(bookingFlow ? { source: 'app-service-booking', media: { url: env.aisensy.serviceBookingMediaUrl, filename: 'citycalls.jpg' } } : {}),
          });
          notification.status = 'SENT';
          notification.sentAt = new Date();
        }
        break;
      }
      case 'PUSH': {
        if (!isPushEnabled()) {
          notification.status = 'SKIPPED_INTEGRATION_DISABLED';
        } else if (!contact.fcmTokens || contact.fcmTokens.length === 0) {
          notification.status = 'FAILED';
          notification.failureReason = 'No push token registered for recipient';
        } else {
          const result = await sendPush({ tokens: contact.fcmTokens, title: subject ?? 'CityCalls', body, data: { triggerKey } });
          if (result.invalidTokens.length > 0) {
            if (contact.customerId) {
              await CustomerModel.updateOne({ _id: contact.customerId }, { $pull: { fcmTokens: { $in: result.invalidTokens } } });
            } else if (contact.employeeId) {
              await EmployeeModel.updateOne({ _id: contact.employeeId }, { $pull: { fcmTokens: { $in: result.invalidTokens } } });
            } else if (contact.userTokensId) {
              await UserModel.updateOne({ _id: contact.userTokensId }, { $pull: { fcmTokens: { $in: result.invalidTokens } } });
            }
          }
          if (result.successCount > 0) {
            notification.status = 'SENT';
            notification.sentAt = new Date();
          } else {
            notification.status = 'FAILED';
            notification.failureReason = 'All tokens rejected by FCM';
          }
        }
        break;
      }
      case 'SMS':
        notification.status = 'SKIPPED_INTEGRATION_DISABLED';
        break;
    }
  } catch (err) {
    notification.status = 'FAILED';
    notification.failureReason = err instanceof Error ? err.message : 'Unknown delivery error';
  }

  await notification.save();
  return notification.status;
}
