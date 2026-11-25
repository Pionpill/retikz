import type { WayDSL } from '@retikz/vanilla';
import type { FC } from 'react';

import { KernelDisplayName } from '../../shared';
import type { PathProps } from '../kernel';
import { Path } from '../kernel';

/** Draw 的作者侧属性 */
export type DrawProps = Readonly<
  Pick<PathProps, 'style' | 'cornerRadius' | 'arrow' | 'marks' | 'zIndex'> & {
    /** TikZ 风格的路径走向简写 */
    way: WayDSL;
  }
>;

/**
 * Sugar 组件，将路径 grammar 原样调度给 Vanilla
 * @description React 只负责 JSX sugar；`normalizePath` 是 `way` 的唯一 parser 调度位置
 */
export const Draw: FC<DrawProps> = props => <Path {...props} />;
Draw.displayName = KernelDisplayName.Draw;
