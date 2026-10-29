import { describe, expect, it } from 'vitest';
import { boolean, literal, number, strictObject } from 'zod';

import type {
  CompositeCompileChild,
  CompositeCompileContext,
  IRAnimationTrack,
  IRChild,
  IRPaint,
  IRScene,
  LayoutChildResult,
  LayoutProposal,
  ScenePrimitive,
} from '../../src';
import {
  BuiltinCompileWarningCode,
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineClip,
  defineComposite,
  formatCompileOccurrence,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  naturalLayoutProposal,
} from '../../src';
import { createFullCompileContext } from '../../src/compile/context';
import { NamespaceStack } from '../../src/compile/namespace';
import { createCompileProvenanceTracker } from '../../src/compile/orchestration/provenance';
import { compileChildrenToPrimitives } from '../../src/compile/orchestration/traversal';
import type { CompositeCompileSession } from '../../src/compile/orchestration/types';
import { sceneRectangles } from '../helpers/scene-rectangles';

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const node = (id: string, position: readonly [number, number] = [0, 0]): IRChild => ({
  type: 'node',
  id,
  position: [...position],
  layout: { minimumSize: 8, padding: 0, margin: 0 },
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

const groups = (primitives: ReadonlyArray<ScenePrimitive>): Array<Extract<ScenePrimitive, { type: 'group' }>> => {
  const output: Array<Extract<ScenePrimitive, { type: 'group' }>> = [];

  const visit = (primitive: ScenePrimitive): void => {
    if (primitive.type !== 'group') return;
    output.push(primitive);
    primitive.children.forEach(visit);
  };

  primitives.forEach(visit);

  return output;
};

const fade: IRAnimationTrack = {
  property: 'opacity',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  duration: 200,
};

describe('布局感知复合运行时包装树', () => {
  it('通过单个 Scope 包装器将父提案转发到其布局感知的子提案', () => {
    let receivedProposal: LayoutProposal | undefined;
    const leaf = defineComposite({
      namespace: 'test',
      type: 'proposalLeaf',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('proposalLeaf') }),
      compile: (_value, context) => {
        receivedProposal = context.proposal;
        return { children: [] };
      },
    });
    const wrapper = defineComposite({
      namespace: 'test',
      type: 'proposalWrapper',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('proposalWrapper') }),
      compile: (_value, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            defaults: { node: { label: { font: { size: 12 } } }, path: { label: { font: { size: 12 } } } },
            children: [{ namespace: 'test', type: 'proposalLeaf' }],
          },
          {
            x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 40 },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          },
        );
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);

        return { children: [context.replay(probe.result)] };
      },
    });

    compileToScene(scene([{ namespace: 'test', type: 'proposalWrapper' }]), {
      composites: [leaf, wrapper],
      padding: 0,
    });

    expect(receivedProposal).toEqual({
      x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 40 },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
    });
    expect(Object.isFrozen(receivedProposal)).toBe(true);
    expect(Object.isFrozen(receivedProposal?.x)).toBe(true);
    expect(Object.isFrozen(receivedProposal?.y)).toBe(true);
  });

  it('将外部裁剪/元框架与内部数字放置框架分开', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'wrappedNode',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('wrappedNode'),
        child: ChildSchema,
      }),
      compile: (value, context) => {
        const laid = resolvedResultOf(context, value.child);
        const replay = context.replay(laid);
        const placement = context.createScope(
          {
            transforms: [
              { kind: 'scale', x: 2, y: 3 },
              { kind: 'translate', x: 10, y: 12 },
            ],
          },
          [replay],
        );

        return {
          children: [
            context.createScope(
              {
                id: 'cell',
                clip: { kind: 'rect', params: { x: 0, y: 0, width: 30, height: 20 } },
                meta: { role: 'cell' },
              },
              [placement],
            ),
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'wrappedNode', child: node('content', [2, 3]) }]), {
      composites: [definition],
      padding: 0,
    });
    const outer = result.scene.primitives[0];

    expect(outer).toMatchObject({ type: 'group', id: 'cell', meta: { role: 'cell' }, clipRef: 'clip-1' });
    expect(outer).not.toHaveProperty('transforms');

    if (outer.type !== 'group') throw new Error('expected outer wrapper group');

    expect(outer.children).toHaveLength(1);
    expect(outer.children[0]).toMatchObject({
      type: 'group',
      transforms: [
        { kind: 'scale', x: 2, y: 3 },
        { kind: 'translate', x: 10, y: 12 },
      ],
    });
    expect(result.scene.resources).toEqual([
      {
        kind: 'clip',
        id: 'clip-1',
        path: {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [30, 0] },
            { kind: 'line', to: [30, 20] },
            { kind: 'line', to: [0, 20] },
            { kind: 'close' },
          ],
          fillRule: 'nonzero',
        },
      },
    ]);
  });

  it('项目运行时 Scope 在混合的原始/回放引用、产物和边界之间进行转换', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'referencedWrapper',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('referencedWrapper') }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, node('target', [1, 0]));
        return {
          children: [
            context.createScope({ transforms: [{ kind: 'translate', x: 10, y: 0 }] }, [
              context.replay(laid),
              node('raw', [2, 0]),
            ]),
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: { id: 'raw', anchor: 'center' } },
                { type: 'step', kind: 'line', to: { id: 'target', anchor: 'center' } },
              ],
            },
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'referencedWrapper' }]), {
      composites: [definition],

      padding: 0,
    });
    const targetArtifact = sceneRectangles(result.scene).find(rectangle => rectangle.id === 'target');
    const rawArtifact = sceneRectangles(result.scene).find(rectangle => rectangle.id === 'raw');
    const wrapper = result.scene.primitives.find(primitive => primitive.type === 'group');
    const path = result.scene.primitives.find(primitive => primitive.type === 'path');
    const move = path?.type === 'path' ? path.commands.find(command => command.kind === 'move') : undefined;
    const line = path?.type === 'path' ? path.commands.find(command => command.kind === 'line') : undefined;

    expect(wrapper).toMatchObject({ transforms: [{ kind: 'translate', x: 10, y: 0 }] });
    expect(targetArtifact?.rect.x).toBe(11);
    expect(rawArtifact?.rect.x).toBe(12);
    expect(move).toMatchObject({ to: [12, 0] });
    expect(line).toMatchObject({ to: [11, 0] });
    expect(result.scene.layout).toEqual({ x: 7, y: -4, width: 9, height: 8 });
  });

  it('保留空的 id/meta 范围并将包装器排序为一个 zIndex 兄弟单元', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'emptyAndSorted',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('emptyAndSorted'),
      }),
      compile: (_value, context) => ({
        children: [
          context.createScope({ id: 'empty', meta: { empty: true } }, []),
          node('plain', [20, 0]),
          context.createScope({ id: 'late', zIndex: 5 }, [node('inside', [10, 0])]),
        ],
      }),
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'emptyAndSorted' }]), {
      composites: [definition],
    });

    expect(result.scene.primitives.at(-1)).toMatchObject({ type: 'group', id: 'late' });
    expect(groups(result.scene.primitives)).toContainEqual(
      expect.objectContaining({ type: 'group', id: 'empty', meta: { empty: true }, children: [] }),
    );
  });

  it('保留编写的 Scope 变换和完整的 Scope 字段', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'allFields',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('allFields') }),
      compile: (_value, context) => ({
        children: [
          context.createScope(
            {
              id: 'all',
              localNamespace: true,
              transforms: [{ kind: 'rotate', degrees: 30, pivot: [4, 5] }],
              position: { kind: 'anchor', target: [20, 30], selfAnchor: [4, 5] },
              clip: { kind: 'rect', params: { x: -20, y: -20, width: 40, height: 40 } },
              zIndex: 2,
              boundingShape: 'circle',
              meta: { role: 'all' },
              animations: [fade],

              defaults: {
                style: { fill: 'red' },
                node: {
                  style: { fill: 'white' },
                },
                reset: ['path'],
              },
            },
            [node('inside')],
          ),
        ],
      }),
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'allFields' }]), {
      composites: [definition],
    });

    expect(result.scene.primitives[0]).toMatchObject({
      type: 'group',
      id: 'all',
      meta: { role: 'all' },
      animations: [fade],
    });
    expect(result.scene.primitives[0]).toMatchObject({
      transforms: [
        { kind: 'translate', x: expect.any(Number), y: expect.any(Number) },
        { kind: 'rotate', degrees: 30, cx: 4, cy: 5 },
      ],
    });
  });

  it('将编写的 Scope 样式继承应用于 Core 内的回放子项', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'styledReplay',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('styledReplay') }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, node('replayed'));
        return {
          children: [
            context.createScope(
              {
                defaults: {
                  style: { color: 'red' },
                  node: {
                    shape: 'circle',
                    style: { fill: 'white' },
                  },
                  reset: true,
                },
              },
              [context.replay(laid)],
            ),
          ],
        };
      },
    });

    const result = compileToScene(
      scene([
        {
          type: 'scope',
          children: [{ namespace: 'test', type: 'styledReplay' }],
          defaults: { style: { color: 'blue' } },
        },
      ]),
      { composites: [definition], padding: 0 },
    );
    const leaves: Array<ScenePrimitive> = [];

    const visit = (primitive: ScenePrimitive): void => {
      if (primitive.type === 'group') primitive.children.forEach(visit);
      else leaves.push(primitive);
    };

    result.scene.primitives.forEach(visit);

    expect(leaves).toContainEqual(expect.objectContaining({ type: 'ellipse', fill: 'white', stroke: 'red' }));
    expect(leaves.some(primitive => primitive.type === 'rect')).toBe(false);
  });

  it('在回放 Scope 样式下重新物化嵌套的布局感知复合组件', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'styledReplayLeaf',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('styledReplayLeaf') }),
      compile: () => ({ children: [node('nested-replayed')] }),
    });
    const owner = defineComposite({
      namespace: 'test',
      type: 'styledReplayOwner',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('styledReplayOwner') }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'styledReplayLeaf' });
        return {
          children: [
            context.createScope(
              {
                defaults: { style: { fill: 'purple' } },
              },
              [context.replay(laid)],
            ),
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'styledReplayOwner' }]), {
      composites: [leaf, owner],
      padding: 0,
    });
    const rects: Array<ScenePrimitive> = [];

    const visit = (primitive: ScenePrimitive): void => {
      if (primitive.type === 'group') primitive.children.forEach(visit);
      else if (primitive.type === 'rect') rects.push(primitive);
    };

    result.scene.primitives.forEach(visit);

    expect(rects).toContainEqual(expect.objectContaining({ id: 'nested-replayed', fill: 'purple' }));
  });

  it('当通过兄弟包装分支到达时，拒绝相同的回放', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'duplicateWrappedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('duplicateWrappedReplay'),
      }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, node('once'));
        const replay = context.replay(laid);

        return {
          children: [context.createScope({ id: 'a' }, [replay]), context.createScope({ id: 'b' }, [replay])],
        };
      },
    });

    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'duplicateWrappedReplay' }]), {
        composites: [definition],
      }),
    ).toThrow(/replay.*once|already.*replay/i);
  });

  it('在有效回放可以发布警告或被使用之前预检整个输出树', () => {
    const warnings: Array<{ code: string }> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'wholeTreePreflight',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('wholeTreePreflight') }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, {
          type: 'node',
          id: 'same',
          position: [20, 0],
          text: [{ segments: [{ tex: 'x' }] }],
        });
        const replay = context.replay(laid);

        return {
          children: [replay, {} as CompositeCompileChild],
        };
      },
    });

    expect(() =>
      compileToScene(scene([node('same'), { namespace: 'test', type: 'wholeTreePreflight' }]), {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      }),
    ).toThrow(/output child|forged|belong/i);
    expect(warnings).toEqual([]);
  });

  it('在回放副作用变得可观察到之前预检嵌套运行时 Scope 裁剪', () => {
    let clipLowerCalls = 0;
    let replayHandle: CompositeCompileChild | undefined;
    let scopeHandle: CompositeCompileChild | undefined;
    let retainedResult: LayoutChildResult | undefined;
    const conditionalClip = defineClip({
      kind: 'conditionalPreflightClip',
      schema: strictObject({
        kind: literal('conditionalPreflightClip'),
        params: strictObject({
          fail: boolean(),
        }),
      }),

      lower: spec => {
        clipLowerCalls += 1;
        if (spec.params.fail) throw new Error('runtime Scope clip failed');
        {
          const params = { x: -10, y: -10, width: 20, height: 20 };
          return {
            commands: [
              { kind: 'move', to: [params.x, params.y] },
              { kind: 'line', to: [params.x + params.width, params.y] },
              { kind: 'line', to: [params.x + params.width, params.y + params.height] },
              { kind: 'line', to: [params.x, params.y + params.height] },
              { kind: 'close' },
            ],
            fillRule: 'nonzero',
          };
        }
      },
    });
    const artifactLeaf = defineComposite({
      namespace: 'test',
      type: 'preflightArtifactLeaf',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('preflightArtifactLeaf'),
      }),
      artifactSchema: strictObject({ candidate: literal(true) }),
      compile: () => ({
        children: [
          {
            type: 'scope',
            children: [
              {
                type: 'node',
                id: 'same',
                position: [20, 0],
                style: {
                  fill: {
                    kind: 'linearGradient',
                    stops: [
                      { offset: 0, color: '#000' },
                      { offset: 1, color: '#fff' },
                    ],
                  },
                },
              },
              node('same', [40, 0]),
            ],
          },
        ],
        artifact: { candidate: true },
      }),
    });
    const definition = defineComposite({
      namespace: 'test',
      type: 'nestedScopeClipPreflight',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('nestedScopeClipPreflight'),
        fail: boolean(),
      }),
      compile: (value, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'preflightArtifactLeaf' });
        retainedResult = laid;
        replayHandle = context.replay(laid);
        scopeHandle = context.createScope(
          { clip: { kind: 'conditionalPreflightClip', params: { fail: value.fail } } },
          [context.createScope({}, [])],
        );

        return {
          children: [replayHandle, scopeHandle],
        };
      },
    });
    const warnings: Array<{ code: string }> = [];
    const options = {
      composites: [artifactLeaf, definition],
      clips: [conditionalClip],

      onWarn: (warning: { code: string }): void => {
        warnings.push(warning);
      },
    };

    const failingIr = scene([{ namespace: 'test', type: 'nestedScopeClipPreflight', fail: true }]);
    const context = createFullCompileContext(failingIr, options);
    const namespaceStack = new NamespaceStack();
    const provenanceTracker = createCompileProvenanceTracker();
    const session: CompositeCompileSession = {
      measurements: new Map(),
      measurementIdentities: new WeakMap(),
      measurementPrimitiveIdentities: new Map(),
      nextMeasurementIdentity: 0,
      replayTransactions: new WeakMap(),
      layoutResults: new WeakMap(),
      outputChildren: new WeakMap(),
      failures: new WeakMap(),
    };

    expect(() =>
      compileChildrenToPrimitives(failingIr.children, context, {
        session,
        namespaceStack,
        provenanceTracker,
      }),
    ).toThrow(/runtime Scope clip failed/i);
    expect(warnings).toEqual([]);
    expect(clipLowerCalls).toBe(1);
    expect(context.workspace.diagnostics.warnings).toEqual([]);
    expect(context.workspace.paintRegistry.resources()).toEqual([]);
    expect(context.workspace.clipRegistry.resources()).toEqual([]);
    expect(namespaceStack.lookupEntry('same')?.layout).toBeUndefined();
    expect(provenanceTracker.rootIdentityRegistrations()).toEqual([]);
    expect(session.outputChildren.get(replayHandle!)).toMatchObject({ used: false });
    expect(session.outputChildren.get(scopeHandle!)).toMatchObject({ used: false });

    const transaction = session.replayTransactions.get(retainedResult!.replay);

    expect(transaction).toMatchObject({ used: false });
    expect(transaction?.primitives.length).toBeGreaterThan(0);
    expect(transaction?.resources.length).toBeGreaterThan(0);
    expect(transaction?.warnings.length).toBeGreaterThan(0);
    expect(transaction?.artifacts.length).toBeGreaterThan(0);
    expect(transaction?.namespaceChanges.length).toBeGreaterThan(0);
    expect(transaction?.topologyIdentityIds.length).toBeGreaterThan(0);

    const committed = compileToScene(
      scene([{ namespace: 'test', type: 'nestedScopeClipPreflight', fail: false }]),
      options,
    );

    expect(committed.scene.primitives).toHaveLength(2);
    expect(committed.scene.resources?.map(resource => resource.kind)).toEqual(['paint', 'clip']);
    expect(warnings.map(warning => warning.code)).toContain(BuiltinCompileWarningCode.DuplicateNodeId);
    expect(clipLowerCalls).toBe(2);
  });

  it('在全树预检期间拒绝重复的运行时 Scope 句柄', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'repeatedScopeHandle',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('repeatedScopeHandle') }),
      compile: (_value, context) => {
        const scope = context.createScope({ id: 'only-once' }, [node('inside')]);
        return { children: [scope, scope] };
      },
    });

    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'repeatedScopeHandle' }]), { composites: [definition] }),
    ).toThrow(/same output child|more than once|consum/i);
  });

  it('拒绝跨编译会话保留的句柄和布局结果', () => {
    let retainedHandle: CompositeCompileChild | undefined;
    let retainedResult: LayoutChildResult | undefined;
    let run = 0;
    const definition = defineComposite({
      namespace: 'test',
      type: 'retained',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('retained') }),
      compile: (_value, context) => {
        run += 1;
        if (run === 1) {
          retainedResult = resolvedResultOf(context, node('retained'));
          retainedHandle = context.replay(retainedResult);
          return { children: [] };
        }

        return {
          children: [retainedHandle ?? context.replay(retainedResult!)],
        };
      },
    });

    compileToScene(scene([{ namespace: 'test', type: 'retained' }]), { composites: [definition] });

    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'retained' }]), { composites: [definition] }),
    ).toThrow(/compile|session|forged|belong/i);
  });

  it('拒绝同一编译中另一个回调的输出句柄', () => {
    let foreignHandle: CompositeCompileChild | undefined;
    let foreignResult: LayoutChildResult | undefined;
    const producer = defineComposite({
      namespace: 'test',
      type: 'producer',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('producer') }),
      compile: (_value, context) => {
        foreignResult = resolvedResultOf(context, node('foreign'));
        foreignHandle = context.replay(foreignResult);
        return { children: [] };
      },
    });
    const consumer = defineComposite({
      namespace: 'test',
      type: 'consumer',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('consumer') }),
      compile: (_value, context) => ({
        children: [context.createScope({}, [foreignHandle ?? context.replay(foreignResult!)])],
      }),
    });

    expect(() =>
      compileToScene(
        scene([
          { namespace: 'test', type: 'producer' },
          { namespace: 'test', type: 'consumer' },
        ]),
        { composites: [producer, consumer] },
      ),
    ).toThrow(/does not belong to this composite callback|callback owner/i);
  });

  it('拒绝同一编译中另一个回调的布局结果', () => {
    let foreignResult: LayoutChildResult | undefined;
    const producer = defineComposite({
      namespace: 'test',
      type: 'resultProducer',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('resultProducer') }),
      compile: (_value, context) => {
        foreignResult = resolvedResultOf(context, node('foreign-result'));
        return { children: [] };
      },
    });
    const consumer = defineComposite({
      namespace: 'test',
      type: 'resultConsumer',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('resultConsumer') }),
      compile: (_value, context) => ({ children: [context.replay(foreignResult!)] }),
    });

    expect(() =>
      compileToScene(
        scene([
          { namespace: 'test', type: 'resultProducer' },
          { namespace: 'test', type: 'resultConsumer' },
        ]),
        { composites: [producer, consumer] },
      ),
    ).toThrow(/does not belong to this composite callback|callback owner/i);
  });

  it('拒绝伪造的输出子项和伪造的布局结果', () => {
    const forgedChild = defineComposite({
      namespace: 'test',
      type: 'forgedChild',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('forgedChild') }),
      compile: (_value, context) => ({
        children: [context.createScope({}, [{} as CompositeCompileChild])],
      }),
    });
    const forgedResult = defineComposite({
      namespace: 'test',
      type: 'forgedResult',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('forgedResult') }),
      compile: (_value, context) => ({
        children: [context.replay({} as LayoutChildResult)],
      }),
    });

    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'forgedChild' }]), { composites: [forgedChild] }),
    ).toThrow(/forged|output child|belong/i);
    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'forgedResult' }]), { composites: [forgedResult] }),
    ).toThrow(/layout|replay|forged|belong/i);
  });

  it('仅导入一次嵌套回放的绘制及裁剪资源并重映射图元引用', () => {
    const paint: IRPaint = {
      kind: 'linearGradient',
      stops: [
        { offset: 0, color: '#f00' },
        { offset: 1, color: '#00f' },
      ],
    };
    const definition = defineComposite({
      namespace: 'test',
      type: 'resourceWrapper',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('resourceWrapper') }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, {
          type: 'scope',
          clip: { kind: 'rect', params: { x: -20, y: -20, width: 40, height: 40 } },
          children: [{ ...node('resource'), fill: paint }],
        });
        return {
          children: [
            context.createScope({ clip: { kind: 'rect', params: { x: -10, y: -10, width: 20, height: 20 } } }, [
              context.createScope({}, [context.replay(laid)]),
            ]),
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'resourceWrapper' }]), {
      composites: [definition],
    });
    const resources = result.scene.resources ?? [];
    const ids = resources.map(resource => resource.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(resources.filter(resource => resource.kind === 'paint')).toHaveLength(1);
    expect(resources.filter(resource => resource.kind === 'clip')).toHaveLength(2);
    expect(groups(result.scene.primitives).filter(group => group.clipRef !== undefined)).toHaveLength(2);

    const serializedPrimitives = JSON.stringify(result.scene.primitives);

    for (const id of ids) expect(serializedPrimitives).toContain(id);
  });

  it('通过嵌套运行时范围从探测源重新调整回放产物', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'artifactLeaf',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('artifactLeaf') }),
      artifactSchema: strictObject({ leaf: literal(true) }),
      compile: () => ({ children: [node('artifact-node')], artifact: { leaf: true } }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'artifactParent',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('artifactParent') }),
      artifactSchema: strictObject({ parent: literal(true) }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, {
          type: 'scope',
          children: [{ namespace: 'test', type: 'artifactLeaf' }],
        });
        return {
          children: [context.createScope({ id: 'outer' }, [context.createScope({}, [context.replay(laid)])])],
          artifact: { parent: true },
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'artifactParent' }]), {
      composites: [leaf, parent],
    });
    const leafArtifact = result.artifacts.find(artifact => artifact.type === 'artifactLeaf');

    expect(leafArtifact?.occurrence.expansionPath).toEqual([
      { kind: 'output', index: 0 },
      { kind: 'scopeChild', index: 0 },
      { kind: 'replay', index: 0 },
      { kind: 'scopeChild', index: 0 },
    ]);
    expect(formatCompileOccurrence(leafArtifact!.occurrence)).toBe(
      'children[0]::output[0]::scopeChild[0]::replay[0]::scopeChild[0]',
    );
  });

  it('将回放的 id 保留在运行时本地命名空间内', () => {
    const warnings: Array<{ code: string }> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'localWrapper',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('localWrapper') }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, node('secret'));
        return {
          children: [
            context.createScope({ id: 'local', localNamespace: true }, [context.replay(laid)]),
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: { id: 'secret' } },
              ],
            },
          ],
        };
      },
    });

    compileToScene(scene([{ namespace: 'test', type: 'localWrapper' }]), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toContainEqual(
      expect.objectContaining({ code: BuiltinCompileWarningCode.UnresolvedNodeReference }),
    );
  });

  it('允许回放的 id 隐藏运行时本地命名空间内的外部 id', () => {
    const warnings: Array<{ code: string }> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'localShadowWrapper',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('localShadowWrapper') }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, node('shared', [10, 0]));
        return {
          children: [context.createScope({ id: 'local', localNamespace: true }, [context.replay(laid)])],
        };
      },
    });

    const result = compileToScene(scene([node('shared'), { namespace: 'test', type: 'localShadowWrapper' }]), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    expect(groups(result.scene.primitives)).toContainEqual(expect.objectContaining({ id: 'local' }));
    expect(warnings).not.toContainEqual(expect.objectContaining({ code: BuiltinCompileWarningCode.DuplicateNodeId }));
  });

  it('在抑制过时的父碰撞时保留探测本地重复警告', () => {
    const warnings: Array<{ code: string; message: string }> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'orderedDuplicateWrapper',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('orderedDuplicateWrapper') }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, {
          type: 'scope',
          children: [
            {
              type: 'scope',
              localNamespace: true,
              children: [node('shared'), node('shared', [2, 0])],
            },
            node('shared', [10, 0]),
          ],
        });
        return {
          children: [context.createScope({ localNamespace: true }, [context.replay(laid)])],
        };
      },
    });

    compileToScene(scene([node('shared'), { namespace: 'test', type: 'orderedDuplicateWrapper' }]), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    const duplicates = warnings.filter(warning => warning.code === BuiltinCompileWarningCode.DuplicateNodeId);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].message).toContain('under <Scope localNamespace>');
  });

  it('在构建器时分离每个可变包装器输入', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'detachedWrapper',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('detachedWrapper') }),
      compile: (_value, context) => {
        const transforms = [{ kind: 'translate' as const, x: 2, y: 3 }];
        const clip = { kind: 'rect' as const, params: { x: 0, y: 0, width: 20, height: 10 } };
        const meta = { role: 'original' };
        const animations = [{ ...fade, keyframes: fade.keyframes.map(frame => ({ ...frame })) }];
        const children: Array<IRChild | CompositeCompileChild> = [node('original')];
        const props = { id: 'detached', transforms, clip, meta, animations };
        const wrapper = context.createScope(props, children);

        transforms[0].x = 99;
        clip.params.width = 99;
        meta.role = 'mutated';
        animations[0].duration = 999;
        children[0] = node('mutated');
        props.id = 'mutated';

        return { children: [wrapper] };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'detachedWrapper' }]), {
      composites: [definition],
    });

    expect(result.scene.primitives[0]).toMatchObject({
      type: 'group',
      id: 'detached',
      transforms: [{ kind: 'translate', x: 2, y: 3 }],
      meta: { role: 'original' },
      animations: [expect.objectContaining({ duration: 200 })],
    });
    expect(JSON.stringify(result.scene.primitives)).toContain('original');
    expect(JSON.stringify(result.scene.primitives)).not.toContain('mutated');
  });

  it('保留类型化 Scope 与回放配置中可选字段的省略语义', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'optionalWrapperFields',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('optionalWrapperFields') }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, node('optional-fields'));
        return {
          children: [
            context.createScope({ id: undefined, defaults: { style: { fill: undefined } } }, [
              context.replay(laid, { transforms: [{ kind: 'scale', x: 1, y: undefined }], clip: undefined }),
            ]),
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'optionalWrapperFields' }]), {
      composites: [definition],
    });
    expect(JSON.stringify(result.scene.primitives).match(/optional-fields/g)).toHaveLength(1);
  });

  it('在父分配坐标裁剪之前应用回放放置，而不改变结果边界', () => {
    const BoundsSchema = strictObject({ x: number(), y: number(), width: number(), height: number() });
    const definition = defineComposite({
      namespace: 'test',
      type: 'replayCoordinateOrder',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('replayCoordinateOrder') }),
      artifactSchema: strictObject({ before: BoundsSchema, after: BoundsSchema }),
      compile: (_value, context) => {
        const laid = resolvedResultOf(context, node('coordinate-order'));
        const before = laid.visualBounds;
        const replay = context.replay(laid, {
          transforms: [{ kind: 'translate', x: 20, y: 0 }],
          clip: { kind: 'rect', params: { x: 18, y: -10, width: 4, height: 20 } },
        });

        return { children: [replay], artifact: { before, after: laid.visualBounds } };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'replayCoordinateOrder' }]), {
      composites: [definition],
      padding: 0,
    });
    const outer = result.scene.primitives[0];

    expect(outer).toMatchObject({ type: 'group', clipRef: 'clip-1' });
    expect(outer).not.toHaveProperty('transforms');

    if (outer.type !== 'group') throw new Error('expected replay clip group');

    expect(outer.children[0]).toMatchObject({
      type: 'group',
      transforms: [{ kind: 'translate', x: 20, y: 0 }],
    });

    const artifact = result.artifacts[0];

    expect(artifact.value.before).toEqual(artifact.value.after);
    expect(result.scene.layout).toEqual({ x: 18, y: -4.5, width: 4, height: 9 });
  });

  it('拒绝直接放置在运行时 Scope 输出中的丢弃布局结果', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'discardedResultScope',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('discardedResultScope') }),
      compile: (_value, context) => {
        const discarded = resolvedResultOf(context, node('discarded-result'));
        return { children: [context.createScope({}, [discarded as unknown as CompositeCompileChild])] };
      },
    });

    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'discardedResultScope' }]), { composites: [definition] }),
    ).toThrow(/invalid|forged|output child/i);
  });

  it('在一次编译中表达类似 Table 的根、Cell 放置、内容回放和边框回放', () => {
    const borderLeaf = defineComposite({
      namespace: 'test',
      type: 'borderLeaf',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('borderLeaf') }),
      artifactSchema: strictObject({ role: literal('border') }),
      compile: () => ({
        children: [
          {
            type: 'path',
            id: 'border',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [40, 0] },
            ],
          },
        ],
        artifact: { role: 'border' },
      }),
    });
    const definition = defineComposite({
      namespace: 'test',
      type: 'tableLike',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('tableLike') }),
      compile: (_value, context) => {
        const content = resolvedResultOf(context, node('content'), {
          x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 40 },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        });
        const border = resolvedResultOf(context, { namespace: 'test', type: 'borderLeaf' });
        const cell = context.createScope(
          {
            id: 'cell-0-0',
            clip: { kind: 'rect', params: { x: 0, y: 0, width: 40, height: 20 } },
            meta: { row: 0, column: 0 },
          },
          [context.createScope({ transforms: [{ kind: 'translate', x: 5, y: 6 }] }, [context.replay(content)])],
        );

        return {
          children: [
            context.createScope({ id: 'table-root', localNamespace: true }, [
              node('allocation-sentinel'),
              cell,
              context.replay(border),
            ]),
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'tableLike' }]), {
      composites: [borderLeaf, definition],
    });
    const root = result.scene.primitives[0];

    expect(root).toMatchObject({ type: 'group', id: 'table-root' });

    if (root.type !== 'group') throw new Error('expected table root group');

    expect(root.children).toHaveLength(3);
    expect(groups(root.children)).toContainEqual(
      expect.objectContaining({ type: 'group', id: 'cell-0-0', meta: { row: 0, column: 0 }, clipRef: 'clip-1' }),
    );
    expect(JSON.stringify(root.children).match(/content/g)).toHaveLength(1);
    expect(JSON.stringify(root.children).match(/border/g)).toHaveLength(1);

    const borderArtifact = result.artifacts[0];

    expect(formatCompileOccurrence(borderArtifact.occurrence)).toBe('children[0]::output[0]::replay[2]');
  });
});
