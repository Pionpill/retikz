import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AnyClipShapeDefinition, IRClip, IRScene } from '../../src';

import { compileToScene, defineClip, defineClipShape } from '../../src';
import { CompositeContractError } from '../../src/resolve/diagnostics';

const clippedIr = (clip: IRClip): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'scope', clip, children: [{ type: 'node', position: [0, 0], text: 'A' }] }],
});

type RecursiveClip = {
  kind: 'recursive';
  depth: number;
};

const RecursiveClipDefinition = defineClip<RecursiveClip>({
  kind: 'recursive',
  schema: z.strictObject({ kind: z.literal('recursive'), depth: z.number().int().nonnegative() }),
  resolve: (spec, context) =>
    spec.depth === 0
      ? { kind: 'rect', x: 0, y: 0, width: 10, height: 10 }
      : context.resolve({ kind: 'recursive', depth: spec.depth - 1 }),
});

const OperationCycleDefinition = defineClip({
  kind: 'operationCycle',
  schema: z.strictObject({ kind: z.literal('operationCycle') }),
  resolve: (spec, context) => context.resolve(spec),
});

const ShapeCycleOperation = defineClip({
  kind: 'shapeCycleOperation',
  schema: z.strictObject({ kind: z.literal('shapeCycleOperation') }),
  resolve: () => ({ kind: 'shapeCycle' }),
});

const ShapeCycleDefinition = defineClipShape({
  kind: 'shapeCycle',
  schema: z.strictObject({ kind: z.literal('shapeCycle') }),
  lower: (shape, context) => context.lower(shape),
});

describe('clip recursion guard', () => {
  it('shares the exact explicit budget across operation resolve and shape lower', () => {
    expect(
      compileToScene(clippedIr({ kind: 'recursive', depth: 2 }), {
        clips: [RecursiveClipDefinition],
        maxClipDepth: 4,
      }).scene.resources,
    ).toHaveLength(1);

    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', depth: 2 }), {
        clips: [RecursiveClipDefinition],
        maxClipDepth: 3,
      }),
    ).toThrow(/maxClipDepth.*3/i);
  });

  it('uses a default budget of 32 edges', () => {
    expect(
      compileToScene(clippedIr({ kind: 'recursive', depth: 30 }), { clips: [RecursiveClipDefinition] }).scene.resources,
    ).toHaveLength(1);
    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', depth: 31 }), { clips: [RecursiveClipDefinition] }),
    ).toThrow(/maxClipDepth.*32/i);
  });

  it('rejects an active operation object cycle before depth overflow', () => {
    expect(() =>
      compileToScene(clippedIr({ kind: 'operationCycle' }), {
        clips: [OperationCycleDefinition],
        maxClipDepth: 100,
      }),
    ).toThrow(/cyclic clip operation/i);
  });

  it('rejects an active shape object cycle before depth overflow', () => {
    expect(() =>
      compileToScene(clippedIr({ kind: 'shapeCycleOperation' }), {
        clips: [ShapeCycleOperation],
        clipShapes: [ShapeCycleDefinition],
        maxClipDepth: 100,
      }),
    ).toThrow(/cyclic clip shape/i);
  });
});

describe('clip failure boundaries', () => {
  it('points missing operation and shape registries to different compile options', () => {
    expect(() => compileToScene(clippedIr({ kind: 'missingOperation' }))).toThrow(/options\.clips/i);
    expect(() => compileToScene(clippedIr({ kind: 'shapeCycleOperation' }), { clips: [ShapeCycleOperation] })).toThrow(
      /options\.clipShapes/i,
    );
  });

  it('keeps malformed lower output as a fatal provider contract error', () => {
    const malformed: AnyClipShapeDefinition = defineClipShape({
      kind: 'malformedPath',
      schema: z.strictObject({ kind: z.literal('malformedPath') }),
      lower: () => ({ commands: [], fillRule: 'nonzero' }),
    });
    const operation = defineClip({
      kind: 'malformedOperation',
      schema: z.strictObject({ kind: z.literal('malformedOperation') }),
      resolve: () => ({ kind: 'malformedPath' }),
    });

    expect(() =>
      compileToScene(clippedIr({ kind: 'malformedOperation' }), {
        clips: [operation],
        clipShapes: [malformed],
      }),
    ).toThrow(CompositeContractError);
  });
});
