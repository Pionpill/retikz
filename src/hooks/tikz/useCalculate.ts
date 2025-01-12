import { createContext, useContext } from 'react';
import { convertPrecision } from '../../utils/math';

export type CalculateProps = {
  precision: number | false;
};

export const CalculateContext = createContext<CalculateProps>({ precision: 2 });

const useCalculate = () => {
  return useContext(CalculateContext);
};

export const useCalculateValue = (value: number, deep = true) => {
  const { precision } = useCalculate();
  return convertPrecision(value, precision, deep);
};

export default useCalculate;
