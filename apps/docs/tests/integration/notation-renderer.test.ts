import type { IRChild, Scene } from '@retikz/core';
import type { AnyVanillaTier2Adapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { compileToScene } from '@retikz/core';
import {
  ConnectorDefinition,
  createConnector,
  createStage,
  createTerminal,
  StageDefinition,
  TerminalDefinition,
} from '@retikz/notation';
import { Connector, Stage, Terminal } from '@retikz/notation-react';
import {
  connector,
  ConnectorVanillaAdapter,
  stage,
  StageVanillaAdapter,
  terminal,
  TerminalVanillaAdapter,
} from '@retikz/notation-vanilla';
import { Layout, Scope, Step } from '@retikz/react';
import { drawScene } from '@retikz/render/canvas';
import { renderToSvgString } from '@retikz/render/svg';
import { figure, renderToSvgString as renderVanillaToSvgString, scope } from '@retikz/vanilla';
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
import ClassRecipeEnDemo from '../../src/modules/docs/contents/diagram/notation/unit/semantic-units/class-recipe.en.demo';
import ClassRecipeZhDemo from '../../src/modules/docs/contents/diagram/notation/unit/semantic-units/class-recipe.zh.demo';
import DataRecipeEnDemo from '../../src/modules/docs/contents/diagram/notation/unit/semantic-units/data-recipe.en.demo';
import DataRecipeZhDemo from '../../src/modules/docs/contents/diagram/notation/unit/semantic-units/data-recipe.zh.demo';
import SemanticUnitsEnDemo from '../../src/modules/docs/contents/diagram/notation/unit/semantic-units/semantic-units.en.demo';
import SemanticUnitsZhDemo from '../../src/modules/docs/contents/diagram/notation/unit/semantic-units/semantic-units.zh.demo';

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

const vanillaTranslated = (x: number, y: number, child: IRChild): IRChild =>
  scope({ transforms: [{ kind: 'translate', x, y }] }, [child]) as unknown as IRChild;

const directChildren = (): Array<IRChild> => [
  translated(48, 65, createTerminal({ id: 'start', position: [0, 0], text: 'Start' })),
  translated(210, 65, createStage({ id: 'step', position: [0, 0], text: 'Step' })),
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
      createElement(Terminal, { id: 'start', position: [0, 0] }, 'Start'),
    ),
    createElement(
      Scope,
      { transforms: [{ kind: 'translate', x: 210, y: 65 }] },
      createElement(Stage, { id: 'step', position: [0, 0] }, 'Step'),
    ),
    createElement(
      Connector,
      { id: 'edge' },
      createElement(Step, { kind: 'move', to: 'start' }),
      createElement(Step, { kind: 'fold', via: '-|', to: 'step', label: { text: 'next' } }),
    ),
  );

const lower = (adapter: AnyVanillaTier2Adapter, embed: { id: string; kind: string; props: unknown }): IRChild =>
  adapter.lower(embed.props as never, {
    id: embed.id,
    kind: embed.kind,
    namespace: adapter.namespace,
    layerId: 'main',
    identityPath: ['main', embed.id],
  }).node;

const vanillaChildren = (): Array<IRChild> => [
  vanillaTranslated(
    48,
    65,
    lower(TerminalVanillaAdapter, terminal('start', { position: [0, 0], text: 'Start' })),
  ),
  vanillaTranslated(
    210,
    65,
    lower(StageVanillaAdapter, stage('step', { position: [0, 0], text: 'Step' })),
  ),
  lower(
    ConnectorVanillaAdapter,
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
  it.each([
    ['logic block en', LogicFrameBasicEnDemo],
    ['logic block zh', LogicFrameBasicZhDemo],
    ['semantic units en', SemanticUnitsEnDemo],
    ['semantic units zh', SemanticUnitsZhDemo],
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
    const input = figure({
      children: [
        terminal('start', { position: [0, 0], text: 'Start' }),
        stage('step', { position: [80, 0], text: 'Step' }),
        connector('edge', { way: ['start', { label: { text: 'next' } }, 'step'] }),
      ],
    });
    const svg = renderVanillaToSvgString(input, {
      adapters: [TerminalVanillaAdapter, StageVanillaAdapter, ConnectorVanillaAdapter],
      output: { width: 220, height: 120 },
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('next');
  });
});
