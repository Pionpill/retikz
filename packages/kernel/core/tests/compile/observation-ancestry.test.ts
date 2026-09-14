import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { CompileObservation, CompileObservationSite, CompileOptions, IRScene } from '../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
  observeCompileToScene,
} from '../../src';

const capture = (
  children: IRScene['children'],
  options: CompileOptions = {},
  select: (site: CompileObservationSite) => boolean = () => true,
) => {
  const observations: Array<CompileObservation> = [];
  let completes = 0;
  const source: IRScene = { version: 1, type: 'scene', children };
  const observed = observeCompileToScene(source, options, [
    {
      key: 'test/final-tree',
      createSession: () => ({
        select,
        observe: observation => observations.push(observation),
        complete: () => {
          completes += 1;
          return observations.length;
        },
      }),
    },
  ]);
  return { source, observed, observations, completes };
};

describe('最终观测树', () => {
  it('replay wrapper 包装多个顶层 primitive 仍只有一次 Clip 观测', () => {
    const pair = defineComposite({
      namespace: 'test',
      type: 'pair',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('pair') }),
      expand: () => ({
        children: [
          { type: 'node', position: [0, 0], text: 'A' },
          { type: 'node', position: [40, 0], text: 'B' },
        ],
      }),
    });
    const wrapper = defineComposite({
      namespace: 'test',
      type: 'clip-pair',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('clip-pair') }),
      compile: (_, context) => {
        const laid = context.layoutChild({ namespace: 'test', type: 'pair' }, NaturalLayoutProposal);
        if (laid.kind === LayoutChildProbeKind.Failed) return context.raise(laid.failure);
        return {
          children: [
            context.replay(laid.result, {
              transforms: [{ kind: 'translate', x: 15, y: 20 }],
              clip: { kind: 'rect', x: 0, y: 0, width: 60, height: 60 },
            }),
          ],
        };
      },
    });
    const { source, observed, observations } = capture([{ namespace: 'test', type: 'clip-pair' }], {
      composites: [wrapper, pair],
    });
    expect(observed.primary.scene.primitives).toHaveLength(2);
    const clips = observations.filter(observation => observation.owner.kind === 'clip');
    expect(clips).toHaveLength(1);
    expect(clips[0]?.transform).toEqual([1, 0, 0, 1, 0, 0]);
    const nodes = observations.filter(observation => observation.owner.kind === 'node');
    expect(nodes).toHaveLength(2);
    expect(nodes.map(observation => observation.ancestors.map(ancestor => ancestor.owner))).toEqual([
      [
        { kind: 'composite', namespace: 'test', type: 'clip-pair' },
        { kind: 'composite', namespace: 'test', type: 'pair' },
      ],
      [
        { kind: 'composite', namespace: 'test', type: 'clip-pair' },
        { kind: 'composite', namespace: 'test', type: 'pair' },
      ],
    ]);
    expect(observed.primary).toEqual(compileToScene(source, { composites: [wrapper, pair] }));
  });
  it('未选中的 Scope 仍作为 Coordinate 的祖先，且自己的变换只应用一次', () => {
    const { observations, completes } = capture(
      [
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 20, y: 30 }],
          children: [
            {
              type: 'scope',
              transforms: [{ kind: 'scale', x: 2, y: 3 }],
              children: [{ type: 'coordinate', id: 'point', position: [4, 5] }],
            },
          ],
        },
      ],
      {},
      site => site.owner.kind === 'coordinate',
    );
    expect(completes).toBe(1);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      owner: { kind: 'coordinate' },
      value: { id: 'point', position: [4, 5] },
      transform: [2, 0, 0, 3, 20, 30],
      ancestors: [
        { owner: { kind: 'scope' }, occurrence: { sourcePath: 'children[0].scope', expansionPath: [] } },
        {
          owner: { kind: 'scope' },
          occurrence: { sourcePath: 'children[0].scope.children[0].scope', expansionPath: [] },
        },
      ],
    });
    expect(Object.isFrozen(observations[0]?.ancestors)).toBe(true);
    expect(Object.isFrozen(observations[0]?.ancestors[0]?.occurrence)).toBe(true);
  });

  it('没有 artifact 的展开 Composite 保留结构归属，空 Scope 仍可观测', () => {
    const expansion = defineComposite({
      namespace: 'test',
      type: 'empty-containers',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('empty-containers') }),
      expand: () => ({
        children: [{ type: 'scope', children: [{ type: 'scope', children: [] }] }],
      }),
    });
    const { observations } = capture([{ namespace: 'test', type: 'empty-containers' }], { composites: [expansion] });
    expect(observations.map(observation => observation.owner.kind)).toEqual(['scope', 'scope']);
    expect(observations.map(observation => observation.value)).toEqual([{ envelope: null }, { envelope: null }]);
    expect(observations[0]?.ancestors).toEqual([
      {
        owner: { kind: 'composite', namespace: 'test', type: 'empty-containers' },
        occurrence: { sourcePath: 'children[0]', expansionPath: [] },
      },
    ]);
    expect(observations[1]?.ancestors).toEqual([
      ...observations[0].ancestors,
      { owner: { kind: 'scope' }, occurrence: observations[0].occurrence },
    ]);
    expect(observations[1]?.ancestors).not.toContainEqual({
      owner: { kind: 'scope' },
      occurrence: observations[1]?.occurrence,
    });
  });

  it('Path-only Scope 不伪造节点布局包络', () => {
    const { observations } = capture([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 25, y: -15 }],
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 100] },
            ],
          },
        ],
      },
    ]);
    const scope = observations.find(observation => observation.owner.kind === 'scope');
    const path = observations.find(observation => observation.owner.kind === 'path');
    expect(scope?.value).toEqual({ envelope: null });
    expect(scope?.transform).toEqual([1, 0, 0, 1, 25, -15]);
    expect(path?.ancestors).toEqual([{ owner: { kind: 'scope' }, occurrence: scope?.occurrence }]);
  });

  it('几何相同的 Scope clip 按逻辑应用分别发布，开启观测不改变 primary', () => {
    const clip = { kind: 'rect', x: 0, y: 0, width: 80, height: 50 };
    const { source, observed, observations } = capture([
      {
        type: 'scope',
        clip,
        transforms: [{ kind: 'translate', x: 10, y: 20 }],
        children: [{ type: 'node', position: [10, 10], text: 'one' }],
      },
      {
        type: 'scope',
        clip,
        transforms: [{ kind: 'translate', x: 110, y: 20 }],
        children: [{ type: 'node', position: [10, 10], text: 'two' }],
      },
    ]);
    const clips = observations.filter(observation => observation.owner.kind === 'clip');
    expect(clips).toHaveLength(2);
    expect(clips[0]?.value).toEqual(clips[1]?.value);
    expect(clips.map(observation => observation.transform)).toEqual([
      [1, 0, 0, 1, 10, 20],
      [1, 0, 0, 1, 110, 20],
    ]);
    for (const clipObservation of clips) {
      expect(clipObservation.occurrence.expansionPath.at(-1)).toEqual({ kind: 'clip', index: 0 });
      expect(clipObservation.provenance.final).toEqual(clipObservation.occurrence);
      expect(clipObservation.ancestors.at(-1)?.owner).toEqual({ kind: 'scope' });
    }
    const ordinary = compileToScene(source);
    expect(observed.primary).toEqual(ordinary);
  });

  it('replay 只提交选中的候选并重建实际祖先，wrapper clip 不重复乘子内容 placement', () => {
    const replayed = defineComposite({
      namespace: 'test',
      type: 'replay-tree',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('replay-tree') }),
      compile: (_, context) => {
        context.layoutChild({ type: 'node', position: [0, 0], text: 'discarded' }, NaturalLayoutProposal);
        const selected = context.layoutChild(
          {
            type: 'scope',
            children: [
              { type: 'node', position: [0, 0], text: 'first' },
              { type: 'node', position: [50, 0], text: 'second' },
            ],
          },
          NaturalLayoutProposal,
        );
        if (selected.kind === LayoutChildProbeKind.Failed) return context.raise(selected.failure);
        return {
          children: [
            context.scope({ transforms: [{ kind: 'translate', x: 20, y: 30 }] }, [
              context.replay(selected.result, {
                transforms: [{ kind: 'translate', x: 100, y: 200 }],
                clip: { kind: 'rect', x: 90, y: 190, width: 100, height: 40 },
              }),
            ]),
          ],
        };
      },
    });
    const { source, observed, observations } = capture([{ namespace: 'test', type: 'replay-tree' }], {
      composites: [replayed],
    });
    const nodes = observations.filter(observation => observation.owner.kind === 'node');
    const scopes = observations.filter(observation => observation.owner.kind === 'scope');
    const clips = observations.filter(observation => observation.owner.kind === 'clip');
    expect(nodes).toHaveLength(2);
    expect(scopes).toHaveLength(2);
    expect(clips).toHaveLength(1);
    expect(clips[0]?.transform).toEqual([1, 0, 0, 1, 20, 30]);
    expect(nodes.map(observation => observation.transform)).toEqual([
      [1, 0, 0, 1, 120, 230],
      [1, 0, 0, 1, 120, 230],
    ]);
    const outerScope = scopes.find(observation => observation.ancestors.length === 1);
    const innerScope = scopes.find(observation => observation.ancestors.length === 2);
    expect(outerScope).toBeDefined();
    expect(innerScope).toBeDefined();
    for (const observation of nodes) {
      expect(observation.ancestors).toEqual([
        {
          owner: { kind: 'composite', namespace: 'test', type: 'replay-tree' },
          occurrence: { sourcePath: 'children[0]', expansionPath: [] },
        },
        { owner: { kind: 'scope' }, occurrence: outerScope?.occurrence },
        { owner: { kind: 'scope' }, occurrence: innerScope?.occurrence },
      ]);
      expect(observation.provenance.origin).not.toEqual(observation.provenance.final);
      expect(observation.occurrence.expansionPath.some(segment => segment.kind === 'probe')).toBe(false);
    }
    expect(clips[0]?.ancestors).toEqual(innerScope?.ancestors);
    expect(observed.primary).toEqual(compileToScene(source, { composites: [replayed] }));
  });
});
