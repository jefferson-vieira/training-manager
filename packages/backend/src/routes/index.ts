import type { App } from '../lib/fastify.js';

import { homeRoutes } from './home.routes.js';
import { statsRoutes } from './stats.routes.js';
import { workoutPlanRoutes } from './workout-plan.routes.js';

export const routes = async (server: App) => {
  server.register(homeRoutes, { prefix: '/home' });
  server.register(statsRoutes, { prefix: '/stats' });
  server.register(workoutPlanRoutes, { prefix: '/workout-plans' });
};
