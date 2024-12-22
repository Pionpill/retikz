import { createContext, useContext } from 'react';
import NodeModel from '../model/component/node';
import { NodeConfig } from '../components/node/_hooks/useNodeConfig';

export const TikZContext = createContext({
  // 存储元素对应的 Model 和 DOM
  nodes: new Map<string, NodeModel>(),
});

const useNodes = () => {
  const context = useContext(TikZContext);
  return {
    getModel: (name: string) => context.nodes.get(name),
    updateModel: (name: string, config: NodeConfig) => {
      const model = context.nodes.get(name);
      if (model) {
        model.update(config)
      } else {
        context.nodes.set(name, new NodeModel(config));
      }
    },
    deleteModel: (name: string) => context.nodes.delete(name),
  };
};

export default useNodes;
