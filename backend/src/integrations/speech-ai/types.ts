import type { SpeakingFeedback } from '@laporte/shared';

export interface AnalyseSpeechInput {
  scenarioId: string;
  /** Present only once real recording is implemented. */
  audio?: ArrayBuffer;
}

/** Contract for speech recognition + pronunciation/conversation feedback. */
export interface SpeechAnalyser {
  analyse(input: AnalyseSpeechInput): Promise<{ transcript: string; feedback: SpeakingFeedback }>;
}
