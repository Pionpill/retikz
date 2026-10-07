import type { resolveBoxSpacing, IRPath } from '@retikz/core';
import type { output } from 'zod';

import type { CanonicalCell } from '../../_cell/resolve';
import type { IRStack, StackLayoutSchema } from '../schema';

/** 供布局消费的单一栈结构，位置与栈顶不重复存储 */
export type CanonicalStack = Omit<
  IRStack,
  'items' | 'data' | 'skeleton' | 'dataExpand' | 'layout' | 'padding' | 'border'
> & {
  /** 已展开并完成逐格继承的输入序列 */
  items: Array<CanonicalCell>;
  /** 确定的物理方向与间距 */
  layout: output<typeof StackLayoutSchema>;
  /** 独立于边框可见性的容器留白 */
  padding: ReturnType<typeof resolveBoxSpacing>;
  /** 开放边框的非结构属性；缺失时隐藏 */
  border?: Omit<IRPath, 'type' | 'id' | 'children' | 'kind' | 'kindOptions'>;
};
