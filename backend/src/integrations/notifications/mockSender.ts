import type { NotificationSender, OutboundNotification } from './types';

/** Records messages instead of sending them. `delivered` is always false. */
export function createMockSender(log: OutboundNotification[] = []): NotificationSender & { log: OutboundNotification[] } {
  return {
    log,
    async send(message) {
      log.push(message);
      return { channel: message.channel, delivered: false, simulated: true };
    },
  };
}
