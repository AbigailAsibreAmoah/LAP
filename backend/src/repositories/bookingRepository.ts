import type { Booking } from '@laporte/shared';
import { store } from './demoStore';

export const bookingRepository = {
  all: () => store.bookings,
  byId: (id: string) => store.bookings.find((b) => b.id === id),
  forLearner: (learnerId: string) => store.bookings.filter((b) => b.learnerId === learnerId),
  forTutor: (tutorId: string) => store.bookings.filter((b) => b.tutorId === tutorId),
  activeForTutorAt: (tutorId: string, start: string) =>
    store.bookings.find((b) => b.tutorId === tutorId && b.start === start && b.status === 'confirmed'),
  insert(booking: Booking) {
    store.bookings.push(booking);
    return booking;
  },
};
