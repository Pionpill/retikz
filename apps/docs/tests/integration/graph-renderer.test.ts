import type { IRChild, IRNode, Scene } from '@retikz/core';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { compileToScene, lowerIRToKernel, ThemeMode } from '@retikz/core';
import {
  createGraphConnector,
  createGraphDefinitions,
  createGraphNode,
  GraphConnectorDefinition,
  GraphNodeDefinition,
} from '@retikz/graph';
import { GraphConnector, GraphNode } from '@retikz/graph-react';
import {
  graphConnector,
  GraphConnectorInputEmbedAdapter,
  graphNode,
  GraphNodeInputEmbedAdapter,
} from '@retikz/graph-vanilla';
import { Layout, Scope, Step } from '@retikz/react';
import { drawScene } from '@retikz/render/canvas';
import { renderToSvgString } from '@retikz/render/svg';
import { renderToSvgString as renderVanillaToSvgString, scene } from '@retikz/vanilla';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import GraphFrameBasicEnDemo from '../../src/modules/docs/contents/diagram/graph/frame/graph-frame/graph-frame-basic.en.demo';
import GraphFrameBasicZhDemo from '../../src/modules/docs/contents/diagram/graph/frame/graph-frame/graph-frame-basic.zh.demo';
import ProcessRecipeEnDemo from '../../src/modules/docs/contents/diagram/graph/frame/graph-frame/process-recipe.en.demo';
import ProcessRecipeZhDemo from '../../src/modules/docs/contents/diagram/graph/frame/graph-frame/process-recipe.zh.demo';
import ConnectorRoutingEnDemo from '../../src/modules/docs/contents/diagram/graph/unit/connector/connector-routing.en.demo';
import ConnectorRoutingZhDemo from '../../src/modules/docs/contents/diagram/graph/unit/connector/connector-routing.zh.demo';
import ClassRecipeEnDemo from '../../src/modules/docs/contents/diagram/graph/unit/node/class-recipe.en.demo';
import ClassRecipeZhDemo from '../../src/modules/docs/contents/diagram/graph/unit/node/class-recipe.zh.demo';
import DataRecipeEnDemo from '../../src/modules/docs/contents/diagram/graph/unit/node/data-recipe.en.demo';
import DataRecipeZhDemo from '../../src/modules/docs/contents/diagram/graph/unit/node/data-recipe.zh.demo';
import GraphNodeEnDemo from '../../src/modules/docs/contents/diagram/graph/unit/node/graph-node.en.demo';
import GraphNodeZhDemo from '../../src/modules/docs/contents/diagram/graph/unit/node/graph-node.zh.demo';

const definitions = [GraphNodeDefinition, GraphConnectorDefinition] as const;

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

const directChildren = (): Array<IRChild> => [
  translated(
    48,
    65,
    createGraphNode({ id: 'start', role: 'terminal', position: [0, 0], text: 'Start', color: '#2563eb' }),
  ),
  translated(210, 65, createGraphNode({ id: 'step', role: 'stage', position: [0, 0], text: 'Step', color: '#16a34a' })),
  createGraphConnector({
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
      createElement(GraphNode, { id: 'start', role: 'terminal', position: [0, 0], color: '#2563eb' }, 'Start'),
    ),
    createElement(
      Scope,
      { transforms: [{ kind: 'translate', x: 210, y: 65 }] },
      createElement(GraphNode, { id: 'step', role: 'stage', position: [0, 0], color: '#16a34a' }, 'Step'),
    ),
    createElement(
      GraphConnector,
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
      GraphNodeInputEmbedAdapter,
      graphNode('start', { role: 'terminal', position: [0, 0], text: 'Start', color: '#2563eb' }),
    ),
  ),
  translated(
    210,
    65,
    lower(
      GraphNodeInputEmbedAdapter,
      graphNode('step', { role: 'stage', position: [0, 0], text: 'Step', color: '#16a34a' }),
    ),
  ),
  lower(
    GraphConnectorInputEmbedAdapter,
    graphConnector('edge', { role: 'flow', way: ['start', { label: { text: 'next' } }, '-|', 'step'] }),
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
  it('lowers the real GraphNode demo with explicit ordinary Core paints', () => {
    const preview = buildPreviewIR(GraphNodeZhDemo);
    const lowered = lowerIRToKernel(
      { ...preview.ir, theme: { mode: ThemeMode.Light } },
      { composites: createGraphDefinitions() },
    );
    const nodes = collectNodes(lowered.children);

    expect(nodes).toHaveLength(4);
    expect(nodes).toMatchObject([
      { id: 'unit-start', color: '#2563eb', textColor: '#2563eb', stroke: '#2563eb', fill: 'none' },
      { id: 'unit-stage', color: '#16a34a', textColor: 'contrast', stroke: '#16a34a', fill: '#16a34a' },
      { id: 'unit-decision', color: '#d97706', textColor: '#d97706', stroke: 'none', fill: '#fbf1e6' },
      { id: 'unit-junction', color: '#9333ea', textColor: '#9333ea', stroke: '#9333ea', fill: '#efe0fc' },
    ]);
    nodes.forEach(node => expect(node).not.toHaveProperty('variant'));
    expect(JSON.stringify(lowered)).not.toContain('notation');
  });

  it.each([
    ['graph frame en', GraphFrameBasicEnDemo],
    ['graph frame zh', GraphFrameBasicZhDemo],
    ['graph node en', GraphNodeEnDemo],
    ['graph node zh', GraphNodeZhDemo],
    ['connector en', ConnectorRoutingEnDemo],
    ['connector zh', ConnectorRoutingZhDemo],
    ['process recipe en', ProcessRecipeEnDemo],
    ['process recipe zh', ProcessRecipeZhDemo],
    ['class recipe en', ClassRecipeEnDemo],
    ['class recipe zh', ClassRecipeZhDemo],
    ['data recipe en', DataRecipeEnDemo],
    ['data recipe zh', DataRecipeZhDemo],
  ])('renders the canonical %s demo through the Vanilla converter', (_name, Component) => {
    const vanilla = buildVanillaPreview(buildPreviewIR(Component));
    expect(vanilla.code).not.toContain('Unsupported Graph composite');
    expect(vanilla.svg).toContain('<svg');
  });

  it('keeps direct, React, and Vanilla canonical IR plus connector identity in parity', () => {
    const direct = directChildren();
    const react = buildPreviewIR(ReactGraph).ir.children;
    const vanilla = vanillaChildren();
    expect(react).toEqual(direct);
    expect(vanilla.slice(0, 2)).toEqual(direct.slice(0, 2));
    expect(vanilla.find(child => child.type === 'graphConnector')).toMatchObject({ id: 'edge', role: 'flow' });
  });

  it('produces one renderer-agnostic Scene without Graph semantic discriminators', () => {
    const result = compileToScene(
      { type: 'scene', version: 1, children: directChildren() },
      { composites: [...definitions], padding: 0 },
    );
    expect(JSON.stringify(result.scene)).not.toContain('graphNode');
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
        graphNode('start', { role: 'terminal', position: [0, 0], text: 'Start' }),
        graphNode('step', { role: 'stage', position: [80, 0], text: 'Step' }),
        graphConnector('edge', { role: 'flow', way: ['start', { label: { text: 'next' } }, 'step'] }),
      ],
    });
    const svg = renderVanillaToSvgString(input, {
      adapters: [GraphNodeInputEmbedAdapter, GraphConnectorInputEmbedAdapter],
      output: { width: 220, height: 120 },
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('next');
  });
});
