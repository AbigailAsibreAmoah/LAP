import type { Request, Response } from 'express';
import { env } from '../config/env';
import { bookingRepository } from '../repositories/bookingRepository';
import { resetDemoStore, store } from '../repositories/demoStore';
import { catalogRepository } from '../repositories/catalogRepository';
import { learnerRepository } from '../repositories/learnerRepository';
import { paymentRepository } from '../repositories/paymentRepository';
import { vocabularyRepository } from '../repositories/engagementRepository';
import { availability, cancelBooking, createBooking, rescheduleBooking, reviewCancellation } from '../services/bookingService';
import { contentStore } from '../repositories/contentStore';
import { adminService, messagingService, notificationService, speakingService, vocabularyService } from '../services/engagementService';
import { initializePayment, verifyPayment } from '../services/paymentService';
import { notFound } from '../utils/errors';

export const systemController = {
  health: (_req: Request, res: Response) =>
    res.json({ status: 'ok', mode: 'demo', persistence: { demo: 'in-memory (resets on restart)', content: contentStore.persistence }, providers: env.providers }),
  snapshot: (_req: Request, res: Response) => res.json({ ...store, content: contentStore.get() }),
  reset: (_req: Request, res: Response) => {
    resetDemoStore();
    contentStore.reset();
    res.json({ ...store, content: contentStore.get() });
  },
};

export const catalogController = {
  areas: (_req: Request, res: Response) => res.json(catalogRepository.areas()),
  courses: (_req: Request, res: Response) => res.json(catalogRepository.courses()),
  course: (req: Request, res: Response) => {
    const course = catalogRepository.course(req.params.id);
    if (!course) throw notFound('Course');
    res.json(course);
  },
  lesson: (req: Request, res: Response) => {
    const lesson = catalogRepository.lesson(req.params.id);
    if (!lesson) throw notFound('Lesson');
    res.json(lesson);
  },
  pathways: (_req: Request, res: Response) => res.json(catalogRepository.pathways()),
  tutors: (_req: Request, res: Response) => res.json(catalogRepository.tutors()),
  plans: (_req: Request, res: Response) => res.json(catalogRepository.plans()),
};

export const learnerController = {
  me: (req: Request, res: Response) => {
    const learner = learnerRepository.byId(req.demoUser.id);
    if (!learner) throw notFound('Learner');
    res.json(learner);
  },
  milestones: (_req: Request, res: Response) => res.json(catalogRepository.milestones()),
  vocabulary: (_req: Request, res: Response) => res.json(vocabularyRepository.all()),
  addVocabulary: (req: Request, res: Response) => res.status(201).json(vocabularyService.add(req.body)),
  toggleVocabulary: (req: Request, res: Response) => res.json(vocabularyService.toggle(req.params.id)),
  payments: (req: Request, res: Response) => res.json(paymentRepository.forLearner(req.demoUser.id)),
};

export const bookingController = {
  availability: async (req: Request, res: Response) => res.json(await availability(req.params.tutorId, String(req.query.date))),
  mine: (req: Request, res: Response) =>
    res.json(
      req.demoUser.role === 'instructor'
        ? bookingRepository.forTutor(req.demoUser.id)
        : bookingRepository.forLearner(req.demoUser.id),
    ),
  create: async (req: Request, res: Response) =>
    res.status(201).json(await createBooking({ learnerId: req.demoUser.id, ...req.body })),
  cancel: async (req: Request, res: Response) => res.json(await cancelBooking(req.params.id, req.demoUser.id, req.body)),
  reviewException: (req: Request, res: Response) => res.json(reviewCancellation(req.params.id, req.demoUser.id, req.body.decision, req.body.note)),
  reschedule: async (req: Request, res: Response) =>
    res.json(await rescheduleBooking(req.params.id, req.demoUser.id, req.body.start)),
};

export const paymentController = {
  initialize: async (req: Request, res: Response) =>
    res.status(201).json(await initializePayment({ learnerId: req.demoUser.id, ...req.body })),
  verify: async (req: Request, res: Response) => res.json(await verifyPayment(req.params.reference)),
};

export const speakingController = {
  scenarios: (_req: Request, res: Response) => res.json(speakingService.scenarios()),
  sampleFeedback: async (req: Request, res: Response) => res.json(await speakingService.sampleFeedback(req.params.id)),
};

export const engagementController = {
  notifications: (_req: Request, res: Response) => res.json(notificationService.list()),
  markRead: (req: Request, res: Response) => res.json(notificationService.markRead(req.params.id)),
  threads: (req: Request, res: Response) => res.json(messagingService.threadsFor(req.demoUser.id)),
  post: (req: Request, res: Response) =>
    res.status(201).json(messagingService.post(req.params.id, req.demoUser.id, req.body.body)),
};

export const adminController = {
  overview: (_req: Request, res: Response) => res.json(adminService.overview()),
};
