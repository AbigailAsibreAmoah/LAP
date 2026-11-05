import { COURSE_AREAS, TUTORS, type Accent, type Course, type CourseAreaId } from '@laporte/shared';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/3d/Portrait';
import { fadeUp } from '../../components/animations/motion';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useI18n } from '../../i18n/I18nProvider';

export const AREA_ICON: Record<CourseAreaId, IconName> = {
  conversational: 'message',
  business: 'briefcase',
  diplomacy: 'globe',
  policy: 'layers',
  entrepreneurship: 'chart',
  everyday: 'home',
  academic: 'award',
  exams: 'file',
};

export const ACCENT_BG: Record<Accent, string> = {
  navy: 'linear-gradient(135deg, #2A3460 0%, #141B34 100%)',
  burgundy: 'linear-gradient(135deg, #8A2340 0%, #5A1027 100%)',
  gold: 'linear-gradient(135deg, #D9B57A 0%, #A97F40 100%)',
  green: 'linear-gradient(135deg, #2C8564 0%, #17523C 100%)',
};

/** A dimensional emblem: stacked, lit tiles with the course-area icon. */
export function AreaEmblem({ area, accent, size = 64 }: { area: CourseAreaId; accent: Accent; size?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }} aria-hidden>
      <span style={{ position: 'absolute', inset: 0, transform: 'translate(8px, 8px)', borderRadius: size * 0.3, background: 'rgba(255,255,255,.14)' }} />
      <span style={{ position: 'absolute', inset: 0, transform: 'translate(4px, 4px)', borderRadius: size * 0.3, background: 'rgba(255,255,255,.22)' }} />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: size * 0.3,
          background: 'linear-gradient(145deg, #FFFFFF 0%, #F1E8DA 100%)',
          color: accent === 'gold' ? '#7A5A24' : `var(--${accent === 'navy' ? 'navy' : accent})`,
          boxShadow: 'inset 0 1px 0 #fff, 0 10px 20px -8px rgba(0,0,0,.45)',
        }}
      >
        <Icon name={AREA_ICON[area]} size={size * 0.44} />
      </span>
    </span>
  );
}

export function CourseCard({ course, to }: { course: Course; to: string }) {
  const { t, l } = useI18n();
  const area = COURSE_AREAS.find((a) => a.id === course.area)!;
  const tutor = TUTORS.find((tu) => tu.id === course.tutorId)!;
  const lessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  return (
    <motion.article variants={fadeUp} className="card card-interactive" style={{ ['--pad' as string]: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Link to={to} style={{ display: 'flex', flexDirection: 'column', height: '100%' }} aria-label={l(course.title)}>
        <div style={{ position: 'relative', height: 112, background: ACCENT_BG[course.accent], padding: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <AreaEmblem area={course.area} accent={course.accent} />
          <span className="chip" style={{ background: 'rgba(255,255,255,.92)' }}>{course.levels}</span>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <span className="tiny" style={{ fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--burgundy)' }}>{l(area.name)}</span>
          <h3 style={{ fontSize: '1.2rem' }}>{l(course.title)}</h3>
          <p className="small muted" style={{ flex: 1 }}>{l(course.summary)}</p>
          <div className="row between" style={{ marginTop: 6 }}>
            <span className="row tiny muted" style={{ ['--gap' as string]: '8px' }}>
              <Avatar spec={tutor.portrait} size={26} />
              {course.durationWeeks} {t('courses.weeks')} · {lessons} {t('courses.lessons')}
            </span>
            <span className={`chip ${course.premium ? 'chip-gold' : ''}`}>{course.premium ? t('courses.premium') : t('courses.included')}</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
