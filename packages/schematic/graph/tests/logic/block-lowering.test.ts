import type { CompileWarning, LayoutProposal } from '@retikz/core';
import type { FlexLayoutCompileArtifact } from '@retikz/layout';

import {
  compileToScene,
  CompileWarningCode,
  defineThemeStyle,
  LayoutAxisProposalKind,
  resolveCoreProviderDependencies,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';
import {
  compileInHarness,
  exactProposal,
  minimumProposal,
  naturalProposal,
  pathPrimitivesOf,
  primitivesOf,
} from './test-utils';

const textNode = (text: string) => ({
  type: 'node' as const,
  position: [0, 0] as const,
  text,
  padding: 0,
  margin: 0,
});

const textValues = (primitives: ReturnType<typeof primitivesOf>): Array<string> =>
  primitives.flatMap(primitive => (primitive.type === 'text' ? primitive.lines.map(line => line.text) : []));

const flexArtifactWithKeys = (
  output: ReturnType<typeof compileToScene>,
  keys: ReadonlyArray<string>,
): FlexLayoutCompileArtifact => {
  const artifact = output.artifacts
    .filter(candidate => candidate.kind === 'composite' && candidate.type === 'flexLayout')
    .map(candidate => candidate as FlexLayoutCompileArtifact)
    .find(candidate => candidate.value.items.map(item => item.key).join('|') === keys.join('|'));
  if (artifact === undefined) throw new Error(`Expected FlexLayout artifact for keys '${keys.join(', ')}'`);
  return artifact;
};

describe('Block-family layout-aware lowering', () => {
  it('keeps arbitrary Block children in authored column order and applies shell defaults', () => {
    const { output, result } = compileInHarness(
      Graph.createBlock({ children: [textNode('first'), textNode('second'), textNode('third')] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );

    expect(textValues(primitivesOf(output.scene.primitives))).toEqual(['first', 'second', 'third']);
    expect(result.allocationBounds.width).toBeGreaterThanOrEqual(16);
    expect(result.allocationBounds.height).toBeGreaterThan(16);
    expect(pathPrimitivesOf(output.scene.primitives)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.2 }),
      ]),
    );
  });

  it('keeps omitted and empty Block children on one stable Surface root', () => {
    const omitted = compileInHarness(Graph.createBlock({}), naturalProposal, Graph.createGraphDefinitions());
    const empty = compileInHarness(
      Graph.createBlock({ children: [] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );

    expect(omitted.result.allocationBounds).toEqual(empty.result.allocationBounds);
    expect(omitted.result.slotSize).toEqual(empty.result.slotSize);
    expect(pathPrimitivesOf(omitted.output.scene.primitives)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.2 }),
      ]),
    );
  });

  it('applies named Graph Theme tokens to the Block root shell', () => {
    const styleName = 'block-shell';
    const graphStyle = Graph.defineGraphThemeStyle({
      name: styleName,
      resolve: () => ({
        block: {
          tokens: {
            background: { fill: '#dbeafe', fillOpacity: 0.7 },
            border: { stroke: '#1d4ed8', strokeWidth: 3 },
            cornerRadius: 7,
          },
        },
      }),
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { style: styleName },
        children: [Graph.createBlock({})],
      },
      {
        composites: Graph.createGraphDefinitions({ graphThemeStyles: [graphStyle] }),
        themeStyles: [defineThemeStyle({ name: styleName, resolve: () => ({}) })],
        padding: 0,
      },
    );
    const visiblePaths = pathPrimitivesOf(output.scene.primitives).filter(
      path => path.fill !== 'none' || path.stroke !== 'none',
    );

    expect(visiblePaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fill: '#dbeafe', fillOpacity: 0.7, stroke: 'none' }),
        expect.objectContaining({ stroke: '#1d4ed8', strokeWidth: 3 }),
      ]),
    );
    expect(
      visiblePaths.every(path => path.commands.some(command => command.kind === 'arc' && command.radius === 7)),
    ).toBe(true);
  });

  it('replaces a themed Block border as one complete explicit Source field', () => {
    const styleName = 'block-explicit-shell';
    const graphStyle = Graph.defineGraphThemeStyle({
      name: styleName,
      resolve: () => ({
        block: {
          tokens: {
            background: { fill: '#ecfccb' },
            border: { stroke: '#3f6212', strokeWidth: 4, strokeOpacity: 0.25, dashPattern: [3, 1] },
            cornerRadius: 9,
          },
        },
      }),
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { style: styleName },
        children: [Graph.createBlock({ border: { stroke: '#dc2626', strokeWidth: 2 } })],
      },
      {
        composites: Graph.createGraphDefinitions({ graphThemeStyles: [graphStyle] }),
        themeStyles: [defineThemeStyle({ name: styleName, resolve: () => ({}) })],
        padding: 0,
      },
    );
    const border = pathPrimitivesOf(output.scene.primitives).find(path => path.stroke === '#dc2626');

    expect(border).toEqual(expect.objectContaining({ strokeWidth: 2 }));
    expect(border?.strokeOpacity).toBeUndefined();
    expect(border?.dashPattern).toBeUndefined();
    expect(pathPrimitivesOf(output.scene.primitives)).toEqual(
      expect.arrayContaining([expect.objectContaining({ fill: '#ecfccb' })]),
    );
  });

  it('compiles Header slots and text defaults without optional placeholders', () => {
    const { output } = compileInHarness(
      Graph.createBlockHeader({
        icon: textNode('icon'),
        title: { text: 'Service' },
        description: { text: 'Public API' },
        trail: textNode('stable'),
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const texts = primitivesOf(output.scene.primitives).filter(primitive => primitive.type === 'text');

    expect(textValues(texts)).toEqual(['icon', 'Service', 'Public API', 'stable']);
    expect(texts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lines: expect.any(Array), opacity: 1 }),
        expect.objectContaining({ lines: expect.any(Array), opacity: 0.7 }),
      ]),
    );
    expect(texts[1]).toEqual(expect.objectContaining({ fontSize: 16, fontWeight: 'bold', opacity: 1 }));
    expect(texts[2]).toEqual(expect.objectContaining({ fontSize: 12, opacity: 0.7 }));

    const overridden = compileInHarness(
      Graph.createBlockHeader({
        title: { text: 'Override', font: { weight: 'normal' } },
        description: { text: 'Override details', font: { size: 'base' } },
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const overriddenTexts = primitivesOf(overridden.output.scene.primitives).filter(
      primitive => primitive.type === 'text',
    );
    expect(overriddenTexts[0]).toEqual(expect.objectContaining({ fontWeight: 'normal' }));
    expect(overriddenTexts[1]).toEqual(expect.objectContaining({ fontSize: 16 }));

    const titleOnly = compileInHarness(
      Graph.createBlockHeader({ title: { text: 'Only' } }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    expect(textValues(primitivesOf(titleOnly.output.scene.primitives))).toEqual(['Only']);
  });

  it('renders string Header text with the regular title and description defaults', () => {
    const { output } = compileInHarness(
      Graph.createBlockHeader({
        title: 'Service',
        description: 'Public API',
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const texts = primitivesOf(output.scene.primitives).filter(primitive => primitive.type === 'text');

    expect(textValues(texts)).toEqual(['Service', 'Public API']);
    expect(texts[0]).toEqual(expect.objectContaining({ fontSize: 16, fontWeight: 'bold', opacity: 1 }));
    expect(texts[1]).toEqual(expect.objectContaining({ fontSize: 12, opacity: 0.7 }));
  });

  it('changes only the Header text layout direction', () => {
    const source = {
      icon: textNode('icon'),
      title: { text: 'Service' },
      description: { text: 'Public API' },
      trail: textNode('stable'),
    } as const;
    const implicit = compileInHarness(Graph.createBlockHeader(source), naturalProposal, Graph.createGraphDefinitions());
    const vertical = compileInHarness(
      Graph.createBlockHeader({ ...source, direction: 'vertical' }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const horizontal = compileInHarness(
      Graph.createBlockHeader({ ...source, direction: 'horizontal' }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );

    expect(implicit.result.allocationBounds).toEqual(vertical.result.allocationBounds);
    expect(horizontal.result.allocationBounds.width).toBeGreaterThan(vertical.result.allocationBounds.width);
    expect(horizontal.result.allocationBounds.height).toBeLessThan(vertical.result.allocationBounds.height);
    for (const result of [implicit, vertical, horizontal]) {
      expect(textValues(primitivesOf(result.output.scene.primitives))).toEqual([
        'icon',
        'Service',
        'Public API',
        'stable',
      ]);
    }
  });

  it('uses bottom alignment only for horizontal Header text', () => {
    const source = {
      title: { text: 'Service' },
      description: { text: 'Public API' },
    } as const;
    const horizontal = compileInHarness(
      Graph.createBlockHeader({ ...source, direction: 'horizontal' }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const vertical = compileInHarness(
      Graph.createBlockHeader({ ...source, direction: 'vertical' }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const horizontalText = flexArtifactWithKeys(horizontal.output, ['title', 'description']);
    const verticalText = flexArtifactWithKeys(vertical.output, ['title', 'description']);
    const horizontalTitle = horizontalText.value.items[0].slotBounds;
    const horizontalDescription = horizontalText.value.items[1].slotBounds;
    const verticalTitle = verticalText.value.items[0].slotBounds;
    const verticalDescription = verticalText.value.items[1].slotBounds;

    expect(horizontalTitle.y + horizontalTitle.height).toBeCloseTo(
      horizontalDescription.y + horizontalDescription.height,
    );
    expect(verticalTitle.x).toBeCloseTo(verticalDescription.x);
  });

  it('applies Header itemGap and main-axis distribution only inside the text region', () => {
    const source = {
      icon: textNode('icon'),
      title: { text: 'A' },
      description: { text: 'B' },
      direction: 'horizontal' as const,
      trail: textNode('stable'),
    };
    const defaultGap = compileInHarness(
      Graph.createBlockHeader(source),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const authoredGap = compileInHarness(
      Graph.createBlockHeader({ ...source, itemGap: 20 }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );

    expect(authoredGap.result.allocationBounds.width - defaultGap.result.allocationBounds.width).toBeCloseTo(16);

    const start = compileInHarness(
      Graph.createBlockHeader({ ...source, itemGap: 8, justifyContent: 'start' }),
      exactProposal(240, 40),
      Graph.createGraphDefinitions(),
    );
    const distributed = compileInHarness(
      Graph.createBlockHeader({ ...source, itemGap: 8, justifyContent: 'space-between' }),
      exactProposal(240, 40),
      Graph.createGraphDefinitions(),
    );
    const startText = flexArtifactWithKeys(start.output, ['title', 'description']);
    const distributedText = flexArtifactWithKeys(distributed.output, ['title', 'description']);

    expect(distributedText.value.items[0]?.slotBounds.x).toBe(startText.value.items[0]?.slotBounds.x);
    expect(distributedText.value.items[1]?.slotBounds.x).toBeGreaterThan(startText.value.items[1]?.slotBounds.x ?? 0);
    expect(textValues(primitivesOf(distributed.output.scene.primitives))).toEqual(['icon', 'A', 'B', 'stable']);
  });

  it('compiles independent Section without a default stroke and keeps Row shell-free', () => {
    const section = Graph.createBlockSection({
      id: 'section',
      title: { text: 'Fields' },
      children: [Graph.createBlockRow({ id: 'row', children: [textNode('name')] })],
    });
    const { output } = compileInHarness(section, naturalProposal, Graph.createGraphDefinitions());
    const primitives = primitivesOf(output.scene.primitives);

    expect(primitives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'group', id: 'section' }),
        expect.objectContaining({ type: 'group', id: 'row' }),
        expect.objectContaining({
          type: 'path',
          fill: 'currentColor',
          fillOpacity: 0.037,
          stroke: 'none',
        }),
      ]),
    );
    expect(
      primitives.filter(
        primitive => primitive.type === 'path' && primitive.stroke !== undefined && primitive.stroke !== 'none',
      ),
    ).toHaveLength(0);
    expect(primitives.filter(primitive => primitive.type === 'path' && primitive.id === 'row')).toHaveLength(0);
  });

  it('defaults Row padding to zero while preserving explicit padding', () => {
    const compileRow = (padding?: number) =>
      compileInHarness(
        Graph.createBlockRow({ content: 'name', ...(padding === undefined ? {} : { padding }) }),
        naturalProposal,
        Graph.createGraphDefinitions(),
      );

    const omitted = compileRow();
    const explicitZero = compileRow(0);
    const explicitEight = compileRow(8);

    expect(omitted.result.allocationBounds).toEqual(explicitZero.result.allocationBounds);
    expect(explicitEight.result.allocationBounds.width - explicitZero.result.allocationBounds.width).toBeCloseTo(16);
    expect(explicitEight.result.allocationBounds.height - explicitZero.result.allocationBounds.height).toBeCloseTo(16);
  });

  it('shares Row space equally across direct children', () => {
    const compileCells = (labels: ReadonlyArray<string>) => {
      const compiled = compileInHarness(
        Graph.createBlockRow({
          padding: 0,
          gap: 0,
          children: labels.map(label => textNode(label)),
        }),
        exactProposal(240, 40),
        Graph.createGraphDefinitions(),
      );
      const artifact = compiled.output.artifacts
        .filter(candidate => candidate.kind === 'composite' && candidate.type === 'flexLayout')
        .map(candidate => candidate as FlexLayoutCompileArtifact)
        .find(candidate => candidate.value.items.length === labels.length);
      if (artifact === undefined) throw new Error(`Expected Row FlexLayout artifact with ${labels.length} items`);
      return artifact.value.items.map(item => item.slotBounds.width);
    };

    expect(compileCells(['x', 'much wider content'])).toEqual([120, 120]);
    expect(compileCells(['x', 'medium', 'much wider content'])).toEqual([80, 80, 80]);
  });

  it('lowers sparse Row text content to equal-share Core Nodes', () => {
    const compileContent = (content: Graph.IRBlockText | Array<Graph.IRBlockText>) =>
      compileInHarness(
        Graph.createBlockRow({ padding: 0, gap: 0, content }),
        exactProposal(240, 40),
        Graph.createGraphDefinitions(),
      );

    const single = compileContent('name');
    const singleObject = compileContent({ text: 'styled', opacity: 0.5 });
    const multiple = compileContent(['x', 'wide']);

    expect(textValues(primitivesOf(single.output.scene.primitives))).toEqual(['name']);
    expect(flexArtifactWithKeys(single.output, ['item:0']).value.items.map(item => item.slotBounds.width)).toEqual([
      240,
    ]);
    expect(primitivesOf(singleObject.output.scene.primitives)).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'text', opacity: 0.5 })]),
    );
    expect(textValues(primitivesOf(multiple.output.scene.primitives))).toEqual(['x', 'wide']);
    expect(
      flexArtifactWithKeys(multiple.output, ['item:0', 'item:1']).value.items.map(item => item.slotBounds.width),
    ).toEqual([120, 120]);
    expect(pathPrimitivesOf(multiple.output.scene.primitives)).toHaveLength(0);
  });

  it('lowers styled Row content through shell-free equal-share Core Nodes', () => {
    const { output } = compileInHarness(
      Graph.createBlockRow({
        padding: 0,
        gap: 0,
        content: [
          'name',
          {
            text: 'string',
            textColor: '#64748b',
            font: { size: 20, weight: 'bold' },
            opacity: 0.4,
          },
        ],
      }),
      exactProposal(240, 40),
      Graph.createGraphDefinitions(),
    );
    const texts = primitivesOf(output.scene.primitives).filter(primitive => primitive.type === 'text');

    expect(textValues(texts)).toEqual(['name', 'string']);
    expect(texts[0]).toEqual(expect.objectContaining({ fontSize: 14 }));
    expect(texts[1]).toEqual(
      expect.objectContaining({ fill: '#64748b', fontSize: 20, fontWeight: 'bold', opacity: 0.4 }),
    );
    expect(flexArtifactWithKeys(output, ['item:0', 'item:1']).value.items.map(item => item.slotBounds.width)).toEqual([
      120, 120,
    ]);
    expect(pathPrimitivesOf(output.scene.primitives)).toHaveLength(0);
  });

  it('keeps equal-share CJK Row content at its final single-line height inside a minimum-width Block', () => {
    const compileBlock = (content: Array<Graph.IRBlockText>) =>
      compileInHarness(
        Graph.createGraph({
          children: [
            Graph.createBlock({
              children: [
                Graph.createBlockHeader({ title: 'User', description: '领域实体' }),
                Graph.createBlockSection({
                  title: '字段',
                  children: [
                    Graph.createBlockRow({ content }),
                    Graph.createBlockRow({ content: content.map(item => (item === '必填' ? '可选' : item)) }),
                  ],
                }),
              ],
            }),
          ],
        }),
        naturalProposal,
        Graph.createGraphDefinitions(),
      );

    const twoItems = compileBlock(['name', 'string']);
    const threeItems = compileBlock(['name', 'string', '必填']);

    const rowHeights = (output: ReturnType<typeof compileToScene>, keys: ReadonlyArray<string>) =>
      output.artifacts
        .filter(candidate => candidate.kind === 'composite' && candidate.type === 'flexLayout')
        .map(candidate => candidate as FlexLayoutCompileArtifact)
        .filter(candidate => candidate.value.items.map(item => item.key).join('|') === keys.join('|'))
        .map(candidate => candidate.value.container.allocationBounds.height);
    const sectionHeight = (output: ReturnType<typeof compileToScene>) => {
      const background = pathPrimitivesOf(output.scene.primitives).find(
        path => path.fill === 'currentColor' && path.fillOpacity === 0.037,
      );
      const bottomEdge = background?.commands.find(command => command.kind === 'line' && command.to[0] === 8);
      if (bottomEdge === undefined || bottomEdge.kind !== 'line') throw new Error('Expected Section bottom edge');
      return bottomEdge.to[1];
    };

    expect(rowHeights(twoItems.output, ['item:0', 'item:1']).at(-1)).toBe(16.8);
    expect(rowHeights(threeItems.output, ['item:0', 'item:1', 'item:2']).at(-1)).toBe(16.8);
    expect(sectionHeight(twoItems.output)).toBe(74.4);
    expect(sectionHeight(threeItems.output)).toBe(74.4);
  });

  it('preserves explicit zero layout and transparent appearance values', () => {
    const source = Graph.createBlock({
      gap: 0,
      padding: 0,
      background: { fill: 'none', fillOpacity: 0 },
      border: { stroke: 'none', strokeWidth: 0, strokeOpacity: 0 },
      cornerRadius: 0,
      children: [textNode('one'), textNode('two')],
    });
    const { output, result } = compileInHarness(source, naturalProposal, Graph.createGraphDefinitions());

    expect(result.allocationBounds.height).toBeCloseTo(38.4);
    expect(pathPrimitivesOf(output.scene.primitives)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fill: 'none', fillOpacity: 0, stroke: 'none' }),
        expect.objectContaining({ fill: 'none', stroke: 'none', strokeWidth: 0, strokeOpacity: 0 }),
      ]),
    );
  });

  it.each<Readonly<[string, LayoutProposal]>>([
    ['minimum intrinsic', minimumProposal],
    ['natural intrinsic', naturalProposal],
    [
      'bounded range',
      {
        x: { kind: LayoutAxisProposalKind.Range, min: 100, max: 180 },
        y: { kind: LayoutAxisProposalKind.Range, min: 80, max: 140 },
      },
    ],
    ['exact parent stretch', exactProposal(240, 160)],
  ])('keeps the Block Surface equal to its final allocation under %s', (_name, proposal) => {
    const { result } = compileInHarness(
      Graph.createBlock({ children: [textNode('content')] }),
      proposal,
      Graph.createGraphDefinitions(),
    );

    expect(result.allocationBounds).toEqual({
      x: 0,
      y: 0,
      width: result.slotSize.width,
      height: result.slotSize.height,
    });
  });

  it('keeps width and minWidth on the outer Surface allocation only', () => {
    const fixed = compileInHarness(
      Graph.createBlock({ width: 180, padding: 12, children: [textNode('content')] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const minimum = compileInHarness(
      Graph.createBlock({ minWidth: 140, children: [textNode('content')] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const growing = compileInHarness(
      Graph.createBlock({ children: [textNode('content that is deliberately wider than the default minimum width')] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );

    expect(fixed.result.allocationBounds.width).toBe(180);
    expect(fixed.result.slotSize.width).toBe(180);
    expect(minimum.result.allocationBounds.width).toBe(140);
    expect(growing.result.allocationBounds.width).toBeGreaterThan(240);
  });

  it('defaults an unconstrained Block to a 240-unit minimum outer width', () => {
    const { result } = compileInHarness(
      Graph.createBlock({ children: [textNode('content')] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );

    expect(result.allocationBounds.width).toBe(240);
    expect(result.slotSize.width).toBe(240);
  });

  it('keeps explicit width and minWidth values ahead of the default minimum', () => {
    const fixed = compileInHarness(
      Graph.createBlock({ width: 180, children: [textNode('content')] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const authoredMinimum = compileInHarness(
      Graph.createBlock({ minWidth: 0, children: [textNode('content')] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );

    expect(fixed.result.allocationBounds.width).toBe(180);
    expect(authoredMinimum.result.allocationBounds.width).toBeLessThan(240);
  });

  it('keeps replayed child ids inside a Block local namespace while publishing the Block id', () => {
    const warnings: Array<CompileWarning> = [];
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          Graph.createBlock({
            id: 'local-block',
            localNamespace: true,
            children: [textNode('inside'), { ...textNode('secret'), id: 'secret' }],
          }),
          Graph.createEntity({ id: 'consumer', role: 'participant', position: [240, 40], text: 'Consumer' }),
          Graph.createRelation({
            role: 'dependency',
            source: { id: 'local-block', anchor: 'right' },
            target: { id: 'consumer', anchor: 'left' },
          }),
          Graph.createRelation({
            role: 'dependency',
            source: { id: 'secret' },
            target: { id: 'consumer' },
          }),
        ],
      },
      {
        ...definitions,
        padding: 0,
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(primitivesOf(output.scene.primitives)).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'group', id: 'local-block' })]),
    );
    expect(pathPrimitivesOf(output.scene.primitives).length).toBeGreaterThan(0);
    expect(warnings).toContainEqual(expect.objectContaining({ code: CompileWarningCode.UnresolvedNodeReference }));
  });

  it('projects Graph Theme through open Block-family content boundaries only', () => {
    const { output } = compileInHarness(
      Graph.createBlock({
        graphTheme: { rules: [{ type: 'entity', appearance: { fill: '#ef4444' } }] },
        nodeDefault: { fill: '#2563eb' },
        children: [
          Graph.createBlockHeader({
            title: { text: 'Header' },
            trail: Graph.createEntity({ role: 'state', position: [0, 0], text: 'Header entity' }),
          }),
          Graph.createBlockSection({
            children: [
              Graph.createBlockRow({
                children: [
                  Graph.createEntity({ role: 'state', position: [0, 0], text: 'Direct Row entity' }),
                  Graph.createEntity({ role: 'state', position: [0, 0], text: 'Second Row entity' }),
                  textNode('Core'),
                ],
              }),
            ],
          }),
        ],
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const rectangles = primitivesOf(output.scene.primitives).filter(primitive => primitive.type === 'rect');

    expect(rectangles.filter(rectangle => rectangle.fill === '#ef4444')).toHaveLength(3);
    expect(rectangles).toEqual(expect.arrayContaining([expect.objectContaining({ fill: '#2563eb' })]));
  });
});
