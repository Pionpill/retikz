import { useLayoutEffect } from 'react';
import { TikZKey } from '../types/tikz';
import useForceUpdate from './useForceUpdate';
import useNodes from './useNodes';

/** 订阅节点状态 */
const useNodeState = (name: TikZKey) => {
  const { getModel, subscribeModel } = useNodes();
  const forceUpdate = useForceUpdate();
  const unSubscribe = subscribeModel(name, () => forceUpdate());
  useLayoutEffect(
    () => () => {
      unSubscribe && unSubscribe();
    },
    [name],
  );
  return getModel(name);
};

export default useNodeState;
