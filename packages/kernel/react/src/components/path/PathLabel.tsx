import type { IRPathLabel } from '@retikz/core';
import type { FC } from 'react';

import { KernelDisplayName } from '../../shared';

/** Path 标签的内容和外观 */
export type PathLabelProps = Omit<IRPathLabel, 'text'> & {
  /** 标签正文 */
  children: IRPathLabel['text'];
};

/** 声明附着于整条路径的标签 */
export const PathLabel: FC<PathLabelProps> = () => null;
PathLabel.displayName = KernelDisplayName.PathLabel;
