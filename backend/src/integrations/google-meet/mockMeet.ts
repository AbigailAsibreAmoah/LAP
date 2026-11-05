import type { MeetingProvider } from './types';

/** Never fabricates a join link — the meeting is explicitly marked simulated. */
export function createMockMeet(): MeetingProvider {
  return {
    async createMeeting() {
      return { provider: 'google-meet', status: 'simulated', joinUrl: null };
    },
    async cancelMeeting() {},
  };
}
