import type { EmbeddableContribution } from '@retikz/react';
import type { FC, ReactElement, ReactNode } from 'react';

import {
  buildIRWithContributions,
  compileLayoutWithDriver,
  defaultLayoutCompileDriver,
  Layout,
  Node,
} from '@retikz/react';
import {
  CalloutDefinition,
  ConnectorDefinition,
  createCallout,
  createConnector,
  createDecision,
  createJunction,
  createLogicFrame,
  createStage,
  createTerminal,
  DecisionDefinition,
  JunctionDefinition,
  LogicFrameDefinition,
  StageDefinition,
  TerminalDefinition,
} from '@retikz/standard';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  CalloutProps,
  ConnectorProps,
  DecisionProps,
  JunctionProps,
  LogicFrameHeaderProps,
  LogicFrameProps,
  LogicFrameSectionProps,
  StageProps,
  TerminalProps,
} from '../../src';

import {
  Callout,
  Connector,
  Decision,
  Junction,
  LogicFrame,
  LogicFrameHeader,
  LogicFrameSection,
  Stage,
  Terminal,
} from '../../src';

type IRChild = EmbeddableContribution['node'];

const node = (id: string): ReactElement => <Node id={id} position={[0, 0]} text={id} />;
const header = (children: ReactNode): ReactElement => createElement(LogicFrameHeader, { children });
const section = (props: Omit<LogicFrameSectionProps, 'children'>, children: ReactNode): ReactElement =>
  createElement(LogicFrameSection, { ...props, children });

describe('Standard React logic authoring', () => {
  it('exports seven flat logic components and two block markers', () => {
    expect([LogicFrame, Terminal, Stage, Decision, Junction, Connector, Callout]).toHaveLength(7);
    expect(LogicFrameHeader).toBeTypeOf('function');
    expect(LogicFrameSection).toBeTypeOf('function');
    expect(
      Reflect.get({ LogicFrame, Terminal, Stage, Decision, Junction, Connector, Callout }, 'Logic'),
    ).toBeUndefined();
  });

  it('publishes typed props for all logic components and markers', () => {
    expectTypeOf<LogicFrameProps>().toHaveProperty('children');
    expectTypeOf<TerminalProps>().toHaveProperty('content');
    expectTypeOf<StageProps>().toHaveProperty('content');
    expectTypeOf<DecisionProps>().toHaveProperty('content');
    expectTypeOf<JunctionProps>().toHaveProperty('content');
    expectTypeOf<ConnectorProps>().toHaveProperty('label');
    expectTypeOf<CalloutProps>().toHaveProperty('content');
    expectTypeOf<LogicFrameHeaderProps>().toHaveProperty('children');
    expectTypeOf<LogicFrameSectionProps>().toHaveProperty('sectionKey');
    expectTypeOf(Terminal).toMatchTypeOf<FC<TerminalProps>>();
    expectTypeOf(Stage).toMatchTypeOf<FC<StageProps>>();
    expectTypeOf(Decision).toMatchTypeOf<FC<DecisionProps>>();
    expectTypeOf(Junction).toMatchTypeOf<FC<JunctionProps>>();
    expectTypeOf(Connector).toMatchTypeOf<FC<ConnectorProps>>();
    expectTypeOf(Callout).toMatchTypeOf<FC<CalloutProps>>();
    expectTypeOf(LogicFrame).toMatchTypeOf<FC<LogicFrameProps>>();
    expectTypeOf(LogicFrameHeader).toMatchTypeOf<FC<LogicFrameHeaderProps>>();
    expectTypeOf(LogicFrameSection).toMatchTypeOf<FC<LogicFrameSectionProps>>();
  });

  it('contributes canonical IR and only its own Definition for every flat component', () => {
    const cases: ReadonlyArray<{
      name: string;
      contribute: () => { node: IRChild; makeComposites: (datasets: Record<string, unknown>) => Array<unknown> };
      expected: IRChild;
      definition: unknown;
    }> = [
      {
        name: 'Terminal',
        contribute: () =>
          Terminal.embeddableAdapter.contribute({
            id: 'react-terminal',
            role: 'start',
            children: node('terminal-content'),
          }),
        expected: createTerminal({
          id: 'react-terminal',
          role: 'start',
          content: { type: 'node', id: 'terminal-content', position: [0, 0], text: 'terminal-content' },
        }),
        definition: TerminalDefinition,
      },
      {
        name: 'Stage',
        contribute: () =>
          Stage.embeddableAdapter.contribute({
            id: 'react-stage',
            category: 'action',
            children: node('stage-content'),
          }),
        expected: createStage({
          id: 'react-stage',
          category: 'action',
          content: { type: 'node', id: 'stage-content', position: [0, 0], text: 'stage-content' },
        }),
        definition: StageDefinition,
      },
      {
        name: 'Decision',
        contribute: () =>
          Decision.embeddableAdapter.contribute({ id: 'react-decision', children: node('decision-content') }),
        expected: createDecision({
          id: 'react-decision',
          content: { type: 'node', id: 'decision-content', position: [0, 0], text: 'decision-content' },
        }),
        definition: DecisionDefinition,
      },
      {
        name: 'Junction',
        contribute: () =>
          Junction.embeddableAdapter.contribute({
            id: 'react-junction',
            role: 'fork',
            children: node('junction-content'),
          }),
        expected: createJunction({
          id: 'react-junction',
          role: 'fork',
          content: { type: 'node', id: 'junction-content', position: [0, 0], text: 'junction-content' },
        }),
        definition: JunctionDefinition,
      },
      {
        name: 'Connector',
        contribute: () =>
          Connector.embeddableAdapter.contribute({
            id: 'react-connector',
            from: [0, 0],
            to: [20, 0],
            label: { text: 'next' },
          }),
        expected: createConnector({ id: 'react-connector', from: [0, 0], to: [20, 0], label: { text: 'next' } }),
        definition: ConnectorDefinition,
      },
      {
        name: 'Callout',
        contribute: () =>
          Callout.embeddableAdapter.contribute({
            id: 'react-callout',
            target: { id: 'react-target' },
            placement: { side: 'right' },
            children: node('callout-content'),
          }),
        expected: createCallout({
          id: 'react-callout',
          target: { id: 'react-target' },
          placement: { side: 'right' },
          content: { type: 'node', id: 'callout-content', position: [0, 0], text: 'callout-content' },
        }),
        definition: CalloutDefinition,
      },
      {
        name: 'LogicFrame',
        contribute: () =>
          LogicFrame.embeddableAdapter.contribute({
            id: 'react-block',
            children: createElement(
              Fragment,
              null,
              header(node('block-header')),
              section({ sectionKey: 'body', role: 'body' }, node('block-body')),
            ),
          }),
        expected: createLogicFrame({
          id: 'react-block',
          header: { child: { type: 'node', id: 'block-header', position: [0, 0], text: 'block-header' } },
          sections: [
            {
              key: 'body',
              role: 'body',
              child: { type: 'node', id: 'block-body', position: [0, 0], text: 'block-body' },
            },
          ],
        }),
        definition: LogicFrameDefinition,
      },
    ];

    for (const testCase of cases) {
      const contribution = testCase.contribute();
      expect(contribution.node).toEqual(testCase.expected);
      expect(contribution.makeComposites({})).toEqual([testCase.definition]);
    }
  });

  it('enforces one-child content and rejects connector label markers', () => {
    expect(() =>
      Terminal.embeddableAdapter.contribute({
        id: 'Terminal-many',
        role: 'start',
        children: [node('one'), node('two')],
      }),
    ).toThrow(/exactly one|content/i);
    expect(() =>
      Stage.embeddableAdapter.contribute({ id: 'Stage-many', children: [node('one'), node('two')] }),
    ).toThrow(/exactly one|content/i);
    expect(() =>
      Decision.embeddableAdapter.contribute({ id: 'Decision-many', children: [node('one'), node('two')] }),
    ).toThrow(/exactly one|content/i);
    expect(() =>
      Junction.embeddableAdapter.contribute({ id: 'Junction-many', children: [node('one'), node('two')] }),
    ).toThrow(/exactly one|content/i);
    expect(() =>
      Callout.embeddableAdapter.contribute({
        id: 'Callout-many',
        target: { id: 'target' },
        placement: { side: 'right' },
        children: [node('one'), node('two')],
      }),
    ).toThrow(/exactly one|content/i);
    expect(() =>
      Connector.embeddableAdapter.contribute({
        id: 'connector-marker',
        from: [0, 0],
        to: [10, 0],
        children: node('label-marker'),
      } as unknown as ConnectorProps),
    ).toThrow(/label|children/i);
  });

  it('treats empty optional children as omitted and required children as invalid', () => {
    expect(
      Terminal.embeddableAdapter.contribute({ id: 'terminal-empty', role: 'start', children: false }).node,
    ).toEqual(createTerminal({ id: 'terminal-empty', role: 'start' }));
    expect(Junction.embeddableAdapter.contribute({ id: 'junction-empty', children: null }).node).toEqual(
      createJunction({ id: 'junction-empty' }),
    );
    const content: IRChild = { type: 'node', id: 'fallback', position: [0, 0] };
    expect(
      Terminal.embeddableAdapter.contribute({ id: 'terminal-fallback', role: 'start', content, children: false }).node,
    ).toEqual(createTerminal({ id: 'terminal-fallback', role: 'start', content }));
    expect(() => Stage.embeddableAdapter.contribute({ id: 'stage-empty', children: false })).toThrow(/content|child/i);
    expect(() => Decision.embeddableAdapter.contribute({ id: 'decision-empty', children: null })).toThrow(
      /content|child/i,
    );
    expect(() =>
      Callout.embeddableAdapter.contribute({
        id: 'callout-empty',
        target: { id: 'target' },
        placement: { side: 'right' },
        children: false,
      }),
    ).toThrow(/content|child/i);
  });

  it('enforces LogicFrame marker grammar and duplicate authored keys', () => {
    const contribute = (children: ReactNode) =>
      LogicFrame.embeddableAdapter.contribute({ id: 'invalid-block', children });

    expect(() => contribute(createElement(Fragment, null, header(node('a')), header(node('b'))))).toThrow(
      /header|one/i,
    );
    expect(() =>
      contribute(createElement(Fragment, null, node('illegal'), section({ sectionKey: 'body' }, node('body')))),
    ).toThrow(/direct|section|marker/i);
    expect(() => contribute(section({ sectionKey: '' }, node('body')))).toThrow(/section|key/i);
    expect(() =>
      contribute(
        createElement(
          Fragment,
          null,
          section({ sectionKey: 'body' }, node('first')),
          section({ sectionKey: 'body' }, node('second')),
        ),
      ),
    ).toThrow(/duplicate|section/i);
    expect(() => contribute(header(createElement(Fragment, null, node('a'), node('b'))))).toThrow(/exactly one|child/i);
  });

  it('does not implicitly register a nested Standard Definition', () => {
    const nestedBlock = (
      <Layout width={120} height={80}>
        <LogicFrame id="nested-block">
          <LogicFrameSection sectionKey="nested">
            <Stage id="nested-stage">{node('nested-stage-content')}</Stage>
          </LogicFrameSection>
        </LogicFrame>
      </Layout>
    );
    expect(() => renderToStaticMarkup(nestedBlock)).toThrow(/standard\.stage|definition/i);
    expect(() =>
      renderToStaticMarkup(
        <Layout width={120} height={80} composites={[StageDefinition]}>
          <LogicFrame id="nested-block">
            <LogicFrameSection sectionKey="nested">
              <Stage id="nested-stage">{node('nested-stage-content')}</Stage>
            </LogicFrameSection>
          </LogicFrame>
        </Layout>,
      ),
    ).not.toThrow();
  });

  it('ignores empty block children when plain header or sections are provided', () => {
    const headerInput = { child: { type: 'node', id: 'plain-header', position: [0, 0] } };
    const sectionsInput = [{ key: 'body', child: { type: 'node', id: 'plain-body', position: [0, 0] } }];
    expect(() =>
      LogicFrame.embeddableAdapter.contribute({
        id: 'plain-empty-false',
        header: headerInput,
        sections: sectionsInput,
        children: false,
      }),
    ).not.toThrow();
    expect(() =>
      LogicFrame.embeddableAdapter.contribute({
        id: 'plain-empty-null',
        header: headerInput,
        sections: sectionsInput,
        children: null,
      }),
    ).not.toThrow();
    expect(() =>
      LogicFrame.embeddableAdapter.contribute({
        id: 'marker-and-plain',
        header: headerInput,
        children: header(node('marker-header')),
      }),
    ).toThrow(/marker|header|sections/i);
  });

  it('keeps direct and React contribution compile Scene and artifact identities in parity', () => {
    const stage = createStage({
      id: 'parity-stage',
      content: { type: 'node', id: 'parity-stage-content', position: [0, 0], text: 'parity-stage-content' },
    });
    const connector = createConnector({ id: 'parity-connector', from: [0, 0], to: [20, 0] });
    const directInput = {
      instance: {},
      source: { type: 'scene' as const, version: 1 as const, children: [stage, connector] },
      authoringSites: [],
      coreOptions: { composites: [StageDefinition, ConnectorDefinition], artifacts: { nodeLayouts: true }, padding: 0 },
    };
    const directOutput = compileLayoutWithDriver(directInput, defaultLayoutCompileDriver.create(directInput));

    const built = buildIRWithContributions(
      <>
        <Stage id="parity-stage">
          <Node id="parity-stage-content" position={[0, 0]} text="parity-stage-content" />
        </Stage>
        <Connector id="parity-connector" from={[0, 0]} to={[20, 0]} />
      </>,
    );
    const authoredInput = {
      instance: {},
      source: built.ir,
      authoringSites: built.authoringSites,
      coreOptions: directInput.coreOptions,
    } as const;
    const authoredOutput = compileLayoutWithDriver(authoredInput, defaultLayoutCompileDriver.create(authoredInput));

    expect(authoredOutput.primary.scene).toEqual(directOutput.primary.scene);
    expect(authoredOutput.primary.artifacts).toEqual(directOutput.primary.artifacts);
    expect(authoredOutput.primary.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'composite',
          namespace: 'standard',
          type: 'stage',
          value: expect.objectContaining({ id: 'parity-stage' }),
        }),
      ]),
    );
    expect(JSON.stringify(authoredOutput.primary.scene)).toContain('"id":"parity-connector"');
  });

  it('renders React Stage and Connector with the same Scene identity as direct canonical IR', () => {
    const stage = createStage({
      id: 'parity-stage',
      content: { type: 'node', id: 'parity-stage-content', position: [0, 0], text: 'parity-stage-content' },
    });
    const connector = createConnector({ id: 'parity-connector', from: [0, 0], to: [20, 0] });
    const direct = renderToStaticMarkup(
      <Layout
        ir={{ type: 'scene', version: 1, children: [stage, connector] }}
        composites={[StageDefinition, ConnectorDefinition]}
        width={120}
        height={80}
      />,
    );
    const react = renderToStaticMarkup(
      <Layout width={120} height={80}>
        <Stage id="parity-stage">{node('parity-stage-content')}</Stage>
        <Connector id="parity-connector" from={[0, 0]} to={[20, 0]} />
      </Layout>,
    );
    expect(react).toBe(direct);
  });
});
