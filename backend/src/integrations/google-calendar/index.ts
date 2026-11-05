import { env } from '../../config/env';
import { liveAdapterNotImplemented } from '../notConfigured';
import { createMockCalendar } from './mockCalendar';
import type { CalendarProvider } from './types';

export type { BusyBlock, CalendarProvider } from './types';

export function createCalendarProvider(): CalendarProvider {
  return env.providers.calendar === 'live' ? liveAdapterNotImplemented('Google Calendar') : createMockCalendar();
}
