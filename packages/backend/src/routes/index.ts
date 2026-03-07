import type { App } from '../lib/fastify.js';

import { aiRoutes } from './ai.routes.js';
import { homeRoutes } from './home.routes.js';
import { meRoutes } from './me.routes.js';
import { statsRoutes } from './stats.routes.js';
import { workoutPlanRoutes } from './workout-plan.routes.js';

export const routes = async (server: App) => {
  server.register(aiRoutes, { prefix: '/ai' });
  server.register(homeRoutes, { prefix: '/home' });
  server.register(meRoutes, { prefix: '/me' });
  server.register(statsRoutes, { prefix: '/stats' });
  server.register(workoutPlanRoutes, { prefix: '/workout-plans' });
};
