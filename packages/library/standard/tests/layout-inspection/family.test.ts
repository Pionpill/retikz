import type { InspectorContext, IRJsonObject, IRPath, ResolvedBaseLayoutInspectOptions } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { FlexLayoutArtifact, GridLayoutArtifact, OverlayLayoutArtifact } from '../../src';
import type { LayoutInspectionChild } from '../../src/composites/layout/internal';

import { inspectFlexLayoutArtifact as inspectFlexLayoutArtifactIR } from '../../src/composites/layout/flex-layout/inspection';
import { inspectGridLayoutArtifact as inspectGridLayoutArtifactIR } from '../../src/composites/layout/grid-layout/inspection';
import { inspectOverlayLayoutArtifact as inspectOverlayLayoutArtifactIR } from '../../src/composites/layout/overlay-layout/inspection';

type LayoutInspectionRecord =
  | Readonly<{
      kind: 'line';
      role: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      tone: 'scope' | 'warning';
      lineStyle: 'dashed' | 'solid';
    }>
  | Readonly<{
      kind: 'rect';
      role: string;
      x: number;
      y: number;
      width: number;
      height: number;
      presentation: 'outline' | 'fill';
      tone: 'scope' | 'warning';
      lineStyle?: 'dashed' | 'solid';
      fillPattern?: 'forward-diagonal' | 'backward-diagonal' | 'solid';
    }>
  | Readonly<{
      kind: 'label';
      role: string;
      x: number;
      y: number;
      text: string;
      tone: 'scope' | 'warning';
    }>;

const appearance = {
  colorScope: 0,
  scopeColor: '#2563eb',
  warningColor: '#dc2626',
} as const;

const inspectionContext = <TOptions extends IRJsonObject>(options: TOptions): InspectorContext<TOptions> => ({
  occurrence: { sourcePath: 'children[0]', expansionPath: [] },
  options,
  appearance,
});

const roleOf = (child: LayoutInspectionChild): string => {
  const role = child.meta?.inspectionRole;
  if (typeof role !== 'string') throw new Error('Expected layout inspection role metadata');
  return role;
};

const positionOf = (step: NonNullable<IRPath['children']>[number]): readonly [number, number] => {
  if (!('to' in step) || !Array.isArray(step.to)) {
    throw new Error('Expected a Cartesian layout inspection path step');
  }
  return step.to;
};

const recordOf = (child: LayoutInspectionChild): LayoutInspectionRecord => {
  if (child.type === 'node' && typeof child.text === 'string') {
    if (!Array.isArray(child.position)) {
      throw new Error('Expected a positioned layout inspection label');
    }
    return {
      kind: 'label',
      role: roleOf(child),
      x: child.position[0],
      y: child.position[1],
      text: child.text,
      tone: child.textColor === appearance.warningColor ? 'warning' : 'scope',
    };
  }
  if (child.type === 'node') {
    if (!Array.isArray(child.position)) {
      throw new Error('Expected a positioned layout inspection area');
    }
    const width = typeof child.minimumSize === 'object' ? child.minimumSize.width : child.minimumSize;
    const height = typeof child.minimumSize === 'object' ? child.minimumSize.height : child.minimumSize;
    if (width === undefined || height === undefined) throw new Error('Expected a sized layout inspection area');
    const pattern = typeof child.fill === 'object' && child.fill.kind === 'pattern' ? child.fill : undefined;
    return {
      kind: 'rect',
      role: roleOf(child),
      x: child.position[0] - width / 2,
      y: child.position[1] - height / 2,
      width,
      height,
      presentation: 'fill',
      tone: child.fill === appearance.warningColor ? 'warning' : 'scope',
      fillPattern:
        pattern === undefined ? 'solid' : pattern.rotation === -45 ? 'forward-diagonal' : 'backward-diagonal',
    };
  }
  const role = roleOf(child);
  const tone = child.stroke === appearance.warningColor || child.fill === appearance.warningColor ? 'warning' : 'scope';
  if (child.children.length === 2) {
    const [x1, y1] = positionOf(child.children[0]);
    const [x2, y2] = positionOf(child.children[1]);
    return {
      kind: 'line',
      role,
      x1,
      y1,
      x2,
      y2,
      tone,
      lineStyle: child.dashPattern === undefined ? 'solid' : 'dashed',
    };
  }
  const [x, y] = positionOf(child.children[0]);
  const [right] = positionOf(child.children[1]);
  const [, bottom] = positionOf(child.children[2]);
  return {
    kind: 'rect',
    role,
    x,
    y,
    width: right - x,
    height: bottom - y,
    presentation: 'outline',
    tone,
    lineStyle: child.dashPattern === undefined ? 'solid' : 'dashed',
  };
};

const recordsOf = (children: ReadonlyArray<LayoutInspectionChild>): Array<LayoutInspectionRecord> =>
  children.map(recordOf);

const inspectFlexLayoutArtifact = (
  artifact: FlexLayoutArtifact,
  context: Readonly<{
    sharedOptions: ResolvedBaseLayoutInspectOptions;
    options: Readonly<{ lines: boolean; gaps: boolean; distributedSpace: boolean }>;
  }>,
): Array<LayoutInspectionRecord> =>
  recordsOf(inspectFlexLayoutArtifactIR(artifact, inspectionContext({ ...context.sharedOptions, ...context.options })));

const inspectGridLayoutArtifact = (
  artifact: GridLayoutArtifact,
  context: Readonly<{
    sharedOptions: ResolvedBaseLayoutInspectOptions;
    options: Readonly<{ tracks: boolean; cells: boolean; gaps: boolean; distributedSpace: boolean; spans: boolean }>;
  }>,
): Array<LayoutInspectionRecord> =>
  recordsOf(inspectGridLayoutArtifactIR(artifact, inspectionContext({ ...context.sharedOptions, ...context.options })));

const inspectOverlayLayoutArtifact = (
  artifact: OverlayLayoutArtifact,
  context: Readonly<{
    sharedOptions: ResolvedBaseLayoutInspectOptions;
    options: Readonly<{ placements: boolean; anchors: boolean; stacking: boolean }>;
  }>,
): Array<LayoutInspectionRecord> =>
  recordsOf(
    inspectOverlayLayoutArtifactIR(artifact, inspectionContext({ ...context.sharedOptions, ...context.options })),
  );

const base: ResolvedBaseLayoutInspectOptions = {
  bounds: { container: true, content: true, slot: true, allocation: true, visual: false },
  spacing: { padding: true, margin: true },
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
  it('lowers Flex rings and spacing with canonical patterns in six paint layers', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [{ ...itemBase, line: 0 }],
      lines: [{ index: 0, itemKeys: ['a'], mainAxis: 'x', mainStart: 8, mainSize: 84, crossStart: 8, crossSize: 20 }],
      spacing: [
        { kind: 'gap', axis: 'x', bounds: rect(45, 8, 6, 20) },
        { kind: 'distributed', axis: 'x', bounds: rect(51, 8, 9, 20) },
      ],
    };
    const primitives = inspectFlexLayoutArtifact(artifact, {
      sharedOptions: { ...base, labels: true },
      options: { lines: true, gaps: true, distributedSpace: true },
    });

    expect(
      primitives.filter(
        primitive =>
          primitive.role === 'layout.padding' && primitive.kind === 'rect' && primitive.presentation === 'fill',
      ),
    ).toMatchObject([
      { x: 0, y: 0, width: 100, height: 8, fillPattern: 'backward-diagonal' },
      { x: 0, y: 52, width: 100, height: 8, fillPattern: 'backward-diagonal' },
      { x: 0, y: 8, width: 8, height: 44, fillPattern: 'backward-diagonal' },
      { x: 92, y: 8, width: 8, height: 44, fillPattern: 'backward-diagonal' },
    ]);
    expect(
      primitives.filter(
        primitive =>
          primitive.role === 'layout.margin' && primitive.kind === 'rect' && primitive.presentation === 'fill',
      ),
    ).toMatchObject([
      { x: 8, y: 8, width: 34, height: 2, fillPattern: 'forward-diagonal' },
      { x: 8, y: 30, width: 34, height: 2, fillPattern: 'forward-diagonal' },
      { x: 8, y: 10, width: 2, height: 20, fillPattern: 'forward-diagonal' },
      { x: 40, y: 10, width: 2, height: 20, fillPattern: 'forward-diagonal' },
    ]);
    expect(primitives.find(primitive => primitive.role === 'flex.gap')).toMatchObject({
      presentation: 'fill',
      fillPattern: 'forward-diagonal',
      tone: 'scope',
    });
    expect(primitives.filter(primitive => primitive.role === 'layout.padding' && primitive.kind === 'line')).toEqual(
      [],
    );
    expect(primitives.filter(primitive => primitive.role === 'layout.margin' && primitive.kind === 'line')).toEqual([
      { kind: 'line', role: 'layout.margin', x1: 42, y1: 8, x2: 42, y2: 32, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.margin', x1: 8, y1: 32, x2: 42, y2: 32, tone: 'scope', lineStyle: 'dashed' },
    ]);
    expect(primitives.filter(primitive => primitive.role === 'flex.gap' && primitive.kind === 'line')).toEqual([
      { kind: 'line', role: 'flex.gap', x1: 51, y1: 8, x2: 51, y2: 28, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'flex.gap', x1: 45, y1: 8, x2: 45, y2: 28, tone: 'scope', lineStyle: 'dashed' },
    ]);
    expect(
      primitives.filter(
        primitive =>
          primitive.role === 'flex.distributed' && primitive.kind === 'rect' && primitive.presentation === 'fill',
      ),
    ).toEqual([]);
    expect(primitives.filter(primitive => primitive.role === 'flex.distributed' && primitive.kind === 'line')).toEqual([
      {
        kind: 'line',
        role: 'flex.distributed',
        x1: 60,
        y1: 8,
        x2: 60,
        y2: 28,
        tone: 'scope',
        lineStyle: 'dashed',
      },
    ]);

    const roles = primitives.map(primitive => primitive.role);
    const lastUnderlay = Math.max(
      roles.lastIndexOf('layout.margin'),
      roles.lastIndexOf('flex.gap'),
      roles.lastIndexOf('flex.distributed'),
    );
    expect(lastUnderlay).toBeLessThan(roles.indexOf('flex.line'));
    expect(roles.indexOf('flex.line')).toBeLessThan(roles.indexOf('layout.container'));
    expect(roles.indexOf('layout.allocation')).toBeLessThan(roles.indexOf('layout.overflow'));
    expect(roles.indexOf('layout.overflow')).toBeLessThan(roles.indexOf('layout.alignment-guide'));
    expect(roles.indexOf('layout.alignment-guide')).toBeLessThan(roles.indexOf('layout.label'));
    expect(
      primitives
        .filter(primitive => primitive.role.startsWith('layout.'))
        .every(
          primitive =>
            primitive.kind !== 'rect' || primitive.presentation !== 'outline' || primitive.lineStyle === 'dashed',
        ),
    ).toBe(true);
    expect(primitives.find(primitive => primitive.role === 'flex.line')).toMatchObject({ lineStyle: 'dashed' });
    expect(primitives.find(primitive => primitive.role === 'layout.overflow')).toMatchObject({
      presentation: 'fill',
      fillPattern: 'solid',
      tone: 'warning',
    });
    expect(primitives.filter(primitive => primitive.role !== 'layout.overflow').every(p => p.tone === 'scope')).toBe(
      true,
    );
  });

  it('adds dashed spacing boundaries without hatch-piece seams or coincident repaint', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [{ ...itemBase, line: 0 }],
      lines: [],
      spacing: [{ kind: 'gap', axis: 'x', bounds: rect(45, 8, 6, 20) }],
    };

    const primitives = inspectFlexLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: false, content: false, slot: false, allocation: false, visual: false },
        spacing: { padding: true, margin: true },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { lines: false, gaps: true, distributedSpace: false },
    });
    const boundaryLines = (role: string) =>
      primitives.filter(primitive => primitive.role === role && primitive.kind === 'line');

    expect(boundaryLines('layout.padding')).toEqual([
      { kind: 'line', role: 'layout.padding', x1: 0, y1: 0, x2: 100, y2: 0, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.padding', x1: 100, y1: 0, x2: 100, y2: 60, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.padding', x1: 0, y1: 60, x2: 100, y2: 60, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.padding', x1: 0, y1: 0, x2: 0, y2: 60, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.padding', x1: 8, y1: 8, x2: 92, y2: 8, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.padding', x1: 92, y1: 8, x2: 92, y2: 52, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.padding', x1: 8, y1: 52, x2: 92, y2: 52, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.padding', x1: 8, y1: 8, x2: 8, y2: 52, tone: 'scope', lineStyle: 'dashed' },
    ]);
    expect(boundaryLines('layout.margin')).toEqual([
      { kind: 'line', role: 'layout.margin', x1: 42, y1: 8, x2: 42, y2: 32, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.margin', x1: 8, y1: 32, x2: 42, y2: 32, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.margin', x1: 10, y1: 10, x2: 40, y2: 10, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.margin', x1: 40, y1: 10, x2: 40, y2: 30, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.margin', x1: 10, y1: 30, x2: 40, y2: 30, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'layout.margin', x1: 10, y1: 10, x2: 10, y2: 30, tone: 'scope', lineStyle: 'dashed' },
    ]);
    expect(boundaryLines('flex.gap')).toEqual([
      { kind: 'line', role: 'flex.gap', x1: 51, y1: 8, x2: 51, y2: 28, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'flex.gap', x1: 45, y1: 28, x2: 51, y2: 28, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'flex.gap', x1: 45, y1: 8, x2: 45, y2: 28, tone: 'scope', lineStyle: 'dashed' },
    ]);
  });

  it('keeps content and slot outlines independent from rings and fixed gaps independent from distributed space', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [{ ...itemBase, line: 0 }],
      lines: [{ index: 0, itemKeys: ['a'], mainAxis: 'x', mainStart: 8, mainSize: 84, crossStart: 8, crossSize: 20 }],
      spacing: [
        { kind: 'gap', axis: 'x', bounds: rect(45, 8, 6, 20) },
        { kind: 'distributed', axis: 'x', bounds: rect(51, 8, 9, 20) },
      ],
    };

    const primitives = inspectFlexLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: false, content: true, slot: true, allocation: false, visual: false },
        spacing: { padding: false, margin: false },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { lines: false, gaps: true, distributedSpace: false },
    });

    expect(primitives.map(primitive => primitive.role)).toEqual([
      'flex.gap',
      'flex.gap',
      'flex.gap',
      'flex.gap',
      'layout.content',
      'layout.slot',
    ]);
    expect(primitives.filter(primitive => primitive.role === 'flex.gap' && primitive.kind === 'line')).toEqual([
      { kind: 'line', role: 'flex.gap', x1: 51, y1: 8, x2: 51, y2: 28, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'flex.gap', x1: 45, y1: 28, x2: 51, y2: 28, tone: 'scope', lineStyle: 'dashed' },
      { kind: 'line', role: 'flex.gap', x1: 45, y1: 8, x2: 45, y2: 28, tone: 'scope', lineStyle: 'dashed' },
    ]);
  });

  it('paints coincident box outlines once while preserving the first enabled role', () => {
    const sharedContainerBounds = rect(0, 0, 100, 60);
    const sharedItemBounds = rect(10, 10, 30, 20);
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container: {
        ...container,
        allocationBounds: sharedContainerBounds,
        contentBounds: sharedContainerBounds,
      },
      items: [
        {
          ...itemBase,
          marginBounds: sharedItemBounds,
          slotBounds: sharedItemBounds,
          allocationBounds: sharedItemBounds,
          visualBounds: sharedItemBounds,
          visibleBounds: sharedItemBounds,
          line: 0,
        },
      ],
      lines: [],
      spacing: [],
    };

    const primitives = inspectFlexLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: true, content: true, slot: true, allocation: true, visual: true },
        spacing: { padding: false, margin: false },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { lines: false, gaps: false, distributedSpace: false },
    });

    expect(primitives).toMatchObject([
      { kind: 'rect', role: 'layout.container', presentation: 'outline', ...sharedContainerBounds },
      { kind: 'rect', role: 'layout.slot', presentation: 'outline', ...sharedItemBounds },
    ]);
    expect(primitives).toHaveLength(2);
  });

  it('keeps one Flex internal boundary without repainting the content perimeter', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [],
      lines: [
        { index: 0, itemKeys: [], mainAxis: 'x', mainStart: 8, mainSize: 84, crossStart: 8, crossSize: 20 },
        { index: 1, itemKeys: [], mainAxis: 'x', mainStart: 8, mainSize: 84, crossStart: 28, crossSize: 24 },
      ],
      spacing: [],
    };

    const primitives = inspectFlexLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: false, content: true, slot: false, allocation: false, visual: false },
        spacing: { padding: false, margin: false },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { lines: true, gaps: false, distributedSpace: false },
    });

    expect(primitives.filter(primitive => primitive.role === 'flex.line')).toEqual([
      {
        kind: 'line',
        role: 'flex.line',
        x1: 8,
        y1: 28,
        x2: 92,
        y2: 28,
        tone: 'scope',
        lineStyle: 'dashed',
      },
    ]);
  });

  it('keeps only the uncovered fragment when a Flex line partially overlaps the content perimeter', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [],
      lines: [{ index: 0, itemKeys: [], mainAxis: 'x', mainStart: 0, mainSize: 50, crossStart: 8, crossSize: 12 }],
      spacing: [],
    };

    const primitives = inspectFlexLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: false, content: true, slot: false, allocation: false, visual: false },
        spacing: { padding: false, margin: false },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { lines: true, gaps: false, distributedSpace: false },
    });

    expect(primitives.filter(primitive => primitive.role === 'flex.line')).toEqual([
      {
        kind: 'line',
        role: 'flex.line',
        x1: 0,
        y1: 8,
        x2: 8,
        y2: 8,
        tone: 'scope',
        lineStyle: 'dashed',
      },
      {
        kind: 'line',
        role: 'flex.line',
        x1: 50,
        y1: 8,
        x2: 50,
        y2: 20,
        tone: 'scope',
        lineStyle: 'dashed',
      },
      {
        kind: 'line',
        role: 'flex.line',
        x1: 0,
        y1: 20,
        x2: 50,
        y2: 20,
        tone: 'scope',
        lineStyle: 'dashed',
      },
      {
        kind: 'line',
        role: 'flex.line',
        x1: 0,
        y1: 8,
        x2: 0,
        y2: 20,
        tone: 'scope',
        lineStyle: 'dashed',
      },
    ]);
  });

  it('keeps only the uncovered gap boundary fragment beside a content outline', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [],
      lines: [],
      spacing: [{ kind: 'gap', axis: 'x', bounds: rect(0, 8, 20, 12) }],
    };

    const primitives = inspectFlexLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: false, content: true, slot: false, allocation: false, visual: false },
        spacing: { padding: false, margin: false },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { lines: false, gaps: true, distributedSpace: false },
    });

    expect(primitives.filter(primitive => primitive.role === 'flex.gap' && primitive.kind === 'line')).toEqual([
      {
        kind: 'line',
        role: 'flex.gap',
        x1: 0,
        y1: 8,
        x2: 8,
        y2: 8,
        tone: 'scope',
        lineStyle: 'dashed',
      },
      {
        kind: 'line',
        role: 'flex.gap',
        x1: 20,
        y1: 8,
        x2: 20,
        y2: 20,
        tone: 'scope',
        lineStyle: 'dashed',
      },
      {
        kind: 'line',
        role: 'flex.gap',
        x1: 0,
        y1: 20,
        x2: 20,
        y2: 20,
        tone: 'scope',
        lineStyle: 'dashed',
      },
      {
        kind: 'line',
        role: 'flex.gap',
        x1: 0,
        y1: 8,
        x2: 0,
        y2: 20,
        tone: 'scope',
        lineStyle: 'dashed',
      },
    ]);
  });

  it('clips an oversized content rect before creating a non-overlapping padding ring', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container: { ...container, contentBounds: rect(-10, 10, 120, 30) },
      items: [],
      lines: [],
      spacing: [],
    };

    const padding = inspectFlexLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: false, content: true, slot: false, allocation: false, visual: false },
        spacing: { padding: true, margin: false },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { lines: false, gaps: false, distributedSpace: false },
    }).filter(
      primitive =>
        primitive.role === 'layout.padding' && primitive.kind === 'rect' && primitive.presentation === 'fill',
    );

    expect(padding).toMatchObject([
      { x: 0, y: 0, width: 100, height: 10 },
      { x: 0, y: 40, width: 100, height: 20 },
    ]);
  });

  it('draws a column Flex alignment guide on the x dimension', () => {
    const artifact: FlexLayoutArtifact = {
      kind: 'flex',
      container,
      items: [
        {
          ...itemBase,
          alignmentGuide: { ...itemBase.alignmentGuide, fallback: true },
          line: 0,
        },
      ],
      lines: [{ index: 0, itemKeys: ['a'], mainAxis: 'y', mainStart: 8, mainSize: 44, crossStart: 8, crossSize: 30 }],
      spacing: [],
    };

    const guide = inspectFlexLayoutArtifact(artifact, {
      sharedOptions: base,
      options: { lines: false, gaps: false, distributedSpace: false },
    }).find(primitive => primitive.role === 'layout.alignment-guide');

    expect(guide).toMatchObject({ kind: 'line', x1: 24, x2: 24, y1: 10, y2: 30, lineStyle: 'dashed' });
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
      spacing: [
        { kind: 'gap', axis: 'x', bounds: rect(38, 8, 4, 44) },
        { kind: 'distributed', axis: 'y', bounds: rect(8, 5, 84, 3) },
      ],
    };
    const primitives = inspectGridLayoutArtifact(artifact, {
      sharedOptions: {
        ...base,
        bounds: { ...base.bounds, slot: false, allocation: false },
      },
      options: { tracks: true, cells: true, gaps: true, distributedSpace: true, spans: true },
    });

    expect(primitives.map(primitive => primitive.role)).toEqual(
      expect.arrayContaining(['grid.track', 'grid.gap', 'grid.distributed', 'grid.span']),
    );
    expect(primitives.filter(primitive => primitive.role === 'grid.cell')).toEqual([]);
    expect(primitives.find(primitive => primitive.role === 'grid.gap')).toMatchObject({
      fillPattern: 'forward-diagonal',
    });
    expect(
      primitives.filter(
        primitive =>
          primitive.role === 'grid.distributed' && primitive.kind === 'rect' && primitive.presentation === 'fill',
      ),
    ).toEqual([]);
    expect(primitives.filter(primitive => primitive.role === 'grid.distributed' && primitive.kind === 'line')).toEqual([
      {
        kind: 'line',
        role: 'grid.distributed',
        x1: 8,
        y1: 5,
        x2: 92,
        y2: 5,
        tone: 'scope',
        lineStyle: 'dashed',
      },
      {
        kind: 'line',
        role: 'grid.distributed',
        x1: 92,
        y1: 5,
        x2: 92,
        y2: 8,
        tone: 'scope',
        lineStyle: 'dashed',
      },
      {
        kind: 'line',
        role: 'grid.distributed',
        x1: 8,
        y1: 5,
        x2: 8,
        y2: 8,
        tone: 'scope',
        lineStyle: 'dashed',
      },
    ]);
    expect(
      primitives
        .filter(primitive => ['grid.track', 'grid.cell', 'grid.span'].includes(primitive.role))
        .every(primitive => 'lineStyle' in primitive && primitive.lineStyle === 'dashed'),
    ).toBe(true);
  });

  it('keeps unique Grid internal boundaries without repainting the content perimeter', () => {
    const artifact: GridLayoutArtifact = {
      kind: 'grid',
      container,
      items: [],
      columns: [
        { index: 0, start: 8, size: 30, sourceKind: 'fixed', implicit: false },
        { index: 1, start: 38, size: 54, sourceKind: 'fixed', implicit: false },
      ],
      rows: [
        { index: 0, start: 8, size: 20, sourceKind: 'fixed', implicit: false },
        { index: 1, start: 28, size: 24, sourceKind: 'fixed', implicit: false },
      ],
      spacing: [],
    };

    const primitives = inspectGridLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: false, content: true, slot: false, allocation: false, visual: false },
        spacing: { padding: false, margin: false },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { tracks: true, cells: false, gaps: false, distributedSpace: false, spans: false },
    });

    expect(primitives.filter(primitive => primitive.role === 'grid.track')).toEqual([
      {
        kind: 'line',
        role: 'grid.track',
        x1: 38,
        y1: 8,
        x2: 38,
        y2: 52,
        tone: 'scope',
        lineStyle: 'dashed',
      },
      {
        kind: 'line',
        role: 'grid.track',
        x1: 8,
        y1: 28,
        x2: 92,
        y2: 28,
        tone: 'scope',
        lineStyle: 'dashed',
      },
    ]);
  });

  it('normalizes Grid tracks, cells, spans, and slot outlines as one boundary set', () => {
    const sharedSlot = rect(10, 10, 50, 20);
    const artifact: GridLayoutArtifact = {
      kind: 'grid',
      container: { ...container, contentBounds: rect(0, 0, 100, 60) },
      items: [
        {
          ...itemBase,
          marginBounds: sharedSlot,
          slotBounds: sharedSlot,
          allocationBounds: sharedSlot,
          visualBounds: sharedSlot,
          visibleBounds: sharedSlot,
          column: 0,
          row: 0,
          columnSpan: 2,
          rowSpan: 1,
        },
      ],
      columns: [
        { index: 0, start: 10, size: 20, sourceKind: 'fixed', implicit: false },
        { index: 1, start: 30, size: 30, sourceKind: 'fixed', implicit: false },
      ],
      rows: [{ index: 0, start: 10, size: 20, sourceKind: 'fixed', implicit: false }],
      spacing: [],
    };

    const primitives = inspectGridLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: false, content: false, slot: true, allocation: false, visual: false },
        spacing: { padding: false, margin: false },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { tracks: true, cells: true, gaps: false, distributedSpace: false, spans: true },
    });

    expect(primitives.filter(primitive => primitive.role === 'layout.slot')).toMatchObject([
      { kind: 'rect', presentation: 'outline', ...sharedSlot },
    ]);
    expect(primitives.filter(primitive => primitive.role === 'grid.cell')).toEqual([]);
    expect(primitives.filter(primitive => primitive.role === 'grid.span')).toEqual([]);
    expect(primitives.filter(primitive => primitive.role === 'grid.track')).toHaveLength(9);
    expect(primitives.filter(primitive => primitive.role === 'grid.track')).not.toContainEqual(
      expect.objectContaining({ kind: 'line', x1: 10, y1: 0, x2: 10, y2: 60 }),
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
      sharedOptions: {
        ...base,
        bounds: { ...base.bounds, slot: false, allocation: false },
      },
      options: { placements: true, anchors: true, stacking: true },
    });

    expect(primitives.map(primitive => primitive.role)).toEqual(
      expect.arrayContaining(['overlay.placement', 'overlay.anchor', 'overlay.stacking']),
    );
    expect(primitives.filter(primitive => primitive.role === 'overlay.anchor')).toMatchObject([
      { lineStyle: 'solid', tone: 'scope' },
      { lineStyle: 'solid', tone: 'scope' },
    ]);
    expect(primitives.find(primitive => primitive.role === 'overlay.placement')).toMatchObject({
      lineStyle: 'dashed',
      tone: 'scope',
    });
  });

  it('does not repaint an Overlay placement already represented by its slot outline', () => {
    const artifact = {
      kind: 'overlay',
      container,
      items: [
        {
          ...itemBase,
          placement: 'aligned',
          sizeParticipation: 'include',
          zIndex: 0,
        },
      ],
      paintOrder: ['a'],
    } as OverlayLayoutArtifact;

    const primitives = inspectOverlayLayoutArtifact(artifact, {
      sharedOptions: {
        bounds: { container: false, content: false, slot: true, allocation: false, visual: false },
        spacing: { padding: false, margin: false },
        overflow: false,
        alignmentGuides: false,
        labels: false,
      },
      options: { placements: true, anchors: false, stacking: false },
    });

    expect(primitives).toMatchObject([{ kind: 'rect', role: 'layout.slot', presentation: 'outline' }]);
    expect(primitives).toHaveLength(1);
  });
});
