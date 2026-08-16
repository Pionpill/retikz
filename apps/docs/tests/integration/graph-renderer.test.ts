import type { AnyCompositeDefinition, IRChild, IRNode, IRScene, Scene, ThemeStyleDefinition } from '@retikz/core';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactElement, ReactNode } from 'react';

import { compileToScene, lowerIRToKernel, ThemeMode } from '@retikz/core';
import {
  createEntity,
  createGraph,
  createGraphDefinitions,
  createRelation,
  EntityDefinition,
  RelationDefinition,
} from '@retikz/graph';
import { Entity, Relation } from '@retikz/graph-react';
import { entity, EntityInputEmbedAdapter, relation, RelationInputEmbedAdapter } from '@retikz/graph-vanilla';
import { Layout, Scope, Step } from '@retikz/react';
import { drawScene } from '@retikz/render/canvas';
import { renderToSvgString } from '@retikz/render/svg';
import { renderToSvgString as renderVanillaToSvgString, scene } from '@retikz/vanilla';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import ContainerBasicEnDemo from '../../src/modules/docs/contents/schematic/graph/container/basic/container-basic.en.demo';
import ContainerBasicZhDemo from '../../src/modules/docs/contents/schematic/graph/container/basic/container-basic.zh.demo';
import ProcessRecipeEnDemo from '../../src/modules/docs/contents/schematic/graph/container/extension/process-recipe.en.demo';
import ProcessRecipeZhDemo from '../../src/modules/docs/contents/schematic/graph/container/extension/process-recipe.zh.demo';
import { previewSource as entityDecisionEnPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-decision.en.demo';
import { previewSource as entityDecisionZhPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-decision.zh.demo';
import { previewSource as entityJunctionEnPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-junction.en.demo';
import { previewSource as entityJunctionZhPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-junction.zh.demo';
import { previewSource as entityStageEnPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-stage.en.demo';
import { previewSource as entityStageZhPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-stage.zh.demo';
import { previewSource as entityTerminalEnPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-terminal.en.demo';
import { previewSource as entityTerminalZhPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-terminal.zh.demo';
import { previewSource as entityThemeSelectorEnPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/extension/entity-theme-selector.en.demo';
import { previewSource as entityThemeSelectorZhPreviewSource } from '../../src/modules/docs/contents/schematic/graph/entity/extension/entity-theme-selector.zh.demo';
import RelationRoutingEnDemo from '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-routing.en.demo';
import RelationRoutingZhDemo from '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-routing.zh.demo';

const definitions = [EntityDefinition, RelationDefinition] as const;

const sceneOf = (children: ReadonlyArray<IRChild>): Scene =>
  compileToScene(
    { type: 'scene', version: 1, viewBox: { x: 0, y: 0, width: 420, height: 180 }, children: [...children] },
    { composites: [...definitions], padding: 0 },
  ).scene;

const translated = (x: number, y: number, child: IRChild): IRChild => ({
  type: 'scope',
  transforms: [{ kind: 'translate', x, y }],
  children: [child],
});

const collectNodes = (children: ReadonlyArray<IRChild>): Array<IRNode> =>
  children.flatMap(child => {
    if (child.type === 'node' && 'position' in child) return [child as unknown as IRNode];
    if (child.type === 'scope' && 'children' in child) return collectNodes(child.children as ReadonlyArray<IRChild>);
    return [];
  });

const canonicalComponentOf = (source: FC | { canonicalRender?: () => ReactNode }): FC =>
  typeof source === 'function' ? source : () => source.canonicalRender?.();

const directChildren = (): Array<IRChild> => [
  translated(
    48,
    65,
    createEntity({ id: 'start', role: 'terminal', position: [0, 0], text: 'Start', color: '#2563eb' }),
  ),
  translated(210, 65, createEntity({ id: 'step', role: 'stage', position: [0, 0], text: 'Step', color: '#16a34a' })),
  createRelation({
    id: 'edge',
    role: 'flow',
    children: [
      { type: 'step', kind: 'move', to: { id: 'start' } },
      { type: 'step', kind: 'fold', via: '-|', to: { id: 'step' }, label: { text: 'next' } },
    ],
  }),
];

const ReactGraph: FC = () =>
  createElement(
    Layout,
    { width: 420, height: 180 },
    createElement(
      Scope,
      { transforms: [{ kind: 'translate', x: 48, y: 65 }] },
      createElement(Entity, { id: 'start', role: 'terminal', position: [0, 0], color: '#2563eb' }, 'Start'),
    ),
    createElement(
      Scope,
      { transforms: [{ kind: 'translate', x: 210, y: 65 }] },
      createElement(Entity, { id: 'step', role: 'stage', position: [0, 0], color: '#16a34a' }, 'Step'),
    ),
    createElement(
      Relation,
      { id: 'edge', role: 'flow' },
      createElement(Step, { kind: 'move', to: 'start' }),
      createElement(Step, { kind: 'fold', via: '-|', to: 'step', label: { text: 'next' } }),
    ),
  );

const lower = (adapter: AnyInputEmbedAdapter, embed: { id: string; kind: string; props: unknown }): IRChild =>
  adapter.lower(embed.props as never, {
    id: embed.id,
    kind: embed.kind,
    layerId: 'main',
    identityPath: ['main', embed.id],
  }).node;

const vanillaChildren = (): Array<IRChild> => [
  translated(
    48,
    65,
    lower(
      EntityInputEmbedAdapter,
      entity('start', { role: 'terminal', position: [0, 0], text: 'Start', color: '#2563eb' }),
    ),
  ),
  translated(
    210,
    65,
    lower(EntityInputEmbedAdapter, entity('step', { role: 'stage', position: [0, 0], text: 'Step', color: '#16a34a' })),
  ),
  lower(
    RelationInputEmbedAdapter,
    relation('edge', { role: 'flow', way: ['start', { label: { text: 'next' } }, '-|', 'step'] }),
  ),
];

const recordingContext = (calls: Array<string>): CanvasRenderingContext2D =>
  new Proxy(
    {},
    {
      get: (_target, property) => (typeof property === 'string' ? vi.fn(() => calls.push(property)) : undefined),
      set: () => true,
    },
  ) as CanvasRenderingContext2D;

describe('Graph renderer integration', () => {
  it.each([
    ['terminal', entityTerminalZhPreviewSource, 'Start'],
    ['stage', entityStageZhPreviewSource, 'Process'],
    ['decision', entityDecisionZhPreviewSource, 'Ready?'],
    ['junction', entityJunctionZhPreviewSource, '+'],
  ])('lowers the real %s Entity demo with controlled foreground Core paints', (_role, source, text) => {
    const preview = buildPreviewIR(canonicalComponentOf(source));
    const lowered = lowerIRToKernel(
      { ...preview.ir, theme: { mode: ThemeMode.Light } },
      { composites: createGraphDefinitions() },
    );
    const nodes = collectNodes(lowered.children);

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ color: '#000000', textColor: 'contrast', stroke: '#000000', fill: 'none', text });
    expect(nodes[0]).not.toHaveProperty('variant');
    expect(JSON.stringify(lowered)).not.toContain('notation');
  });

  it.each([
    ['container en', ContainerBasicEnDemo],
    ['container zh', ContainerBasicZhDemo],
    ['entity terminal en', entityTerminalEnPreviewSource],
    ['entity terminal zh', entityTerminalZhPreviewSource],
    ['entity stage en', entityStageEnPreviewSource],
    ['entity stage zh', entityStageZhPreviewSource],
    ['entity decision en', entityDecisionEnPreviewSource],
    ['entity decision zh', entityDecisionZhPreviewSource],
    ['entity junction en', entityJunctionEnPreviewSource],
    ['entity junction zh', entityJunctionZhPreviewSource],
    ['relation en', RelationRoutingEnDemo],
    ['relation zh', RelationRoutingZhDemo],
    ['process recipe en', ProcessRecipeEnDemo],
    ['process recipe zh', ProcessRecipeZhDemo],
  ])('renders the canonical %s demo through the Vanilla converter', (_name, source) => {
    const vanilla = buildVanillaPreview(buildPreviewIR(canonicalComponentOf(source)));
    expect(vanilla.code).not.toContain('Unsupported Graph composite');
    expect(vanilla.svg).toContain('<svg');
  });

  it('converts a built-in Graph presentation root through the Vanilla preview', () => {
    const BuiltinGraphDemo: FC = () =>
      createElement(Layout, {
        ir: {
          version: 1,
          type: 'scene',
          children: [
            createGraph({
              id: 'workflow',
              entityVariant: 'default',
              children: [createEntity({ id: 'step', role: 'stage', position: [0, 0], text: 'Step' })],
            }),
          ],
        },
        composites: createGraphDefinitions(),
        width: 320,
        height: 160,
      });
    const vanilla = buildVanillaPreview(buildPreviewIR(BuiltinGraphDemo));

    expect(vanilla.code).toContain('graph(');
    expect(vanilla.svg).toContain('<svg');
  });

  it.each([
    ['entity theme selector en', entityThemeSelectorEnPreviewSource],
    ['entity theme selector zh', entityThemeSelectorZhPreviewSource],
  ])('lowers the runtime-configured %s demo with its own Definitions', (_name, source) => {
    const element = source.canonicalRender?.() as ReactElement<{
      ir: IRScene;
      composites: ReadonlyArray<AnyCompositeDefinition>;
      themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
    }>;
    const lowered = lowerIRToKernel(element.props.ir, {
      composites: element.props.composites,
      ...(element.props.themeStyles === undefined ? {} : { themeStyles: element.props.themeStyles }),
    });

    expect(collectNodes(lowered.children)).not.toHaveLength(0);
    expect(JSON.stringify(lowered)).not.toContain('"namespace":"graph"');
  });

  it('keeps direct, React, and Vanilla canonical IR plus connector identity in parity', () => {
    const direct = directChildren();
    const react = buildPreviewIR(ReactGraph).ir.children;
    const vanilla = vanillaChildren();
    expect(react).toEqual(direct);
    expect(vanilla.slice(0, 2)).toEqual(direct.slice(0, 2));
    expect(vanilla.find(child => child.type === 'relation')).toMatchObject({ id: 'edge', role: 'flow' });
  });

  it('produces one renderer-agnostic Scene without Graph semantic discriminators', () => {
    const result = compileToScene(
      { type: 'scene', version: 1, children: directChildren() },
      { composites: [...definitions], padding: 0 },
    );
    expect(JSON.stringify(result.scene)).not.toContain('entity');
    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });

  it('renders the same lowered Scene through SVG and Canvas', () => {
    const graphScene = sceneOf(directChildren());
    const calls: Array<string> = [];
    expect(renderToSvgString(graphScene, { idPrefix: 'graph' })).toContain('<svg');
    expect(() => drawScene(recordingContext(calls), graphScene)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });

  it('keeps a runnable Vanilla example with direct Graph nodes', () => {
    const input = scene({
      children: [
        entity('start', { role: 'terminal', position: [0, 0], text: 'Start' }),
        entity('step', { role: 'stage', position: [80, 0], text: 'Step' }),
        relation('edge', { role: 'flow', way: ['start', { label: { text: 'next' } }, 'step'] }),
      ],
    });
    const svg = renderVanillaToSvgString(input, {
      adapters: [EntityInputEmbedAdapter, RelationInputEmbedAdapter],
      output: { width: 220, height: 120 },
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('next');
  });
});
