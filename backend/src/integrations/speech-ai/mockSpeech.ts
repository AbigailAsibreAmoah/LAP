import { SPEAKING_SCENARIOS } from '@laporte/shared';
import { notFound } from '../../utils/errors';
import type { SpeechAnalyser } from './types';

/** Returns the scenario's labelled sample response. No audio is analysed. */
export function createMockSpeech(): SpeechAnalyser {
  return {
    async analyse({ scenarioId }) {
      const scenario = SPEAKING_SCENARIOS.find((s) => s.id === scenarioId);
      if (!scenario) throw notFound('Scenario');
      return { transcript: scenario.sampleResponse, feedback: { ...scenario.feedback, simulated: true } };
    },
  };
}
