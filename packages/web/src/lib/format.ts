const EMPTY_VALUE = '—';

const isEmpty = (value: null | number | undefined): value is null | undefined =>
  value === null || value === undefined;

const trimDecimal = (value: number, fractionDigits: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(fractionDigits);

/** Age in years → integer label (30 → "30"). Unit ("Anos") is rendered separately. */
export function formatAge(age: null | number | undefined): string {
  if (isEmpty(age)) return EMPTY_VALUE;

  return String(age);
}

/** Body fat on the 0–1000 domain scale → percentage (225 → "22.5%"). */
export function formatBodyFat(
  bodyFatPercentage: null | number | undefined,
): string {
  if (isEmpty(bodyFatPercentage)) return EMPTY_VALUE;

  return `${trimDecimal(bodyFatPercentage / 10, 1)}%`;
}

/** Conclusion rate on a 0–1 scale → whole-number percentage (0.64 → "64%"). */
export function formatCompletionRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Height stored in centimeters → integer cm (168 → "168"). Unit ("Cm") is rendered separately. */
export function formatHeight(
  heightInCentimeters: null | number | undefined,
): string {
  if (isEmpty(heightInCentimeters)) return EMPTY_VALUE;

  return String(heightInCentimeters);
}

/** Total training time in seconds → hours and minutes ("115h40m", "0h00m"). */
export function formatTotalTime(totalSeconds: number): string {
  const totalMinutes = Math.floor(totalSeconds / 60);

  const hours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;

  return `${hours}h${String(minutes).padStart(2, '0')}m`;
}

/** Weight stored in grams → kilograms (78500 → "78.5"). Unit ("Kg") is rendered separately. */
export function formatWeight(weightInGrams: null | number | undefined): string {
  if (isEmpty(weightInGrams)) return EMPTY_VALUE;

  return trimDecimal(weightInGrams / 1000, 1);
}
