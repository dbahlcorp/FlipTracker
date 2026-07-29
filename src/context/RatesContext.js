import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LABOUR_RATE_KEY = '@flip_tracker_labour_rate';
const LASER_RATE_KEY = '@flip_tracker_laser_rate';

const RatesContext = createContext({
  labourRate: 0,
  laserRate: 0,
  setLabourRate: () => {},
  setLaserRate: () => {},
});

export function RatesProvider({ children }) {
  const [labourRate, setLabourRateState] = useState(0);
  const [laserRate, setLaserRateState] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(LABOUR_RATE_KEY).then((val) => {
      if (val) setLabourRateState(parseFloat(val) || 0);
    });
    AsyncStorage.getItem(LASER_RATE_KEY).then((val) => {
      if (val) setLaserRateState(parseFloat(val) || 0);
    });
  }, []);

  const setLabourRate = async (rate) => {
    setLabourRateState(rate);
    await AsyncStorage.setItem(LABOUR_RATE_KEY, String(rate));
  };

  const setLaserRate = async (rate) => {
    setLaserRateState(rate);
    await AsyncStorage.setItem(LASER_RATE_KEY, String(rate));
  };

  return (
    <RatesContext.Provider value={{ labourRate, laserRate, setLabourRate, setLaserRate }}>
      {children}
    </RatesContext.Provider>
  );
}

export const useRates = () => useContext(RatesContext);
