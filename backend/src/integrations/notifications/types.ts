import type { NotificationChannel } from '@laporte/shared';

export interface OutboundNotification {
  channel: Exclude<NotificationChannel, 'in-app'>;
  to: string;
  template: 'booking-confirmed' | 'booking-reminder' | 'booking-cancelled' | 'payment-receipt';
  variables: Record<string, string>;
}

export interface DeliveryResult {
  channel: OutboundNotification['channel'];
  delivered: boolean;
  simulated: boolean;
}

/** Contract for email + WhatsApp delivery providers. */
export interface NotificationSender {
  send(message: OutboundNotification): Promise<DeliveryResult>;
}
