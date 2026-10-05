import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

/**
 * 带稳定 Vanilla InputEmbed adapter 静态字段的 Standard React 组件
 * @template TProps React 组件接受的作者属性类型
 */
export type StandardEmbeddableComponent<TProps> = FC<TProps> & {
  /** 标识组件可由 Core React 收集器作为 Tier 2 嵌入内容处理 */
  isTier2Embeddable: true;
  /** 将 Standard 作者输入转换为 Core contribution 的 Vanilla adapter */
  inputEmbedAdapter: AnyInputEmbedAdapter;
  /** 可选作者属性转换入口，用于在嵌入前收集 JSX 内容与嵌套 adapter */
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => unknown;
};
