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

/** Height stored in centimeters → integer cm (168 → "168"). Unit ("Cm") is rendered separately. */
export function formatHeight(
  heightInCentimeters: null | number | undefined,
): string {
  if (isEmpty(heightInCentimeters)) return EMPTY_VALUE;

  return String(heightInCentimeters);
}

/** Weight stored in grams → kilograms (78500 → "78.5"). Unit ("Kg") is rendered separately. */
export function formatWeight(weightInGrams: null | number | undefined): string {
  if (isEmpty(weightInGrams)) return EMPTY_VALUE;

  return trimDecimal(weightInGrams / 1000, 1);
}
