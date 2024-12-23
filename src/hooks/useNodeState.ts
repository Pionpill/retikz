import { useSyncExternalStore } from 'react';
import { TikZKey } from '../types/tikz';
import useNodes from './useNodes';

/** 订阅节点状态 */
const useNodeState = (name: TikZKey) => {
  const { getModel } = useNodes();
  const node = useSyncExternalStore(
    onStorageChange => {
      const model = getModel(name);
      if (model) {
        return model.subscribe(onStorageChange);
      }
      return () => {};
    },
    () => getModel(name),
  );
  return node;
};

export default useNodeState;
