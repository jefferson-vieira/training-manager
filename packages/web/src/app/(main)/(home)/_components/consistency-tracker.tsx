import dayjs from 'dayjs';

import type { GetHomeData200ConsistencyByDay } from '@/lib/api/fetch-generated';

import { ConsistencySquare } from './consistency-square';

const WEEKDAY_SHORT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

interface ConsistencyTrackerProps {
  consistencyByDay: GetHomeData200ConsistencyByDay;
}

export function ConsistencyTracker({
  consistencyByDay,
}: ConsistencyTrackerProps) {
  const today = dayjs();

  const weekDates = getWeekDates(today);

  const todayStr = today.format('YYYY-MM-DD');

  return (
    <div className="flex items-center justify-between">
      {weekDates.map((date, index) => {
        const dateStr = date.format('YYYY-MM-DD');

        const dayData = consistencyByDay[dateStr];

        return (
          <div key={dateStr} className="flex flex-col items-center gap-1.5">
            <ConsistencySquare
              completed={dayData?.workoutDayCompleted ?? false}
              isToday={dateStr === todayStr}
              started={dayData?.workoutDayStarted ?? false}
            />
            <span className="font-heading text-xs text-muted-foreground">
              {WEEKDAY_SHORT[index]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function getWeekDates(today: dayjs.Dayjs) {
  const monday =
    today.day() === 0
      ? today.subtract(6, 'day')
      : today.subtract(today.day() - 1, 'day');

  return Array.from({ length: 7 }, (_, i) => monday.add(i, 'day'));
}
