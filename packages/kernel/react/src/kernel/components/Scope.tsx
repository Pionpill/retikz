import type { ScopeOptions } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps } from '../protocol';
import { TIKZ_SCOPE } from '../protocol';

/**
 * 为一组图元设置局部样式、命名空间、变换、裁剪和引用包络
 */
export type ScopeProps = ScopeOptions &
  HydrationEventProps & {
    /** 当前作用域内按声明顺序收集的 JSX 图元 */
    children?: ReactNode;
  };

/**
 * 将子图元组合为作用域，统一设置样式、变换、定位与裁剪
 * @description 给一组节点 / 路径提供局部样式、命名空间、原点或锚点定位、局部变换、裁剪和引用包络
 */
export const Scope: FC<ScopeProps> = () => null;
Scope.displayName = TIKZ_SCOPE;
