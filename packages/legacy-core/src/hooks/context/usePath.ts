import { createContext, useContext } from 'react';
import type { StateListener } from '../../model/component/path';
import type PathModel from '../../model/component/path';
import type { Position } from '../../types/coordinate/descartes';

export const PathContext = createContext<PathModel | null>(null);

const usePath = () => {
  const pathModel = useContext(PathContext);
  if (!pathModel) throw new Error('usePath must be used within a PathProvider');
  return {
    model: pathModel,
    subscribeModel: (listener: StateListener) => {
      return pathModel.subscribe(listener);
    },
    updateModel: (config: { ways?: Array<Array<Position>>; lineWidth?: number; init?: boolean }) => {
      pathModel.update(config);
    },
  };
};

export default usePath;
