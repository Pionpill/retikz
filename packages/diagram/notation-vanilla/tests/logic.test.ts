import type { InputChild, InputEmbed, InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';

import {
  ConnectorProvider,
  DecisionProvider,
  JunctionProvider,
  LogicFrameProvider,
  StageProvider,
  TerminalProvider,
} from '@retikz/notation';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import {
  connector,
  ConnectorInputEmbedAdapter,
  createNotationVanillaAdapters,
  decision,
  DecisionInputEmbedAdapter,
  junction,
  JunctionInputEmbedAdapter,
  stage,
  StageInputEmbedAdapter,
  terminal,
  TerminalInputEmbedAdapter,
} from '../src';

const normalizeChildren = (children: ReadonlyArray<InputChild>) => {
  const normalized = normalizeScene({ children });
  return {
    children: normalized.ir.children,
    providerDependencies: {
      roots: normalized.contributions.flatMap(contribution => contribution.roots),
      providers: normalized.contributions.flatMap(contribution => contribution.providers),
    },
    authoringSites: [],
  };
};

const contextOf = (id: string, kind: string): InputEmbedContext => ({
  id,
  kind,
  layerId: 'layer',
  identityPath: ['layer', id],
  normalizeChildren,
});

const lower = <TProps>(spec: InputEmbed<TProps>, adapter: InputEmbedAdapter<TProps>) =>
  adapter.lower(spec.props, contextOf(spec.id, spec.kind));

describe('@retikz/notation-vanilla package boundary', () => {
  it('does not expose Callout authoring', async () => {
    const notationVanilla = await import('../src');

    expect(notationVanilla).not.toHaveProperty('callout');
    expect(notationVanilla).not.toHaveProperty('CalloutInputEmbedAdapter');
    expect(notationVanilla).not.toHaveProperty('NotationCalloutEmbedKind');
  });
});

describe('Notation Vanilla semantic authoring', () => {
  it('creates all six adapters and preserves LogicUnitVariant authoring fields', () => {
    const adapters = createNotationVanillaAdapters();
    const stageAdapter = adapters[2];
    const contribution = lower(
      stage('vibrant', { position: [0, 0], color: '#123456', variant: 'vibrant' }),
      stageAdapter,
    );

    expect(adapters.map(adapter => adapter.kind)).toEqual([
      'notation.logicFrame',
      'notation.terminal',
      'notation.stage',
      'notation.decision',
      'notation.junction',
      'notation.connector',
    ]);
    expect(contribution.node).toMatchObject({ color: '#123456' });
    expect(contribution.node).toMatchObject({ variant: 'vibrant' });
    expect(
      adapters[0].lower({ header: { child: { type: 'node', position: [0, 0] } } }, contextOf('frame', adapters[0].kind))
        .providerDependencies.roots[0],
    ).toEqual(LogicFrameProvider.key);
    expect(
      adapters[5].lower({ way: ['a', 'b'] }, contextOf('connector', adapters[5].kind)).providerDependencies.roots[0],
    ).toEqual(ConnectorProvider.key);
  });

  it('returns embeds for all five lightweight semantic elements', () => {
    expect(terminal('start', { position: [0, 0], text: 'Start' })).toMatchObject({
      type: 'embed',
      id: 'start',
    });
    expect(stage('step', { position: [20, 0] })).toMatchObject({ type: 'embed', id: 'step' });
    expect(decision('check', { position: [40, 0] })).toMatchObject({ type: 'embed', id: 'check' });
    expect(junction('join', { position: [60, 0] })).toMatchObject({ type: 'embed', id: 'join' });
    expect(connector('flow', { way: ['start', 'step'] })).toMatchObject({ type: 'embed', id: 'flow' });
  });

  it.each([
    {
      type: 'terminal',
      id: 'terminal',
      lower: () => lower(terminal('terminal', { position: [0, 0] }), TerminalInputEmbedAdapter),
    },
    { type: 'stage', id: 'stage', lower: () => lower(stage('stage', { position: [20, 0] }), StageInputEmbedAdapter) },
    {
      type: 'decision',
      id: 'decision',
      lower: () => lower(decision('decision', { position: [40, 0] }), DecisionInputEmbedAdapter),
    },
    {
      type: 'junction',
      id: 'junction',
      lower: () => lower(junction('junction', { position: [60, 0] }), JunctionInputEmbedAdapter),
    },
    {
      type: 'connector',
      id: 'connector',
      lower: () => lower(connector('connector', { way: ['terminal', 'stage'] }), ConnectorInputEmbedAdapter),
    },
  ] as const)('lowers $type to same-id semantic IR and contributes its Definition', ({ type, id, lower: runLower }) => {
    const contribution = runLower();
    const provider = {
      terminal: TerminalProvider,
      stage: StageProvider,
      decision: DecisionProvider,
      junction: JunctionProvider,
      connector: ConnectorProvider,
    }[type];

    expect(contribution.node).toMatchObject({ namespace: 'notation', type, id });
    expect(contribution.providerDependencies).toEqual({ roots: [provider.key], providers: [provider] });
    expect(provider.makeDefinition({})).toMatchObject({ namespace: 'notation', type });
  });
});
