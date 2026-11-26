import type { IRStepLabel } from '@retikz/core';
import type { FC } from 'react';

import { KernelDisplayName } from '../../shared';

/** 以子文本声明路径段标签，并配置沿段位置、偏移和描边中断 */
export type StepLabelProps = Pick<IRStepLabel, 'position' | 'side' | 'sloped' | 'interrupt'> & {
  /** 标签文字内容；必须是字符串 */
  children: string;
};

/**
 * 路径段标签
 * @description 以 Step 子元素声明标签；显式 label 优先
 */
export const StepLabel: FC<StepLabelProps> = () => null;
StepLabel.displayName = KernelDisplayName.StepLabel;
