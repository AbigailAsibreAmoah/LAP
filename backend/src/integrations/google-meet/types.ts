import type { MeetingInfo } from '@laporte/shared';

export interface CreateMeetingInput {
  bookingId: string;
  subject: string;
  start: string;
  durationMin: number;
}

/** Contract for Google Meet creation (Google Calendar API events with conferenceData). */
export interface MeetingProvider {
  createMeeting(input: CreateMeetingInput): Promise<MeetingInfo>;
  cancelMeeting(bookingId: string): Promise<void>;
}
