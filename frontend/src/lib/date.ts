const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const formatDateTime = (date: Date | null): string =>
  date ? dateTimeFormatter.format(date) : 'Not set';

const pad = (value: number): string => value.toString().padStart(2, '0');

export const toInputDate = (date: Date | null): string => {
  if (!date) {
    return '';
  }
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

export const fromInputDate = (value: string): string | null => {
  if (!value || value.trim().length === 0) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number.parseInt(yearStr ?? '', 10);
  const month = Number.parseInt(monthStr ?? '', 10);
  const day = Number.parseInt(dayStr ?? '', 10);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};
