import { format } from 'date-fns';

export const formatCurrency = (value: number, round: boolean) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  });

  const roundedValue = Math.round(value / 5) * 5;
  const formattedValue = formatter.format(round ? roundedValue : value);

  return formattedValue;
};

export const formatDate = (date: string, dateFormat: string) => {
  const newDate = date ? new Date(date) : new Date();

  const res = format(newDate, dateFormat);
  return res;
};
