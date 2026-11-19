import type { RequireExactlyOne } from '@retikz/foundation';
import type { InputEmbedContribution } from '@retikz/vanilla';
import type { ReactNode } from 'react';

/** 布局子项唯一内容的 React 或 IR 输入 */
export type LayoutItemChildSource = RequireExactlyOne<{
  /** 提供恰好一个可绘制 JSX 子元素；不能同时传 ir */
  readonly children: ReactNode;
  /** 已声明的可序列化子图形；不能同时传 children */
  readonly ir: InputEmbedContribution['node'];
}>;
