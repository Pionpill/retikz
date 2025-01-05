import { useContext } from 'react';
import { TikZContext } from './TikZContext';

const useIntegerMode = () => {
  const { integerMode } = useContext(TikZContext);
  return integerMode;
};

export const useInteger = (value: number) => {
  const integerMode = useIntegerMode();
  return integerMode ? Math.round(value) : value;
};

export default useIntegerMode;
