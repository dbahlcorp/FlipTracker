import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCY_KEY = '@flip_tracker_currency';

export const CURRENCIES = {
  USD: '$',
  CAD: 'CA$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  JPY: '¥',
};

// Approximate exchange rates relative to 1 USD. Static and manually maintained —
// this app has no backend, so rates aren't fetched live. Update here as needed.
export const EXCHANGE_RATES = {
  USD: 1,
  CAD: 1.38,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  JPY: 156,
};

export function convertAmount(amount, fromCurrency, toCurrency) {
  const value = amount || 0;
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return value;
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;
  return (value / fromRate) * toRate;
}

const CurrencyContext = createContext({
  currency: 'USD',
  symbol: '$',
  setCurrency: () => {},
  convert: (amount) => amount,
});

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState('USD');

  useEffect(() => {
    AsyncStorage.getItem(CURRENCY_KEY).then((val) => {
      if (val && CURRENCIES[val]) setCurrencyState(val);
    });
  }, []);

  const setCurrency = async (c) => {
    setCurrencyState(c);
    await AsyncStorage.setItem(CURRENCY_KEY, c);
  };

  const symbol = CURRENCIES[currency];

  // Converts an amount recorded in `fromCurrency` (a flip's native currency) into
  // the currently selected display currency, so switching currency actually
  // recomputes totals instead of just relabeling the symbol.
  const convert = (amount, fromCurrency) => convertAmount(amount, fromCurrency || currency, currency);

  return (
    <CurrencyContext.Provider value={{ currency, symbol, setCurrency, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
