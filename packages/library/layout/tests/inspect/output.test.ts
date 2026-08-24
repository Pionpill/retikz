import type { IRChild, IRJsonObject } from '@retikz/core';
import type { InspectorContext } from '@retikz/inspect';

import { describe, expect, it } from 'vitest';

import type { FlexLayoutArtifact, GridLayoutArtifact, OverlayLayoutArtifact } from '../../src';

import { FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR } from '../../src/inspect';

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

const contextOf = <TOptions extends IRJsonObject>(
  options: TOptions,
  owner: InspectorContext<TOptions>['owner'],
): InspectorContext<TOptions> =>
  Object.freeze({
    inspectorKey: { namespace: 'layout', type: owner.kind === 'composite' ? owner.type : owner.name },
    owner,
    occurrence: { sourcePath: 'children[0]', expansionPath: [] },
    provenance: {
      origin: { sourcePath: 'children[0]', expansionPath: [] },
      final: { sourcePath: 'children[0]', expansionPath: [] },
    },
    options,
    appearance: {
      colorScope: 0,
      scopeColor: '#2563eb',
      semanticColors: { error: '#ef4444', success: '#16a34a', warning: '#dc2626', guide: '#6b7280' },
    },
  });

const ordinaryChildren = (value: unknown): Array<IRChild> => {
  if (!Array.isArray(value)) throw new Error('Expected dense Inspector output');
  return value;
};

describe('Layout inspect output', () => {
  it('lowers Flex, Grid, and Overlay artifacts to ordinary Core children', () => {
    const flexArtifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [{ ...itemBase, line: 0 }],
      lines: [{ index: 0, itemKeys: ['a'], mainAxis: 'x', mainStart: 8, mainSize: 84, crossStart: 8, crossSize: 20 }],
      spacing: [{ kind: 'gap', axis: 'x', bounds: rect(45, 8, 6, 20) }],
    };
    const gridArtifact: GridLayoutArtifact = {
      kind: 'grid',
      container,
      items: [{ ...itemBase, column: 0, row: 0, columnSpan: 2, rowSpan: 1 }],
      columns: [
        { index: 0, start: 8, size: 30, sourceKind: 'fixed', implicit: false },
        { index: 1, start: 42, size: 50, sourceKind: 'fixed', implicit: false },
      ],
      rows: [{ index: 0, start: 8, size: 44, sourceKind: 'fixed', implicit: false }],
      spacing: [{ kind: 'gap', axis: 'x', bounds: rect(38, 8, 4, 44) }],
    };
    const overlayArtifact: OverlayLayoutArtifact = {
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
    };

    const flexOutput = ordinaryChildren(
      FLEX_LAYOUT_INSPECTOR.inspect(
        flexArtifact,
        contextOf(FLEX_LAYOUT_INSPECTOR.optionsSchema.parse({ labels: true }), FLEX_LAYOUT_INSPECTOR.owner),
      ),
    );
    const gridOutput = ordinaryChildren(
      GRID_LAYOUT_INSPECTOR.inspect(
        gridArtifact,
        contextOf(GRID_LAYOUT_INSPECTOR.optionsSchema.parse({}), GRID_LAYOUT_INSPECTOR.owner),
      ),
    );
    const overlayOutput = ordinaryChildren(
      OVERLAY_LAYOUT_INSPECTOR.inspect(
        overlayArtifact,
        contextOf(OVERLAY_LAYOUT_INSPECTOR.optionsSchema.parse({ anchors: true }), OVERLAY_LAYOUT_INSPECTOR.owner),
      ),
    );

    expect(flexOutput.some(child => child.type === 'path')).toBe(true);
    expect(gridOutput.some(child => child.type === 'path')).toBe(true);
    expect(overlayOutput.some(child => child.type === 'path')).toBe(true);
    expect(overlayOutput.some(child => child.type === 'node' && child.text === 'z:2')).toBe(false);
    expect(flexOutput.every(child => child.type === 'path' || child.type === 'node')).toBe(true);
  });
});
