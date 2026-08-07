import type { AnyCompositeDefinition, IRChild, IRPathBase } from '@retikz/core';

import { compileToScene, lowerIRToKernel } from '@retikz/core';
import { beforeAll, describe, expect, it } from 'vitest';

import * as Standard from '../../src';

const production = Standard;

const connectorDefinitionOf = (): AnyCompositeDefinition => production.ConnectorDefinition;

const sceneOf = (children: ReadonlyArray<IRChild>): { version: 1; type: 'scene'; children: Array<IRChild> } => ({
  version: 1,
  type: 'scene',
  children: Array.from(children),
});

const sectionTarget = (section: string): Standard.LogicDiagramPointInput => ({
  kind: 'logicBlock',
  id: 'logic-block-target',
  section,
});

const lowerConnector = (input: Parameters<typeof Standard.createConnector>[0]): Array<IRChild> => {
  const connector = Standard.createConnector(input);
  return lowerCanonicalConnector(connector);
};

const lowerCanonicalConnector = (connector: ReturnType<typeof Standard.createConnector>): Array<IRChild> => {
  return lowerIRToKernel(sceneOf([connector]), { composites: [connectorDefinitionOf()] }).children;
};

const calloutDefinitionOf = (): AnyCompositeDefinition => Standard.CalloutDefinition;

const calloutNode = (id: string): IRChild => ({
  type: 'node',
  id,
  position: [0, 0],
  shape: 'rectangle',
  boundary: 'shape',
  minimumSize: { width: 40, height: 20 },
  padding: 0,
});

const compileCallout = (children: ReadonlyArray<IRChild>, definitions: ReadonlyArray<AnyCompositeDefinition> = []) =>
  compileToScene(sceneOf(children), {
    composites: [calloutDefinitionOf(), ...definitions],
    padding: 0,
  });

describe('Connector target diagnostics', () => {
  beforeAll(() => {
    expect(production.ConnectorDefinition).toBeDefined();
  });

  it('accepts and preserves a section target in canonical Connector input until lowering', () => {
    const target = sectionTarget('body');
    const connector = Standard.createConnector({
      id: 'section-target-input',
      from: target,
      to: [100, 0],
    });

    expect(connector.from).toEqual(target);
  });

  it.each([
    {
      name: 'from',
      section: 'from-section',
      input: { from: sectionTarget('from-section'), to: [100, 0] },
    },
    {
      name: 'to',
      section: 'to-section',
      input: { from: [0, 0], to: sectionTarget('to-section') },
    },
    {
      name: 'polyline point',
      section: 'waypoint-section',
      input: {
        from: [0, 0],
        to: [100, 0],
        routing: { kind: 'polyline', points: [sectionTarget('waypoint-section')] },
      },
    },
  ] as const)('fails loudly for a $name section target before Core lowering', ({ name, section, input }) => {
    expect(() =>
      lowerConnector({ id: `unsupported-section-${name}`, ...input } as Parameters<typeof Standard.createConnector>[0]),
    ).toThrow(new RegExp(`unsupported.*section.*${section}|${section}.*unsupported`, 'i'));
  });

  it('does not turn an unsupported section target into a fabricated whole-block id or path', () => {
    const connector = Standard.createConnector({
      id: 'section-target-no-fallback',
      from: sectionTarget('body'),
      to: [100, 0],
    });
    const definition = connectorDefinitionOf();

    expect(definition.expand).toEqual(expect.any(Function));
    expect(() => lowerCanonicalConnector(connector)).toThrow(/unsupported.*section.*body|body.*unsupported/i);
  });

  it('maps ordinary and whole-block target anchor/offset fields without fabricating ids', () => {
    const ordinary = Standard.createConnector({
      id: 'ordinary-target-mapping',
      from: { id: 'ordinary-target', anchor: 'right', offset: [4, -2] },
      to: [100, 0],
    });
    const wholeBlock = Standard.createConnector({
      id: 'whole-block-target-mapping',
      from: { kind: 'logicBlock', id: 'logic-block-target', anchor: 'bottom', offset: [6, 3] },
      to: [100, 0],
    });
    const ordinaryPath = lowerCanonicalConnector(ordinary).find((child): child is IRPathBase => child.type === 'path');
    const wholeBlockPath = lowerCanonicalConnector(wholeBlock).find(
      (child): child is IRPathBase => child.type === 'path',
    );

    expect(ordinaryPath?.children?.[0]).toMatchObject({
      kind: 'move',
      to: { id: 'ordinary-target', anchor: 'right', offset: [4, -2] },
    });
    expect(wholeBlockPath?.children?.[0]).toMatchObject({
      kind: 'move',
      to: { id: 'logic-block-target', anchor: 'bottom', offset: [6, 3] },
    });
    expect(wholeBlockPath?.children?.[0]).not.toHaveProperty('to.kind');
  });

  it('keeps a whole LogicBlock target shape distinct from a section target', () => {
    const connector = Standard.createConnector({
      id: 'whole-block-target',
      from: { kind: 'logicBlock', id: 'logic-block-target' },
      to: [100, 0],
    });

    expect(() => lowerCanonicalConnector(connector)).not.toThrow();
    const lowered = lowerCanonicalConnector(connector);
    const path = lowered.find((child): child is IRPathBase => child.type === 'path');
    expect(path?.children?.[0]).toMatchObject({ kind: 'move', to: { id: 'logic-block-target' } });
  });
});

describe('Callout target diagnostics', () => {
  beforeAll(() => {
    expect(Standard.CalloutDefinition, 'production mutation required: CalloutDefinition').toBeDefined();
  });

  it('resolves a previous whole LogicBlock target through authored Scope placement', () => {
    const block = Standard.createLogicBlockBase({
      id: 'callout-previous-block',
      sections: [{ key: 'body', child: calloutNode('callout-block-content') }],
    });
    const output = compileCallout(
      [
        block,
        Standard.createCallout({
          id: 'callout-previous-success',
          target: { kind: 'logicBlock', id: block.id },
          content: calloutNode('callout-previous-content'),
          placement: { side: 'right' },
        }),
      ],
      [Standard.LogicBlockBaseDefinition],
    );

    expect(
      output.artifacts.some(
        artifact => artifact.kind === 'composite' && artifact.namespace === 'standard' && artifact.type === 'callout',
      ),
    ).toBe(true);
  });

  it.each([
    {
      name: 'missing target',
      children: [
        Standard.createCallout({
          id: 'callout-missing-target',
          target: { id: 'missing-callout-target' },
          content: calloutNode('missing-target-content'),
          placement: { side: 'top' },
        }),
      ],
      error: /target|reference|missing/i,
    },
    {
      name: 'forward target',
      children: [
        Standard.createCallout({
          id: 'callout-forward-target',
          target: { id: 'forward-callout-target' },
          content: calloutNode('forward-target-content'),
          placement: { side: 'top' },
        }),
        calloutNode('forward-callout-target'),
      ],
      error: /forward|previous|target|reference/i,
    },
    {
      name: 'self target',
      children: [
        Standard.createCallout({
          id: 'callout-self-target',
          target: { id: 'callout-self-target' },
          content: calloutNode('self-target-content'),
          placement: { side: 'top' },
        }),
      ],
      error: /self|target|reference/i,
    },
    {
      name: 'section target',
      children: [
        Standard.createCallout({
          id: 'callout-section-target',
          target: { kind: 'logicBlock', id: 'section-target-block', section: 'body' },
          content: calloutNode('section-target-content'),
          placement: { side: 'top' },
        }),
      ],
      error: /unsupported.*section|section.*unsupported/i,
    },
    {
      name: 'invalid anchor',
      children: [
        calloutNode('invalid-anchor-target'),
        Standard.createCallout({
          id: 'callout-invalid-anchor',
          target: { id: 'invalid-anchor-target', anchor: 'missing-anchor' },
          content: calloutNode('invalid-anchor-content'),
          placement: { side: 'top' },
        }),
      ],
      error: /anchor|unknown|invalid/i,
    },
  ] as const)('fails loudly for a $name', ({ children, error }) => {
    expect(() => compileCallout(children)).toThrow(error);
  });
});
