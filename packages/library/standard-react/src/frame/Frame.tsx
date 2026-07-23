import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FrameInput, IRFrame } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { convertReactNodeToIR } from '@retikz/react';
import { createFrame, FrameDefinition } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

/** React Frame 组件接受的 Standard authoring 输入 */
export type FrameProps = Omit<FrameInput, 'children'> & {
  /** 参与 Frame Scope 自动 bounds 的 Core Node children */
  children: ReactNode;
};

type FrameNode = IRFrame['children'][number];

/** 当前 Layout 内贡献 Standard FrameDefinition 的稳定 maker */
const makeFrameComposites = () => [FrameDefinition];

/** 将 React children 转为 Frame 支持的直接 Core Node */
const convertFrameChildren = (children: ReactNode): Array<FrameNode> => {
  const irChildren = convertReactNodeToIR(children).children;
  if (!irChildren.every((child): child is FrameNode => child.type === 'node' && !('namespace' in child))) {
    throw new Error('Frame only accepts direct Node children.');
  }
  return irChildren;
};

const frameEmbeddableAdapter: EmbeddableTier2Adapter<FrameProps> = {
  displayName: 'Frame',
  namespace: 'standard.frame',
  contribute: props => {
    const { children, ...input } = props;
    return {
      node: createFrame({ ...input, children: convertFrameChildren(children) }),
      datasets: {},
      makeComposites: makeFrameComposites,
    };
  },
};

const FrameComponent: FC<FrameProps> = () => null;

/** Standard Frame 的 React Tier 2 authoring 组件 */
export const Frame = FrameComponent as StandardEmbeddableComponent<FrameProps>;

Frame.displayName = 'Frame';
Frame.isTier2Embeddable = true;
Frame.embeddableAdapter = frameEmbeddableAdapter;
