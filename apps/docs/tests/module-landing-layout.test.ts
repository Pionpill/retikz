import { describe, expect, it } from 'vitest';

import { resolveModuleLandingPlacements } from '../src/modules/docs/components/module-landing';
import type { ModuleLandingLayoutDemo } from '../src/modules/docs/components/module-landing';

const kernelDemos: Array<ModuleLandingLayoutDemo> = [
  { id: 'architecture', span: { columns: 4, rows: 2 } },
  { id: 'primitive-model', span: { columns: 3, rows: 2 } },
  { id: 'coordinate-system', span: { columns: 4, rows: 2 } },
  { id: 'layout', span: { columns: 4, rows: 2 } },
  { id: 'path-label-interval', span: { columns: 4, rows: 2 } },
  { id: 'anchors-explicit', span: { columns: 4, rows: 2 } },
  { id: 'relation-dynamic-vs-locked', span: { columns: 3, rows: 1 } },
  { id: 'layout-theme-overlays', span: { columns: 4, rows: 2 } },
  { id: 'node-size-states', span: { columns: 3, rows: 1 } },
  { id: 'math-bounds', span: { columns: 1, rows: 1 } },
  { id: 'math-curve', span: { columns: 2, rows: 1 } },
  { id: 'tex-formulas', span: { columns: 3, rows: 1 } },
  { id: 'inspect-node-geometry', span: { columns: 1, rows: 1 } },
];

describe('resolveModuleLandingPlacements', () => {
  it('在 8 列网格中仅将空格留在最后一行', () => {
    const placements = resolveModuleLandingPlacements(kernelDemos, 8);
    const finalRow = Math.max(...placements.map(({ placement }) => placement.row + placement.rowSpan - 1));
    const occupiedCellKeys = new Set<string>();

    for (const { placement } of placements) {
      for (let row = placement.row; row < placement.row + placement.rowSpan; row += 1) {
        for (let column = placement.column; column < placement.column + placement.columnSpan; column += 1) {
          occupiedCellKeys.add(`${column}:${row}`);
        }
      }
    }

    for (let row = 0; row < finalRow; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        expect(occupiedCellKeys.has(`${column}:${row}`)).toBe(true);
      }
    }
  });

  it.each([6, 8, 12])('在 %i 列网格中保留五格宽的演示卡', columns => {
    const placements = resolveModuleLandingPlacements(
      [{ id: 'namespace-storage', span: { columns: 5, rows: 3 } }],
      columns,
    );

    expect(placements[0]?.placement).toMatchObject({ columnSpan: 5, rowSpan: 3 });
  });

  it('在四列网格中按比例压缩五乘三的演示卡', () => {
    const placements = resolveModuleLandingPlacements([{ id: 'namespace-storage', span: { columns: 5, rows: 3 } }], 4);

    expect(placements[0]?.placement).toMatchObject({ columnSpan: 4, rowSpan: 2 });
  });

  it('仅在四列断点压缩超过四列宽的演示卡', () => {
    const demo = [{ id: 'wide-demo', span: { columns: 6, rows: 3 } }];

    expect(resolveModuleLandingPlacements(demo, 6)[0]?.placement).toMatchObject({ columnSpan: 6, rowSpan: 3 });
    expect(resolveModuleLandingPlacements(demo, 4)[0]?.placement).toMatchObject({ columnSpan: 4, rowSpan: 2 });
  });
});
