import type {
  AnyCompositeDefinition,
  CompileWarning,
  IRChild,
  LayoutChildResult,
  LayoutProposal,
  ScenePrimitive,
} from '@retikz/core';

import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
} from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

const LogicTestNamespace = 'standard-logic-test';

const ProbeLeafSchema = CompositeBaseSchema.extend({
  namespace: z.literal(LogicTestNamespace),
  type: z.literal('probe-leaf'),
  id: NonBlankStringSchema,
  minimumWidth: z.number().nonnegative().default(8),
  minimumHeight: z.number().nonnegative().default(6),
  naturalWidth: z.number().nonnegative().default(24),
  naturalHeight: z.number().nonnegative().default(14),
  visualX: z.number().default(-4),
  visualY: z.number().default(-3),
  visualWidth: z.number().nonnegative().default(32),
  visualHeight: z.number().nonnegative().default(24),
  ignoreExact: z.boolean().default(false),
  fail: z.boolean().default(false),
});

const HarnessSchema = CompositeBaseSchema.extend({
  namespace: z.literal(LogicTestNamespace),
  type: z.literal('harness'),
  child: ChildSchema,
  proposal: z.custom<LayoutProposal>(),
});

export type ProbeRecord = Readonly<{
  id: string;
  proposal: LayoutProposal;
}>;

export type LogicCompileOutput = ReturnType<typeof compileToScene>;

const resolvedAxis = (
  proposal: LayoutProposal['x'],
  minimum: number,
  natural: number,
  ignoreExact: boolean,
): number => {
  if (proposal.kind === LayoutAxisProposalKind.Exact) return ignoreExact ? natural : proposal.value;
  if (proposal.kind === LayoutAxisProposalKind.Range) return Math.min(natural, proposal.max ?? natural);
  return proposal.mode === 'minimum' ? minimum : natural;
};

const pathForVisualBounds = (node: z.infer<typeof ProbeLeafSchema>): IRChild => ({
  type: 'path',
  stroke: 'currentColor',
  strokeWidth: 1,
  children: [
    { type: 'step', kind: 'move', to: [node.visualX, node.visualY] },
    { type: 'step', kind: 'line', to: [node.visualX + node.visualWidth, node.visualY + node.visualHeight] },
  ],
});

export const createProbeLeaf = (
  id: string,
  options: Partial<{
    minimumWidth: number;
    minimumHeight: number;
    naturalWidth: number;
    naturalHeight: number;
    visualX: number;
    visualY: number;
    visualWidth: number;
    visualHeight: number;
    ignoreExact: boolean;
    fail: boolean;
  }> = {},
): IRChild => ({
  namespace: LogicTestNamespace,
  type: 'probe-leaf',
  id,
  ...options,
});

export const createProbeLeafDefinition = (records: Array<ProbeRecord> = []): AnyCompositeDefinition =>
  defineComposite({
    namespace: LogicTestNamespace,
    type: 'probe-leaf',
    schema: ProbeLeafSchema,
    compile: (node, context) => {
      records.push({ id: node.id, proposal: context.proposal });
      if (node.fail) throw new Error(`probe failure for '${node.id}'`);

      const width = resolvedAxis(context.proposal.x, node.minimumWidth, node.naturalWidth, node.ignoreExact);
      const height = resolvedAxis(context.proposal.y, node.minimumHeight, node.naturalHeight, node.ignoreExact);
      return {
        allocationBounds: { x: 0, y: 0, width, height },
        children: [context.scope({ id: node.id }, [pathForVisualBounds(node)])],
      };
    },
  });

export const createHarnessDefinition = (observed: { result?: LayoutChildResult }): AnyCompositeDefinition =>
  defineComposite({
    namespace: LogicTestNamespace,
    type: 'harness',
    schema: HarnessSchema,
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, node.proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      observed.result = probe.result;
      return { children: [context.replay(probe.result)] };
    },
  });

export const compileInHarness = (
  child: IRChild,
  proposal: LayoutProposal,
  definitions: ReadonlyArray<AnyCompositeDefinition>,
  options: Readonly<{ onWarn?: (warning: CompileWarning) => void }> = {},
): { output: LogicCompileOutput; result: LayoutChildResult } => {
  const observed: { result?: LayoutChildResult } = {};
  const output = compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [
        {
          namespace: LogicTestNamespace,
          type: 'harness',
          child,
          proposal,
        },
      ],
    },
    {
      composites: [...definitions, createHarnessDefinition(observed)],
      padding: 0,
      ...options,
    },
  );

  if (observed.result === undefined) throw new Error('Expected Core to resolve the logic child probe');
  return { output, result: observed.result };
};

export const compositeArtifact = (output: LogicCompileOutput, type: string): Readonly<{ value: unknown }> => {
  const artifact = output.artifacts.find(
    candidate => candidate.kind === 'composite' && candidate.namespace === 'graph' && candidate.type === type,
  );
  if (artifact === undefined || artifact.kind !== 'composite') {
    throw new Error(`Expected Graph composite artifact '${type}'`);
  }
  return artifact;
};

export const primitivesOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...primitivesOf(primitive.children)] : [primitive],
  );

export const pathPrimitivesOf = (primitives: ReadonlyArray<ScenePrimitive>) =>
  primitivesOf(primitives).filter((primitive): primitive is Extract<ScenePrimitive, { type: 'path' }> => {
    return primitive.type === 'path';
  });

export const naturalProposal: LayoutProposal = {
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
};

export const minimumProposal: LayoutProposal = {
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'minimum' },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'minimum' },
};

export const exactProposal = (width: number, height: number): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Exact, value: width },
  y: { kind: LayoutAxisProposalKind.Exact, value: height },
});
