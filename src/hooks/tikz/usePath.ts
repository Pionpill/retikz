import { createContext, useContext } from 'react';
import PathModel, { StateListener } from '../../model/component/path';
import { Position } from '../../types/coordinate/descartes';

export const PathContext = createContext<PathModel | null>(null);

const usePath = () => {
  const pathModel = useContext(PathContext);
  if (!pathModel) throw new Error('usePath must be used within a PathProvider');
  return {
    model: pathModel,
    subscribeModel: (listener: StateListener) => {
      if (!pathModel) return;
      return pathModel.subscribe(listener);
    },
    updateModel: (config: {ways?: Array<Position[]>, lineWidth?: number, init?: boolean}) => {
      pathModel?.update(config);
    },
  };
};

export default usePath;
