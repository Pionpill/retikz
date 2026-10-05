import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

/**
 * 带稳定 Vanilla InputEmbed adapter 静态字段的 Graph React 组件
 * @template TProps React 组件接受的作者属性类型
 */
export type GraphEmbeddableComponent<TProps> = FC<TProps> & {
  /** 标识可由 Core React 收集器处理的 Tier 2 嵌入组件 */
  isTier2Embeddable: true;
  /** 把 Graph 作者输入归一化为 Core 贡献的领域 adapter */
  inputEmbedAdapter: AnyInputEmbedAdapter;
  /** 可选的 JSX 属性与子内容转换入口 */
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => unknown;
};
