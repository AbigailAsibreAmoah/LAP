import { createApp } from './app';
import { env } from './config/env';

createApp().listen(env.port, () => {
  console.log(`La Porte API (demo mode) listening on http://localhost:${env.port}/api`);
});
