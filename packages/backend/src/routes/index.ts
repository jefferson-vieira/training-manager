import type { App } from '../lib/fastify.js';

import { homeRoutes } from './home.routes.js';
import { workoutPlanRoutes } from './workout-plan.routes.js';

export const routes = async (server: App) => {
  server.register(workoutPlanRoutes, { prefix: '/workout-plans' });
  server.register(homeRoutes, { prefix: '/home' });
};
