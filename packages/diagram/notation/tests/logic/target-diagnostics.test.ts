import type { AnyCompositeDefinition, IRChild } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { beforeAll, describe, expect, it } from 'vitest';

import * as Notation from '../../src';

const sceneOf = (children: ReadonlyArray<IRChild>): { version: 1; type: 'scene'; children: Array<IRChild> } => ({
  version: 1,
  type: 'scene',
  children: Array.from(children),
});

const calloutDefinitionOf = (): AnyCompositeDefinition => Notation.CalloutDefinition;

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

describe('Callout target diagnostics', () => {
  beforeAll(() => {
    expect(Notation.CalloutDefinition, 'production mutation required: CalloutDefinition').toBeDefined();
  });

  it('resolves a previous whole LogicFrame target through authored Scope placement', () => {
    const block = Notation.createLogicFrame({
      id: 'callout-previous-block',
      sections: [{ key: 'body', child: calloutNode('callout-block-content') }],
    });
    const output = compileCallout(
      [
        block,
        Notation.createCallout({
          id: 'callout-previous-success',
          target: { kind: 'logicFrame', id: block.id },
          content: calloutNode('callout-previous-content'),
          placement: { side: 'right' },
        }),
      ],
      [Notation.LogicFrameDefinition],
    );

    expect(
      output.artifacts.some(
        artifact => artifact.kind === 'composite' && artifact.namespace === 'notation' && artifact.type === 'callout',
      ),
    ).toBe(true);
  });

  it.each([
    {
      name: 'missing target',
      children: [
        Notation.createCallout({
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
        Notation.createCallout({
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
        Notation.createCallout({
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
        Notation.createCallout({
          id: 'callout-section-target',
          target: { kind: 'logicFrame', id: 'section-target-block', section: 'body' },
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
        Notation.createCallout({
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
