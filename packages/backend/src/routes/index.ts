import type { App } from '../lib/fastify.js';

import { workoutPlanRoutes } from './workout-plan.routes.js';

export const routes = async (server: App) => {
  server.register(workoutPlanRoutes, { prefix: '/workout-plans' });
};
