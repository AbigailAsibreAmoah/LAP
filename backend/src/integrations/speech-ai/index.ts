import { env } from '../../config/env';
import { liveAdapterNotImplemented } from '../notConfigured';
import { createMockSpeech } from './mockSpeech';
import type { SpeechAnalyser } from './types';

export type { SpeechAnalyser } from './types';

export function createSpeechAnalyser(): SpeechAnalyser {
  return env.providers.speech === 'live' ? liveAdapterNotImplemented('Speech AI') : createMockSpeech();
}
