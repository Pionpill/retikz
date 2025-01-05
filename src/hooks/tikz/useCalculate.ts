import { createContext, useContext } from 'react';

export const CalculateContext = createContext({integerMode: false});

const useCalculate = () => {
  const { integerMode } = useContext(CalculateContext);
  return integerMode;
};

export const useCalculateValue = (value: number) => {
  const integerMode = useCalculate();
  return integerMode ? Math.round(value) : value;
};

export default useCalculate;
