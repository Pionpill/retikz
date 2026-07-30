import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type {
  CompileResult,
  CompileWarning,
  IRPaintSpec,
  IRScene,
  LayoutChildResult,
  LayoutProposal,
  TextMeasurer,
} from '../../src';

import {
  compileToScene,
  CompileWarningCode,
  CompositeBaseSchema,
  defineComposite,
  formatCompileOccurrence,
  isNodeLayoutCompileArtifact,
  LayoutAlignmentGuideDimension,
  LayoutAlignmentGuideName,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
} from '../../src';

const fixedMeasurer: TextMeasurer = text => ({
  width: [...text].length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const gradient = (first: string, second: string): IRPaintSpec => ({
  kind: 'linearGradient',
  stops: [
    { offset: 0, color: first },
    { offset: 1, color: second },
  ],
});

const discardedPaint = gradient('#100', '#200');
const failedPaint = gradient('#300', '#400');
const selectedPaint = gradient('#500', '#600');

const minimumRangeProposal: LayoutProposal = {
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
  y: { kind: LayoutAxisProposalKind.Range, min: 5, max: 25 },
};

const exactNaturalProposal: LayoutProposal = {
  x: { kind: LayoutAxisProposalKind.Exact, value: 50 },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
};

/** 收集错误及 cause 链，验证 nested failure 没有被中间 provider 重新归属 */
const errorChainOf = (error: unknown): Array<Error> => {
  const chain: Array<Error> = [];
  let current = error;
  while (current instanceof Error) {
    chain.push(current);
    current = current.cause;
  }
  return chain;
};

type NestedObservation = Readonly<{
  proposal: LayoutProposal;
  text: LayoutChildResult;
  path: LayoutChildResult;
  failureKind: string;
}>;

type FixtureRun = Readonly<{
  result: CompileResult;
  warnings: ReadonlyArray<CompileWarning>;
  nestedObservations: ReadonlyArray<NestedObservation>;
  parentResults: ReadonlyArray<LayoutChildResult>;
  dispatches: Readonly<{ parent: number; nested: number; failing: number }>;
}>;

const runNestedFixture = (): FixtureRun => {
  const nestedObservations: Array<NestedObservation> = [];
  const parentResults: Array<LayoutChildResult> = [];
  const warnings: Array<CompileWarning> = [];
  const dispatches = { parent: 0, nested: 0, failing: 0 };

  const failing = defineComposite({
    namespace: 'nested-gate',
    type: 'failing',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('nested-gate'),
      type: z.literal('failing'),
    }),
    compile: () => {
      dispatches.failing += 1;
      throw new Error('discarded nested candidate');
    },
  });

  const nested = defineComposite({
    namespace: 'nested-gate',
    type: 'nested',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('nested-gate'),
      type: z.literal('nested'),
    }),
    artifactSchema: z.strictObject({
      role: z.literal('nested'),
      x: z.enum(['intrinsic', 'range', 'exact']),
      y: z.enum(['intrinsic', 'range', 'exact']),
    }),
    compile: (_node, context) => {
      dispatches.nested += 1;
      const pathProbe = context.layoutChild(
        {
          type: 'path',
          stroke: '#000',
          strokeWidth: 4,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [40, 10] },
          ],
        },
        context.proposal,
      );
      if (pathProbe.kind === LayoutChildProbeKind.Failed) return context.raise(pathProbe.failure);

      const failedProbe = context.layoutChild(
        {
          type: 'scope',
          children: [
            {
              type: 'node',
              id: 'shared-identity',
              position: [200, 0],
              text: [{ runs: [{ tex: 'x' }] }],
              fill: failedPaint,
            },
            { namespace: 'nested-gate', type: 'failing' },
          ],
        },
        context.proposal,
      );
      expect(failedProbe.kind).toBe(LayoutChildProbeKind.Failed);
      if (failedProbe.kind === LayoutChildProbeKind.Resolved) {
        throw new Error('expected the nested candidate to fail recoverably');
      }

      const textProbe = context.layoutChild(
        {
          type: 'node',
          id: 'shared-identity',
          position: context.proposal.x.kind === LayoutAxisProposalKind.Exact ? [0, 0] : [100, 0],
          shape: 'rectangle',
          text: 'aa bb cc',
          font: { size: 10 },
          lineHeight: 10,
          padding: 0,
          margin: 0,
          fill: context.proposal.x.kind === LayoutAxisProposalKind.Exact ? selectedPaint : discardedPaint,
          stroke: 'transparent',
        },
        context.proposal,
      );
      if (textProbe.kind === LayoutChildProbeKind.Failed) return context.raise(textProbe.failure);
      const selectedGuide = textProbe.result.alignmentGuides?.find(
        guide => guide.name === LayoutAlignmentGuideName.FirstBaseline,
      );
      if (selectedGuide === undefined) throw new Error('expected the selected text first baseline guide');

      nestedObservations.push({
        proposal: context.proposal,
        text: textProbe.result,
        path: pathProbe.result,
        failureKind: failedProbe.kind,
      });
      return {
        children: [context.replay(textProbe.result)],
        allocationBounds: textProbe.result.allocationBounds,
        alignmentGuides: [selectedGuide],
        artifact: {
          role: 'nested',
          x: context.proposal.x.kind,
          y: context.proposal.y.kind,
        },
      };
    },
  });

  const parent = defineComposite({
    namespace: 'nested-gate',
    type: 'parent',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('nested-gate'),
      type: z.literal('parent'),
    }),
    artifactSchema: z.strictObject({ role: z.literal('parent') }),
    compile: (_node, context) => {
      dispatches.parent += 1;
      expect(context.proposal).toEqual({
        x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      });
      const discarded = context.layoutChild({ namespace: 'nested-gate', type: 'nested' }, minimumRangeProposal);
      if (discarded.kind === LayoutChildProbeKind.Failed) return context.raise(discarded.failure);
      const selected = context.layoutChild({ namespace: 'nested-gate', type: 'nested' }, exactNaturalProposal);
      if (selected.kind === LayoutChildProbeKind.Failed) return context.raise(selected.failure);
      parentResults.push(discarded.result, selected.result);
      return {
        children: [context.replay(selected.result)],
        allocationBounds: selected.result.allocationBounds,
        alignmentGuides: selected.result.alignmentGuides,
        artifact: { role: 'parent' },
      };
    },
  });

  const scene: IRScene = {
    version: 1,
    type: 'scene',
    children: [
      { namespace: 'nested-gate', type: 'parent' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [100, 0] },
          { type: 'step', kind: 'line', to: { id: 'shared-identity' } },
        ],
      },
    ],
  };
  const result = compileToScene(scene, {
    composites: [failing, nested, parent],
    measureText: fixedMeasurer,
    padding: 0,
    artifacts: { nodeLayouts: true },
    onWarn: warning => warnings.push(warning),
  });
  return { result, warnings, nestedObservations, parentResults, dispatches };
};

describe('three-level layout proposal closure', () => {
  it('keeps mixed-axis proposals, independent quantities, guides and selected transaction state through nesting', () => {
    const run = runNestedFixture();

    expect(run.nestedObservations.map(observation => observation.proposal)).toEqual([
      minimumRangeProposal,
      exactNaturalProposal,
    ]);
    expect(run.nestedObservations.every(observation => Object.isFrozen(observation.proposal))).toBe(true);
    expect(run.nestedObservations.map(observation => observation.failureKind)).toEqual([
      LayoutChildProbeKind.Failed,
      LayoutChildProbeKind.Failed,
    ]);

    const selectedObservation = run.nestedObservations[1];
    const selectedParentResult = run.parentResults[1];
    expect(selectedObservation.text.slotSize).toEqual({ width: 50, height: 20 });
    expect(selectedObservation.text.allocationBounds).toEqual({ x: -25, y: -10, width: 50, height: 20 });
    expect(selectedObservation.text.visualBounds).toEqual({ x: -25.5, y: -22, width: 51, height: 32.5 });
    expect(selectedObservation.path.slotSize).toEqual({ width: 50, height: 10 });
    expect(selectedObservation.path.allocationBounds).toEqual({ x: 0, y: 0, width: 40, height: 10 });
    expect(selectedObservation.path.visualBounds).toEqual({ x: -20, y: -20, width: 80, height: 50 });
    expect(selectedParentResult.slotSize).toEqual({ width: 50, height: 20 });
    expect(selectedParentResult.allocationBounds).toEqual(selectedObservation.text.allocationBounds);
    expect(selectedParentResult.visualBounds).toEqual(selectedObservation.text.visualBounds);
    const selectedLeafGuide = selectedObservation.text.alignmentGuides?.find(
      guide => guide.name === LayoutAlignmentGuideName.FirstBaseline,
    );
    expect(selectedLeafGuide).toBeDefined();
    expect(selectedParentResult.alignmentGuides).toEqual([selectedLeafGuide]);
    expect(selectedLeafGuide?.dimension).toBe(LayoutAlignmentGuideDimension.Y);
    expect(selectedLeafGuide?.position).toBeGreaterThanOrEqual(selectedObservation.text.allocationBounds.y);
    expect(selectedLeafGuide?.position).toBeLessThanOrEqual(
      selectedObservation.text.allocationBounds.y + selectedObservation.text.allocationBounds.height,
    );

    expect(run.result.scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: selectedPaint }]);
    expect(run.warnings).toEqual([]);
    expect(run.warnings.filter(warning => warning.code === CompileWarningCode.DuplicateNodeId)).toEqual([]);
    expect(run.warnings.filter(warning => warning.code === CompileWarningCode.UnresolvedNodeReference)).toEqual([]);
    const selectedNodeArtifact = run.result.artifacts.find(isNodeLayoutCompileArtifact);
    expect(selectedNodeArtifact?.value.id).toBe('shared-identity');
    expect(formatCompileOccurrence(selectedNodeArtifact?.occurrence ?? { sourcePath: '', expansionPath: [] })).toBe(
      'children[0]::replay[0]::replay[0]',
    );
    const referencePath = run.result.scene.primitives.find(primitive => primitive.type === 'path');
    expect(
      referencePath?.type === 'path' ? referencePath.commands.find(command => command.kind === 'line') : undefined,
    ).toMatchObject({ to: [25, 0] });
  });

  it('commits one selected replay without redispatch and stays renderer-neutral and deterministic', () => {
    const first = runNestedFixture();
    const second = runNestedFixture();

    expect(first.dispatches).toEqual({ parent: 1, nested: 2, failing: 2 });
    expect(second.dispatches).toEqual(first.dispatches);
    expect(second.result).toEqual(first.result);
    expect(first.result.artifacts.filter(isNodeLayoutCompileArtifact)).toHaveLength(1);

    const parentArtifact = first.result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.type === 'parent',
    );
    const nestedArtifact = first.result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.type === 'nested',
    );
    const selectedNodeArtifact = first.result.artifacts.find(isNodeLayoutCompileArtifact);
    expect(parentArtifact?.value).toEqual({ role: 'parent' });
    expect(nestedArtifact?.value).toEqual({ role: 'nested', x: 'exact', y: 'intrinsic' });
    expect(formatCompileOccurrence(nestedArtifact?.occurrence ?? { sourcePath: '', expansionPath: [] })).toBe(
      'children[0]::replay[0]',
    );
    expect(formatCompileOccurrence(selectedNodeArtifact?.occurrence ?? { sourcePath: '', expansionPath: [] })).toBe(
      'children[0]::replay[0]::replay[0]',
    );
  });

  it('preserves the leaf provider and full Parent to nested to leaf occurrence when both levels raise', () => {
    const rootCause = new Error('three-level leaf failure');
    const leaf = defineComposite({
      namespace: 'diagnostic-gate',
      type: 'leaf',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('diagnostic-gate'),
        type: z.literal('leaf'),
      }),
      compile: () => {
        throw rootCause;
      },
    });
    const nested = defineComposite({
      namespace: 'diagnostic-gate',
      type: 'nested',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('diagnostic-gate'),
        type: z.literal('nested'),
      }),
      compile: (_node, context) => {
        const leafProbe = context.layoutChild({ namespace: 'diagnostic-gate', type: 'leaf' }, exactNaturalProposal);
        if (leafProbe.kind === LayoutChildProbeKind.Failed) return context.raise(leafProbe.failure);
        throw new Error('expected the leaf probe to fail');
      },
    });
    const parent = defineComposite({
      namespace: 'diagnostic-gate',
      type: 'parent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('diagnostic-gate'),
        type: z.literal('parent'),
      }),
      compile: (_node, context) => {
        const nestedProbe = context.layoutChild({ namespace: 'diagnostic-gate', type: 'nested' }, minimumRangeProposal);
        if (nestedProbe.kind === LayoutChildProbeKind.Failed) return context.raise(nestedProbe.failure);
        throw new Error('expected the nested probe to fail');
      },
    });

    let thrown: unknown;
    try {
      compileToScene(
        {
          version: 1,
          type: 'scene',
          children: [{ namespace: 'diagnostic-gate', type: 'parent' }],
        },
        { composites: [leaf, nested, parent] },
      );
    } catch (error) {
      thrown = error;
    }
    const chain = errorChainOf(thrown);

    expect(chain).toContain(rootCause);
    expect(chain[0]?.message).toBe(
      "Layout child provider 'diagnostic-gate.leaf' failed at children[0] (children[0]::probe[0]::probe[0]): three-level leaf failure",
    );
  });
});
