import type { resolveBoxSpacing, IRPath } from '@retikz/core';
import type { output } from 'zod';

import type { CanonicalCell } from '../../_cell/resolve';
import type { IRQueue, QueueLayoutSchema } from '../schema';

/** 供布局消费的单一队列结构，位置与首尾不重复存储 */
export type CanonicalQueue = Omit<
  IRQueue,
  'items' | 'data' | 'skeleton' | 'dataExpand' | 'layout' | 'padding' | 'border'
> & {
  /** 已展开并完成逐格继承的输入序列 */
  items: Array<CanonicalCell>;
  /** 确定的物理方向与间距 */
  layout: output<typeof QueueLayoutSchema>;
  /** 独立于边框可见性的容器留白 */
  padding: ReturnType<typeof resolveBoxSpacing>;
  /** 开放边框的非结构属性；缺失时隐藏 */
  border?: Omit<IRPath, 'type' | 'id' | 'children' | 'kind' | 'kindOptions'>;
};
