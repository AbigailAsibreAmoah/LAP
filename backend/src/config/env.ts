type ProviderMode = 'mock' | 'live';

function mode(name: string): ProviderMode {
  const value = (process.env[name] ?? 'mock').toLowerCase();
  if (value !== 'mock' && value !== 'live') {
    throw new Error(`${name} must be "mock" or "live" (got "${value}")`);
  }
  return value;
}

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  /**
   * Where the content library (lessons, media records, packs, progress) is saved as JSON.
   * "memory" keeps it in memory only (tests; read-only hosts such as serverless functions).
   */
  contentStore: process.env.CONTENT_STORE ?? (isTest ? 'memory' : 'data/content.json'),
  /** Uploaded video and audio files. */
  uploadDir: process.env.UPLOAD_DIR ?? (isTest ? '' : 'data/uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 500),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  /** /api/demo/* snapshot + reset. Off in production unless explicitly enabled. */
  demoRoutes: process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_ROUTES === 'true',
  providers: {
    payments: mode('PAYMENTS_PROVIDER'),
    meetings: mode('MEETINGS_PROVIDER'),
    calendar: mode('CALENDAR_PROVIDER'),
    notifications: mode('NOTIFICATIONS_PROVIDER'),
    speech: mode('SPEECH_PROVIDER'),
  },
};
