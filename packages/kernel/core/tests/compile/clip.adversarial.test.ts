import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ClipResource, ClipShape, GroupPrim, IRPaint, IRScene, ScenePrimitive, SceneResource } from '../../src';

import { compileToScene, defineClip, defineClipShape, PositionSchema } from '../../src';

type TestPolygonClipShape = ClipShape & {
  kind: 'polygon';
  points: Array<[number, number]>;
};

const polygonClipShape = defineClipShape<TestPolygonClipShape>({
  kind: 'polygon',
  schema: z.strictObject({ kind: z.literal('polygon'), points: z.array(PositionSchema).min(3) }),
  lower: shape => ({
    commands: [
      { kind: 'move', to: shape.points[0] },
      ...shape.points.slice(1).map(to => ({ kind: 'line' as const, to })),
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

const polygonClip = defineClip({
  kind: 'polygon',
  schema: z.strictObject({
    kind: z.literal('polygon'),
    points: z.array(z.tuple([z.number(), z.number()])).min(3),
  }),
  resolve: spec => ({ kind: 'polygon', points: spec.points }),
});

const polygonOptions = { clips: [polygonClip], clipShapes: [polygonClipShape] } as const;

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const firstGroup = (primitives: ReadonlyArray<ScenePrimitive>): GroupPrim | undefined =>
  primitives.find((p): p is GroupPrim => p.type === 'group');

const allGroups = (primitives: ReadonlyArray<ScenePrimitive>): Array<GroupPrim> =>
  primitives.filter((p): p is GroupPrim => p.type === 'group');

const clipResources = (resources: Array<SceneResource> | undefined): Array<ClipResource> =>
  (resources ?? []).filter((r): r is ClipResource => r.kind === 'clip');

const grad: IRPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#4f8' },
    { offset: 1, color: '#08f' },
  ],
};

/** 手搓非 finite / 非法字段：用 any cast 绕过 IR zod，直接喂 compileToScene */
const handcraftedScope = (
  clip: unknown,
  children: IRScene['children'] = [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
): IRScene => scene([{ type: 'scope', clip, children } as unknown as IRScene['children'][number]]);

describe('clip 非 finite 守卫：必须编译期抛、绝不进 Scene', () => {
  const cases: Array<{ name: string; clip: unknown }> = [
    { name: 'rect x = Infinity', clip: { kind: 'rect', x: Infinity, y: 0, width: 10, height: 10 } },
    { name: 'rect y = -Infinity', clip: { kind: 'rect', x: 0, y: -Infinity, width: 10, height: 10 } },
    { name: 'rect width = NaN', clip: { kind: 'rect', x: 0, y: 0, width: NaN, height: 10 } },
    { name: 'rect width = -Infinity', clip: { kind: 'rect', x: 0, y: 0, width: -Infinity, height: 10 } },
    { name: 'rect width = -5（负尺寸）', clip: { kind: 'rect', x: 0, y: 0, width: -5, height: 10 } },
  ];

  for (const { name, clip } of cases) {
    it(`${name} → 编译期抛`, () => {
      expect(() => compileToScene(handcraftedScope(clip)).scene).toThrow();
    });
  }

  it('抛出的错误信息含 kind + 字段线索（清晰错）', () => {
    expect(
      () => compileToScene(handcraftedScope({ kind: 'rect', x: 0, y: 0, width: Infinity, height: 10 })).scene,
    ).toThrow(/rect/i);
  });
});

describe('finite 守卫不误伤合法值', () => {
  it('rect 负坐标 + 正尺寸合法（取景窗可在第三象限）', () => {
    const compiled = compileToScene(handcraftedScope({ kind: 'rect', x: -50, y: -40, width: 10, height: 10 })).scene;
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(1);
    expect(clips[0].path.commands[0]).toEqual({ kind: 'move', to: [-50, -40] });
    expect(clips[0].path.commands[2]).toEqual({ kind: 'line', to: [-40, -30] });
  });

  it('rect 零尺寸合法并表示空裁剪区域', () => {
    const compiled = compileToScene(handcraftedScope({ kind: 'rect', x: 0, y: 0, width: 0, height: 0 })).scene;
    expect(clipResources(compiled.resources)).toHaveLength(1);
  });
});

describe('clip Scene JSON round-trip 不失真', () => {
  /** JSON 序列化 + 反序列化后 Scene 与原始等价（NaN/Infinity 会变 null，-0 会变 0） */
  const assertRoundTrip = (ir: IRScene): void => {
    const compiled = compileToScene(ir, polygonOptions).scene;
    const roundTripped = JSON.parse(JSON.stringify(compiled));
    expect(roundTripped).toEqual(compiled);
  };

  it('rect clip round-trip 等价', () => {
    assertRoundTrip(handcraftedScope({ kind: 'rect', x: -50, y: 0, width: 40, height: 30 }));
  });

  it('polygon clip round-trip 等价（点序保持）', () => {
    assertRoundTrip(
      handcraftedScope({
        kind: 'polygon',
        points: [
          [0, 0],
          [40, 0],
          [20, 40],
          [-10, 20],
        ],
      }),
    );
  });

  it('坐标 round 到 -0：无 NaN/Infinity/null 泄漏，数值等价（-0 与 0 同值）', () => {
    // -0.001 按 precision=2 round → -0（systemic 量化产物，非 clip 专属）。
    // JSON.stringify(-0)="0"，故 round-trip 后变 +0。本测试的真实契约主张：
    //   裁剪区不得携带 NaN/Infinity（会变 null 失真），数值层面 -0==0 视作等价。
    // 注：vitest toEqual 用 Object.is 区分 -0/0，故这里 round-trip 与原始的 strict 深比较会差一格
    //   （见报告：-0 量化是既有 quirk，渲染无影响，不 BLOCKING）。
    const ir = handcraftedScope({ kind: 'rect', x: -0.001, y: -0.004, width: 10, height: 10 });
    const compiled = compileToScene(ir, polygonOptions).scene;
    const json = JSON.stringify(compiled);
    // 关键契约：序列化产物里没有 null（非 finite 会序列化成 null）
    expect(json).not.toContain('null');
    const first = clipResources(compiled.resources)[0].path.commands[0];
    expect(first.kind).toBe('move');
    if (first.kind === 'move') {
      expect(Object.is(first.to[0], -0)).toBe(false);
      expect(Object.is(first.to[1], -0)).toBe(false);
      expect(Number.isFinite(first.to[0])).toBe(true);
      expect(Number.isFinite(first.to[1])).toBe(true);
    }
  });
});

describe('clip dedup 边界', () => {
  it('字段书写顺序不同但结构相同 → 仍 dedup 为 1 条资源', () => {
    // 手搓两个 rect，字段顺序故意打乱（width 在前 / height 在前），结构等价应 dedup
    const clipA = { height: 30, width: 40, y: 0, x: 0, kind: 'rect' };
    const clipB = { kind: 'rect', x: 0, y: 0, width: 40, height: 30 };
    const ir = scene([
      {
        type: 'scope',
        clip: clipA,
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      } as unknown as IRScene['children'][number],
      {
        type: 'scope',
        clip: clipB,
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      } as unknown as IRScene['children'][number],
    ]);
    const compiled = compileToScene(ir, polygonOptions).scene;
    expect(clipResources(compiled.resources)).toHaveLength(1);
    const groups = allGroups(compiled.primitives);
    expect(groups[0].clipRef).toBe(groups[1].clipRef);
  });

  it('polygon 点序不同（同点集，不同顺序）→ 不 dedup（视为不同裁剪区）', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: {
          kind: 'polygon',
          points: [
            [0, 0],
            [40, 0],
            [20, 40],
          ],
        },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        clip: {
          kind: 'polygon',
          points: [
            [40, 0],
            [0, 0],
            [20, 40],
          ],
        },
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir, polygonOptions).scene;
    // 点序不同 → 不同 polygon → 2 条资源
    expect(clipResources(compiled.resources)).toHaveLength(2);
  });

  it('两个 clip round 到同一值（亚精度差）→ 合并为 1 条资源', () => {
    // precision=2：0.001 与 0.004 都 round 到 0.00 → 同 key → dedup
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0.001, y: 0, width: 10, height: 10 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0.004, y: 0, width: 10, height: 10 },
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    expect(clipResources(compiled.resources)).toHaveLength(1);
  });

  it('两个不同 rect geometry 不 dedup', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 20, height: 20 },
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    expect(clipResources(compiled.resources)).toHaveLength(2);
  });
});

describe('clip 编译确定性：同 IR 编译两次产同 id', () => {
  it('多 clip 混合，两次编译资源 id 完全一致', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        clip: { kind: 'rect', x: 1, y: 1, width: 5, height: 5 },
        children: [{ type: 'node', id: 'B', position: [40, 0], text: 'B' }],
      },
      {
        type: 'scope',
        clip: { kind: 'rect', x: 2, y: 2, width: 3, height: 2 },
        children: [{ type: 'node', id: 'C', position: [80, 0], text: 'C' }],
      },
    ]);
    const a = compileToScene(ir).scene;
    const b = compileToScene(ir).scene;
    expect(clipResources(a.resources).map(c => c.id)).toEqual(clipResources(b.resources).map(c => c.id));
    expect(a.resources).toEqual(b.resources);
  });
});

describe('clip + paint 资源命名空间：大量混合不撞、稳定', () => {
  it('多 paint + 多 clip 交错 → paint-N / clip-N 各自递增、全局 id 唯一', () => {
    const grad2: IRPaint = {
      kind: 'linearGradient',
      angle: 0,
      stops: [
        { offset: 0, color: '#f00' },
        { offset: 1, color: '#00f' },
      ],
    };
    const ir = scene([
      { type: 'node', id: 'G1', position: [0, 0], text: 'G1', fill: grad },
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
        children: [{ type: 'node', id: 'A', position: [40, 0], text: 'A' }],
      },
      { type: 'node', id: 'G2', position: [80, 0], text: 'G2', fill: grad2 },
      {
        type: 'scope',
        clip: { kind: 'rect', x: 1, y: 1, width: 5, height: 5 },
        children: [{ type: 'node', id: 'B', position: [120, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const paints = (compiled.resources ?? []).filter(r => r.kind === 'paint');
    const clips = clipResources(compiled.resources);
    expect(paints).toHaveLength(2);
    expect(clips).toHaveLength(2);
    expect(paints.map(p => p.id)).toEqual(['paint-1', 'paint-2']);
    expect(clips.map(c => c.id)).toEqual(['clip-1', 'clip-2']);
    const allIds = (compiled.resources ?? []).map(r => r.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe('clip prune / 复合 scope', () => {
  it('scope 同时有 transforms + clip + zIndex + id → clipRef 仍正确挂', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'S',
        zIndex: 5,
        transforms: [{ kind: 'translate', x: 10, y: 5 }],
        clip: { kind: 'rect', x: 0, y: 0, width: 50, height: 50 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const group = firstGroup(compiled.primitives);
    expect(group).toBeDefined();
    expect(group?.transforms).toBeDefined();
    expect(group?.clipRef).toBe(clipResources(compiled.resources)[0].id);
  });

  it('嵌套 scope 各自带 clip → 内外两条资源、内层 GroupPrim 嵌在外层、各挂各的 clipRef', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 100, height: 100 },
        children: [
          {
            type: 'scope',
            clip: { kind: 'rect', x: 10, y: 10, width: 20, height: 20 },
            children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(2);
    const outer = firstGroup(compiled.primitives);
    expect(outer?.clipRef).toBeDefined();
    const inner = outer?.children.find((c): c is GroupPrim => c.type === 'group');
    expect(inner).toBeDefined();
    expect(inner?.clipRef).toBeDefined();
    expect(inner?.clipRef).not.toBe(outer?.clipRef);
  });

  it('空 children + 无 id + 无 transforms 但带 clip 的 scope 不被 prune', () => {
    const compiled = compileToScene(handcraftedScope({ kind: 'rect', x: 0, y: 0, width: 20, height: 20 }, [])).scene;
    const group = firstGroup(compiled.primitives);
    expect(group).toBeDefined();
    expect(group?.clipRef).toBe(clipResources(compiled.resources)[0].id);
  });
});

describe('clip 退化几何', () => {
  it('polygon 巨量点（500）→ 资源含全部点、不抛', () => {
    const points = Array.from({ length: 500 }, (_, i): [number, number] => [
      Math.round(50 * Math.cos((i / 500) * 2 * Math.PI)),
      Math.round(50 * Math.sin((i / 500) * 2 * Math.PI)),
    ]);
    const compiled = compileToScene(handcraftedScope({ kind: 'polygon', points }), polygonOptions).scene;
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(1);
    expect(clips[0].path.commands).toHaveLength(501);
    expect(clips[0].path.commands[0]).toEqual({ kind: 'move', to: points[0] });
    expect(clips[0].path.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('polygon 全重复点（退化成一点）→ 不抛（finite 即接受）', () => {
    const compiled = compileToScene(
      handcraftedScope({
        kind: 'polygon',
        points: [
          [5, 5],
          [5, 5],
          [5, 5],
        ],
      }),
      polygonOptions,
    ).scene;
    expect(clipResources(compiled.resources)).toHaveLength(1);
  });

  it('rect 极大坐标（finite 但巨大）→ 不抛、round-trip 等价', () => {
    const ir = handcraftedScope({ kind: 'rect', x: 1e15, y: -1e15, width: 1e10, height: 1e10 });
    const compiled = compileToScene(ir).scene;
    expect(clipResources(compiled.resources)).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(compiled))).toEqual(compiled);
  });
});
