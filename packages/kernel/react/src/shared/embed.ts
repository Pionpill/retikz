import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { ReactElement } from 'react';

import { RetikzReactError, RetikzReactErrorCode } from '../error';

/** React 收集父级为嵌入组件输入工厂提供的稳定上下文 */
export type ReactInputEmbedContext = Readonly<{
  /** 当前嵌入组件在 Scene 中的稳定 identity */
  id: string;
  /** 当前嵌入组件匹配的 Vanilla adapter kind */
  kind: string;
}>;

/** 组件类型上可读取的可嵌入静态属性形状 */
type MaybeEmbeddableType = {
  /** 为 true 时，JSX 收集器按 Tier 2 嵌入组件处理，不展开组件函数 */
  isTier2Embeddable?: boolean;
  /** 将组件输入转换为场景节点及编译依赖的 Vanilla 适配器；声明可嵌入时必须提供 */
  inputEmbedAdapter?: AnyInputEmbedAdapter;
  /** 根据 React props 和当前嵌入位置构造适配器输入；省略时直接传递原 props */
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => unknown;
  /** 缺少适配器时，错误消息优先使用的组件显示名 */
  displayName?: string;
  /** 未设置 displayName 时用于错误消息的组件函数名 */
  name?: string;
};

/** 宿主标签不携带组件静态属性 */
const asMaybeEmbeddable = (type: ReactElement['type']): MaybeEmbeddableType | null =>
  typeof type === 'string' ? null : (type as MaybeEmbeddableType);

/** 读取组件类型的可嵌入静态标记 */
export const isEmbeddableMarked = (type: ReactElement['type']): boolean =>
  asMaybeEmbeddable(type)?.isTier2Embeddable === true;

/**
 * 解析一个元素的 Vanilla 嵌入适配器
 * @description 组件声明自己可嵌入但缺少 adapter 时会抛出带组件名的错误；普通组件返回 null
 */
export const resolveInputEmbedAdapter = (type: ReactElement['type']): AnyInputEmbedAdapter | null => {
  const candidate = asMaybeEmbeddable(type);
  if (candidate?.isTier2Embeddable === true) {
    const adapter = candidate.inputEmbedAdapter;
    if (adapter !== undefined) return adapter;

    const name = candidate.displayName ?? candidate.name ?? '匿名组件';
    throw new RetikzReactError(
      RetikzReactErrorCode.Kernel,
      `[retikz] <${name}> 标记了 isTier2Embeddable 但未提供 inputEmbedAdapter`,
    );
  }

  return null;
};

/** 将 React props 收集为匹配 Vanilla adapter 的 typed Input */
export const createInputEmbedProps = (
  type: ReactElement['type'],
  props: Readonly<Record<string, unknown>>,
  context: ReactInputEmbedContext,
): unknown => {
  const factory = asMaybeEmbeddable(type)?.createInputEmbedProps;
  return factory === undefined ? props : factory(props, context);
};
