import type { IRStepLabel } from '@retikz/core';
import type { FC } from 'react';

import { KernelDisplayName } from '../../shared';

/** 以子文本声明路径段标签，并配置沿段位置、偏移和描边中断 */
export type EdgeLabelProps = Pick<IRStepLabel, 'position' | 'side' | 'sloped' | 'interrupt'> & {
  /** 标签文字内容；必须是字符串 */
  children: string;
};

/**
 * Sugar 组件——挂在 <Step> 内作为子节点声明边标注
 * @description 等价于在 Step 上写 `label={{ text, position, side, interrupt }}` prop；二者并存时 prop 优先。自身不渲染
 */
export const EdgeLabel: FC<EdgeLabelProps> = () => null;
EdgeLabel.displayName = KernelDisplayName.EdgeLabel;
