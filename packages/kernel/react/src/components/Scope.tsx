import { pickDefined } from '@retikz/foundation';
import type { InputScope, ScopeOptions } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps } from '../hydration';
import { KernelDisplayName } from '../shared';

/** Scope 的级联视觉覆盖与后代默认通道，Layout 通过 rootScope 承载 */
export type ScopeStyleProps = Pick<ScopeOptions, 'defaults'>;

/**
 * 为一组图元设置局部样式、命名空间、变换、裁剪和引用包络
 */
export type ScopeProps = ScopeOptions &
  HydrationEventProps & {
    /** 当前作用域内按声明顺序收集的 JSX 图元 */
    children?: ReactNode;
  };

/**
 * 局部作用域
 * @description 为一组子图元设置共同的样式、变换和裁剪
 */
export const Scope: FC<ScopeProps> = () => null;
Scope.displayName = KernelDisplayName.Scope;

/** 把 <Scope> props 和已收集 children 组装为 Vanilla InputScope */
export const convertScopeProps = (props: ScopeProps, children: InputScope['children']): InputScope => {
  return {
    type: 'scope',
    ...pickDefined(props, [
      'theme',
      'id',
      'localNamespace',
      'transforms',
      'position',
      'zIndex',
      'clip',
      'boundingShape',
      'meta',
      'animations',
      'defaults',
    ]),
    ...(props.authoring === undefined && children.length === 0 ? {} : { authoring: props.authoring }),
    children,
  };
};
