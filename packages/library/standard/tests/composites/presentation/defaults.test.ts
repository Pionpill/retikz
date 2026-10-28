import { describe, expect, it } from 'vitest';

import { createOperationArrow } from '../../../src/collection/_cell/operation-arrow';
import { resolveStack } from '../../../src/collection/stack/resolve';
import { resolveFrame } from '../../../src/presentation/frame/resolve';
import { resolveGrid } from '../../../src/presentation/grid/resolve';
import { resolveLegend } from '../../../src/presentation/legend/resolve';

describe('类型化呈现输入的默认补全', () => {
  it('补齐 Grid 双向默认与 major 偏移，保留显式零值和关闭策略', () => {
    const grid = resolveGrid({
      namespace: 'standard',
      type: 'grid',
      bounds: { start: [0, 0], end: [20, 20] },
      line: { spacing: 5, origin: 0, major: { every: 2 } },
      border: { padding: 0, extendLines: false },
    });

    expect(grid.line).toEqual({
      vertical: { spacing: 5, origin: 0, includeBoundary: false, major: { every: 2, offset: 0 } },
      horizontal: { spacing: 5, origin: 0, includeBoundary: false, major: { every: 2, offset: 0 } },
    });
    expect(grid.border).toMatchObject({ padding: 0, extendLines: false, order: 'front' });
  });

  it('Frame 边框默认不覆盖作者提供的样式', () => {
    const source = { namespace: 'standard', type: 'frame', children: [{ type: 'node', text: 'A' }] } as const;
    const frame = resolveFrame({ ...source, children: [...source.children], border: { style: { strokeWidth: 0 } } });

    expect(frame.border.style).toEqual({ strokeWidth: 0 });
    expect(resolveFrame({ ...source, children: [...source.children] }).border.style).toEqual({
      stroke: 'currentColor',
      strokeWidth: 1,
    });
  });

  it('离散与连续 Legend 均补全排列字段，并保留零间距', () => {
    const items = resolveLegend({
      namespace: 'standard',
      type: 'legend',
      content: { kind: 'items', items: [], gap: 0 },
    });
    const ramp = resolveLegend({
      namespace: 'standard',
      type: 'legend',
      content: { kind: 'ramp', sample: { type: 'node', text: 'sample' }, ticks: [] },
    });

    expect(items.content).toMatchObject({
      direction: 'vertical',
      wrap: 'nowrap',
      gap: { row: 0, column: 0 },
      sampleGap: 8,
      sampleAlign: 'center',
    });
    expect(ramp.content).toMatchObject({ direction: 'vertical', sampleGap: 8 });
  });

  it('Stack 与操作箭头共享描边默认且不覆盖零宽度', () => {
    const stack = resolveStack({
      namespace: 'standard',
      type: 'stack',
      items: [],
      border: { style: { strokeWidth: 0 } },
      layout: { gap: 0 },
    });

    expect(stack.border?.style).toMatchObject({ stroke: 'currentColor', strokeWidth: 0, fill: 'none' });
    expect(stack.layout).toEqual({ direction: 'up', reverseArrows: false, gap: 0 });
    expect(
      createOperationArrow({ style: { strokeWidth: 0 } }, [
        [0, 0],
        [1, 0],
      ]).style,
    ).toMatchObject({ stroke: 'currentColor', strokeWidth: 0, fill: 'none' });
  });
});
