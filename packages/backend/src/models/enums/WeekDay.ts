import { WeekDay as PrismaWeekDay } from '../../generated/prisma/enums.js';

/* eslint-disable perfectionist/sort-objects */
export const WeekDay = {
  0: PrismaWeekDay.SUNDAY,
  1: PrismaWeekDay.MONDAY,
  2: PrismaWeekDay.TUESDAY,
  3: PrismaWeekDay.WEDNESDAY,
  4: PrismaWeekDay.THURSDAY,
  5: PrismaWeekDay.FRIDAY,
  6: PrismaWeekDay.SATURDAY,

  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export type WeekDay = (typeof WeekDay)[keyof typeof WeekDay];
