import { NotificationChannel } from '../modules/notifications/notificationTemplates.model';

// Used only when a row is absent. Existing admin edits and inactive rows win.
export const serviceNotificationDefaults: Record<string, Array<{
  channel: NotificationChannel; bodyTemplate: string; variables: string[];
}>> = {
  SERVICE_REQUEST_CREATED: [
    { channel: 'WHATSAPP', bodyTemplate: 'Your service booking {{number}} has been received.', variables: ['firstName', 'serviceName', 'problem', 'slot', 'number'] },
    { channel: 'IN_APP', bodyTemplate: 'Your service booking {{number}} has been received.', variables: ['number'] },
    { channel: 'PUSH', bodyTemplate: 'Your service booking {{number}} has been received.', variables: ['number'] },
  ],
  SERVICE_COMPLETION_OTP: [
    { channel: 'WHATSAPP', bodyTemplate: 'Completion confirmation code for {{number}}: {{otp}}', variables: ['otp'] },
  ],
  SERVICE_REQUEST_SERVICE_COMPLETED: [
    { channel: 'IN_APP', bodyTemplate: 'Service {{number}} has been completed.', variables: ['number'] },
    { channel: 'PUSH', bodyTemplate: 'Service {{number}} has been completed.', variables: ['number'] },
  ],
  SERVICE_REQUEST_CLOSED: [
    { channel: 'IN_APP', bodyTemplate: 'Service {{number}} has been closed. Thank you!', variables: ['number'] },
    { channel: 'PUSH', bodyTemplate: 'Service {{number}} has been closed. Thank you!', variables: ['number'] },
  ],
};
