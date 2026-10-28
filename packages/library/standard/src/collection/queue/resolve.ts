import type { IRPath } from '@retikz/core';
import { resolveBoxSpacing } from '@retikz/core';
import type { output } from 'zod';

import type { CanonicalCell } from '../_cell/resolve';
import { expandLinearCells, resolveCell } from '../_cell/resolve';
import type { IRQueue } from './schema';
import { QueueBorderSchema, QueueLayoutSchema, QueueSchema } from './schema';

/** 供布局消费的单一队列结构，位置与首尾不重复存储 */
type CanonicalQueue = Omit<IRQueue, 'items' | 'data' | 'skeleton' | 'dataExpand' | 'layout' | 'padding' | 'border'> & {
  /** 已展开并完成逐格继承的输入序列 */
  items: Array<CanonicalCell>;
  /** 确定的物理方向与间距 */
  layout: output<typeof QueueLayoutSchema>;
  /** 独立于边框可见性的容器留白 */
  padding: ReturnType<typeof resolveBoxSpacing>;
  /** 开放边框的非结构属性；缺失时隐藏 */
  border?: Omit<IRPath, 'type' | 'id' | 'children' | 'kind' | 'kindOptions'>;
};

/** 展开三入口，合并单格继承并物化框的静态默认 */
export const resolveQueue = (source: IRQueue): CanonicalQueue => {
  const { items, data, dataExpand, skeleton, layout, border, padding, ...common } = source;
  const cells = items ?? expandLinearCells(data !== undefined ? { data, dataExpand } : { skeleton });
  const path = typeof border === 'object' ? border : {};
  const styleSchema = QueueBorderSchema.shape.style.unwrap().shape;
  const style = {
    ...path.style,
    stroke: path.style?.stroke ?? styleSchema.stroke.parse(undefined),
    strokeWidth: path.style?.strokeWidth ?? styleSchema.strokeWidth.parse(undefined),
    fill: path.style?.fill ?? styleSchema.fill.parse(undefined),
  };
  return {
    ...common,
    items: cells.map(cell =>
      resolveCell(cell, { overallStyle: source.defaultCell?.style, overallLayout: source.defaultCell?.layout }),
    ),
    layout: {
      direction: layout?.direction ?? QueueLayoutSchema.shape.direction.parse(undefined),
      gap: layout?.gap ?? QueueLayoutSchema.shape.gap.parse(undefined),
    },
    padding: resolveBoxSpacing(padding ?? QueueSchema.options[0].shape.padding.parse(undefined), 0),
    ...(border === false ? {} : { border: { ...path, style } }),
  };
};
