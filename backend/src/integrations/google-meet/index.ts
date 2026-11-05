import { env } from '../../config/env';
import { liveAdapterNotImplemented } from '../notConfigured';
import { createMockMeet } from './mockMeet';
import type { MeetingProvider } from './types';

export type { MeetingProvider } from './types';

export function createMeetingProvider(): MeetingProvider {
  return env.providers.meetings === 'live' ? liveAdapterNotImplemented('Google Meet') : createMockMeet();
}
