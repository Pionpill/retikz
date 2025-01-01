import { createContext } from 'react';
import NodeModel from '../../model/component/node';

export const TikZContext = createContext({
  /** 存储元素对应的 Model 和 DOM */
  nodes: new Map<string, NodeModel>(),
  /** 是否使用整数模式 */
  integerMode: false,
});
