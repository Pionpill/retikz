import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import type { IRChild, IRPaint, IRScene, LayoutChildResult, CompositeCompileContext, LayoutProposal } from '../../src';
import {
  compileToScene,
  BuiltinCompileWarningCode,
  CompositeBaseSchema,
  defineComposite,
  formatCompileOccurrence,
  isNodeLayoutCompileArtifact,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  naturalLayoutProposal,
} from '../../src';

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const resolvedResultOf = (
  context: CompositeCompileContext,
  child: IRChild,
  proposal: LayoutProposal = naturalLayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

const gradient = (first: string, second: string): IRPaint => ({
  kind: 'linearGradient',
  stops: [
    { offset: 0, color: first },
    { offset: 1, color: second },
  ],
});

describe('布局感知的复合事务和产物', () => {
  it('仅针对最小的、自然的和精确的事务副作用提交精确的探测', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'multiProposalIsolation',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('multiProposalIsolation'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'node',
            id: 'minimum-only',
            position: [0, 0],
            text: 'minimum',
            style: { fill: gradient('#100', '#200') },
          },
          {
            x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          },
        );
        context.layoutChild(
          {
            type: 'node',
            id: 'natural-only',
            position: [0, 0],
            text: 'natural',
            style: { fill: gradient('#300', '#400') },
          },
          naturalLayoutProposal,
        );
        const exact = resolvedResultOf(
          context,
          {
            type: 'node',
            id: 'exact-only',
            position: [0, 0],
            text: 'exact',
            style: { fill: gradient('#500', '#600') },
          },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 80 },
            y: { kind: LayoutAxisProposalKind.Exact, value: 30 },
          },
        );

        return { children: [context.replay(exact)] };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'multiProposalIsolation' }]), {
      composites: [definition],
      artifacts: { nodeLayouts: true },
    });
    const serialized = JSON.stringify(result);

    expect(serialized).toContain('exact-only');
    expect(serialized).not.toContain('minimum-only');
    expect(serialized).not.toContain('natural-only');
    expect(result.scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: gradient('#500', '#600') }]);
    expect(result.artifacts.filter(isNodeLayoutCompileArtifact)).toHaveLength(1);
  });

  it('仅发布回放的资源并保留最终的资源排序', () => {
    const discarded = gradient('#f00', '#0f0');
    const selected = gradient('#00f', '#fff');
    const definition = defineComposite({
      namespace: 'test',
      type: 'resourceProbe',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('resourceProbe'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'node',
            position: [0, 0],
            text: 'discarded',
            style: { fill: discarded },
          },
          naturalLayoutProposal,
        );
        const final = resolvedResultOf(context, {
          type: 'node',
          position: [0, 0],
          text: 'selected',
          style: { fill: selected },
        });

        return { children: [context.replay(final)] };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'resourceProbe' }]), {
      composites: [definition],
    });

    expect(result.scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: selected }]);
  });

  it('丢弃探测警告，直到选择相应的回放', () => {
    const warnings: Array<{ code: string }> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'warningProbe',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('warningProbe'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'node',
            position: [0, 0],
            text: [{ segments: [{ tex: 'x' }] }],
          },
          naturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    compileToScene(scene([{ namespace: 'test', type: 'warningProbe' }]), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).not.toContainEqual({
      code: BuiltinCompileWarningCode.TexLowererMissing,
    });
  });

  it('丢弃在失败的子项之前创建的资源、警告、身份、观察结果和产物', () => {
    const failure = defineComposite({
      namespace: 'test',
      type: 'lateProbeFailure',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('lateProbeFailure') }),
      compile: () => {
        throw new Error('late failure');
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'failedSideEffectIsolation',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('failedSideEffectIsolation'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            children: [
              {
                type: 'node',
                id: 'discarded-side-effects',
                position: [0, 0],
                text: [{ segments: [{ tex: 'x' }] }],
                style: { fill: gradient('#123', '#456') },
              },
              { namespace: 'test', type: 'lateProbeFailure' },
            ],
          },
          naturalLayoutProposal,
        );

        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);

        return { children: [] };
      },
    });
    const warnings: Array<{ code: string }> = [];

    const result = compileToScene(scene([{ namespace: 'test', type: 'failedSideEffectIsolation' }]), {
      composites: [failure, parent],
      artifacts: { nodeLayouts: true },
      onWarn: warning => warnings.push(warning),
    });

    expect(result.scene.primitives).toEqual([]);
    expect(result.scene.resources ?? []).toEqual([]);
    expect(result.artifacts).toEqual([]);
    expect(warnings).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('discarded-side-effects');
  });

  it('在后续同级节点解析前提交回放的命名空间条目', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'namedChild',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('namedChild'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, {
          type: 'node',
          id: 'inside',
          position: [20, 10],
          layout: { minimumSize: 10 },
        });
        return { children: [context.replay(laid)] };
      },
    });
    const result = compileToScene(
      scene([
        { namespace: 'test', type: 'namedChild' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'inside' } },
          ],
        },
      ]),
      { composites: [definition] },
    );

    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });

  it('使废弃的探测命名空间对后来的同级不可见', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'discardedNamespace',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('discardedNamespace'),
      }),
      compile: (_, context) => {
        context.layoutChild({ type: 'node', id: 'discarded', position: [20, 0] }, naturalLayoutProposal);
        return { children: [] };
      },
    });
    const warnings: Array<{ code: string }> = [];
    const result = compileToScene(
      scene([
        { namespace: 'test', type: 'discardedNamespace' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'discarded' } },
          ],
        },
      ]),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings).toContainEqual(
      expect.objectContaining({ code: BuiltinCompileWarningCode.UnresolvedNodeReference }),
    );
    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(false);
  });

  it('让 layoutChild 解析在复合发生之前完成的引用', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'currentReferences',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('currentReferences'),
      }),
      compile: (_, context) => {
        const child = resolvedResultOf(context, {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'ready' } },
          ],
        });
        return { children: [context.replay(child)] };
      },
    });
    const warnings: Array<{ code: string }> = [];
    const result = compileToScene(
      scene([
        { type: 'node', id: 'ready', position: [20, 0] },
        { namespace: 'test', type: 'currentReferences' },
      ]),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings).toEqual([]);
    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });

  it('在回放后代前输出父级产物并组合实例定位器', () => {
    const child = defineComposite({
      namespace: 'test',
      type: 'child',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('child'),
      }),
      artifactSchema: strictObject({ role: literal('child') }),
      compile: () => ({
        children: [{ type: 'node', position: [0, 0], text: 'child' }],
        artifact: { role: 'child' },
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'parent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('parent'),
      }),
      artifactSchema: strictObject({ role: literal('parent') }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'child' });
        return {
          children: [context.replay(laid)],
          artifact: { role: 'parent' },
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'parent' }]), {
      composites: [child, parent],
    });

    expect(result.artifacts).toMatchObject([
      {
        kind: 'composite',
        type: 'parent',
        occurrence: { sourcePath: 'children[0]', expansionPath: [] },
      },
      {
        kind: 'composite',
        type: 'child',
        occurrence: {
          sourcePath: 'children[0]',
          expansionPath: [{ kind: 'replay', index: 0 }],
        },
      },
    ]);
  });

  it('通过生成的输出事件跟踪嵌套产物', () => {
    const layout = defineComposite({
      namespace: 'test',
      type: 'layoutArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('layoutArtifact'),
      }),
      artifactSchema: strictObject({ ok: literal(true) }),
      compile: () => ({ children: [], artifact: { ok: true } }),
    });
    const wrapper = defineComposite({
      namespace: 'test',
      type: 'wrapper',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('wrapper'),
      }),
      compile: () => ({ children: [{ namespace: 'test', type: 'layoutArtifact' }] }),
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'wrapper' }]), {
      composites: [wrapper, layout],
    });

    expect(result.artifacts[0]?.occurrence).toEqual({
      sourcePath: 'children[0]',
      expansionPath: [{ kind: 'output', index: 0 }],
    });
  });

  it('区分生成的输出 Scope 后代和规范 Scope 后代', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'leafArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('leafArtifact'),
      }),
      artifactSchema: strictObject({ leaf: literal(true) }),
      compile: () => ({ children: [], artifact: { leaf: true } }),
    });
    const wrapper = defineComposite({
      namespace: 'test',
      type: 'scopeOutput',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('scopeOutput'),
      }),
      compile: () => ({
        children: [
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'leafArtifact' }],
          },
        ],
      }),
    });
    const result = compileToScene(
      scene([
        { namespace: 'test', type: 'scopeOutput' },
        {
          type: 'scope',
          children: [{ namespace: 'test', type: 'leafArtifact' }],
        },
      ]),
      { composites: [leaf, wrapper] },
    );

    expect(result.artifacts.map(artifact => artifact.occurrence)).toEqual([
      {
        sourcePath: 'children[0]',
        expansionPath: [
          { kind: 'output', index: 0 },
          { kind: 'scopeChild', index: 0 },
        ],
      },
      {
        sourcePath: 'children[1].scope.children[0]',
        expansionPath: [],
      },
    ]);
  });

  it('使用嵌套的 Scope 来源组成回放并忽略丢弃的探测', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'replayedLeaf',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('replayedLeaf'),
      }),
      artifactSchema: strictObject({ leaf: literal(true) }),
      compile: () => ({ children: [], artifact: { leaf: true } }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'replayedScope',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('replayedScope'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'replayedLeaf' }],
          },
          naturalLayoutProposal,
        );
        const selected = resolvedResultOf(context, {
          type: 'scope',
          children: [{ namespace: 'test', type: 'replayedLeaf' }],
        });

        return { children: [context.replay(selected)] };
      },
    });
    const result = compileToScene(scene([{ namespace: 'test', type: 'replayedScope' }]), {
      composites: [leaf, parent],
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]?.occurrence).toEqual({
      sourcePath: 'children[0]',
      expansionPath: [
        { kind: 'replay', index: 0 },
        { kind: 'scopeChild', index: 0 },
      ],
    });
    expect(formatCompileOccurrence(result.artifacts[0].occurrence)).toBe('children[0]::replay[0]::scopeChild[0]');
  });

  it('返回已分离且不可变的产物并仅在显式启用时输出 Node 布局', () => {
    const payload = { width: 10 };
    const definition = defineComposite({
      namespace: 'test',
      type: 'frozen',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('frozen'),
      }),
      artifactSchema: strictObject({ width: number() }),
      compile: () => ({ children: [], artifact: payload }),
    });
    const ir = scene([
      { namespace: 'test', type: 'frozen' },
      { type: 'node', id: 'node', position: [0, 0], text: 'N' },
    ]);

    const withoutLayouts = compileToScene(ir, { composites: [definition] });
    payload.width = 99;

    expect(withoutLayouts.artifacts).toHaveLength(1);
    expect(withoutLayouts.artifacts[0]?.value).toEqual({ width: 10 });
    expect(Object.isFrozen(withoutLayouts.artifacts)).toBe(true);
    expect(Object.isFrozen(withoutLayouts.artifacts[0]?.value)).toBe(true);

    const withLayouts = compileToScene(ir, {
      composites: [definition],
      artifacts: { nodeLayouts: true },
    });

    expect(withLayouts.artifacts.filter(isNodeLayoutCompileArtifact)).toHaveLength(1);
  });

  it('仅发布一次回放的 Node 布局产物', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'replayedNodeLayout',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('replayedNodeLayout'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { type: 'node', id: 'replayed', position: [0, 0], text: 'N' });
        return { children: [context.replay(laid)] };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'replayedNodeLayout' }]), {
      composites: [definition],
      artifacts: { nodeLayouts: true },
    });

    expect(result.artifacts.filter(isNodeLayoutCompileArtifact)).toEqual([
      expect.objectContaining({
        kind: 'nodeLayout',
        occurrence: {
          sourcePath: 'children[0]',
          expansionPath: [{ kind: 'replay', index: 0 }],
        },
      }),
    ]);
  });

  it('按逻辑发生预序对 Node 布局和复合产物进行排序', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'laterArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('laterArtifact'),
      }),
      artifactSchema: strictObject({ value: literal('later') }),
      compile: () => ({ children: [], artifact: { value: 'later' } }),
    });

    const result = compileToScene(
      scene([
        { type: 'node', id: 'first', position: [0, 0], text: 'N' },
        { namespace: 'test', type: 'laterArtifact' },
      ]),
      {
        composites: [definition],
        artifacts: { nodeLayouts: true },
      },
    );

    expect(result.artifacts.map(artifact => artifact.kind)).toEqual(['nodeLayout', 'composite']);
  });
});
