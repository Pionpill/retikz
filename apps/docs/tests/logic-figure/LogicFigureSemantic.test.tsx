import type { ReactNode } from 'react';

import { FlowDiagramSchema } from '@retikz/diagram/flow';
import { Entity } from '@retikz/graph-react';
import { createInputScene } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PreviewThemeProvider } from '@/modules/docs/components/component-preview/theme';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '@/modules/docs/components/component-preview/vanilla-preview';
import {
  LogicFigure,
  LogicFigureEntityKind,
  LogicFigureFrame,
  LogicFigureFrameTitle,
  LogicFigureRelation,
  LogicFigureRelationKind,
} from '@/modules/docs/components/logic-figure';
import OpaqueColorFlow from '@/modules/docs/contents/kernel/packages/foundation/utilities/opaque-color-flow';
import InspectCompileFlow from '@/modules/docs/contents/kernel/packages/inspect/mechanism/inspect-compile-flow';
import AffineCompositionFlow from '@/modules/docs/contents/kernel/packages/math/transforms/affine-composition-flow';
import CoordinateConversionFlow from '@/modules/docs/contents/kernel/packages/math/transforms/coordinate-conversion-flow';

/** 经过 React authoring 与 Vanilla normalize 读取逻辑图的 Source IR */
const readLogicFigure = (element: ReactNode) => {
  const input = createInputScene(element);
  return normalizeScene(input.scene, { adapters: input.adapters }).ir.children[0];
};

describe('LogicFigure semantic vocabulary', () => {
  it.each([
    { mode: 'light' as const, fill: '#e4e4e4', text: '#555555' },
    { mode: 'dark' as const, fill: '#1b1b1b', text: '#bbbbbb' },
  ])('Secondary 在 $mode 下保持无描边中性底色并允许实例覆盖', ({ mode, fill, text }) => {
    const Figure = () => (
      <LogicFigure semanticColors={false}>
        <Entity role="activity" kind={LogicFigureEntityKind.Secondary} group="branch" position={[0, 0]}>
          Derived
        </Entity>
        <Entity
          role="activity"
          kind={LogicFigureEntityKind.Secondary}
          position={[200, 0]}
          style={{ fill: 'red', stroke: 'blue' }}
        >
          Override
        </Entity>
      </LogicFigure>
    );
    const reactSvg = renderToStaticMarkup(
      <PreviewThemeProvider theme={{ mode }}>
        <Figure />
      </PreviewThemeProvider>,
    );
    const vanilla = buildVanillaPreview(buildPreviewIR(Figure), { theme: { mode } });
    expect(vanilla.svg, vanilla.code).toBeDefined();
    const vanillaSvg = vanilla.svg;
    for (const svg of [reactSvg, vanillaSvg]) {
      expect(svg).toContain(`fill="${fill}"`);
      expect(svg).toContain('stroke="none"');
      expect(svg).toContain(`fill="${text}"`);
      expect(svg).toContain('fill="red"');
      expect(svg).toContain('stroke="blue"');
    }
  });

  it('Inspect 总览使用普通实体，通过 group 区分主图与观测支路', () => {
    const figure = FlowDiagramSchema.parse(buildPreviewIR(InspectCompileFlow).sourceIr.children[0]);
    expect(figure.entities.every(entity => entity.kind === undefined)).toBe(true);
    expect(figure.entities.filter(entity => entity.group === 'inspection').map(entity => entity.id)).toEqual([
      'observation',
      'inspect',
      'fragment',
    ]);
  });

  it('defines site Entity kinds for important, important data, secondary, and algorithmic content', () => {
    expect(LogicFigureEntityKind).toEqual({
      Important: 'docs.logic.important',
      ImportantData: 'docs.logic.importantData',
      Secondary: 'docs.logic.secondary',
      Algorithm: 'docs.logic.algorithm',
    });
  });

  it('records the site Entity and Relation kinds in Graph Source IR', () => {
    const figure = readLogicFigure(
      <LogicFigure>
        <Entity id="input" role="participant" kind={LogicFigureEntityKind.Important} position={[60, 90]}>
          external IR
        </Entity>
        <Entity id="runtime" role="activity" kind={LogicFigureEntityKind.Important} position={[180, 90]}>
          compile
        </Entity>
        <Entity id="scene" role="resource" kind={LogicFigureEntityKind.ImportantData} position={[300, 90]}>
          Scene
        </Entity>
        <LogicFigureRelation
          id="depends-on"
          kind={LogicFigureRelationKind.Secondary}
          source={{ id: 'runtime' }}
          target={{ id: 'input' }}
        />
      </LogicFigure>,
    );

    expect(figure).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      children: [
        { type: 'entity', id: 'input', role: 'participant', kind: 'docs.logic.important' },
        { type: 'entity', id: 'runtime', role: 'activity', kind: 'docs.logic.important' },
        { type: 'entity', id: 'scene', role: 'resource', kind: 'docs.logic.importantData' },
        { type: 'relation', id: 'depends-on', role: 'dependency', kind: 'docs.logic.secondary' },
      ],
    });
  });

  it('keeps semantic Entity children in a LogicFigureFrame Graph group', () => {
    const figure = readLogicFigure(
      <LogicFigure>
        <LogicFigureFrame id="core">
          <LogicFigureFrameTitle>@retikz/core</LogicFigureFrameTitle>
          <Entity id="compile" role="activity" kind={LogicFigureEntityKind.Algorithm} position={[120, 80]}>
            compileToScene
          </Entity>
        </LogicFigureFrame>
      </LogicFigure>,
    );

    expect(figure).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      children: [
        {
          namespace: 'graph',
          type: 'group',
          id: 'core',
          caption: { title: { text: '@retikz/core' } },
          children: [{ type: 'entity', id: 'compile', role: 'activity', kind: 'docs.logic.algorithm' }],
        },
      ],
    });
  });

  it.each([
    ['Chinese', OpaqueColorFlow],
    ['English', OpaqueColorFlow],
  ])('renders the %s CSS color flow with stable logic kinds', (_language, Demo) => {
    const figure = FlowDiagramSchema.parse(buildPreviewIR(Demo).sourceIr.children[0]);

    expect(figure).toMatchObject({
      namespace: 'diagram',
      type: 'flow',
      graphRules: expect.any(Array),
    });
    expect(figure.entities).toEqual(
      expect.arrayContaining(
        [
          { id: 'inputs', role: 'participant' },
          { id: 'weight', role: 'activity' },
          { id: 'parse', role: 'activity', kind: LogicFigureEntityKind.Important },
          { id: 'colors', role: 'resource', kind: LogicFigureEntityKind.Secondary },
          { id: 'backdrop', role: 'activity', kind: LogicFigureEntityKind.Important },
          { id: 'compose', role: 'activity', kind: LogicFigureEntityKind.Algorithm },
          { id: 'output', role: 'participant' },
        ].map(value => expect.objectContaining(value)),
      ),
    );
    expect(figure.entities.find(entity => entity.id === 'inputs')?.kind).toBeUndefined();
    expect(figure.entities.find(entity => entity.id === 'weight')?.kind).toBeUndefined();
    expect(figure.entities.find(entity => entity.id === 'output')?.kind).toBeUndefined();
    expect(figure.layouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'rows', direction: 'down' }),
        expect.objectContaining({ id: 'prepare', direction: 'right' }),
        expect.objectContaining({ id: 'compose-row', direction: 'right' }),
      ]),
    );
    const relations = figure.relations ?? [];

    expect(relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'colors',
          target: 'parse',
          role: 'dependency',
          kind: LogicFigureRelationKind.Secondary,
        }),
        expect.objectContaining({
          source: 'parse',
          target: 'backdrop',
          routing: { kind: 'orthogonal', cornerRadius: 8 },
        }),
      ]),
    );
    expect(
      relations.filter(relation => relation.source !== 'colors').every(relation => relation.kind === undefined),
    ).toBe(true);
  });

  it.each([
    ['Chinese', CoordinateConversionFlow],
    ['English', CoordinateConversionFlow],
  ])('uses two shared Entity and Relation groups for the %s coordinate conversion Flow', (_language, Demo) => {
    const figure = FlowDiagramSchema.parse(buildPreviewIR(Demo).sourceIr.children[0]);
    const entities = figure.entities;
    const relations = figure.relations ?? [];
    const forwardRelations = relations.filter(relation => relation.group === 'local-to-world');
    const reverseRelations = relations.filter(relation => relation.group === 'world-to-local');
    const dependencyRelations = relations.filter(relation => relation.role === 'dependency');

    expect(forwardRelations).toHaveLength(3);
    expect(reverseRelations).toHaveLength(3);
    expect(entities.filter(entity => entity.group === 'local-to-world').map(entity => entity.id)).toEqual([
      'rotate',
      'translate',
    ]);
    expect(entities.filter(entity => entity.group === 'world-to-local').map(entity => entity.id)).toEqual([
      'inverse-rotate',
      'remove-center',
    ]);
    expect(entities.every(entity => entity.kind === undefined)).toBe(true);
    expect(dependencyRelations).toHaveLength(4);
    expect(dependencyRelations.every(relation => relation.group === undefined)).toBe(true);
  });

  it.each([
    ['Chinese', AffineCompositionFlow],
    ['English', AffineCompositionFlow],
  ])('keeps the %s affine composition Flow ungrouped', (_language, Demo) => {
    const figure = FlowDiagramSchema.parse(buildPreviewIR(Demo).sourceIr.children[0]);
    const relations = figure.relations ?? [];

    expect(figure.layouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'affine', direction: 'right' }),
        expect.objectContaining({ id: 'application', direction: 'down' }),
      ]),
    );
    expect(figure.entities.every(entity => entity.group === undefined)).toBe(true);
    expect(relations.every(relation => relation.group === undefined)).toBe(true);
    expect(relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'combined-matrix',
          target: 'apply',
          role: 'dependency',
          kind: LogicFigureRelationKind.Secondary,
        }),
      ]),
    );
  });
});
