import { NotFoundError } from '../../errors/NotFoundError.js';
import { WeekDay } from '../../generated/prisma/enums.js';
import { prisma } from '../../lib/db.js';

interface InputDto {
  userId: string;
}

// `enum WeekDay` is declared Sunday-first in schema.prisma and PostgreSQL orders enums
// by declaration order, so `orderBy: { weekDay: 'asc' }` would return a rotated week.
// The Monday-first order is a contract promise of this endpoint, so sort explicitly.
const WEEK_ORDER: WeekDay[] = [
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
  WeekDay.SUNDAY,
];

export class GetActiveWorkoutPlan {
  async execute(dto: InputDto) {
    const workoutPlan = await prisma.workoutPlan.findFirst({
      include: {
        workoutDays: {
          include: {
            _count: {
              select: {
                exercises: true,
              },
            },
          },
        },
      },
      where: {
        isActive: true,
        userId: dto.userId,
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError('Active workout plan not found');
    }

    return {
      ...workoutPlan,
      workoutDays: workoutPlan.workoutDays
        .map(({ _count, ...workoutDay }) => ({
          ...workoutDay,
          exercisesCount: _count.exercises,
        }))
        .sort(
          (a, b) =>
            WEEK_ORDER.indexOf(a.weekDay) - WEEK_ORDER.indexOf(b.weekDay),
        ),
    };
  }
}
