import type { GetWorkoutDay200WeekDay } from '@/lib/api/fetch-generated';

// Title case is the storable form: the day card uppercases via CSS, while the day
// screen header renders the label as-is.
export const WEEKDAY_LABELS: Record<GetWorkoutDay200WeekDay, string> = {
  FRIDAY: 'Sexta',
  MONDAY: 'Segunda',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
  THURSDAY: 'Quinta',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
};

export const HOME_ORIGIN = 'home';

// The weekday label is the default; "Treino de Hoje" is the marked special case, so
// deep links and refreshes without the marker stay coherent.
export function getWorkoutDayTitle(
  weekDay: GetWorkoutDay200WeekDay,
  origin?: string,
) {
  if (origin === HOME_ORIGIN) {
    return 'Treino de Hoje';
  }

  return WEEKDAY_LABELS[weekDay];
}
