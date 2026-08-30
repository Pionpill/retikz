import type { CompileWarning, LayoutProposal } from '@retikz/core';
import type { FlexLayoutCompileArtifact } from '@retikz/layout';

import {
  compileToScene,
  CompileWarningCode,
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

  it('compiles Header slots and text defaults without optional placeholders', () => {
    const { output } = compileInHarness(
      Graph.createBlockHeader({
        icon: textNode('icon'),
        title: { text: 'Service' },
        description: { text: 'Public API' },
        trailing: textNode('stable'),
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
      trailing: textNode('stable'),
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

  it('applies Header itemGap and main-axis distribution only inside the text region', () => {
    const source = {
      icon: textNode('icon'),
      title: { text: 'A' },
      description: { text: 'B' },
      direction: 'horizontal' as const,
      trailing: textNode('stable'),
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

  it('compiles independent Section and Row defaults through Surface and FlexLayout', () => {
    const section = Graph.createBlockSection({
      id: 'section',
      title: { text: 'Fields' },
      children: [Graph.createBlockRow({ id: 'row', children: [{ key: 'name', child: textNode('name') }] })],
    });
    const { output } = compileInHarness(section, naturalProposal, Graph.createGraphDefinitions());
    const primitives = primitivesOf(output.scene.primitives);

    expect(primitives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'group', id: 'section' }),
        expect.objectContaining({ type: 'group', id: 'row' }),
        expect.objectContaining({
          type: 'path',
          fill: 'lightgray',
          fillOpacity: 0.04,
          stroke: 'none',
        }),
        expect.objectContaining({
          type: 'path',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1,
          strokeOpacity: 0.2,
        }),
      ]),
    );
    expect(primitives.filter(primitive => primitive.type === 'path' && primitive.id === 'row')).toHaveLength(0);
  });

  it('shares Row space equally across two or more default Cells', () => {
    const compileCells = (labels: ReadonlyArray<string>) => {
      const compiled = compileInHarness(
        Graph.createBlockRow({
          padding: 0,
          gap: 0,
          children: labels.map((label, index) => ({
            key: `cell-${index}`,
            child: textNode(label),
          })),
        }),
        exactProposal(240, 40),
        Graph.createGraphDefinitions(),
      );
      return flexArtifactWithKeys(
        compiled.output,
        labels.map((_label, index) => `cell-${index}`),
      ).value.items.map(item => item.slotBounds.width);
    };

    expect(compileCells(['x', 'much wider content'])).toEqual([120, 120]);
    expect(compileCells(['x', 'medium', 'much wider content'])).toEqual([80, 80, 80]);
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

    expect(fixed.result.allocationBounds.width).toBe(180);
    expect(fixed.result.slotSize.width).toBe(180);
    expect(minimum.result.allocationBounds.width).toBe(140);
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
            trailing: Graph.createEntity({ role: 'state', position: [0, 0], text: 'Header entity' }),
          }),
          Graph.createBlockSection({
            children: [
              Graph.createBlockRow({
                children: [
                  {
                    key: 'entity',
                    child: Graph.createEntity({ role: 'state', position: [0, 0], text: 'Row entity' }),
                  },
                  { key: 'core', child: textNode('Core') },
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

    expect(rectangles.filter(rectangle => rectangle.fill === '#ef4444')).toHaveLength(2);
    expect(rectangles).toEqual(expect.arrayContaining([expect.objectContaining({ fill: '#2563eb' })]));
  });
});
