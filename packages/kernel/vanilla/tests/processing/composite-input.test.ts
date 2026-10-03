import {
  ChildSchema,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { InputEmbedAdapter, InputEmbedContribution, InputSceneChildren } from '../../src';
import {
  createProcessingControllerAsync,
  processToStaticInputResult,
  processToStaticInputResultAsync,
} from '../../src';

const leafDefinition = defineComposite({
  namespace: 'fixture',
  type: 'prepared',
  schema: CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('prepared') }),
  expand: (_node, context) => ({ children: [{ type: 'node', position: [0, 0], text: String(context.runtimeInput) }] }),
});
const makeContribution = (text: string): InputEmbedContribution => ({
  node: { namespace: 'fixture', type: 'prepared' },
  providerDependencies: { roots: [], providers: [] },
  runtimeInputs: [{ path: [], input: text }],
});
const adapter: InputEmbedAdapter<{ text: string }> &
  Required<Pick<InputEmbedAdapter<{ text: string }>, 'prepare' | 'lower'>> = {
  kind: 'prepared',
  lower: props => makeContribution(props.text),
  prepare: props => ({ execute: () => Promise.resolve(makeContribution(props.text)) }),
};
const source = (text: string): InputSceneChildren => ({
  children: [{ type: 'embed', kind: 'prepared', props: { text } }],
});

describe('prepared composite input consumption', () => {
  it('keeps synchronous and async anonymous instances equivalent', async () => {
    const input: InputSceneChildren = {
      children: [...source('left-ready').children, ...source('right-ready').children],
    };
    const options = { adapters: [adapter], compile: { composites: [leafDefinition] } };
    const sync = processToStaticInputResult(input, options);
    const async = await processToStaticInputResultAsync(input, options);
    expect(async.scene).toEqual(sync.scene);
    expect(JSON.stringify(async.scene)).toContain('left-ready');
    expect(JSON.stringify(async.scene)).toContain('right-ready');
  });

  it('updates prepared input when authoring normalizes to identical JSON', async () => {
    const controller = await createProcessingControllerAsync(source('first-ready'), {
      adapters: [adapter],
      compile: { composites: [leafDefinition] },
    });
    const outcome = await controller.update(source('second-ready'));
    expect(outcome.kind).toBe('committed');
    expect(controller.read().revision).toBe(1);
    expect(JSON.stringify(controller.read().scene)).toContain('second-ready');
    expect(JSON.stringify(controller.read().scene)).not.toContain('first-ready');
    controller.dispose();
  });

  it('transports prepared nested children through an opaque Source slot', async () => {
    const outerDefinition = defineComposite({
      namespace: 'fixture',
      type: 'outer',
      schema: CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('outer'), child: ChildSchema }),
      compile: (_node, context) => {
        const child = context.sourceChild(['child']);
        const probe = context.layoutChild(child, NaturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result)] };
      },
    });
    const outer: InputEmbedAdapter<unknown> & Required<Pick<InputEmbedAdapter<unknown>, 'prepare'>> = {
      kind: 'outer',
      prepare: async (_props, context) => {
        const nested = await context.prepareChildren(source('slot-ready').children);
        return {
          execute: async () => {
            const children = await nested.execute();
            return {
              node: { namespace: 'fixture', type: 'outer', child: children.children[0] },
              providerDependencies: children.providerDependencies,
              runtimeInputs: children.runtimeInputs?.map(input => ({
                ...input,
                path: ['child', ...input.path.slice(1)],
              })),
            };
          },
        };
      },
    };
    const result = await processToStaticInputResultAsync(
      { children: [{ type: 'embed', kind: 'outer', props: {} }] },
      { adapters: [adapter, outer], compile: { composites: [leafDefinition, outerDefinition] } },
    );
    expect(JSON.stringify(result.scene)).toContain('slot-ready');
    expect(JSON.stringify(result.scene)).not.toContain('undefined');
  });
});
