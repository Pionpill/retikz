import type { AnyInputEmbedAdapter } from '@retikz/vanilla';

/** React 收集父级为嵌入组件输入工厂提供的稳定上下文 */
export type ReactInputEmbedContext = Readonly<{
  /** 当前嵌入组件在 Scene 中的稳定 identity */
  id: string;
  /** 当前嵌入组件匹配的 Vanilla adapter kind */
  kind: string;
}>;

/** 组件类型上可读取的可嵌入静态属性形状 */
type MaybeEmbeddableType = {
  isTier2Embeddable?: boolean;
  inputEmbedAdapter?: AnyInputEmbedAdapter;
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => unknown;
  displayName?: string;
  name?: string;
};

/** 把任意类型视作可能带可嵌入静态属性的组件读取 */
const asMaybeEmbeddable = (type: unknown): MaybeEmbeddableType | null => {
  if (typeof type === 'function' || (typeof type === 'object' && type !== null)) {
    return type;
  }
  return null;
};

/** 读取组件类型的可嵌入静态标记 */
export const isEmbeddableMarked = (type: unknown): boolean => asMaybeEmbeddable(type)?.isTier2Embeddable === true;

/**
 * 解析一个元素的 Vanilla 嵌入适配器
 * @description 组件声明自己可嵌入但缺少 adapter 时会抛出带组件名的错误；普通组件返回 null
 */
export const resolveInputEmbedAdapter = (type: unknown): AnyInputEmbedAdapter | null => {
  const candidate = asMaybeEmbeddable(type);
  if (candidate?.isTier2Embeddable === true) {
    const adapter = candidate.inputEmbedAdapter;
    if (typeof adapter === 'object') return adapter;
    const name = candidate.displayName ?? candidate.name ?? '匿名组件';
    throw new Error(`[retikz] <${name}> 标记了 isTier2Embeddable 但未提供 inputEmbedAdapter`);
  }

  return null;
};

/** 将 React props 收集为匹配 Vanilla adapter 的 typed Input */
export const createInputEmbedProps = (
  type: unknown,
  props: Readonly<Record<string, unknown>>,
  context: ReactInputEmbedContext,
): unknown => {
  const factory = asMaybeEmbeddable(type)?.createInputEmbedProps;
  return factory === undefined ? props : factory(props, context);
};
