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
import type { infer as ZodInfer } from 'zod';
import { boolean, custom, literal, number } from 'zod';

const LogicTestNamespace = 'standard-logic-test';

const ProbeLeafSchema = CompositeBaseSchema.extend({
  namespace: literal(LogicTestNamespace),
  type: literal('probe-leaf'),
  id: NonBlankStringSchema,
  minimumWidth: number().nonnegative().default(8),
  minimumHeight: number().nonnegative().default(6),
  naturalWidth: number().nonnegative().default(24),
  naturalHeight: number().nonnegative().default(14),
  visualX: number().default(-4),
  visualY: number().default(-3),
  visualWidth: number().nonnegative().default(32),
  visualHeight: number().nonnegative().default(24),
  ignoreExact: boolean().default(false),
  fail: boolean().default(false),
});

const HarnessSchema = CompositeBaseSchema.extend({
  namespace: literal(LogicTestNamespace),
  type: literal('harness'),
  child: ChildSchema,
  proposal: custom<LayoutProposal>(),
});

/** 记录测试叶节点收到的布局提案 */
export type ProbeRecord = Readonly<{
  /** 收到提案的测试叶节点标识 */
  id: string;
  /** Core 传给该次叶节点编译的尺寸提案 */
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

const pathForVisualBounds = (node: ZodInfer<typeof ProbeLeafSchema>): IRChild => ({
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [node.visualX, node.visualY] },
    { type: 'step', kind: 'line', to: [node.visualX + node.visualWidth, node.visualY + node.visualHeight] },
  ],
  style: { stroke: 'currentColor', strokeWidth: 1 },
});

/** 创建可指定自然尺寸、最小尺寸及失败行为的布局测试叶节点 */
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

/** 创建记录布局提案并按测试配置产出分配边界的叶节点定义 */
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

/** 创建测量单个子节点并重放结果的测试容器，向外记录成功的测量结果 */
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

/** 以指定提案编译测试子节点，返回完整编译输出及子节点测量结果 */
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

/** 读取指定类型的 Graph 产物；缺失时使测试失败 */
export const compositeArtifact = (output: LogicCompileOutput, type: string): Readonly<{ value: unknown }> => {
  const artifact = output.artifacts.find(
    candidate => candidate.kind === 'composite' && candidate.namespace === 'graph' && candidate.type === type,
  );
  if (artifact === undefined || artifact.kind !== 'composite') {
    throw new Error(`Expected Graph composite artifact '${type}'`);
  }

  return artifact;
};

/** 按先父后子的深度优先顺序展平场景图元，保留分组自身 */
export const primitivesOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...primitivesOf(primitive.children)] : [primitive],
  );

/** 递归收集场景中的全部路径图元 */
export const pathPrimitivesOf = (primitives: ReadonlyArray<ScenePrimitive>) =>
  primitivesOf(primitives).filter((primitive): primitive is Extract<ScenePrimitive, { type: 'path' }> => {
    return primitive.type === 'path';
  });

/** 请求两个轴各自采用自然尺寸的测试提案 */
export const naturalProposal: LayoutProposal = {
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
};

/** 请求两个轴各自采用最小尺寸的测试提案 */
export const minimumProposal: LayoutProposal = {
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'minimum' },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'minimum' },
};

/** 创建两个轴都使用固定尺寸的测试提案 */
export const exactProposal = (width: number, height: number): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Exact, value: width },
  y: { kind: LayoutAxisProposalKind.Exact, value: height },
});
