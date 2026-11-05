import { env } from '../../config/env';
import { liveAdapterNotImplemented } from '../notConfigured';
import { createMockSender } from './mockSender';

export type { NotificationSender, OutboundNotification } from './types';

export function createNotificationSender() {
  return env.providers.notifications === 'live' ? liveAdapterNotImplemented('Email/WhatsApp') : createMockSender();
}
