import { useContext } from 'react';
import { TikZContext } from './TikZContext';

const useIntegerMode = () => {
  const { integerMode } = useContext(TikZContext);
  return integerMode;
};

export default useIntegerMode;
