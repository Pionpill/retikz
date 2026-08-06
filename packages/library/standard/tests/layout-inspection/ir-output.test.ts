import type { InspectorContext, IRJsonObject, IRPatternPaintSpec } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { FlexLayoutArtifact, GridLayoutArtifact, OverlayLayoutArtifact } from '../../src';
import type { LayoutInspectionChild } from '../../src/composites/layout/internal';

import { inspectFlexLayoutArtifact } from '../../src/composites/layout/flex-layout/inspection';
import { inspectGridLayoutArtifact } from '../../src/composites/layout/grid-layout/inspection';
import { inspectOverlayLayoutArtifact } from '../../src/composites/layout/overlay-layout/inspection';

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

const sharedOptions = {
  bounds: { container: true, content: true, slot: true, allocation: true, visual: false },
  spacing: { padding: true, margin: true },
  overflow: true,
  alignmentGuides: true,
  labels: true,
} as const;

const appearance = {
  colorScope: 3,
  scopeColor: '#123456',
  warningColor: '#dc2626',
} as const;

const contextOf = <TOptions extends IRJsonObject>(options: TOptions): InspectorContext<TOptions> =>
  Object.freeze({
    occurrence: { sourcePath: 'children[0]', expansionPath: [] },
    options,
    appearance,
  });

const isPatternPaint = (value: unknown): value is IRPatternPaintSpec =>
  value !== null && typeof value === 'object' && 'kind' in value && value.kind === 'pattern';

const patternFillsOf = (children: ReadonlyArray<LayoutInspectionChild>): Array<IRPatternPaintSpec> =>
  children.flatMap(child => (child.type === 'node' && isPatternPaint(child.fill) ? [child.fill] : []));

const inspectionRoleOf = (child: LayoutInspectionChild): string | undefined => {
  const meta = child.meta;
  if (meta === undefined || !('inspectionRole' in meta)) return undefined;
  return typeof meta.inspectionRole === 'string' ? meta.inspectionRole : undefined;
};

describe('Standard Layout Inspector ordinary IR output', () => {
  it('lowers Flex guides, spacing, warnings, and labels to ordinary Core children', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [{ ...itemBase, line: 0 }],
      lines: [{ index: 0, itemKeys: ['a'], mainAxis: 'x', mainStart: 8, mainSize: 84, crossStart: 8, crossSize: 20 }],
      spacing: [{ kind: 'gap', axis: 'x', bounds: rect(45, 8, 6, 20) }],
    };

    const children = inspectFlexLayoutArtifact(
      artifact,
      contextOf({ ...sharedOptions, lines: true, gaps: true, distributedSpace: true }),
    );

    expect(patternFillsOf(children)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          shape: 'lines',
          color: appearance.scopeColor,
          size: 12,
          lineWidth: 1,
          rotation: -45,
        }),
        expect.objectContaining({
          shape: 'lines',
          color: appearance.scopeColor,
          size: 12,
          lineWidth: 1,
          rotation: 45,
        }),
      ]),
    );
    expect(
      children.some(
        child =>
          child.type === 'path' &&
          child.stroke === appearance.scopeColor &&
          Array.isArray(child.dashPattern) &&
          child.dashPattern.join() === '6,4',
      ),
    ).toBe(true);
    expect(
      children.some(child => child.type === 'node' && child.fill === appearance.warningColor && child.opacity === 0.14),
    ).toBe(true);
    expect(
      children.some(child => child.type === 'node' && child.text === 'a' && child.textColor === appearance.scopeColor),
    ).toBe(true);
  });

  it('keeps Grid distributed space transparent while lowering fixed gaps to pattern paint', () => {
    const artifact: GridLayoutArtifact = {
      kind: 'grid',
      container,
      items: [{ ...itemBase, column: 0, row: 0, columnSpan: 2, rowSpan: 1 }],
      columns: [
        { index: 0, start: 8, size: 30, sourceKind: 'fixed', implicit: false },
        { index: 1, start: 42, size: 50, sourceKind: 'fixed', implicit: false },
      ],
      rows: [{ index: 0, start: 8, size: 44, sourceKind: 'fixed', implicit: false }],
      spacing: [
        { kind: 'gap', axis: 'x', bounds: rect(38, 8, 4, 44) },
        { kind: 'distributed', axis: 'y', bounds: rect(8, 5, 84, 3) },
      ],
    };

    const children = inspectGridLayoutArtifact(
      artifact,
      contextOf({
        ...sharedOptions,
        spacing: { padding: false, margin: false },
        tracks: true,
        cells: true,
        gaps: true,
        distributedSpace: true,
        spans: true,
      }),
    );

    expect(patternFillsOf(children)).toHaveLength(1);
    expect(children.filter(child => child.type === 'path')).not.toHaveLength(0);
  });

  it('lowers Overlay anchors to solid paths without adding spacing patterns', () => {
    const artifact: OverlayLayoutArtifact = {
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

    const children = inspectOverlayLayoutArtifact(
      artifact,
      contextOf({
        ...sharedOptions,
        spacing: { padding: false, margin: false },
        placements: true,
        anchors: true,
        stacking: true,
      }),
    );

    expect(patternFillsOf(children)).toHaveLength(0);
    expect(
      children.filter(
        child =>
          child.type === 'path' && inspectionRoleOf(child) === 'overlay.anchor' && child.dashPattern === undefined,
      ),
    ).toHaveLength(2);
    expect(
      children.some(
        child => child.type === 'node' && child.text === 'z:2' && child.textColor === appearance.scopeColor,
      ),
    ).toBe(true);
  });
});
