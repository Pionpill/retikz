import type { IRChild, Scene } from '@retikz/core';
import type { FC } from 'react';

import { compileToScene } from '@retikz/core';
import { Layout, Node, Scope } from '@retikz/react';
import { drawScene } from '@retikz/render/canvas';
import { renderToSvgString } from '@retikz/render/svg';
import {
  CalloutArtifactSchema,
  CalloutDefinition,
  ConnectorDefinition,
  createCallout,
  createConnector,
  createStage,
  createTerminal,
  StageDefinition,
  TerminalDefinition,
} from '@retikz/standard';
import { Callout, Connector, Stage, Terminal } from '@retikz/standard-react';
import {
  callout,
  CalloutVanillaAdapter,
  connector,
  ConnectorVanillaAdapter,
  stage,
  StageVanillaAdapter,
  terminal,
  TerminalVanillaAdapter,
} from '@retikz/standard-vanilla';
import { figure, renderToSvgString as renderVanillaToSvgString, scope } from '@retikz/vanilla';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import CalloutPlacementEnDemo from '../../src/modules/docs/contents/standard/logic/callout/callout-placement.en.demo';
import CalloutPlacementZhDemo from '../../src/modules/docs/contents/standard/logic/callout/callout-placement.zh.demo';
import ConnectorRoutingEnDemo from '../../src/modules/docs/contents/standard/logic/connector/connector-routing.en.demo';
import ConnectorRoutingZhDemo from '../../src/modules/docs/contents/standard/logic/connector/connector-routing.zh.demo';
import LogicFrameBasicEnDemo from '../../src/modules/docs/contents/standard/logic/logic-frame/logic-frame-basic.en.demo';
import LogicFrameBasicZhDemo from '../../src/modules/docs/contents/standard/logic/logic-frame/logic-frame-basic.zh.demo';
import ProcessRecipeEnDemo from '../../src/modules/docs/contents/standard/logic/logic-frame/process-recipe.en.demo';
import ProcessRecipeZhDemo from '../../src/modules/docs/contents/standard/logic/logic-frame/process-recipe.zh.demo';
import ClassRecipeEnDemo from '../../src/modules/docs/contents/standard/logic/semantic-units/class-recipe.en.demo';
import ClassRecipeZhDemo from '../../src/modules/docs/contents/standard/logic/semantic-units/class-recipe.zh.demo';
import DataRecipeEnDemo from '../../src/modules/docs/contents/standard/logic/semantic-units/data-recipe.en.demo';
import DataRecipeZhDemo from '../../src/modules/docs/contents/standard/logic/semantic-units/data-recipe.zh.demo';
import SemanticUnitsEnDemo from '../../src/modules/docs/contents/standard/logic/semantic-units/semantic-units.en.demo';
import SemanticUnitsZhDemo from '../../src/modules/docs/contents/standard/logic/semantic-units/semantic-units.zh.demo';

const definitions = [TerminalDefinition, StageDefinition, ConnectorDefinition, CalloutDefinition] as const;

const sceneOf = (children: ReadonlyArray<IRChild>): Scene =>
  compileToScene(
    {
      type: 'scene',
      version: 1,
      viewBox: { x: 0, y: 0, width: 420, height: 180 },
      children: [...children],
    },
    { composites: [...definitions], padding: 0 },
  ).scene;

const translated = (x: number, y: number, child: IRChild): IRChild => ({
  type: 'scope',
  transforms: [{ kind: 'translate', x, y }],
  children: [child],
});

const vanillaTranslated = (x: number, y: number, child: IRChild): IRChild =>
  scope({ transforms: [{ kind: 'translate', x, y }] }, [child]) as unknown as IRChild;

const directChildren = () => [
  translated(
    48,
    65,
    createTerminal({
      id: 'start/terminal',
      role: 'start',
      content: { type: 'node', id: 'start-content', position: [0, 0], text: 'Start' },
    }),
  ),
  translated(
    210,
    65,
    createStage({
      id: 'step/stage',
      content: { type: 'node', id: 'step-content', position: [0, 0], text: 'Step' },
    }),
  ),
  createConnector({
    id: 'edge/connector',
    from: { id: 'start/terminal' },
    to: { id: 'step/stage' },
    routing: { kind: 'orthogonal', pattern: 'hv' },
    label: { text: 'next' },
  }),
  createCallout({
    id: 'note/callout',
    target: { id: 'step/stage' },
    content: { type: 'node', id: 'note-content', position: [0, 0], text: 'Explain' },
    placement: { side: 'right', gap: 10 },
  }),
];

const ReactLogic: FC = () =>
  createElement(
    Layout,
    { width: 420, height: 180 },
    createElement(
      Scope,
      { transforms: [{ kind: 'translate', x: 48, y: 65 }] },
      createElement(
        Terminal,
        { id: 'start/terminal', role: 'start' },
        createElement(Node, { id: 'start-content', position: [0, 0], text: 'Start' }),
      ),
    ),
    createElement(
      Scope,
      { transforms: [{ kind: 'translate', x: 210, y: 65 }] },
      createElement(
        Stage,
        { id: 'step/stage' },
        createElement(Node, { id: 'step-content', position: [0, 0], text: 'Step' }),
      ),
    ),
    createElement(Connector, {
      id: 'edge/connector',
      from: { id: 'start/terminal' },
      to: { id: 'step/stage' },
      routing: { kind: 'orthogonal', pattern: 'hv' },
      label: { text: 'next' },
    }),
    createElement(
      Callout,
      { id: 'note/callout', target: { id: 'step/stage' }, placement: { side: 'right', gap: 10 } },
      createElement(Node, { id: 'note-content', position: [0, 0], text: 'Explain' }),
    ),
  );

const lower = (
  adapter:
    | typeof TerminalVanillaAdapter
    | typeof StageVanillaAdapter
    | typeof ConnectorVanillaAdapter
    | typeof CalloutVanillaAdapter,
  embed: { id: string; kind: string; props: unknown },
): IRChild =>
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
    lower(
      TerminalVanillaAdapter,
      terminal('start', {
        role: 'start',
        content: { type: 'node', id: 'start-content', position: [0, 0], text: 'Start' },
      }),
    ),
  ),
  vanillaTranslated(
    210,
    65,
    lower(
      StageVanillaAdapter,
      stage('step', { content: { type: 'node', id: 'step-content', position: [0, 0], text: 'Step' } }),
    ),
  ),
  lower(
    ConnectorVanillaAdapter,
    connector('edge', {
      from: { id: 'start/terminal' },
      to: { id: 'step/stage' },
      routing: { kind: 'orthogonal', pattern: 'hv' },
      label: { text: 'next' },
    }),
  ),
  lower(
    CalloutVanillaAdapter,
    callout('note', {
      target: { id: 'step/stage' },
      content: { type: 'node', id: 'note-content', position: [0, 0], text: 'Explain' },
      placement: { side: 'right', gap: 10 },
    }),
  ),
];

const recordingContext = (calls: Array<string>): CanvasRenderingContext2D =>
  new Proxy(
    {},
    {
      get: (_target, property) => {
        if (typeof property !== 'string') return undefined;
        return vi.fn(() => calls.push(property));
      },
      set: () => true,
    },
  ) as CanvasRenderingContext2D;

describe('Standard Logic renderer integration', () => {
  it.each([
    ['logic block en', LogicFrameBasicEnDemo],
    ['logic block zh', LogicFrameBasicZhDemo],
    ['semantic units en', SemanticUnitsEnDemo],
    ['semantic units zh', SemanticUnitsZhDemo],
    ['connector en', ConnectorRoutingEnDemo],
    ['connector zh', ConnectorRoutingZhDemo],
    ['callout en', CalloutPlacementEnDemo],
    ['callout zh', CalloutPlacementZhDemo],
    ['process recipe en', ProcessRecipeEnDemo],
    ['process recipe zh', ProcessRecipeZhDemo],
    ['class recipe en', ClassRecipeEnDemo],
    ['class recipe zh', ClassRecipeZhDemo],
    ['data recipe en', DataRecipeEnDemo],
    ['data recipe zh', DataRecipeZhDemo],
  ])('renders the canonical %s demo through the Vanilla converter', (_name, Component) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).not.toContain('Unsupported Standard composite');
    expect(vanilla.code).not.toContain('Failed to generate Vanilla preview');
    expect(vanilla.svg).toContain('<svg');
  });

  it('keeps direct, React, and Vanilla canonical IR plus connector identity in parity', () => {
    const direct = directChildren();
    const react = buildPreviewIR(ReactLogic).ir.children;
    const vanilla = vanillaChildren();

    expect(react).toEqual(direct);
    expect(vanilla).toEqual(direct);
    expect(vanilla.find(child => child.type === 'connector')).toMatchObject({ id: 'edge/connector' });
    expect(vanilla.find(child => child.type === 'callout')).toMatchObject({ id: 'note/callout' });
  });

  it('produces a typed Callout artifact and one renderer-agnostic Scene', () => {
    const result = compileToScene(
      { type: 'scene', version: 1, children: directChildren() },
      { composites: [...definitions], padding: 0 },
    );
    const calloutArtifact = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.type === 'callout',
    );

    expect(calloutArtifact).toBeDefined();
    expect(CalloutArtifactSchema.parse(calloutArtifact?.value)).toMatchObject({ kind: 'callout', id: 'note/callout' });
    expect(JSON.stringify(result.scene)).not.toContain('standard.logic');
    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });

  it('renders the same lowered Scene through SVG and Canvas', () => {
    const scene = sceneOf(directChildren());
    const calls: Array<string> = [];

    const svg = renderToSvgString(scene, { idPrefix: 'logic' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    expect(svg).toContain('next');
    expect(svg).toContain('Explain');
    expect(() => drawScene(recordingContext(calls), scene)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });

  it('keeps a runnable Vanilla target example on the documented derived IDs', () => {
    const input = figure({
      viewBox: { x: 0, y: 0, width: 420, height: 180 },
      children: [
        scope({ transforms: [{ kind: 'translate', x: 48, y: 65 }] }, [
          terminal('start', { role: 'start', content: { type: 'node', position: [0, 0], text: 'Start' } }),
        ]),
        scope({ transforms: [{ kind: 'translate', x: 210, y: 65 }] }, [
          stage('step', { content: { type: 'node', position: [0, 0], text: 'Step' } }),
        ]),
        connector('edge', { from: { id: 'start/terminal' }, to: { id: 'step/stage' }, label: { text: 'next' } }),
      ],
    });
    const svg = renderVanillaToSvgString(input, {
      adapters: [TerminalVanillaAdapter, StageVanillaAdapter, ConnectorVanillaAdapter],
      output: { width: 420, height: 180 },
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('next');
  });
});
