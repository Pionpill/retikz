import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { IRChild, IRScene, TextMeasurer } from '../../src';

import { ChildSchema, compileToScene, CompositeBaseSchema, defineComposite, lowerIRToKernel } from '../../src';

const fixedMeasurer: TextMeasurer = text => ({
  width: text.length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const createLayoutDefinition = () =>
  defineComposite({
    namespace: 'test',
    type: 'layout',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('layout'),
      child: ChildSchema,
      width: z.number().nonnegative(),
    }),
    artifactSchema: z.strictObject({
      intrinsicWidth: z.number(),
      constrainedWidth: z.number(),
    }),
    compile: (node, context) => {
      const { constraint, layoutChild } = context;
      expect(constraint).toEqual({ kind: 'intrinsic' });
      const intrinsic = layoutChild(node.child, { kind: 'intrinsic' });
      const constrained = layoutChild(node.child, {
        kind: 'constrained',
        width: { kind: 'bounded', max: node.width },
      });
      return {
        children: [context.replay(constrained)],
        artifact: {
          intrinsicWidth: intrinsic.allocationBounds.width,
          constrainedWidth: constrained.allocationBounds.width,
        },
      };
    },
  });

const sceneOf = (child: IRChild): IRScene => ({
  version: 1,
  type: 'scene',
  children: [child],
});

describe('layout-aware composite', () => {
  it('measures intrinsic and constrained content, then replays the selected result without a third layout', () => {
    const measureText = vi.fn<TextMeasurer>(fixedMeasurer);
    const definition = createLayoutDefinition();
    const result = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'layout',
        width: 45,
        child: {
          type: 'node',
          position: [0, 0],
          text: 'aa aa',
          padding: 0,
          margin: 0,
          fill: 'transparent',
          stroke: 'transparent',
        },
      }),
      { composites: [definition], measureText, padding: 0 },
    );

    expect(result.scene.primitives).not.toHaveLength(0);
    expect(result.artifacts).toEqual([
      {
        kind: 'composite',
        namespace: 'test',
        type: 'layout',
        occurrence: { sourcePath: 'children[0]', expansionPath: [] },
        value: { intrinsicWidth: 50, constrainedWidth: 20 },
      },
    ]);
    expect(measureText).toHaveBeenCalledTimes(4);
  });

  it('does not broadcast a constrained Scope width to nested layout-aware composites', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'nestedConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nestedConstraint'),
      }),
      artifactSchema: z.strictObject({
        constraint: z.enum(['intrinsic', 'constrained']),
      }),
      compile: (_node, { constraint }) => ({
        children: [],
        artifact: { constraint: constraint.kind },
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'scopeConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('scopeConstraint'),
      }),
      compile: (_node, context) => {
        const { layoutChild } = context;
        const laid = layoutChild(
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'nestedConstraint' }],
          },
          { kind: 'constrained', width: { kind: 'bounded', max: 40 } },
        );
        return { children: [context.replay(laid)] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'scopeConstraint' }), {
      composites: [parent, nested],
    });

    expect(result.artifacts).toEqual([
      {
        kind: 'composite',
        namespace: 'test',
        type: 'nestedConstraint',
        occurrence: {
          sourcePath: 'children[0]',
          expansionPath: [
            { kind: 'replay', index: 0 },
            { kind: 'scopeChild', index: 0 },
          ],
        },
        value: { constraint: 'intrinsic' },
      },
    ]);
  });

  it('rejects duplicate replay placement', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'duplicateReplay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('duplicateReplay'),
        child: ChildSchema,
      }),
      compile: (node, context) => {
        const { layoutChild } = context;
        const laid = layoutChild(node.child, { kind: 'intrinsic' });
        return {
          children: [context.replay(laid), context.replay(laid)],
        };
      },
    });

    expect(() =>
      compileToScene(
        sceneOf({
          namespace: 'test',
          type: 'duplicateReplay',
          child: { type: 'node', position: [0, 0], text: 'A' },
        }),
        { composites: [definition] },
      ),
    ).toThrow(/Composite 'test\.duplicateReplay' at children\[0\].*already replayed/i);
  });

  it('makes lowerIRToKernel fail loudly before invoking a layout-aware definition', () => {
    const compile = vi.fn(() => ({ children: [] }));
    const definition = defineComposite({
      namespace: 'test',
      type: 'layoutOnly',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('layoutOnly'),
      }),
      compile,
    });

    expect(() =>
      lowerIRToKernel(sceneOf({ namespace: 'test', type: 'layoutOnly' }), {
        composites: [definition],
      }),
    ).toThrow(/test\.layoutOnly.*children\[0\].*full compile environment/i);
    expect(compile).not.toHaveBeenCalled();
  });
});
