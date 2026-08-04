import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

import type { WeekDay as PrismaWeekDay } from '../../generated/prisma/enums.js';

import { WeekDay } from '../../models/enums/WeekDay.js';

dayjs.extend(utc);

export type PlanSchedule = {
  createdAt: Dayjs;
  scheduledWeekDays: Set<PrismaWeekDay>;
}[];

interface PlanInput {
  createdAt: Date;
  workoutDays: { isRest: boolean; weekDay: PrismaWeekDay }[];
}

/** Plans newest-first, each with the weekdays it schedules a workout on. */
export function buildPlanSchedule(workoutPlans: PlanInput[]): PlanSchedule {
  return workoutPlans
    .map(({ createdAt, workoutDays }) => ({
      createdAt: dayjs.utc(createdAt),
      scheduledWeekDays: new Set(
        workoutDays
          .filter(({ isRest }) => !isRest)
          .map(({ weekDay }) => weekDay),
      ),
    }))
    .sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());
}

/**
 * Did any scheduled day strictly after `afterDay` and up to `throughDay` fully
 * elapse without a workout? `throughDay` itself is excluded when it is today —
 * the user still has the rest of the day to train (FR-008).
 */
export function hasMissedScheduledDay({
  afterDay,
  completedDays,
  schedule,
  throughDay,
}: {
  afterDay: string;
  completedDays: ReadonlySet<string>;
  schedule: PlanSchedule;
  throughDay: string;
}): boolean {
  const today = dayjs.utc().format('YYYY-MM-DD');

  let day = dayjs.utc(afterDay).add(1, 'day');

  while (toStreakDayFromDayjs(day) <= throughDay) {
    const key = toStreakDayFromDayjs(day);

    if (key === today) {
      return false;
    }

    if (!completedDays.has(key) && wasScheduledOn(day, schedule)) {
      return true;
    }

    day = day.add(1, 'day');
  }

  return false;
}

/** The UTC calendar day a workout belongs to. */
export function toStreakDay(date: Date): string {
  return dayjs.utc(date).format('YYYY-MM-DD');
}

export function toStreakDayFromDayjs(day: Dayjs): string {
  return day.utc().format('YYYY-MM-DD');
}

/**
 * Was `day` a scheduled workout day under the plan in effect on that day?
 * Days before the user's first plan are not scheduled.
 */
export function wasScheduledOn(day: Dayjs, schedule: PlanSchedule): boolean {
  const plan = schedule.find(({ createdAt }) => !createdAt.isAfter(day, 'day'));

  if (!plan) {
    return false;
  }

  return plan.scheduledWeekDays.has(WeekDay[day.utc().day()]);
}
