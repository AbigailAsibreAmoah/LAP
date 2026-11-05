import { createCalendarProvider } from '../integrations/google-calendar';
import { createMeetingProvider } from '../integrations/google-meet';
import { createNotificationSender } from '../integrations/notifications';
import { createPaymentGateway } from '../integrations/paystack';
import { createSpeechAnalyser } from '../integrations/speech-ai';

/** Single place where adapters are chosen; services never import providers directly. */
export const integrations = {
  payments: createPaymentGateway(),
  meetings: createMeetingProvider(),
  calendar: createCalendarProvider(),
  notifications: createNotificationSender(),
  speech: createSpeechAnalyser(),
};
