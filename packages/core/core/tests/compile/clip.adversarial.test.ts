/**
 * clip 裁切对抗测试（破坏视角）
 * @description 构造让实现挂的对抗输入：手搓 IR 绕过 zod 喂非 finite 坐标、字段顺序错位、退化几何、
 *   大量资源混合、嵌套 / 复合 scope。核心目标——非 finite 绝不进 Scene（守 JSON round-trip），
 *   dedup 不误并 / 不漏并，资源 id 命名空间稳定不撞，复合 scope 仍正确挂 clipRef。
 *   只补对抗 case，不重复 clip.test.ts 的正向覆盖。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { GroupPrim, IR, IRPaintSpec, ScenePrimitive, SceneResource } from '../../src';
import type { ClipResource } from '../../src';

const scene = (children: IR['children']): IR => ({
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

const grad: IRPaintSpec = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#4f8' },
    { offset: 1, color: '#08f' },
  ],
};

/** 手搓非 finite / 非法字段：用 any cast 绕过 IR zod，直接喂 compileToScene */
const handcraftedScope = (clip: unknown, children: IR['children'] = [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }]): IR =>
  scene([{ type: 'scope', clip, children } as unknown as IR['children'][number]]);

describe('clip 非 finite 守卫：必须编译期抛、绝不进 Scene', () => {
  const cases: Array<{ name: string; clip: unknown }> = [
    { name: 'rect x = Infinity', clip: { kind: 'rect', x: Infinity, y: 0, width: 10, height: 10 } },
    { name: 'rect y = -Infinity', clip: { kind: 'rect', x: 0, y: -Infinity, width: 10, height: 10 } },
    { name: 'rect width = NaN', clip: { kind: 'rect', x: 0, y: 0, width: NaN, height: 10 } },
    { name: 'rect width = -Infinity', clip: { kind: 'rect', x: 0, y: 0, width: -Infinity, height: 10 } },
    { name: 'rect height = 0（非正）', clip: { kind: 'rect', x: 0, y: 0, width: 10, height: 0 } },
    { name: 'rect width = -5（负尺寸）', clip: { kind: 'rect', x: 0, y: 0, width: -5, height: 10 } },
    { name: 'circle cx = NaN', clip: { kind: 'circle', cx: NaN, cy: 0, r: 5 } },
    { name: 'circle cy = Infinity', clip: { kind: 'circle', cx: 0, cy: Infinity, r: 5 } },
    { name: 'circle r = Infinity', clip: { kind: 'circle', cx: 0, cy: 0, r: Infinity } },
    { name: 'circle r = 0', clip: { kind: 'circle', cx: 0, cy: 0, r: 0 } },
    { name: 'ellipse rx = NaN', clip: { kind: 'ellipse', cx: 0, cy: 0, rx: NaN, ry: 5 } },
    { name: 'ellipse ry = Infinity', clip: { kind: 'ellipse', cx: 0, cy: 0, rx: 5, ry: Infinity } },
    { name: 'ellipse rx = -3', clip: { kind: 'ellipse', cx: 0, cy: 0, rx: -3, ry: 5 } },
    { name: 'ellipse cx = -Infinity', clip: { kind: 'ellipse', cx: -Infinity, cy: 0, rx: 5, ry: 5 } },
    {
      name: 'polygon 点含 Infinity x',
      clip: { kind: 'polygon', points: [[Infinity, 0], [10, 0], [5, 10]] },
    },
    {
      name: 'polygon 点含 NaN y',
      clip: { kind: 'polygon', points: [[0, 0], [10, NaN], [5, 10]] },
    },
    {
      name: 'polygon 末点含 -Infinity',
      clip: { kind: 'polygon', points: [[0, 0], [10, 0], [5, 10], [-Infinity, 2]] },
    },
  ];

  for (const { name, clip } of cases) {
    it(`${name} → 编译期抛`, () => {
      expect(() => compileToScene(handcraftedScope(clip))).toThrow();
    });
  }

  it('抛出的错误信息含 kind + 字段线索（清晰错）', () => {
    expect(() =>
      compileToScene(handcraftedScope({ kind: 'circle', cx: 0, cy: 0, r: Infinity })),
    ).toThrow(/circle/i);
  });
});

describe('finite 守卫不误伤合法值', () => {
  it('rect 负坐标 + 正尺寸合法（取景窗可在第三象限）', () => {
    const compiled = compileToScene(
      handcraftedScope({ kind: 'rect', x: -50, y: -40, width: 10, height: 10 }),
    );
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(1);
    expect(clips[0].shape).toMatchObject({ kind: 'rect', x: -50, y: -40, width: 10, height: 10 });
  });

  it('circle / ellipse 极小正半径合法', () => {
    const compiled = compileToScene(
      handcraftedScope({ kind: 'ellipse', cx: 0, cy: 0, rx: 0.01, ry: 0.01 }),
    );
    expect(clipResources(compiled.resources)).toHaveLength(1);
  });
});

describe('clip Scene JSON round-trip 不失真', () => {
  /** JSON 序列化 + 反序列化后 Scene 与原始等价（NaN/Infinity 会变 null，-0 会变 0） */
  const assertRoundTrip = (ir: IR): void => {
    const compiled = compileToScene(ir);
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
        points: [[0, 0], [40, 0], [20, 40], [-10, 20]],
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
    const compiled = compileToScene(ir);
    const json = JSON.stringify(compiled);
    // 关键契约：序列化产物里没有 null（非 finite 会序列化成 null）
    expect(json).not.toContain('null');
    const shape = clipResources(compiled.resources)[0].shape;
    expect(shape.kind).toBe('rect');
    if (shape.kind === 'rect') {
      // 数值等价（+0 === -0 为 true），不要求 Object.is 一致
      expect(shape.x === 0).toBe(true);
      expect(shape.y === 0).toBe(true);
      expect(Number.isFinite(shape.x)).toBe(true);
      expect(Number.isFinite(shape.y)).toBe(true);
    }
  });
});

describe('clip dedup 边界', () => {
  it('字段书写顺序不同但结构相同 → 仍 dedup 为 1 条资源', () => {
    // 手搓两个 rect，字段顺序故意打乱（width 在前 / height 在前），结构等价应 dedup
    const clipA = { height: 30, width: 40, y: 0, x: 0, kind: 'rect' };
    const clipB = { kind: 'rect', x: 0, y: 0, width: 40, height: 30 };
    const ir = scene([
      { type: 'scope', clip: clipA, children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }] } as unknown as IR['children'][number],
      { type: 'scope', clip: clipB, children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }] } as unknown as IR['children'][number],
    ]);
    const compiled = compileToScene(ir);
    expect(clipResources(compiled.resources)).toHaveLength(1);
    const groups = allGroups(compiled.primitives);
    expect(groups[0].clipRef).toBe(groups[1].clipRef);
  });

  it('polygon 点序不同（同点集，不同顺序）→ 不 dedup（视为不同裁剪区）', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'polygon', points: [[0, 0], [40, 0], [20, 40]] },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        clip: { kind: 'polygon', points: [[40, 0], [0, 0], [20, 40]] },
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir);
    // 点序不同 → 不同 polygon → 2 条资源
    expect(clipResources(compiled.resources)).toHaveLength(2);
  });

  it('两个 clip round 到同一值（亚精度差）→ 合并为 1 条资源', () => {
    // precision=2：0.001 与 0.004 都 round 到 0.00 → 同 key → dedup
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'circle', cx: 0.001, cy: 0, r: 10 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        clip: { kind: 'circle', cx: 0.004, cy: 0, r: 10 },
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir);
    expect(clipResources(compiled.resources)).toHaveLength(1);
  });

  it('rect 与 circle 同坐标 → 永不 dedup（kind 不同）', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        clip: { kind: 'circle', cx: 0, cy: 0, r: 10 },
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir);
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
        clip: { kind: 'circle', cx: 0, cy: 0, r: 5 },
        children: [{ type: 'node', id: 'B', position: [40, 0], text: 'B' }],
      },
      {
        type: 'scope',
        clip: { kind: 'ellipse', cx: 0, cy: 0, rx: 3, ry: 2 },
        children: [{ type: 'node', id: 'C', position: [80, 0], text: 'C' }],
      },
    ]);
    const a = compileToScene(ir);
    const b = compileToScene(ir);
    expect(clipResources(a.resources).map(c => c.id)).toEqual(
      clipResources(b.resources).map(c => c.id),
    );
    expect(a.resources).toEqual(b.resources);
  });
});

describe('clip + paint 资源命名空间：大量混合不撞、稳定', () => {
  it('多 paint + 多 clip 交错 → paint-N / clip-N 各自递增、全局 id 唯一', () => {
    const grad2: IRPaintSpec = {
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
        clip: { kind: 'circle', cx: 0, cy: 0, r: 5 },
        children: [{ type: 'node', id: 'B', position: [120, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir);
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
    const compiled = compileToScene(ir);
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
            clip: { kind: 'circle', cx: 0, cy: 0, r: 20 },
            children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
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
    const compiled = compileToScene(
      handcraftedScope({ kind: 'rect', x: 0, y: 0, width: 20, height: 20 }, []),
    );
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
    const compiled = compileToScene(
      handcraftedScope({ kind: 'polygon', points }),
    );
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(1);
    const shape = clips[0].shape;
    expect(shape.kind).toBe('polygon');
    if (shape.kind === 'polygon') expect(shape.points).toHaveLength(500);
  });

  it('polygon 全重复点（退化成一点）→ 不抛（finite 即接受）', () => {
    const compiled = compileToScene(
      handcraftedScope({ kind: 'polygon', points: [[5, 5], [5, 5], [5, 5]] }),
    );
    expect(clipResources(compiled.resources)).toHaveLength(1);
  });

  it('rect 极大坐标（finite 但巨大）→ 不抛、round-trip 等价', () => {
    const ir = handcraftedScope({ kind: 'rect', x: 1e15, y: -1e15, width: 1e10, height: 1e10 });
    const compiled = compileToScene(ir);
    expect(clipResources(compiled.resources)).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(compiled))).toEqual(compiled);
  });
});
