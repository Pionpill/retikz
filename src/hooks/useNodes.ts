import { createContext, useContext } from 'react';
import NodeModel, { NodeConfig, StateListener } from '../model/component/node';

export const TikZContext = createContext({
  // 存储元素对应的 Model 和 DOM
  nodes: new Map<string, NodeModel>(),
});

const useNodes = () => {
  const { nodes } = useContext(TikZContext);
  return {
    subscribeModel: (name: string, listener: StateListener) => {
      const model = nodes.get(name);
      if (!model) return false;
      return model.subscribe(listener);
    },
    getModel: (name: string) => nodes.get(name),
    updateModel: (name: string, config: NodeConfig, init = true) => {
      const model = nodes.get(name);
      if (model) {
        model.update(config, init);
      } else {
        nodes.set(name, new NodeModel(config, init));
      }
    },
    deleteModel: (name: string) => {
      const model = nodes.get(name);
      if (!model) return;
      model.dispose();
      model.notify();
      nodes.delete(name);
    },
  };
};

export default useNodes;
