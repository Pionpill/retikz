import type { IRScope } from '@retikz/core';
import { pickDefined } from '@retikz/foundation';
import type { AssertEqual } from '@retikz/foundation';
import type { InputScope, ScopeOptions } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps } from '../../hydration';
import { KernelDisplayName } from '../../protocol';

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
Scope.displayName = KernelDisplayName.Scope;

/**
 * IRScope 纯透传字段表（除 type / children 特化字段外）
 * @description 含容器字段（id / localNamespace / transforms）+ 样式默认字段
 *   （style 级联值与 defaults 通道）；同 NODE_FIELDS 互锁防漂移
 */
const SCOPE_FIELDS = [
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
] as const satisfies ReadonlyArray<keyof IRScope>;

type _ScopeFieldsCheck = AssertEqual<(typeof SCOPE_FIELDS)[number], Exclude<keyof IRScope, 'type' | 'children'>>;

const _assertScopeFieldsCheck: _ScopeFieldsCheck = true;
void _assertScopeFieldsCheck;

/** 把 <Scope> props 和已收集 children 组装为 Vanilla InputScope */
export const inputScopeFromProps = (props: ScopeProps, children: InputScope['children']): InputScope => {
  return {
    type: 'scope',
    ...pickDefined(props, SCOPE_FIELDS),
    ...(props.authoring === undefined && children.length === 0 ? {} : { authoring: props.authoring }),
    children,
  };
};
