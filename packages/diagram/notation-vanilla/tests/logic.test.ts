import type { InputEmbed, InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';

import {
  ConnectorProvider,
  DecisionProvider,
  JunctionProvider,
  StageProvider,
  TerminalProvider,
} from '@retikz/notation';
import { describe, expect, it } from 'vitest';

import {
  connector,
  ConnectorInputEmbedAdapter,
  decision,
  DecisionInputEmbedAdapter,
  junction,
  JunctionInputEmbedAdapter,
  stage,
  StageInputEmbedAdapter,
  terminal,
  TerminalInputEmbedAdapter,
} from '../src';

const lower = <TProps>(spec: InputEmbed<TProps>, adapter: InputEmbedAdapter<TProps>) =>
  adapter.lower(spec.props, {
    id: spec.id,
    kind: spec.kind,
    layerId: 'layer',
    identityPath: ['layer', spec.id],
  } satisfies InputEmbedContext);

describe('@retikz/notation-vanilla package boundary', () => {
  it('does not expose Callout authoring', async () => {
    const notationVanilla = await import('../src');

    expect(notationVanilla).not.toHaveProperty('callout');
    expect(notationVanilla).not.toHaveProperty('CalloutInputEmbedAdapter');
    expect(notationVanilla).not.toHaveProperty('NotationCalloutEmbedKind');
  });
});

describe('Notation Vanilla semantic authoring', () => {
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
    expect(contribution.compositeDependencies).toEqual({ roots: [provider.key], providers: [provider] });
    expect(provider.makeDefinition({})).toMatchObject({ namespace: 'notation', type });
  });
});
