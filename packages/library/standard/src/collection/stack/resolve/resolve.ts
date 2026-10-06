import { resolveBoxSpacing } from '@retikz/core';

import { createDataCell, DataExpandSchema } from '../../_cell/data';
import { resolveCell } from '../../_cell/resolve';
import { StackBorderSchema, StackLayoutSchema, StackSchema } from '../schema';
import type { IRStack } from '../schema';
import type { CanonicalStack } from './types';

/** 展开三入口，合并单格继承并物化框的静态默认 */
export const resolveStack = (source: IRStack): CanonicalStack => {
  const { items, data, dataExpand, skeleton, layout, border, padding, ...common } = source;
  const cells =
    items ??
    (data !== undefined
      ? data.map(value => createDataCell(value, dataExpand ?? DataExpandSchema.parse(undefined)))
      : skeleton.labels !== undefined
        ? skeleton.labels.map(text => (text === '' ? {} : { content: text }))
        : Array.from({ length: skeleton.count }, () => ({})));
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
