import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

/**
 * 带稳定 Vanilla InputEmbed adapter 静态字段的 Layout React 组件
 * @template TProps React 组件接受的作者属性类型
 */
export type LayoutEmbeddableComponent<TProps> = FC<TProps> & {
  /** 标记该组件可作为 Tier 2 内容嵌入 */
  isTier2Embeddable: true;
  /** 将组件输入接入 Vanilla 嵌入协议的适配器 */
  inputEmbedAdapter: AnyInputEmbedAdapter;
  /** 在嵌入收集时结合 React 上下文构造 Vanilla 作者输入 */
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => unknown;
};
