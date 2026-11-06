import { MotionConfig } from 'motion/react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toasts';
import { I18nProvider } from './i18n/I18nProvider';
import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { HomePage } from './pages/public/HomePage';
import { AboutPage, AuthPage, CorporatePage, CourseDetailPage, CoursesPage, HelpPage, HowItWorksPage, PricingPage } from './pages/public/PublicPages';
import { AppStoreProvider } from './state/AppStore';
import { importFresh } from './utils/staleBuild';

// Workspaces are split from the public site so the first visit loads only what it needs.
// If a newer version was deployed while the tab was open, importFresh reloads instead of failing.
const named = <M, K extends keyof M>(load: () => Promise<M>, key: K) =>
  lazy(() => importFresh(load)().then((m) => (m ? { default: m[key] as React.ComponentType } : new Promise<never>(() => undefined)))); // no module: the page is reloading
const learner = () => import('./pages/learner/LearnerPages');
const DashboardPage = named(() => import('./pages/learner/DashboardPage'), 'DashboardPage');
const LessonPage = named(learner, 'LessonPage');
const StudioPage = named(learner, 'StudioPage');
const PassportPage = named(learner, 'PassportPage');
const VocabularyPage = named(learner, 'VocabularyPage');
const NotificationsPage = named(learner, 'NotificationsPage');
const LearnerHelpPage = named(learner, 'LearnerHelpPage');
const BookPage = named(() => import('./pages/learner/BookingPages'), 'BookPage');
const TutorsDirectoryPage = named(() => import('./pages/learner/TutorPages'), 'TutorsDirectoryPage');
const TutorProfilePage = named(() => import('./pages/learner/TutorPages'), 'TutorProfilePage');
const MyLessonsPage = named(() => import('./pages/learner/BookingPages'), 'MyLessonsPage');
const BillingPage = named(() => import('./pages/learner/BillingPages'), 'BillingPage');
const CheckoutPage = named(() => import('./pages/learner/BillingPages'), 'CheckoutPage');
const MessagesPage = named(() => import('./pages/shared/MessagesPage'), 'MessagesPage');
const KidsProfilesPage = named(() => import('./pages/kids/KidsPages'), 'KidsProfilesPage');
const KidModePage = named(() => import('./pages/kids/KidsPages'), 'KidModePage');
const StartPage = named(() => import('./pages/onboarding/StartPage'), 'StartPage');
const CafePage = named(() => import('./pages/cafe/CafePage'), 'CafePage');
const KidsGamesHostPage = named(() => import('./pages/kids/HostGamesPage'), 'KidsGamesHostPage');
const InstructorDashboard = named(() => import('./pages/instructor/InstructorPages'), 'InstructorDashboard');
const AvailabilityPage = named(() => import('./pages/instructor/InstructorPages'), 'AvailabilityPage');
const InstructorLearnersPage = named(() => import('./pages/instructor/InstructorPages'), 'InstructorLearnersPage');
const AdminPage = named(() => import('./pages/admin/AdminPages'), 'AdminPage');
const content = () => import('./pages/content/ContentPages');
const practice = () => import('./pages/content/PracticePages');
const ContentLibraryPage = named(content, 'ContentLibraryPage');
const LessonEditorPage = named(content, 'LessonEditorPage');
const ImmersionPage = named(practice, 'ImmersionPage');
const MyPracticePage = named(practice, 'MyPracticePage');
const PlacementPage = named(practice, 'PlacementPage');
const community = () => import('./pages/community/CommunityPages');
const CommunityPage = named(community, 'CommunityPage');
const MyGroupPage = named(community, 'MyGroupPage');
const GroupsPage = named(community, 'GroupsPage');

export function App() {
  return (
    <I18nProvider>
      <AppStoreProvider>
        <ToastProvider>
          {/* "user" honours prefers-reduced-motion for every Motion animation */}
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <ErrorBoundary>
              <Suspense fallback={<div className="app-content muted small" role="status" aria-live="polite">Loading… / Chargement…</div>}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="courses" element={<CoursesPage />} />
                  <Route path="courses/:id" element={<CourseDetailPage />} />
                  <Route path="how-it-works" element={<HowItWorksPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="organisations" element={<CorporatePage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="help" element={<HelpPage />} />
                  <Route path="login" element={<AuthPage mode="login" />} />
                  <Route path="register" element={<AuthPage mode="register" />} />
                </Route>
                <Route path="app" element={<AppLayout role="learner" />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="courses" element={<CoursesPage inApp />} />
                  <Route path="courses/:id" element={<CourseDetailPage inApp />} />
                  <Route path="learn/:lessonId" element={<LessonPage />} />
                  <Route path="studio" element={<StudioPage />} />
                  <Route path="passport" element={<PassportPage />} />
                  <Route path="practice" element={<MyPracticePage />} />
                  <Route path="group" element={<MyGroupPage />} />
                  <Route path="community" element={<CommunityPage />} />
                  <Route path="placement" element={<PlacementPage />} />
                  <Route path="tutors" element={<TutorsDirectoryPage />} />
                  <Route path="tutors/:id" element={<TutorProfilePage />} />
                  <Route path="book" element={<BookPage />} />
                  <Route path="lessons" element={<MyLessonsPage />} />
                  <Route path="vocabulary" element={<VocabularyPage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="checkout/:planId" element={<CheckoutPage />} />
                  <Route path="help" element={<LearnerHelpPage />} />
                  <Route path="kids" element={<KidsProfilesPage />} />
                  <Route path="cafe" element={<CafePage />} />
                </Route>
                <Route path="instructor" element={<AppLayout role="instructor" />}>
                  <Route index element={<InstructorDashboard />} />
                  <Route path="availability" element={<AvailabilityPage />} />
                  <Route path="learners" element={<InstructorLearnersPage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path="content" element={<ContentLibraryPage />} />
                  <Route path="content/lessons/:lessonId" element={<LessonEditorPage />} />
                  <Route path="immersion" element={<ImmersionPage />} />
                  <Route path="groups" element={<GroupsPage />} />
                  <Route path="games" element={<KidsGamesHostPage />} />
                  <Route path="cafe" element={<CafePage />} />
                </Route>
                <Route path="admin" element={<AppLayout role="admin" />}>
                  <Route index element={<AdminPage />} />
                  <Route path="content" element={<ContentLibraryPage />} />
                  <Route path="content/lessons/:lessonId" element={<LessonEditorPage />} />
                  <Route path="immersion" element={<ImmersionPage />} />
                  <Route path="groups" element={<GroupsPage />} />
                  <Route path="games" element={<KidsGamesHostPage />} />
                  <Route path="cafe" element={<CafePage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path=":section" element={<AdminPage />} />
                </Route>
                {/* Child mode sits outside the app layout: no sidebar, classmates, messages or calls. */}
                <Route path="kids/:id" element={<KidModePage />} />
                {/* After sign-up: a separate screen to take the entry assessment or start at A1. */}
                <Route path="start" element={<StartPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </MotionConfig>
        </ToastProvider>
      </AppStoreProvider>
    </I18nProvider>
  );
}
