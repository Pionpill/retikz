import type { IRPath } from '@retikz/core';
import { resolveBoxSpacing } from '@retikz/core';
import type { output } from 'zod';

import type { CanonicalCell } from '../_cell/resolve';
import { expandLinearCells, resolveCell } from '../_cell/resolve';
import type { IRStack } from './schema';
import { StackBorderSchema, StackLayoutSchema, StackSchema } from './schema';

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

/** 展开三入口，合并单格继承并物化框的静态默认 */
export const resolveStack = (source: IRStack): CanonicalStack => {
  const { items, data, dataExpand, skeleton, layout, border, padding, ...common } = source;
  const cells = items ?? expandLinearCells(data !== undefined ? { data, dataExpand } : { skeleton });
  const path = StackBorderSchema.parse(typeof border === 'object' ? border : {});
  const style = StackBorderSchema.shape.style.unwrap().parse(path.style ?? {});
  return {
    ...common,
    items: cells.map(cell => resolveCell(cell, { overallStyle: source.style, overallLayout: layout })),
    layout: StackLayoutSchema.parse(layout ?? {}),
    padding: resolveBoxSpacing(padding ?? StackSchema.options[0].shape.padding.parse(undefined), 0),
    ...(border === false ? {} : { border: { ...path, style } }),
  };
};
