import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { listenForStaleBuilds } from './utils/staleBuild';
import { App } from './App';
import './styles/global.css';
import './styles/kids.css';
import './styles/access.css';
import './styles/practice.css';
import './styles/cafe.css';
import './styles/books.css';
import './styles/passport-map.css';
import './styles/note.css';
import './styles/tutors.css';
import './styles/tutor-profile.css';
import './styles/story.css';
import './styles/paystack.css';
import './styles/presence.css';
import './styles/mobile.css';

listenForStaleBuilds();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
