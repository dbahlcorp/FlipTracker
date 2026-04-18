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

const CurrencyContext = createContext({
  currency: 'USD',
  symbol: '$',
  setCurrency: () => {},
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

  return (
    <CurrencyContext.Provider value={{ currency, symbol, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
