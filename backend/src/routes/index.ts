import { Router } from 'express';
import { env } from '../config/env';
import {
  adminController,
  bookingController,
  catalogController,
  engagementController,
  learnerController,
  paymentController,
  speakingController,
  systemController,
} from '../controllers';
import { asyncHandler, requireRole, validateBody, validateQuery } from '../middleware';
import { contentController, upload } from '../controllers/contentController';
import { communityService, contentService } from '../services/contentService';
import { classmateMessaging, staffMessaging } from '../services/engagementService';
import { kidsService, liveGameService } from '../services/kidsService';
import { placementService } from '../services/placementService';
import { authService } from '../services/authService';
import { runCafe } from '../services/cafeService';
import {
  addVocabularySchema,
  assignPackSchema,
  attendanceSchema,
  cohortSchema,
  cohortSessionSchema,
  followSchema,
  groupAssignmentSchema,
  leaderboardVisibilitySchema,
  startThreadSchema,
  receiptPreferenceSchema,
  staffThreadSchema,
  availabilityQuerySchema,
  cancelBookingSchema,
  claimQuestSchema,
  completeLessonSchema,
  createBookingSchema,
  createLessonSchema,
  editorsSchema,
  feedbackSchema,
  initializePaymentSchema,
  packSchema,
  placementSchema,
  postMessageSchema,
  rescheduleBookingSchema,
  responseSchema,
  shareSchema,
  registerSchema,
  loginSchema,
  reviewSchema,
  reportSchema,
  resolveReportSchema,
  kidCreateSchema,
  kidUpdateSchema,
  kidActivitySchema,
  kidTimeSchema,
  externalGameSchema,
  liveCreateSchema,
  liveJoinSchema,
  liveAnswerSchema,
  reviewCancellationSchema,
  transitionSchema,
  adminCreditsSchema,
  adminUnlockSchema,
  updateLessonSchema,
} from '../validators/schemas';

export const api = Router();

api.get('/health', systemController.health);

// Demo-only: hydrate the prototype UI and reset the in-memory store.
// Disabled in production unless ENABLE_DEMO_ROUTES=true.
if (env.demoRoutes) {
  api.get('/demo/snapshot', systemController.snapshot);
  api.post('/demo/reset', systemController.reset);
}

// Catalogue (public)
api.get('/course-areas', catalogController.areas);
api.get('/courses', catalogController.courses);
api.get('/courses/:id', catalogController.course);
api.get('/lessons/:id', catalogController.lesson);
api.get('/pathways', catalogController.pathways);
api.get('/tutors', catalogController.tutors);
api.get('/memberships', catalogController.plans);

// Learner
api.get('/me', requireRole('learner'), learnerController.me);
api.get('/me/milestones', requireRole('learner'), learnerController.milestones);
api.get('/me/vocabulary', requireRole('learner'), learnerController.vocabulary);
api.post('/me/vocabulary', requireRole('learner'), validateBody(addVocabularySchema), learnerController.addVocabulary);
api.post('/me/vocabulary/:id/toggle', requireRole('learner'), learnerController.toggleVocabulary);
api.get('/me/payments', requireRole('learner'), learnerController.payments);

// Bookings
api.get('/tutors/:tutorId/availability', validateQuery(availabilityQuerySchema), asyncHandler(bookingController.availability));
api.get('/bookings', bookingController.mine);
api.post('/bookings', requireRole('learner'), validateBody(createBookingSchema), asyncHandler(bookingController.create));
api.post('/bookings/:id/cancel', requireRole('learner'), validateBody(cancelBookingSchema), asyncHandler(bookingController.cancel));
api.post('/admin/bookings/:id/exception', requireRole('admin'), validateBody(reviewCancellationSchema), bookingController.reviewException);
api.post('/bookings/:id/reschedule', requireRole('learner'), validateBody(rescheduleBookingSchema), asyncHandler(bookingController.reschedule));

// Payments (simulated Paystack)
api.post('/payments/initialize', requireRole('learner'), validateBody(initializePaymentSchema), asyncHandler(paymentController.initialize));
api.post('/payments/:reference/verify', asyncHandler(paymentController.verify));
api.post('/payments/:reference/receipt/email', requireRole('learner', 'admin'), asyncHandler(paymentController.emailReceipt));
api.put('/me/receipt-emails', requireRole('learner'), validateBody(receiptPreferenceSchema), paymentController.receiptPreference);

// Speaking Studio
api.get('/speaking/scenarios', speakingController.scenarios);
api.post('/speaking/scenarios/:id/sample-feedback', asyncHandler(speakingController.sampleFeedback));

// Messaging & notifications
api.get('/notifications', engagementController.notifications);
api.post('/notifications/:id/read', engagementController.markRead);
api.get('/threads', engagementController.threads);
api.post('/threads/:id/messages', validateBody(postMessageSchema), engagementController.post);

// Administration
api.get('/admin/overview', requireRole('admin'), adminController.overview);
api.post('/admin/learners/:id/credits', requireRole('admin'), validateBody(adminCreditsSchema), adminController.credits);
api.post('/admin/learners/:id/unlock', requireRole('admin'), validateBody(adminUnlockSchema), adminController.unlock);

// Content library (role rules are enforced in the shared content operations)
const staff = requireRole('instructor', 'admin');
api.get('/content', contentController.view);
api.post('/content/lessons', staff, validateBody(createLessonSchema), contentController.createLesson);
api.patch('/content/lessons/:id', staff, validateBody(updateLessonSchema), contentController.updateLesson);
api.post('/content/lessons/:id/complete', requireRole('learner'), validateBody(completeLessonSchema), contentController.completeLesson);
api.post('/content/lessons/:id/:action', staff, validateBody(transitionSchema), contentController.transition);
api.post('/content/media', staff, upload.single('file'), contentController.uploadMedia);
api.get('/content/media/:id/file', contentController.mediaFile);
api.delete('/content/media/:id', staff, contentController.deleteMedia);
api.put('/content/courses/:courseId/editors', requireRole('admin'), validateBody(editorsSchema), contentController.setEditors);
api.post('/content/packs', staff, validateBody(packSchema), contentController.createPack);
api.put('/content/packs/:id', staff, validateBody(packSchema), contentController.updatePack);
api.post('/content/assignments', staff, validateBody(assignPackSchema), contentController.assignPack);
api.post('/content/assignments/:id/submit', requireRole('learner'), validateBody(responseSchema), contentController.submitAssignment);
api.post('/content/assignments/:id/review', staff, validateBody(feedbackSchema), contentController.reviewAssignment);
api.post('/me/quests/claim', requireRole('learner'), validateBody(claimQuestSchema), contentController.claimQuest);
/* Le Café La Porte: members only (children never reach it: child mode has no API session of its own). */
api.post('/cafe/:op', (req, res) => res.json(runCafe(req.demoUser, req.params.op, req.body)));
/* Demo accounts (no passwords in the prototype). */
api.post('/auth/register', validateBody(registerSchema), (req, res) => res.status(201).json(authService.register(req.body)));
api.post('/auth/login', validateBody(loginSchema), (req, res) => res.json(authService.login(req.body.email)));
api.post('/me/placement/attempt', requireRole('learner'), (req, res) => res.status(201).json(placementService.start(req.demoUser)));
api.post('/me/placement', requireRole('learner'), validateBody(placementSchema), contentController.placement);

// Community: groups (5 learners maximum), classmates, leaderboard, rewards
api.post('/community/cohorts', requireRole('admin'), validateBody(cohortSchema), (req, res) => res.status(201).json(communityService.createCohort(req.demoUser, req.body)));
api.post('/community/cohorts/:id/join', requireRole('learner'), (req, res) => res.json(communityService.joinCohort(req.demoUser, req.params.id)));
api.post('/community/cohorts/:id/leave', requireRole('learner'), (req, res) => res.json(communityService.leaveCohort(req.demoUser, req.params.id)));
api.post('/community/cohorts/:id/sessions', staff, validateBody(cohortSessionSchema), (req, res) => res.status(201).json(communityService.scheduleSession(req.demoUser, req.params.id, req.body)));
api.post('/community/cohorts/:id/sessions/:sid/attendance', staff, validateBody(attendanceSchema), (req, res) => res.json(communityService.takeAttendance(req.demoUser, req.params.id, req.params.sid, req.body.attended)));
api.post('/community/cohorts/:id/assignments', staff, validateBody(groupAssignmentSchema), (req, res) => res.status(201).json(communityService.postGroupAssignment(req.demoUser, req.params.id, req.body)));
api.post('/community/cohorts/:id/assignments/:aid/sharing', staff, validateBody(shareSchema), (req, res) => res.json(communityService.setAnswerSharing(req.demoUser, req.params.id, req.params.aid, req.body.share)));
api.post('/community/cohorts/:id/assignments/:aid/respond', requireRole('learner'), validateBody(responseSchema), (req, res) => res.json(communityService.respondGroupAssignment(req.demoUser, req.params.id, req.params.aid, req.body.response)));
api.post('/community/follow', requireRole('learner'), validateBody(followSchema), (req, res) => res.json(communityService.follow(req.demoUser, req.body.learnerId, req.body.on)));
api.post('/me/leaderboard', requireRole('learner'), validateBody(leaderboardVisibilitySchema), (req, res) => res.json(communityService.setLeaderboardVisibility(req.demoUser, req.body.visible)));
api.post('/me/rewards/:id/redeem', requireRole('learner'), (req, res) => res.json(communityService.redeemToken(req.demoUser, req.params.id)));
/* La Porte Kids: profiles belong to the parent's learner account. */
api.post('/kids', requireRole('learner'), validateBody(kidCreateSchema), (req, res) => res.status(201).json(kidsService.create(req.demoUser, req.body)));
api.patch('/kids/:id', requireRole('learner'), validateBody(kidUpdateSchema), (req, res) => res.json(kidsService.update(req.demoUser, req.params.id, req.body)));
api.delete('/kids/:id', requireRole('learner'), (req, res) => res.json(kidsService.remove(req.demoUser, req.params.id)));
api.post('/kids/activity', requireRole('learner'), validateBody(kidActivitySchema), (req, res) => res.status(201).json(kidsService.record(req.demoUser, req.body)));
api.post('/kids/:id/time', requireRole('learner'), validateBody(kidTimeSchema), (req, res) => res.json(kidsService.logTime(req.demoUser, req.params.id, req.body.minutes)));
api.post('/kids/external-games', staff, validateBody(externalGameSchema), (req, res) => res.status(201).json(kidsService.addExternal(req.demoUser, req.body)));
api.delete('/kids/external-games/:id', staff, (req, res) => res.json(kidsService.removeExternal(req.demoUser, req.params.id)));
/* Live class games: tutors host, children join with a code. */
api.post('/games', staff, validateBody(liveCreateSchema), (req, res) => res.status(201).json(liveGameService.create(req.demoUser, req.body.unitId)));
api.get('/games/:code', (req, res) => res.json(liveGameService.view(req.demoUser, req.params.code, typeof req.query.player === 'string' ? req.query.player : undefined)));
api.post('/games/:code/join', requireRole('learner'), validateBody(liveJoinSchema), (req, res) => res.json(liveGameService.join(req.demoUser, req.params.code, req.body.kidId)));
api.post('/games/:code/advance', staff, (req, res) => res.json(liveGameService.advance(req.demoUser, req.params.code)));
api.post('/games/:code/answer', requireRole('learner'), validateBody(liveAnswerSchema), (req, res) => res.json(liveGameService.answer(req.demoUser, req.params.code, req.body.playerId, req.body.index, req.body.choice)));
api.post('/me/vocabulary/:id/review', requireRole('learner'), validateBody(reviewSchema), (req, res) => res.json(contentService.reviewWord(req.demoUser, req.params.id, req.body.grade)));
api.post('/reports', validateBody(reportSchema), (req, res) => res.status(201).json(contentService.reportMessage(req.demoUser, req.body)));
api.post('/admin/reports/:id/resolve', requireRole('admin'), validateBody(resolveReportSchema), (req, res) => res.json(contentService.resolveReport(req.demoUser, req.params.id, req.body.outcome)));
api.post('/threads', requireRole('learner'), validateBody(startThreadSchema), (req, res) => res.status(201).json(classmateMessaging.start(req.demoUser.id, req.body.participantId, req.body.body)));
api.post('/staff/threads', requireRole('instructor', 'admin'), validateBody(staffThreadSchema), (req, res) => res.status(201).json(staffMessaging.start(req.demoUser.id, req.body.participantId, req.body.subject, req.body.body)));
