import type { NodeOptions } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps } from '../protocol';
import { TIKZ_NODE } from '../protocol';

/** 可定位、可连接的节点输入，组合文字、视觉形状和连接面 */
export type NodeProps = NodeOptions &
  HydrationEventProps & {
    /** 节点文字或带样式的 Text 子元素；显式 text 优先 */
    children?: ReactNode;
  };

/**
 * Node 声明一个可引用的节点
 * @description 声明一个带位置、文本、形状和样式的可引用节点；组件自身不渲染 DOM，最终由 `<Layout>` 输出到
 *   SVG 或 Canvas
 */
export const Node: FC<NodeProps> = () => null;
Node.displayName = TIKZ_NODE;
