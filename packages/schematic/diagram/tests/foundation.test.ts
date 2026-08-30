import type { IRChild, IRScope, ResolvedTheme, ScenePrimitive } from '@retikz/core';
import type { IRFlexLayout } from '@retikz/layout';

import { DEFAULT_RESOLVED_THEME, defineThemeStyle, LayoutAxisProposalKind, ThemeMode } from '@retikz/core';
import { FlexLayoutArtifactSchema, FlexLayoutDirection, FlexLayoutSchema, LayoutAlignment } from '@retikz/layout';
import { LegendArtifactSchema, LegendSchema } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { defineDiagramThemeStyle } from '../src/contract';
import { RetikzDiagramError, RetikzDiagramErrorCode } from '../src/errors';
import { lowerDiagramFoundation } from '../src/pipeline';
import { resolveDiagramThemeStyleRegistry } from '../src/providers';
import { resolveDiagramFoundation } from '../src/resolve';
import { DiagramFrameSchema, DiagramPresentationSchema, DiagramThemeSchema } from '../src/schemas';
import { compileTestDiagramFoundation } from './test-utils';

const drawing: IRChild = {
  type: 'node',
  id: 'drawing',
  position: [0, 0],
  minimumSize: { width: 80, height: 40 },
  text: 'Drawing',
};

const legend = LegendSchema.parse({
  namespace: 'standard',
  type: 'legend',
  id: 'legend-main',
  padding: 3,
  contentAlign: 'end',
  content: {
    kind: 'items',
    direction: 'horizontal',
    wrap: 'wrap',
    gap: { row: 3, column: 5 },
    sampleGap: 4,
    sampleAlign: 'start',
    items: [
      {
        key: 'critical',
        sample: { type: 'node', position: [0, 0], minimumSize: 10, fill: '#dc2626' },
        label: { type: 'node', position: [0, 0], text: 'Critical' },
      },
    ],
  },
});

const rampLegend = LegendSchema.parse({
  namespace: 'standard',
  type: 'legend',
  id: 'legend-ramp',
  content: {
    kind: 'ramp',
    direction: 'horizontal',
    sample: { type: 'node', position: [0, 0], minimumSize: { width: 60, height: 12 }, fill: '#64748b' },
    ticks: [
      { key: 'low', offset: 0, label: { type: 'node', position: [0, 0], text: 'Low' } },
      { key: 'high', offset: 1, label: { type: 'node', position: [0, 0], text: 'High' } },
    ],
  },
});

const resolveFoundation = (
  source: Readonly<{
    presentation?: ReturnType<typeof DiagramPresentationSchema.parse>;
    frame?: ReturnType<typeof DiagramFrameSchema.parse>;
    diagramTheme?: ReturnType<typeof DiagramThemeSchema.parse>;
  }> = {},
) =>
  resolveDiagramFoundation(source, {
    theme: DEFAULT_RESOLVED_THEME,
    diagramThemeStyles: resolveDiagramThemeStyleRegistry(),
  });

const flexOf = (child: IRChild): IRFlexLayout => {
  const parsed = FlexLayoutSchema.safeParse(child);
  if (!parsed.success) throw new Error('Expected a FlexLayout child');
  return parsed.data;
};

const isScope = (value: unknown): value is IRScope =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  value.type === 'scope' &&
  'children' in value &&
  Array.isArray(value.children);

const primitivesOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...primitivesOf(primitive.children)] : [primitive],
  );

describe('Diagram Foundation resolve', () => {
  it('resolves complete Frame defaults without manufacturing Presentation or drawing state', () => {
    const resolution = resolveFoundation();

    expect(resolution).toEqual({
      frame: {
        legendPosition: 'right',
        legendAlign: 'start',
        titleDescriptionGap: 6,
        headingMainGap: 16,
        drawingLegendGap: 16,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        cornerRadius: 0,
        overflow: 'visible',
      },
      title: {
        textColor: '#000000',
        opacity: 1,
        font: { size: 18, weight: 600 },
        align: 'start',
        lineHeight: 22,
      },
      description: {
        textColor: 'hsl(215, 12%, 48%)',
        opacity: 1,
        font: { size: 14, weight: 400 },
        align: 'start',
        lineHeight: 20,
      },
    });
    expect(resolution).not.toHaveProperty('drawing');
    expect(resolution).not.toHaveProperty('id');
    expect(resolution).not.toHaveProperty('artifact');
  });

  it('applies inline Theme then preserves every legal falsy Frame override', () => {
    const resolution = resolveFoundation({
      presentation: DiagramPresentationSchema.parse({ legend }),
      diagramTheme: DiagramThemeSchema.parse({
        frame: { padding: 20, cornerRadius: 8, background: { fill: '#ffffff' } },
        title: { opacity: 0.7, font: { family: 'Inter' } },
      }),
      frame: DiagramFrameSchema.parse({
        legendPosition: 'left',
        legendAlign: 'end',
        titleDescriptionGap: 0,
        headingMainGap: 0,
        drawingLegendGap: 0,
        padding: 0,
        background: { fill: 'transparent', fillOpacity: 0 },
        cornerRadius: 0,
        overflow: 'visible',
      }),
    });

    expect(resolution.frame).toMatchObject({
      legendPosition: 'left',
      legendAlign: 'end',
      titleDescriptionGap: 0,
      headingMainGap: 0,
      drawingLegendGap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      background: { fill: 'transparent', fillOpacity: 0 },
      cornerRadius: 0,
      overflow: 'visible',
    });
    expect(resolution.title).toMatchObject({ opacity: 0.7, font: { family: 'Inter', size: 18, weight: 600 } });
  });

  it.each([{ legendPosition: 'left' as const }, { legendAlign: 'center' as const }, { drawingLegendGap: 0 }])(
    'rejects explicit Legend structure fields when Presentation has no Legend: %j',
    frame => {
      try {
        resolveFoundation({ frame: DiagramFrameSchema.parse(frame) });
        expect.unreachable('Expected invalid Legend structure failure');
      } catch (error) {
        if (!(error instanceof RetikzDiagramError)) throw error;
        expect(error.code).toBe(RetikzDiagramErrorCode.ResolveInvalid);
        expect(error.details.reason).toMatch(/legend/i);
      }
    },
  );
});

describe('Diagram Foundation lowering', () => {
  it('uses the drawing child directly when every optional region is absent', () => {
    const surface = lowerDiagramFoundation(resolveFoundation(), drawing);

    expect(surface).toMatchObject({
      namespace: 'standard',
      type: 'surface',
      child: drawing,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      overflow: 'visible',
      cornerRadius: 0,
    });
    expect(JSON.stringify(surface).match(/"id":"drawing"/g)).toHaveLength(1);
  });

  it('places complete Presentation text in a node-reset heading outside the drawing child', () => {
    const presentation = DiagramPresentationSchema.parse({
      title: ['Title', { runs: [{ text: 'styled', fill: '#2563eb' }, { tex: 'x^2' }] }],
      description: 'Description',
    });
    const surface = lowerDiagramFoundation(resolveFoundation({ presentation }), drawing);
    const outer = flexOf(surface.child);

    expect(outer.direction).toBe(FlexLayoutDirection.Column);
    expect(outer.gap).toEqual({ column: 16, row: 16 });
    expect(outer.children).toHaveLength(2);
    const headingScope = outer.children[0]?.child;
    if (!isScope(headingScope)) throw new Error('Expected presentation reset Scope');
    expect(headingScope.resetStyle).toEqual(['node']);
    const heading = flexOf(headingScope.children[0]);
    expect(heading.direction).toBe(FlexLayoutDirection.Column);
    expect(heading.gap).toEqual({ column: 6, row: 6 });
    expect(heading.children[0]?.child).toMatchObject({
      type: 'node',
      fill: 'none',
      stroke: 'none',
      padding: 0,
      margin: 0,
      minimumSize: 0,
      text: presentation.title,
      textColor: '#000000',
      opacity: 1,
      font: { size: 18, weight: 600 },
    });
    expect(heading.children[1]?.child).toMatchObject({ type: 'node', text: 'Description' });
    expect(outer.children[1]?.child).toEqual(drawing);
    expect(JSON.stringify(headingScope)).not.toContain('"id":"drawing"');
  });

  it.each([
    { side: 'top' as const, direction: FlexLayoutDirection.Column, legendIndex: 0, drawingIndex: 1 },
    { side: 'right' as const, direction: FlexLayoutDirection.Row, legendIndex: 1, drawingIndex: 0 },
    { side: 'bottom' as const, direction: FlexLayoutDirection.Column, legendIndex: 1, drawingIndex: 0 },
    { side: 'left' as const, direction: FlexLayoutDirection.Row, legendIndex: 0, drawingIndex: 1 },
  ])(
    'docks the Legend on $side without changing its internal layout',
    ({ side, direction, legendIndex, drawingIndex }) => {
      const presentation = DiagramPresentationSchema.parse({ legend });
      const frame = DiagramFrameSchema.parse({ legendPosition: side, legendAlign: 'center', drawingLegendGap: 9 });
      const main = flexOf(lowerDiagramFoundation(resolveFoundation({ presentation, frame }), drawing).child);

      expect(main.direction).toBe(direction);
      expect(main.gap).toEqual({ column: 9, row: 9 });
      expect(main.children[legendIndex]).toMatchObject({ alignSelf: LayoutAlignment.Center, child: legend });
      expect(main.children[drawingIndex]).toMatchObject({ alignSelf: LayoutAlignment.Stretch, child: drawing });
      expect(main.children[legendIndex]?.child).toEqual(legend);
      expect(main.children[legendIndex]?.child).not.toHaveProperty('direction');
    },
  );

  it('preserves a non-default ramp Legend and its authored tick keys', () => {
    const presentation = DiagramPresentationSchema.parse({ legend: rampLegend });
    const main = flexOf(lowerDiagramFoundation(resolveFoundation({ presentation }), drawing).child);

    expect(main.children[1]?.child).toEqual(rampLegend);
  });
});

describe('Diagram Foundation provider integration', () => {
  it('observes the effective Core Scope Theme before resolving the named Diagram style', () => {
    const observed: Array<ResolvedTheme> = [];
    const diagramStyle = defineDiagramThemeStyle({
      name: 'brand',
      resolve: theme => {
        observed.push(theme);
        return { title: { textColor: '#f97316' } };
      },
    });
    const coreStyle = defineThemeStyle({
      name: 'brand',
      resolve: () => ({ semantic: { guide: '#94a3b8' } }),
    });
    const output = compileTestDiagramFoundation(
      {
        presentation: DiagramPresentationSchema.parse({ title: 'Themed title' }),
        drawing,
      },
      {
        host: { theme: { style: 'brand', mode: ThemeMode.Dark } },
        diagram: { diagramThemeStyles: [diagramStyle] },
        themeStyles: [coreStyle],
      },
    );
    const text = primitivesOf(output.scene.primitives).find(
      primitive => primitive.type === 'text' && primitive.lines.some(line => line.text === 'Themed title'),
    );

    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({ style: 'brand', mode: ThemeMode.Dark });
    expect(text).toMatchObject({ type: 'text', fill: '#f97316' });
  });

  it('isolates generated text Nodes while the opaque drawing keeps host nodeDefault', () => {
    const output = compileTestDiagramFoundation(
      {
        presentation: DiagramPresentationSchema.parse({ title: 'Title' }),
        drawing,
      },
      {
        host: {
          nodeDefault: { fill: '#ef4444', stroke: '#2563eb', minimumSize: 200 },
        },
      },
    );
    const primitives = primitivesOf(output.scene.primitives);
    const rectangles = primitives.filter(primitive => primitive.type === 'rect');
    const title = primitives.find(
      primitive => primitive.type === 'text' && primitive.lines.some(line => line.text === 'Title'),
    );

    expect(rectangles.some(rect => rect.fill === '#ef4444' && rect.stroke === '#2563eb')).toBe(true);
    expect(title).toMatchObject({ type: 'text', fill: '#000000' });
  });

  it('keeps dependency-owned artifacts observable without publishing Diagram identity or artifacts', () => {
    const output = compileTestDiagramFoundation({
      presentation: DiagramPresentationSchema.parse({
        title: 'Title',
        description: 'Description',
        legend,
      }),
      drawing: { ...drawing, meta: { secret: 'drawing-source-only' } },
    });
    const compositeTypes = output.artifacts
      .filter(artifact => artifact.kind === 'composite')
      .map(artifact => artifact.type);
    const flexArtifacts = output.artifacts
      .filter(
        artifact => artifact.kind === 'composite' && artifact.namespace === 'layout' && artifact.type === 'flexLayout',
      )
      .map(artifact => FlexLayoutArtifactSchema.parse(artifact.value));
    const flexItems = flexArtifacts.flatMap(artifact => artifact.items);
    const legendArtifactValue = output.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'standard' && artifact.type === 'legend',
    )?.value;
    const legendArtifact = LegendArtifactSchema.parse(legendArtifactValue);
    const textLines = primitivesOf(output.scene.primitives).flatMap(primitive =>
      primitive.type === 'text' ? primitive.lines.map(line => line.text) : [],
    );

    expect(compositeTypes).toEqual(expect.arrayContaining(['flexLayout', 'legend']));
    expect(compositeTypes).not.toContain('foundation');
    expect(output.artifacts.some(artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram')).toBe(
      false,
    );
    expect(flexItems.map(item => item.key)).toEqual(
      expect.arrayContaining(['heading', 'main', 'title', 'description', 'drawing', 'legend']),
    );
    for (const key of ['title', 'description', 'drawing', 'legend']) {
      const item = flexItems.find(candidate => candidate.key === key);
      expect(item?.allocationBounds.width).toBeGreaterThan(0);
      expect(item?.allocationBounds.height).toBeGreaterThan(0);
      expect(item?.visualBounds.width).toBeGreaterThan(0);
      expect(item?.visibleBounds).not.toBeNull();
    }
    expect(legendArtifact).toMatchObject({ kind: 'items', items: [{ key: 'critical', sourceIndex: 0 }] });
    expect(textLines).toEqual(expect.arrayContaining(['Title', 'Description', 'Drawing', 'Critical']));
    expect(JSON.stringify(output.artifacts)).not.toContain('drawing-source-only');
    expect(JSON.stringify(output.scene)).toContain('drawing-source-only');
    expect(output.scene.layout.width).toBeGreaterThan(0);
    expect(output.scene.layout.height).toBeGreaterThan(0);
  });

  it('keeps ramp tick identity in the dependency-owned Legend artifact', () => {
    const output = compileTestDiagramFoundation({
      presentation: DiagramPresentationSchema.parse({ legend: rampLegend }),
      drawing,
    });
    const value = output.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'standard' && artifact.type === 'legend',
    )?.value;
    const artifact = LegendArtifactSchema.parse(value);

    expect(artifact).toMatchObject({
      kind: 'ramp',
      ticks: [
        { key: 'low', sourceIndex: 0 },
        { key: 'high', sourceIndex: 1 },
      ],
    });
  });

  it('lets replacement drawing geometry determine the complete Scene allocation', () => {
    const compileWithSize = (width: number, height: number) =>
      compileTestDiagramFoundation({
        drawing: { type: 'node', position: [0, 0], minimumSize: { width, height } },
      }).scene.layout;
    const small = compileWithSize(20, 10);
    const large = compileWithSize(120, 70);

    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBeGreaterThan(small.height);
  });

  it('keeps rounded Surface content clipping inside Scope clipping while preserving frame paint', () => {
    const output = compileTestDiagramFoundation(
      {
        frame: DiagramFrameSchema.parse({
          overflow: 'clip',
          cornerRadius: 6,
          padding: 4,
          background: { fill: '#f8fafc' },
          border: { stroke: '#0f172a', strokeWidth: 2 },
        }),
        drawing,
      },
      {
        host: { clip: { kind: 'rect', x: 0, y: 0, width: 40, height: 30 } },
      },
    );
    const clippedGroups = primitivesOf(output.scene.primitives).filter(
      primitive => primitive.type === 'group' && primitive.clipRef !== undefined,
    );
    const clipResources = (output.scene.resources ?? []).filter(resource => resource.kind === 'clip');
    const roundedClip = clipResources.find(resource => resource.path.commands.some(command => command.kind === 'arc'));
    const scopeClip = clipResources.find(resource => resource.path.commands.every(command => command.kind !== 'arc'));
    const roundedArcs = roundedClip?.path.commands.filter(command => command.kind === 'arc') ?? [];
    const scopeGroup = output.scene.primitives.find(
      primitive => primitive.type === 'group' && primitive.clipRef === scopeClip?.id,
    );
    const scopePrimitives = scopeGroup?.type === 'group' ? primitivesOf(scopeGroup.children) : [];
    const surfaceContent = scopePrimitives.find(
      primitive => primitive.type === 'group' && primitive.clipRef === roundedClip?.id,
    );
    const surfaceContentPrimitives = surfaceContent?.type === 'group' ? primitivesOf(surfaceContent.children) : [];

    expect(clippedGroups.flatMap(group => (group.type === 'group' ? [group.clipRef] : []))).toEqual(
      expect.arrayContaining([scopeClip?.id, roundedClip?.id]),
    );
    expect(roundedArcs).toHaveLength(4);
    expect(roundedArcs.every(command => command.radius === 6)).toBe(true);
    expect(scopeGroup).toBeDefined();
    expect(surfaceContent).toBeDefined();
    expect(scopePrimitives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'path', fill: '#f8fafc', stroke: 'none' }),
        expect.objectContaining({ type: 'path', fill: 'none', stroke: '#0f172a', strokeWidth: 2 }),
      ]),
    );
    expect(
      surfaceContentPrimitives.some(
        primitive => primitive.type === 'path' && (primitive.fill === '#f8fafc' || primitive.stroke === '#0f172a'),
      ),
    ).toBe(false);
    expect(output.scene.layout.width).toBeGreaterThan(40);
    expect(output.scene.layout.height).toBeGreaterThan(30);
  });

  it('fails before drawing layout when an exact proposal cannot contain Surface padding', () => {
    expect(() =>
      compileTestDiagramFoundation(
        { drawing },
        {
          proposal: {
            x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
            y: { kind: LayoutAxisProposalKind.Exact, value: 20 },
          },
        },
      ),
    ).toThrow(/surface.*padding/i);
  });
});
