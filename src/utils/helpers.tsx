export const formatCurrency = (value: number, round: boolean) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  });

  const roundedValue = Math.round(value / 5) * 5;
  const formattedValue = formatter.format(round ? roundedValue : value);

  // Return the formatted and rounded value
  return formattedValue;
};
