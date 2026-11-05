import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ease } from '../components/animations/motion';
import { Brand } from '../components/layout/Brand';
import { LanguageSwitch } from '../components/ui/Controls';
import { Icon } from '../components/ui/Icon';
import { useRouteFocus } from '../hooks/useRouteFocus';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/dictionary';

const NAV: { to: string; key: MessageKey }[] = [
  { to: '/courses', key: 'nav.courses' },
  { to: '/tutors', key: 'nav.tutors' },
  { to: '/how-it-works', key: 'nav.how' },
  { to: '/pricing', key: 'nav.pricing' },
  { to: '/organisations', key: 'nav.corporate' },
  { to: '/about', key: 'nav.about' },
  { to: '/help', key: 'nav.help' },
];

export function PublicLayout() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  // On the landing page the header floats over the photo hero until the visitor scrolls.
  // The original light cover sits under a solid header; set this to a dark-cover route to float the header.
  const overHero = false;
  const toggle = useRef<HTMLButtonElement>(null);
  useRouteFocus('main');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  // Mobile menu: Escape closes it and returns focus to the toggle.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenu(false);
      toggle.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);

  return (
    <>
      <a href="#main" className="skip-link">
        {t('nav.skip')}
      </a>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span><Icon name="globe" size={13} /> {t('home.trust1')}</span>
          <span className="desktop-only"><Icon name="meet" size={13} /> {t('home.trust2')}</span>
          <span className="utility-right"><Icon name="card" size={13} /> {t('home.trust3')}</span>
        </div>
      </div>
      <header className={`site-header${scrolled ? ' scrolled' : ''}${overHero ? ' over-hero' : ''}`}>
        <div className="container inner">
          <Brand light={overHero} />
          <nav className="main-nav" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to}>
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <LanguageSwitch dark={overHero} />
            <Link to="/login" className="btn btn-ghost desktop-only">
              {t('nav.login')}
            </Link>
            <Link to="/register" className={`btn desktop-only ${overHero ? 'btn-on-photo' : 'btn-primary'}`}>
              {t('nav.start')}
            </Link>
            <button ref={toggle} className="icon-btn mobile-only" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="mobile-menu" aria-label={menu ? t('nav.close') : t('nav.menu')}>
              <Icon name={menu ? 'x' : 'menu'} size={18} />
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.nav id="mobile-menu" className="mobile-menu" aria-label="Mobile" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: ease.out }}>
            {NAV.map((n) => (
              <Link key={n.to} to={n.to}>
                {t(n.key)}
              </Link>
            ))}
            <div className="stack" style={{ marginTop: 24 }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                {t('nav.start')}
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                {t('nav.login')}
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function Footer() {
  const { t, lang } = useI18n();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="stack" style={{ ['--gap' as string]: '16px' }}>
            <Brand light />
            <p style={{ maxWidth: 340 }}>{t('brand.promise')}</p>
            <span className="demo-tag" style={{ alignSelf: 'flex-start', color: '#E7C78F', background: 'transparent', borderColor: 'rgba(231,199,143,.5)' }}>
              {lang === 'fr' ? 'Prototype de démonstration' : 'Demonstration prototype'}
            </span>
          </div>
          <div className="stack" style={{ ['--gap' as string]: '10px' }}>
            <h2 className="h4">{t('nav.courses')}</h2>
            <Link to="/courses">{t('courses.pathways')}</Link>
            <Link to="/tutors">{t('nav.tutors')}</Link>
            <Link to="/pricing">{t('nav.pricing')}</Link>
          </div>
          <div className="stack" style={{ ['--gap' as string]: '10px' }}>
            <h2 className="h4">{t('nav.about')}</h2>
            <Link to="/about">{t('nav.about')}</Link>
            <Link to="/how-it-works">{t('nav.how')}</Link>
            <Link to="/organisations">{t('nav.corporate')}</Link>
          </div>
          <div className="stack" style={{ ['--gap' as string]: '10px' }}>
            <h2 className="h4">{t('nav.help')}</h2>
            <Link to="/help">FAQ</Link>
            <Link to="/login">{t('nav.login')}</Link>
            <Link to="/app">{t('nav.enterDemo')}</Link>
          </div>
        </div>
        <hr className="divider" style={{ background: 'rgba(255,255,255,.1)', margin: '40px 0 20px' }} />
        <p className="tiny">© 2026 La Porte French Institute · {lang === 'fr' ? 'Contenus, tarifs et profils de démonstration.' : 'Demo content, pricing and profiles.'}</p>
      </div>
    </footer>
  );
}
