import type { AnyVanillaTier2Adapter, VanillaChildSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import {
  CalloutDefinition,
  ConnectorDefinition,
  createCallout,
  createConnector,
  createDecision,
  createJunction,
  createLogicBlockBase,
  createStage,
  createTerminal,
  DecisionDefinition,
  JunctionDefinition,
  LogicBlockBaseDefinition,
  StageDefinition,
  TerminalDefinition,
} from '@retikz/standard';
import {
  compileVanillaWithDriver,
  defaultVanillaCompileDriver,
  normalizeFigureSpec,
  renderToSvgString,
} from '@retikz/vanilla';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  CalloutVanillaInput,
  ConnectorVanillaInput,
  DecisionVanillaInput,
  JunctionVanillaInput,
  LogicBlockBaseVanillaInput,
  StageVanillaInput,
  TerminalVanillaInput,
} from '../src';

import {
  callout,
  CalloutVanillaAdapter,
  connector,
  ConnectorVanillaAdapter,
  decision,
  DecisionVanillaAdapter,
  junction,
  JunctionVanillaAdapter,
  logicBlockBase,
  LogicBlockBaseVanillaAdapter,
  stage,
  StageVanillaAdapter,
  terminal,
  TerminalVanillaAdapter,
} from '../src';

type AdapterIdentity = Pick<AnyVanillaTier2Adapter, 'kind' | 'namespace'>;

const contextOf = (adapter: AdapterIdentity, id: string) => ({
  id,
  kind: adapter.kind,
  namespace: adapter.namespace,
  layerId: 'main',
  identityPath: ['main', id],
});

describe('Standard Vanilla logic authoring', () => {
  it('publishes typed inputs, builders, and adapters', () => {
    expectTypeOf<LogicBlockBaseVanillaInput>().toHaveProperty('sections');
    expectTypeOf<TerminalVanillaInput>().toHaveProperty('role');
    expectTypeOf<StageVanillaInput>().toHaveProperty('content');
    expectTypeOf<DecisionVanillaInput>().toHaveProperty('content');
    expectTypeOf<JunctionVanillaInput>().toHaveProperty('content');
    expectTypeOf<ConnectorVanillaInput>().toHaveProperty('from');
    expectTypeOf<CalloutVanillaInput>().toHaveProperty('target');

    expectTypeOf(logicBlockBase).parameter(0).toEqualTypeOf<string>();
    expectTypeOf(logicBlockBase).parameter(1).toMatchTypeOf<LogicBlockBaseVanillaInput>();
    expectTypeOf(terminal).parameter(0).toEqualTypeOf<string>();
    expectTypeOf(terminal).parameter(1).toMatchTypeOf<TerminalVanillaInput>();
    expectTypeOf(stage).parameter(1).toMatchTypeOf<StageVanillaInput>();
    expectTypeOf(decision).parameter(1).toMatchTypeOf<DecisionVanillaInput>();
    expectTypeOf(junction).parameter(1).toMatchTypeOf<JunctionVanillaInput>();
    expectTypeOf(connector).parameter(1).toMatchTypeOf<ConnectorVanillaInput>();
    expectTypeOf(callout).parameter(1).toMatchTypeOf<CalloutVanillaInput>();

    expectTypeOf(LogicBlockBaseVanillaAdapter).toMatchTypeOf<VanillaTier2Adapter<LogicBlockBaseVanillaInput>>();
    expectTypeOf(TerminalVanillaAdapter).toMatchTypeOf<VanillaTier2Adapter<TerminalVanillaInput>>();
    expectTypeOf(StageVanillaAdapter).toMatchTypeOf<VanillaTier2Adapter<StageVanillaInput>>();
    expectTypeOf(DecisionVanillaAdapter).toMatchTypeOf<VanillaTier2Adapter<DecisionVanillaInput>>();
    expectTypeOf(JunctionVanillaAdapter).toMatchTypeOf<VanillaTier2Adapter<JunctionVanillaInput>>();
    expectTypeOf(ConnectorVanillaAdapter).toMatchTypeOf<VanillaTier2Adapter<ConnectorVanillaInput>>();
    expectTypeOf(CalloutVanillaAdapter).toMatchTypeOf<VanillaTier2Adapter<CalloutVanillaInput>>();
  });

  it('exports seven plain builders and seven independent adapters', () => {
    const entries = [
      [logicBlockBase, LogicBlockBaseVanillaAdapter],
      [terminal, TerminalVanillaAdapter],
      [stage, StageVanillaAdapter],
      [decision, DecisionVanillaAdapter],
      [junction, JunctionVanillaAdapter],
      [connector, ConnectorVanillaAdapter],
      [callout, CalloutVanillaAdapter],
    ] as const;
    const namespaces = entries.map(([, adapter]) => adapter.namespace);
    expect(new Set(namespaces).size).toBe(entries.length);
    for (const [builder, adapter] of entries) {
      expect(builder).toBeTypeOf('function');
      expect(adapter).toBeDefined();
      expect(adapter.kind).toBe(adapter.namespace);
    }
  });

  it('lowers each builder to the direct canonical IR and only its own Definition', () => {
    const cases = [
      {
        name: 'Terminal',
        lower: () =>
          TerminalVanillaAdapter.lower(
            {
              role: 'start',
              content: { type: 'node', id: 'terminal-content', position: [0, 0], text: 'terminal-content' },
            },
            contextOf(TerminalVanillaAdapter, 'vanilla-terminal'),
          ),
        expected: createTerminal({
          id: 'vanilla-terminal/terminal',
          role: 'start',
          content: { type: 'node', id: 'terminal-content', position: [0, 0], text: 'terminal-content' },
        }),
        definition: TerminalDefinition,
      },
      {
        name: 'Stage',
        lower: () =>
          StageVanillaAdapter.lower(
            {
              category: 'action',
              content: { type: 'node', id: 'stage-content', position: [0, 0], text: 'stage-content' },
            },
            contextOf(StageVanillaAdapter, 'vanilla-stage'),
          ),
        expected: createStage({
          id: 'vanilla-stage/stage',
          category: 'action',
          content: { type: 'node', id: 'stage-content', position: [0, 0], text: 'stage-content' },
        }),
        definition: StageDefinition,
      },
      {
        name: 'Decision',
        lower: () =>
          DecisionVanillaAdapter.lower(
            { content: { type: 'node', id: 'decision-content', position: [0, 0], text: 'decision-content' } },
            contextOf(DecisionVanillaAdapter, 'vanilla-decision'),
          ),
        expected: createDecision({
          id: 'vanilla-decision/decision',
          content: { type: 'node', id: 'decision-content', position: [0, 0], text: 'decision-content' },
        }),
        definition: DecisionDefinition,
      },
      {
        name: 'Junction',
        lower: () =>
          JunctionVanillaAdapter.lower(
            {
              role: 'fork',
              content: { type: 'node', id: 'junction-content', position: [0, 0], text: 'junction-content' },
            },
            contextOf(JunctionVanillaAdapter, 'vanilla-junction'),
          ),
        expected: createJunction({
          id: 'vanilla-junction/junction',
          role: 'fork',
          content: { type: 'node', id: 'junction-content', position: [0, 0], text: 'junction-content' },
        }),
        definition: JunctionDefinition,
      },
      {
        name: 'Connector',
        lower: () =>
          ConnectorVanillaAdapter.lower(
            { from: [0, 0], to: [20, 0], label: { text: 'next' } },
            contextOf(ConnectorVanillaAdapter, 'vanilla-connector'),
          ),
        expected: createConnector({
          id: 'vanilla-connector/connector',
          from: [0, 0],
          to: [20, 0],
          label: { text: 'next' },
        }),
        definition: ConnectorDefinition,
      },
      {
        name: 'Callout',
        lower: () =>
          CalloutVanillaAdapter.lower(
            {
              target: { id: 'vanilla-target' },
              placement: { side: 'right' },
              content: { type: 'node', id: 'callout-content', position: [0, 0], text: 'callout-content' },
            },
            contextOf(CalloutVanillaAdapter, 'vanilla-callout'),
          ),
        expected: createCallout({
          id: 'vanilla-callout/callout',
          target: { id: 'vanilla-target' },
          placement: { side: 'right' },
          content: { type: 'node', id: 'callout-content', position: [0, 0], text: 'callout-content' },
        }),
        definition: CalloutDefinition,
      },
      {
        name: 'LogicBlockBase',
        lower: () =>
          LogicBlockBaseVanillaAdapter.lower(
            {
              header: { child: { type: 'node', id: 'block-header', position: [0, 0], text: 'block-header' } },
              sections: [
                { key: 'body', child: { type: 'node', id: 'block-body', position: [0, 0], text: 'block-body' } },
              ],
            },
            contextOf(LogicBlockBaseVanillaAdapter, 'vanilla-block'),
          ),
        expected: createLogicBlockBase({
          id: 'vanilla-block/logicBlockBase',
          header: { child: { type: 'node', id: 'block-header', position: [0, 0], text: 'block-header' } },
          sections: [{ key: 'body', child: { type: 'node', id: 'block-body', position: [0, 0], text: 'block-body' } }],
        }),
        definition: LogicBlockBaseDefinition,
      },
    ];

    for (const testCase of cases) {
      const contribution = testCase.lower();
      expect(contribution.node).toEqual(testCase.expected);
      expect(contribution.makeComposites({})).toEqual([testCase.definition]);
    }
  });

  it('keeps nested Standard Definition loading explicit', () => {
    const block = logicBlockBase('block', {
      sections: [
        {
          key: 'nested',
          child: createStage({ id: 'stage', content: { type: 'node', id: 'nested-content', position: [0, 0] } }),
        },
      ],
    });
    const blockAdapter = [LogicBlockBaseVanillaAdapter] as unknown as Array<AnyVanillaTier2Adapter>;
    expect(() =>
      renderToSvgString(
        { type: 'figure', version: 1, children: [block as VanillaChildSpec] },
        { adapters: blockAdapter, compile: { composites: [StageDefinition] } },
      ),
    ).not.toThrow();
    expect(() =>
      renderToSvgString(
        { type: 'figure', version: 1, children: [block as VanillaChildSpec] },
        { adapters: blockAdapter },
      ),
    ).toThrow(/standard\.stage|adapter/i);
  });

  it('normalizes all seven adapters without a shared namespace maker', () => {
    const embeds: Array<VanillaChildSpec> = [
      terminal('terminal', { role: 'start' }),
      stage('stage', { content: { type: 'node', position: [0, 0] } }),
      decision('decision', { content: { type: 'node', position: [0, 0] } }),
      junction('junction', {}),
      connector('connector', { from: [0, 0], to: [20, 0] }),
      callout('callout', {
        target: { id: 'terminal' },
        placement: { side: 'right' },
        content: { type: 'node', position: [0, 0] },
      }),
      logicBlockBase('block', { sections: [{ key: 'body', child: { type: 'node', position: [0, 0] } }] }),
    ];
    const adapters = [
      TerminalVanillaAdapter,
      StageVanillaAdapter,
      DecisionVanillaAdapter,
      JunctionVanillaAdapter,
      ConnectorVanillaAdapter,
      CalloutVanillaAdapter,
      LogicBlockBaseVanillaAdapter,
    ] as unknown as Array<AnyVanillaTier2Adapter>;
    const normalized = normalizeFigureSpec({ type: 'figure', version: 1, children: embeds }, { adapters });
    expect(normalized.ir.children).toHaveLength(embeds.length);
    expect(normalized.composites).toHaveLength(embeds.length);
  });

  it('keeps direct and Vanilla contribution compile Scene and artifact identities in parity', () => {
    const stageNode = createStage({
      id: 'parity-stage/stage',
      content: { type: 'node', id: 'parity-stage-content', position: [0, 0], text: 'parity-stage-content' },
    });
    const connectorNode = createConnector({ id: 'parity-connector/connector', from: [0, 0], to: [20, 0] });
    const directInput = {
      instance: {},
      source: { type: 'scene' as const, version: 1 as const, children: [stageNode, connectorNode] },
      authoringSites: [],
      coreOptions: { composites: [StageDefinition, ConnectorDefinition], artifacts: { nodeLayouts: true }, padding: 0 },
    };
    const directOutput = compileVanillaWithDriver(directInput, defaultVanillaCompileDriver.create(directInput));

    const normalized = normalizeFigureSpec(
      {
        type: 'figure',
        version: 1,
        children: [
          stage('parity-stage', {
            content: { type: 'node', id: 'parity-stage-content', position: [0, 0], text: 'parity-stage-content' },
          }),
          connector('parity-connector', { from: [0, 0], to: [20, 0] }),
        ] as Array<VanillaChildSpec>,
      },
      { adapters: [StageVanillaAdapter, ConnectorVanillaAdapter] as unknown as Array<AnyVanillaTier2Adapter> },
    );
    const authoredInput = {
      instance: {},
      source: normalized.ir,
      authoringSites: normalized.authoringSites,
      coreOptions: { composites: normalized.composites, artifacts: { nodeLayouts: true }, padding: 0 },
    };
    const authoredOutput = compileVanillaWithDriver(authoredInput, defaultVanillaCompileDriver.create(authoredInput));

    expect(authoredOutput.primary.scene).toEqual(directOutput.primary.scene);
    expect(authoredOutput.primary.artifacts).toEqual(directOutput.primary.artifacts);
    expect(authoredOutput.primary.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'composite',
          namespace: 'standard',
          type: 'stage',
          value: expect.objectContaining({ id: 'parity-stage/stage' }),
        }),
      ]),
    );
    expect(JSON.stringify(authoredOutput.primary.scene)).toContain('"id":"parity-connector/connector"');
  });

  it('renders Vanilla Stage and Connector with the same Scene identity as direct canonical IR', () => {
    const stageNode = createStage({
      id: 'parity-stage/stage',
      content: { type: 'node', id: 'parity-stage-content', position: [0, 0], text: 'parity-stage-content' },
    });
    const connectorNode = createConnector({ id: 'parity-connector/connector', from: [0, 0], to: [20, 0] });
    const direct = renderToSvgString(
      { type: 'scene', version: 1, children: [stageNode, connectorNode] },
      { compile: { composites: [StageDefinition, ConnectorDefinition] } },
    );
    const normalized = normalizeFigureSpec(
      {
        type: 'figure',
        version: 1,
        children: [
          stage('parity-stage', {
            content: { type: 'node', id: 'parity-stage-content', position: [0, 0], text: 'parity-stage-content' },
          }),
          connector('parity-connector', { from: [0, 0], to: [20, 0] }),
        ] as Array<VanillaChildSpec>,
      },
      { adapters: [StageVanillaAdapter, ConnectorVanillaAdapter] as unknown as Array<AnyVanillaTier2Adapter> },
    );
    const vanilla = renderToSvgString(normalized.ir, { compile: { composites: normalized.composites } });
    expect(vanilla).toBe(direct);
  });
});
