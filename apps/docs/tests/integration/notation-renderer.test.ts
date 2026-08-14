import type { IRChild, IRNode, Scene } from '@retikz/core';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { compileToScene, lowerIRToKernel, ThemeMode } from '@retikz/core';
import {
  ConnectorDefinition,
  createConnector,
  createNotationDefinitions,
  createStage,
  createTerminal,
  StageDefinition,
  TerminalDefinition,
} from '@retikz/notation';
import { Connector, Stage, Terminal } from '@retikz/notation-react';
import {
  connector,
  ConnectorInputEmbedAdapter,
  stage,
  StageInputEmbedAdapter,
  terminal,
  TerminalInputEmbedAdapter,
} from '@retikz/notation-vanilla';
import { Layout, Scope, Step } from '@retikz/react';
import { drawScene } from '@retikz/render/canvas';
import { renderToSvgString } from '@retikz/render/svg';
import { renderToSvgString as renderVanillaToSvgString, scene } from '@retikz/vanilla';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import LogicFrameBasicEnDemo from '../../src/modules/docs/contents/diagram/notation/frame/logic-frame/logic-frame-basic.en.demo';
import LogicFrameBasicZhDemo from '../../src/modules/docs/contents/diagram/notation/frame/logic-frame/logic-frame-basic.zh.demo';
import ProcessRecipeEnDemo from '../../src/modules/docs/contents/diagram/notation/frame/logic-frame/process-recipe.en.demo';
import ProcessRecipeZhDemo from '../../src/modules/docs/contents/diagram/notation/frame/logic-frame/process-recipe.zh.demo';
import ConnectorRoutingEnDemo from '../../src/modules/docs/contents/diagram/notation/unit/connector/connector-routing.en.demo';
import ConnectorRoutingZhDemo from '../../src/modules/docs/contents/diagram/notation/unit/connector/connector-routing.zh.demo';
import ClassRecipeEnDemo from '../../src/modules/docs/contents/diagram/notation/unit/logic-unit/class-recipe.en.demo';
import ClassRecipeZhDemo from '../../src/modules/docs/contents/diagram/notation/unit/logic-unit/class-recipe.zh.demo';
import DataRecipeEnDemo from '../../src/modules/docs/contents/diagram/notation/unit/logic-unit/data-recipe.en.demo';
import DataRecipeZhDemo from '../../src/modules/docs/contents/diagram/notation/unit/logic-unit/data-recipe.zh.demo';
import LogicUnitEnDemo from '../../src/modules/docs/contents/diagram/notation/unit/logic-unit/logic-unit.en.demo';
import LogicUnitZhDemo from '../../src/modules/docs/contents/diagram/notation/unit/logic-unit/logic-unit.zh.demo';

const definitions = [TerminalDefinition, StageDefinition, ConnectorDefinition] as const;

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

const vanillaTranslated = (x: number, y: number, child: IRChild): IRChild => translated(x, y, child);

const directChildren = (): Array<IRChild> => [
  translated(48, 65, createTerminal({ id: 'start', position: [0, 0], text: 'Start', color: '#2563eb' })),
  translated(210, 65, createStage({ id: 'step', position: [0, 0], text: 'Step', color: '#16a34a' })),
  createConnector({
    id: 'edge',
    children: [
      { type: 'step', kind: 'move', to: { id: 'start' } },
      { type: 'step', kind: 'fold', via: '-|', to: { id: 'step' }, label: { text: 'next' } },
    ],
  }),
];

const ReactLogic: FC = () =>
  createElement(
    Layout,
    { width: 420, height: 180 },
    createElement(
      Scope,
      { transforms: [{ kind: 'translate', x: 48, y: 65 }] },
      createElement(Terminal, { id: 'start', position: [0, 0], color: '#2563eb' }, 'Start'),
    ),
    createElement(
      Scope,
      { transforms: [{ kind: 'translate', x: 210, y: 65 }] },
      createElement(Stage, { id: 'step', position: [0, 0], color: '#16a34a' }, 'Step'),
    ),
    createElement(
      Connector,
      { id: 'edge' },
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
  vanillaTranslated(
    48,
    65,
    lower(TerminalInputEmbedAdapter, terminal('start', { position: [0, 0], text: 'Start', color: '#2563eb' })),
  ),
  vanillaTranslated(
    210,
    65,
    lower(StageInputEmbedAdapter, stage('step', { position: [0, 0], text: 'Step', color: '#16a34a' })),
  ),
  lower(
    ConnectorInputEmbedAdapter,
    connector('edge', {
      way: ['start', { label: { text: 'next' } }, '-|', 'step'],
    }),
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

describe('Notation renderer integration', () => {
  it('lowers the real logic-unit demo with explicit ordinary Core paints', () => {
    const preview = buildPreviewIR(LogicUnitZhDemo);
    const lowered = lowerIRToKernel(
      { ...preview.ir, theme: { mode: ThemeMode.Light } },
      { composites: createNotationDefinitions() },
    );
    const nodes = collectNodes(lowered.children);

    expect(nodes).toHaveLength(4);
    expect(nodes).toMatchObject([
      { id: 'unit-start', color: '#2563eb', textColor: '#2563eb', stroke: '#2563eb', fill: 'none' },
      { id: 'unit-stage', color: '#16a34a', textColor: 'contrast', stroke: '#16a34a', fill: '#16a34a' },
      { id: 'unit-decision', color: '#d97706', textColor: '#d97706', stroke: 'none', fill: '#fbf1e6' },
      { id: 'unit-junction', color: '#9333ea', textColor: '#9333ea', stroke: '#9333ea', fill: '#efe0fc' },
    ]);
    nodes.forEach(node => {
      expect(node).not.toHaveProperty('variant');
      expect(node).not.toHaveProperty('opacity');
      expect(node).not.toHaveProperty('fillOpacity');
      expect(node).not.toHaveProperty('strokeOpacity');
    });
    expect(JSON.stringify(lowered)).not.toContain('"namespace":"notation"');
    expect(JSON.stringify(lowered)).not.toMatch(/rgba|hsla/i);
  });

  it.each([
    ['logic block en', LogicFrameBasicEnDemo],
    ['logic block zh', LogicFrameBasicZhDemo],
    ['logic unit en', LogicUnitEnDemo],
    ['logic unit zh', LogicUnitZhDemo],
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
    expect(vanilla.code).not.toContain('Unsupported Notation composite');
    expect(vanilla.svg).toContain('<svg');
  });

  it('keeps direct, React, and Vanilla canonical IR plus connector identity in parity', () => {
    const direct = directChildren();
    const react = buildPreviewIR(ReactLogic).ir.children;
    const vanilla = vanillaChildren();
    expect(react).toEqual(direct);
    expect(vanilla.slice(0, 2)).toEqual(direct.slice(0, 2));
    expect(vanilla.find(child => child.type === 'connector')).toMatchObject({ id: 'edge' });
  });

  it('produces one renderer-agnostic Scene without Notation discriminators', () => {
    const result = compileToScene(
      { type: 'scene', version: 1, children: directChildren() },
      { composites: [...definitions], padding: 0 },
    );
    expect(JSON.stringify(result.scene)).not.toContain('notation.logic');
    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });

  it('renders the same lowered Scene through SVG and Canvas', () => {
    const scene = sceneOf(directChildren());
    const calls: Array<string> = [];
    expect(renderToSvgString(scene, { idPrefix: 'logic' })).toContain('<svg');
    expect(() => drawScene(recordingContext(calls), scene)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });

  it('keeps a runnable Vanilla example with direct semantic Nodes', () => {
    const input = scene({
      children: [
        terminal('start', { position: [0, 0], text: 'Start' }),
        stage('step', { position: [80, 0], text: 'Step' }),
        connector('edge', { way: ['start', { label: { text: 'next' } }, 'step'] }),
      ],
    });
    const svg = renderVanillaToSvgString(input, {
      adapters: [TerminalInputEmbedAdapter, StageInputEmbedAdapter, ConnectorInputEmbedAdapter],
      output: { width: 220, height: 120 },
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('next');
  });
});
