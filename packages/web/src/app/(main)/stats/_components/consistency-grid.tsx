'use client';

import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import { useState } from 'react';

import type { GetApiStats200ConsistencyByDay } from '@/lib/api/fetch-generated';

import { ConsistencySquare } from '@/components/consistency-square';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

dayjs.extend(isToday);

const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface ConsistencyGridProps {
  consistencyByDay: GetApiStats200ConsistencyByDay;
  from: string;
  to: string;
}

interface DayCellProps {
  completed: boolean;
  day: dayjs.Dayjs;
  started: boolean;
}

interface MonthGroup {
  label: string;
  monthKey: string;
  weeks: dayjs.Dayjs[][];
}

export function ConsistencyGrid({
  consistencyByDay,
  from,
  to,
}: ConsistencyGridProps) {
  const monthGroups = getMonthGroups(from, to);

  return (
    <TooltipProvider>
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border p-5">
        <div className="flex flex-col gap-1.5 pr-1">
          <span
            aria-hidden
            className="font-heading text-xs leading-[1.4] text-muted-foreground"
          >
            &nbsp;
          </span>

          <div className="flex flex-col gap-1">
            {WEEKDAY_LABELS.map((weekday) => (
              <span
                key={weekday}
                className="font-heading flex h-5 items-center text-xs leading-[1.4] text-muted-foreground"
              >
                {weekday}
              </span>
            ))}
          </div>
        </div>

        {monthGroups.map((group) => (
          <div key={group.monthKey} className="flex flex-col gap-1.5">
            <span className="font-heading text-xs leading-[1.4] text-muted-foreground">
              {group.label}
            </span>

            <div className="flex gap-1">
              {group.weeks.map((week) => (
                <div
                  key={week[0].format('YYYY-MM-DD')}
                  className="flex flex-col gap-1"
                >
                  {week.map((day) => {
                    const dateKey = day.format('YYYY-MM-DD');

                    const dayData = consistencyByDay[dateKey];

                    return (
                      <DayCell
                        key={dateKey}
                        completed={dayData?.workoutDayCompleted ?? false}
                        day={day}
                        started={dayData?.workoutDayStarted ?? false}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

function DayCell({ completed, day, started }: DayCellProps) {
  const [open, setOpen] = useState(false);

  const label = day.format('DD/MM');

  return (
    <Tooltip open={open}>
      <TooltipTrigger
        aria-label={label}
        className="flex rounded-md"
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
      >
        <ConsistencySquare
          completed={completed}
          isToday={day.isToday()}
          started={started}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Builds Sun→Sat week columns across [from, to], grouped by the month of each column's Sunday. */
function getMonthGroups(from: string, to: string): MonthGroup[] {
  const start = dayjs(from).day(0);

  const end = dayjs(to).day(6);

  const groups: MonthGroup[] = [];

  let cursor = start;

  while (!cursor.isAfter(end)) {
    const week = Array.from({ length: 7 }, (_, index) =>
      cursor.add(index, 'day'),
    );

    const monthKey = cursor.format('YYYY-MM');

    const lastGroup = groups.at(-1);

    if (lastGroup?.monthKey === monthKey) {
      lastGroup.weeks.push(week);
    } else {
      groups.push({
        label: MONTH_LABELS[cursor.month()],
        monthKey,
        weeks: [week],
      });
    }

    cursor = cursor.add(7, 'day');
  }

  return groups;
}
