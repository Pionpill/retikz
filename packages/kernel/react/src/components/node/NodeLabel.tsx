import type { IRNodeLabel } from '@retikz/core';
import type { FC } from 'react';

import { KernelDisplayName } from '../../shared';

/** Node 标签的内容和外观 */
export type NodeLabelProps = Omit<IRNodeLabel, 'text'> & {
  /** 标签正文 */
  children: IRNodeLabel['text'];
};

/** 声明附着于节点的标签 */
export const NodeLabel: FC<NodeLabelProps> = () => null;
NodeLabel.displayName = KernelDisplayName.NodeLabel;
