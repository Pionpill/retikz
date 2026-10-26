import type { IRChild, LayoutChildResult, LayoutProposal, ScenePrimitive, TranslateTransform } from '@retikz/core';
import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAlignmentGuideDimension,
  BuiltinLayoutAlignmentGuideName,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { boolean, literal, number, string } from 'zod';

import {
  createOverlayLayout,
  LayoutAlignment,
  LayoutItemKind,
  LayoutOverflow,
  LayoutSizeParticipation,
  OverlayLayoutDefinition,
  OverlayPlacementKind,
} from '../../src';

const LeafSchema = CompositeBaseSchema.extend({
  namespace: literal('overlay-test'),
  type: literal('leaf'),
  id: string(),
  width: number().nonnegative(),
  height: number().nonnegative(),
  minimumWidth: number().nonnegative().optional(),
  minimumHeight: number().nonnegative().optional(),
  originX: number().default(0),
  originY: number().default(0),
  firstBaseline: number().optional(),
  lastBaseline: number().optional(),
  failOnExactPair: boolean().default(false),
});

type ProbeLog = Readonly<{ id: string; proposal: LayoutProposal }>;

const axisSize = (proposal: LayoutProposal['x'], natural: number, minimum: number): number => {
  if (proposal.kind === LayoutAxisProposalKind.Exact) return proposal.value;
  if (proposal.kind === LayoutAxisProposalKind.Range) return Math.min(natural, proposal.max ?? natural);
  return proposal.mode === 'minimum' ? minimum : natural;
};

const createLeafDefinition = (logs: Array<ProbeLog>) =>
  defineComposite({
    namespace: 'overlay-test',
    type: 'leaf',
    schema: LeafSchema,
    compile: (node, context) => {
      logs.push({ id: node.id, proposal: context.proposal });
      if (
        node.failOnExactPair &&
        context.proposal.x.kind === LayoutAxisProposalKind.Exact &&
        context.proposal.y.kind === LayoutAxisProposalKind.Exact
      ) {
        throw new Error(`Leaf '${node.id}' rejected an exact proposal`);
      }

      const slotWidth = axisSize(context.proposal.x, node.width, node.minimumWidth ?? node.width);
      const slotHeight = axisSize(context.proposal.y, node.height, node.minimumHeight ?? node.height);

      return {
        allocationBounds: {
          x: node.originX,
          y: node.originY,
          width: context.proposal.x.kind === LayoutAxisProposalKind.Intrinsic ? slotWidth : node.width,
          height: context.proposal.y.kind === LayoutAxisProposalKind.Intrinsic ? slotHeight : node.height,
        },
        alignmentGuides: [
          ...(node.firstBaseline === undefined
            ? []
            : [
                {
                  name: BuiltinLayoutAlignmentGuideName.FirstBaseline,
                  dimension: LayoutAlignmentGuideDimension.Y,
                  position: node.firstBaseline,
                } as const,
              ]),
          ...(node.lastBaseline === undefined
            ? []
            : [
                {
                  name: BuiltinLayoutAlignmentGuideName.LastBaseline,
                  dimension: LayoutAlignmentGuideDimension.Y,
                  position: node.lastBaseline,
                } as const,
              ]),
        ],
        children: [context.createScope({ id: node.id, meta: { slotWidth, slotHeight } }, [])],
      };
    },
  });

const leaf = (
  id: string,
  width: number,
  height: number,
  options: Partial<{
    minimumWidth: number;
    minimumHeight: number;
    originX: number;
    originY: number;
    firstBaseline: number;
    lastBaseline: number;
    failOnExactPair: boolean;
  }> = {},
): IRChild => ({ namespace: 'overlay-test', type: 'leaf', id, width, height, ...options });

const exactProposal = (width: number, height: number): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Exact, value: width },
  y: { kind: LayoutAxisProposalKind.Exact, value: height },
});

const intrinsicProposal = (mode: 'minimum' | 'natural'): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode },
});

const compileOverlay = (child: IRChild, proposal: LayoutProposal) => {
  const logs: Array<ProbeLog> = [];
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'overlay-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: literal('overlay-test'),
      type: literal('harness'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);

      observed = probe.result;

      return { children: [context.replay(probe.result)] };
    },
  });
  const output = compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'overlay-test', type: 'harness', child }],
    },
    {
      composites: [OverlayLayoutDefinition, createLeafDefinition(logs), harness],
      padding: 0,
    },
  );
  if (observed === undefined) throw new Error('Expected OverlayLayout probe to resolve');

  return { logs, observed, output };
};

const groupsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<Extract<ScenePrimitive, { type: 'group' }>> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? [primitive, ...groupsOf(primitive.children)] : []));

const translationOf = (primitives: ReadonlyArray<ScenePrimitive>, id: string): Readonly<{ x: number; y: number }> => {
  const visit = (
    children: ReadonlyArray<ScenePrimitive>,
    x: number,
    y: number,
  ): Readonly<{ x: number; y: number }> | undefined => {
    for (const primitive of children) {
      if (primitive.type !== 'group') continue;

      const translations = (primitive.transforms ?? []).filter(
        (transform): transform is TranslateTransform => transform.kind === 'translate',
      );
      const nextX = x + translations.reduce((sum, transform) => sum + transform.x, 0);
      const nextY = y + translations.reduce((sum, transform) => sum + transform.y, 0);
      if (primitive.id === id) return { x: nextX, y: nextY };

      const nested = visit(primitive.children, nextX, nextY);
      if (nested !== undefined) return nested;
    }

    return undefined;
  };

  const found = visit(primitives, 0, 0);
  if (found === undefined) throw new Error(`Expected Scene group '${id}'`);

  return found;
};

describe('OverlayLayout 编译契约', () => {
  it('保持最小和自然对齐的轮廓清晰', () => {
    const overlay = createOverlayLayout({
      children: [
        {
          kind: LayoutItemKind.Overlay,
          key: 'profile',
          child: leaf('profile', 30, 20, { minimumWidth: 10, minimumHeight: 5 }),
        },
      ],
    });
    const minimum = compileOverlay(overlay, intrinsicProposal('minimum'));
    const natural = compileOverlay(overlay, intrinsicProposal('natural'));

    expect(minimum.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 10, height: 5 });
    expect(natural.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 30, height: 20 });
  });

  it('直接使用最终约束并仅测量缺失的定位尺寸', () => {
    const result = compileOverlay(
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 20 } },
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'aligned',
            child: leaf('aligned', 10, 5, { minimumWidth: 4, minimumHeight: 2 }),
            margin: 2,
          },
          {
            kind: LayoutItemKind.Overlay,
            key: 'positioned',
            child: leaf('positioned', 10, 5, { minimumWidth: 4, minimumHeight: 2 }),
            placement: { kind: OverlayPlacementKind.Positioned, at: { x: 0, y: 0 } },
          },
        ],
      }),
      exactProposal(40, 20),
    );

    expect(result.logs.filter(log => log.id === 'aligned').map(log => log.proposal)).toEqual([
      { x: { kind: 'range', min: 0, max: 36 }, y: { kind: 'range', min: 0, max: 16 } },
    ]);
    expect(result.logs.filter(log => log.id === 'positioned').map(log => log.proposal)).toEqual([
      intrinsicProposal('natural'),
      { x: { kind: 'exact', value: 10 }, y: { kind: 'intrinsic', mode: 'natural' } },
      exactProposal(10, 5),
    ]);
    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 40, height: 20 });
  });

  it('使用精确编写的定位尺寸来包含和排除项目', () => {
    const result = compileOverlay(
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 20 } },
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'include',
            child: leaf('include', 10, 5),
            placement: {
              kind: OverlayPlacementKind.Positioned,
              at: { x: 0, y: 0 },
              width: 8,
              height: 6,
            },
          },
          {
            kind: LayoutItemKind.Overlay,
            key: 'exclude',
            child: leaf('exclude', 10, 5),
            placement: {
              kind: OverlayPlacementKind.Positioned,
              at: { x: 0, y: 0 },
              width: 8,
              height: 6,
            },
            sizeParticipation: LayoutSizeParticipation.Exclude,
          },
        ],
      }),
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      },
    );
    const includeProposals = result.logs.filter(log => log.id === 'include').map(log => log.proposal);
    const excludeProposals = result.logs.filter(log => log.id === 'exclude').map(log => log.proposal);

    expect(includeProposals.length).toBeGreaterThan(0);
    for (const proposal of includeProposals) expect(proposal).toEqual(exactProposal(8, 6));
    expect(excludeProposals).toEqual(includeProposals);
  });

  it('将基线和定位的最小贡献与其自然轮廓分开', () => {
    const baseline = createOverlayLayout({
      alignItems: LayoutAlignment.FirstBaseline,
      children: [
        {
          kind: LayoutItemKind.Overlay,
          key: 'real',
          child: leaf('baseline-real', 10, 10, { minimumHeight: 4, firstBaseline: 3 }),
        },
        {
          kind: LayoutItemKind.Overlay,
          key: 'fallback',
          child: leaf('baseline-fallback', 10, 8, { minimumHeight: 2 }),
        },
      ],
    });
    const positioned = createOverlayLayout({
      children: [
        {
          kind: LayoutItemKind.Overlay,
          key: 'positioned',
          child: leaf('positioned-profile', 20, 5, { minimumWidth: 5, minimumHeight: 2 }),
          placement: {
            kind: OverlayPlacementKind.Positioned,
            at: { x: 10, y: 4 },
            anchor: { x: 0, y: 0 },
          },
        },
      ],
    });

    expect(compileOverlay(baseline, intrinsicProposal('minimum')).observed.allocationBounds.height).toBe(5);
    expect(compileOverlay(baseline, intrinsicProposal('natural')).observed.allocationBounds.height).toBe(11);
    expect(compileOverlay(positioned, intrinsicProposal('minimum')).observed.allocationBounds).toEqual({
      x: 0,
      y: 0,
      width: 15,
      height: 6,
    });
    expect(compileOverlay(positioned, intrinsicProposal('natural')).observed.allocationBounds).toEqual({
      x: 0,
      y: 0,
      width: 30,
      height: 9,
    });
  });

  it('使用定位正侧槽范围，不计算填充两次', () => {
    const result = compileOverlay(
      createOverlayLayout({
        padding: { top: 2, right: 4, bottom: 3, left: 5 },
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'badge',
            child: leaf('badge', 10, 4),
            margin: 1,
            placement: {
              kind: OverlayPlacementKind.Positioned,
              at: { x: 20, y: 10 },
              anchor: { x: 0.5, y: 0.5 },
            },
            offset: { x: 2, y: -1 },
          },
        ],
      }),
      intrinsicProposal('natural'),
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 37, height: 17 });
    expect(translationOf(result.output.scene.primitives, 'badge')).toEqual({ x: 22, y: 9 });
  });

  it('exclude 条目不计入内容尺寸但仍参与探测和回放', () => {
    const result = compileOverlay(
      createOverlayLayout({
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'floating',
            child: leaf('floating', 100, 50),
            sizeParticipation: LayoutSizeParticipation.Exclude,
          },
        ],
      }),
      intrinsicProposal('natural'),
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(groupsOf(result.output.scene.primitives).filter(group => group.id === 'floating')).toHaveLength(1);
    expect(result.logs.at(-1)?.id).toBe('floating');
  });

  it('将实际、回退和排除第一基线项目与一个包含目标对齐', () => {
    const result = compileOverlay(
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 60 }, y: { kind: 'content' } },
        justifyItems: LayoutAlignment.Start,
        alignItems: LayoutAlignment.FirstBaseline,
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'real',
            child: leaf('real', 20, 10, { firstBaseline: 7 }),
          },
          { kind: LayoutItemKind.Overlay, key: 'fallback', child: leaf('fallback', 20, 15) },
          {
            kind: LayoutItemKind.Overlay,
            key: 'exclude',
            child: leaf('exclude', 20, 5, { firstBaseline: 2 }),
            sizeParticipation: LayoutSizeParticipation.Exclude,
          },
        ],
      }),
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 60 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      },
    );

    expect(result.observed.allocationBounds.height).toBe(22);
    expect(translationOf(result.output.scene.primitives, 'real')).toEqual({ x: 0, y: 0 });
    expect(translationOf(result.output.scene.primitives, 'fallback')).toEqual({ x: 0, y: 7 });
    expect(translationOf(result.output.scene.primitives, 'exclude')).toEqual({ x: 0, y: 5 });
    expect(result.observed.alignmentGuides?.find(guide => guide.name === 'first-baseline')?.position).toBe(7);
  });

  it('当每个对齐的子项都忽略它们时，使用编写的包含边缘作为传出辅助线', () => {
    const result = compileOverlay(
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 40 } },
        children: [
          { kind: LayoutItemKind.Overlay, key: 'first', child: leaf('first', 10, 10) },
          { kind: LayoutItemKind.Overlay, key: 'last', child: leaf('last', 10, 20) },
          {
            kind: LayoutItemKind.Overlay,
            key: 'positioned',
            child: leaf('positioned-guide', 1, 1, { firstBaseline: 99, lastBaseline: 99 }),
            placement: { kind: OverlayPlacementKind.Positioned, at: { x: 0, y: 0 } },
          },
          {
            kind: LayoutItemKind.Overlay,
            key: 'exclude',
            child: leaf('exclude-guide', 1, 1, { firstBaseline: 99, lastBaseline: 99 }),
            sizeParticipation: LayoutSizeParticipation.Exclude,
          },
        ],
      }),
      exactProposal(20, 40),
    );

    expect(result.observed.alignmentGuides).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 15 },
      { name: 'last-baseline', dimension: 'y', position: 30 },
    ]);
  });

  it('独立于边距锚定定位槽并补偿分配源', () => {
    const result = compileOverlay(
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 50 } },
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'positioned',
            child: leaf('positioned', 30, 10, { originX: -5, originY: 2 }),
            margin: 20,
            placement: {
              kind: OverlayPlacementKind.Positioned,
              at: { x: 50, y: 20 },
              anchor: { x: 0.5, y: 0.5 },
              width: 20,
              height: 10,
            },
            offset: { x: 2, y: -1 },
            justifySelf: LayoutAlignment.End,
            alignSelf: LayoutAlignment.Start,
          },
        ],
      }),
      exactProposal(100, 50),
    );

    expect(result.logs.at(-1)?.proposal).toEqual(exactProposal(20, 10));
    expect(translationOf(result.output.scene.primitives, 'positioned')).toEqual({ x: 37, y: 12 });
  });

  it('以稳定的 zIndex 和编写的平局顺序发出项目范围', () => {
    const result = compileOverlay(
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 10 }, y: { kind: 'fixed', value: 10 } },
        children: [
          { kind: LayoutItemKind.Overlay, key: 'a', child: leaf('a', 1, 1), zIndex: 2 },
          { kind: LayoutItemKind.Overlay, key: 'b', child: leaf('b', 1, 1), zIndex: -1 },
          { kind: LayoutItemKind.Overlay, key: 'c', child: leaf('c', 1, 1), zIndex: 2 },
        ],
      }),
      exactProposal(10, 10),
    );

    expect(
      groupsOf(result.output.scene.primitives)
        .filter(group => ['a', 'b', 'c'].includes(group.id ?? ''))
        .map(group => group.id),
    ).toEqual(['b', 'a', 'c']);
  });

  it('引发选定的排除最终失败，而不是回放早期的探测', () => {
    expect(() =>
      compileOverlay(
        createOverlayLayout({
          size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 10 } },
          children: [
            {
              kind: LayoutItemKind.Overlay,
              key: 'failure',
              child: leaf('failure', 20, 10, { failOnExactPair: true }),
              sizeParticipation: LayoutSizeParticipation.Exclude,
              justifySelf: LayoutAlignment.Stretch,
              alignSelf: LayoutAlignment.Stretch,
            },
          ],
        }),
        exactProposal(20, 10),
      ),
    ).toThrow(/rejected an exact proposal/);
  });

  it('用矩形裁剪零区域容器，同时保留最终回放', () => {
    const result = compileOverlay(
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 0 }, y: { kind: 'fixed', value: 10 } },
        overflow: LayoutOverflow.Clip,
        children: [
          {
            kind: LayoutItemKind.Overlay,
            key: 'child',
            child: leaf('child', 10, 10),
            sizeParticipation: LayoutSizeParticipation.Exclude,
          },
        ],
      }),
      exactProposal(0, 10),
    );

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 0, height: 10 });
    expect(
      (result.output.scene.resources ?? []).some(
        resource => resource.kind === 'clip' && resource.path.commands.length > 0,
      ),
    ).toBe(true);
    expect(translationOf(result.output.scene.primitives, 'child')).toBeDefined();
  });

  it('通过相同的自定义组合注册表支持嵌套 OverlayLayout', () => {
    const inner = createOverlayLayout({
      size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 10 } },
      children: [{ kind: LayoutItemKind.Overlay, key: 'leaf', child: leaf('nested-leaf', 20, 10) }],
    });
    const result = compileOverlay(
      createOverlayLayout({
        size: { x: { kind: 'fixed', value: 40 }, y: { kind: 'fixed', value: 20 } },
        children: [{ kind: LayoutItemKind.Overlay, key: 'inner', child: inner }],
      }),
      exactProposal(40, 20),
    );

    expect(translationOf(result.output.scene.primitives, 'nested-leaf')).toEqual({ x: 10, y: 5 });
  });

  it('当根填充没有有限的父分配时，物理轴会明确报错', () => {
    const proposal = intrinsicProposal('natural');

    expect(() => compileOverlay(createOverlayLayout({ size: { x: { kind: 'fill' } } }), proposal)).toThrow(
      'Layout fill requires a finite parent allocation on x',
    );
    expect(() => compileOverlay(createOverlayLayout({ size: { y: { kind: 'fill' } } }), proposal)).toThrow(
      'Layout fill requires a finite parent allocation on y',
    );
  });
});
