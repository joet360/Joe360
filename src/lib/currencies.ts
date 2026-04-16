export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

// Mock exchange rates relative to USD
// In a production app, these would be fetched from an API
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 151.62,
  INR: 83.31,
};

export const getCurrencySymbol = (code: string) => {
  return CURRENCIES.find(c => c.code === code)?.symbol || '$';
};

export const convertCurrency = (amount: number, from: string, to: string) => {
  if (from === to) return amount;
  const amountInUSD = amount / (EXCHANGE_RATES[from] || 1);
  return amountInUSD * (EXCHANGE_RATES[to] || 1);
};
