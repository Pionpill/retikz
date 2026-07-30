import type { ResolvedBaseLayoutInspectOptions } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { FlexLayoutArtifact, GridLayoutArtifact, OverlayLayoutArtifact } from '../../src';

import { inspectFlexLayoutArtifact } from '../../src/composites/flex-layout/inspection';
import { inspectGridLayoutArtifact } from '../../src/composites/grid-layout/inspection';
import { inspectOverlayLayoutArtifact } from '../../src/composites/overlay-layout/inspection';

const base: ResolvedBaseLayoutInspectOptions = {
  bounds: { container: true, content: true, slot: true, allocation: true, visual: false },
  overflow: true,
  alignmentGuides: true,
  labels: false,
};

const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const itemBase = {
  key: 'a',
  sourceIndex: 0,
  marginBounds: rect(8, 8, 34, 24),
  slotBounds: rect(10, 10, 30, 20),
  allocationBounds: rect(10, 10, 30, 20),
  visualBounds: rect(9, 9, 32, 22),
  visibleBounds: rect(9, 9, 32, 22),
  translation: { x: 10, y: 10 },
  overflow: {
    allocation: { x: false, y: false },
    visual: { x: true, y: true },
    clipped: false,
  },
  alignmentGuide: { name: 'baseline', position: 24, fallback: false },
} as const;
const container = {
  allocationBounds: rect(0, 0, 100, 60),
  contentBounds: rect(8, 8, 84, 44),
  visualBounds: rect(9, 9, 82, 42),
  visibleBounds: rect(9, 9, 82, 42),
} as const;

describe('Standard layout artifact inspection lowering', () => {
  it('lowers Flex lines, gaps, item bounds, overflow, and guides from artifact only', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [{ ...itemBase, line: 0 }],
      lines: [{ index: 0, itemKeys: ['a'], mainAxis: 'x', mainStart: 8, mainSize: 84, crossStart: 8, crossSize: 20 }],
    };
    const primitives = inspectFlexLayoutArtifact(artifact, {
      baseOptions: base,
      options: { lines: true, gaps: true },
    });

    expect(primitives.map(primitive => primitive.role)).toEqual(
      expect.arrayContaining([
        'layout.container',
        'layout.content',
        'layout.slot',
        'layout.allocation',
        'layout.overflow',
        'layout.alignment-guide',
        'flex.line',
      ]),
    );
  });

  it('draws a column Flex alignment guide on the x dimension', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [{ ...itemBase, line: 0 }],
      lines: [{ index: 0, itemKeys: ['a'], mainAxis: 'y', mainStart: 8, mainSize: 44, crossStart: 8, crossSize: 30 }],
    };

    const guide = inspectFlexLayoutArtifact(artifact, {
      baseOptions: base,
      options: { lines: false, gaps: false },
    }).find(primitive => primitive.role === 'layout.alignment-guide');

    expect(guide).toMatchObject({ kind: 'line', x1: 24, x2: 24, y1: 10, y2: 30 });
  });

  it('lowers Grid tracks, cells, gaps, and spans without rerunning placement', () => {
    const artifact: GridLayoutArtifact = {
      kind: 'grid',
      container,
      items: [{ ...itemBase, column: 0, row: 0, columnSpan: 2, rowSpan: 1 }],
      columns: [
        { index: 0, start: 8, size: 30, sourceKind: 'fixed', implicit: false },
        { index: 1, start: 42, size: 50, sourceKind: 'fixed', implicit: false },
      ],
      rows: [{ index: 0, start: 8, size: 44, sourceKind: 'fixed', implicit: false }],
    };
    const primitives = inspectGridLayoutArtifact(artifact, {
      baseOptions: base,
      options: { tracks: true, cells: true, gaps: true, spans: true },
    });

    expect(primitives.map(primitive => primitive.role)).toEqual(
      expect.arrayContaining(['grid.track', 'grid.cell', 'grid.gap', 'grid.span']),
    );
  });

  it('lowers Overlay placements, anchors, and stacking from resolved artifact fields', () => {
    const artifact = {
      kind: 'overlay',
      container,
      items: [
        {
          ...itemBase,
          placement: 'positioned',
          sizeParticipation: 'include',
          zIndex: 2,
          position: { target: { x: 30, y: 20 }, slotAnchor: { x: 30, y: 20 } },
        },
      ],
      paintOrder: ['a'],
    } as OverlayLayoutArtifact;
    const primitives = inspectOverlayLayoutArtifact(artifact, {
      baseOptions: base,
      options: { placements: true, anchors: true, stacking: true },
    });

    expect(primitives.map(primitive => primitive.role)).toEqual(
      expect.arrayContaining(['overlay.placement', 'overlay.anchor', 'overlay.stacking']),
    );
  });
});
