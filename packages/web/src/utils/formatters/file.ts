import { bytesToMB } from '@/utils/file';

const formatter = new Intl.NumberFormat(navigator.language, {
  maximumFractionDigits: 2,
  style: 'unit',
  unit: 'megabyte',
  unitDisplay: 'short',
});

export function formatBytesInMB(bytes: number) {
  return formatter.format(bytesToMB(bytes));
}
