/**
 * OffsetPosition 对抗性边界测试
 * @description bug hunter 视角：聚焦"应该失败但可能误通过"的输入——zod union 选错分支、循环引用、特殊数值、首步前向、polar.origin 误纳 OffsetPosition 等
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { type IR, OffsetPositionSchema, PolarPositionSchema, TargetSchema } from '../../src/ir';
import type { PathPrim, RectPrim, ScenePrimitive } from '../../src/primitive';

const rects = (prims: Array<ScenePrimitive>): Array<RectPrim> =>
  prims.filter((p): p is RectPrim => p.type === 'rect');
const rectCenter = (r: RectPrim): [number, number] => [
  r.x + r.width / 2,
  r.y + r.height / 2,
];
const findPath = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  prims.find((x): x is PathPrim => x.type === 'path');
const lastLineEnd = (prim: PathPrim): [number, number] => {
  for (let i = prim.commands.length - 1; i >= 0; i--) {
    const cmd = prim.commands[i];
    if (cmd.kind === 'line') return [cmd.to[0], cmd.to[1]];
  }
  throw new Error('no line cmd');
};

describe('OffsetPosition adversarial: schema union 边界', () => {
  it('of 是 RelTarget（{ rel }）→ 应被 zod 拒绝（of union 仅 string|Position|Polar）', () => {
    expect(() =>
      OffsetPositionSchema.parse({ of: { rel: [1, 2] }, offset: [0, 0] }),
    ).toThrow();
  });

  it('of 是 AtPosition（{ direction, of }）→ 应被 zod 拒绝（at 不属 of union）', () => {
    expect(() =>
      OffsetPositionSchema.parse({
        of: { direction: 'right', of: 'A' },
        offset: [0, 0],
      }),
    ).toThrow();
  });

  it('offset 是空数组 → 应被 zod 拒绝', () => {
    expect(() => OffsetPositionSchema.parse({ of: 'A', offset: [] })).toThrow();
  });

  it('offset 是数字而非二元组 → 应被 zod 拒绝', () => {
    expect(() =>
      OffsetPositionSchema.parse({ of: 'A', offset: 10 }),
    ).toThrow();
  });

  it('offset 元素混类型（[number, string]）→ 应被 zod 拒绝', () => {
    expect(() =>
      OffsetPositionSchema.parse({ of: 'A', offset: [1, 'two'] }),
    ).toThrow();
  });

  it('of 是 null → 应被 zod 拒绝', () => {
    expect(() =>
      OffsetPositionSchema.parse({ of: null, offset: [0, 0] }),
    ).toThrow();
  });

  it('of 是 undefined（缺字段）→ 应被 zod 拒绝', () => {
    expect(() =>
      OffsetPositionSchema.parse({ of: undefined, offset: [0, 0] }),
    ).toThrow();
  });

  it('整 OffsetPosition 是 null → 应被 zod 拒绝', () => {
    expect(() => OffsetPositionSchema.parse(null)).toThrow();
  });

  it('PolarPosition.origin 仍然不接受 OffsetPosition（同形对称只到一级）', () => {
    // 防回归：origin union 仍是 (string, Position, PolarPosition)，不允许 OffsetPosition 进 origin
    expect(() =>
      PolarPositionSchema.parse({
        origin: { of: 'A', offset: [10, 0] },
        angle: 0,
        radius: 30,
      }),
    ).toThrow();
  });

  it('TargetSchema 拒绝既不是 OffsetPosition 也不是任何既有形态的 object', () => {
    expect(() => TargetSchema.parse({ foo: 'bar' })).toThrow();
    expect(() => TargetSchema.parse({ offset: [0, 0] })).toThrow();
  });
});

describe('OffsetPosition adversarial: 循环 / 自引用', () => {
  it('Node 自引用自身 id（offset of self） → 抛错（self 尚未注册）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'X', position: { of: 'X', offset: [10, 0] } },
      ],
    };
    expect(() => compileToScene(ir)).toThrow(/Cannot resolve position/);
  });

  it('Coordinate 自引用自身 id → 抛错', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'a', position: { of: 'a', offset: [0, 0] } },
      ],
    };
    expect(() => compileToScene(ir)).toThrow(/Cannot resolve position/);
  });

  it('A → B → A 互引用：B 先出现 → 抛（前向引用拒绝）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'B', position: { of: 'A', offset: [5, 0] } },
        { type: 'node', id: 'A', position: { of: 'B', offset: [0, 5] } },
      ],
    };
    expect(() => compileToScene(ir)).toThrow(/Cannot resolve position/);
  });
});

describe('OffsetPosition adversarial: 数值极端', () => {
  it('小数 offset 精确累加', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0.5, 0.25], text: 'A' },
        {
          type: 'node',
          id: 'B',
          position: { of: 'A', offset: [0.1, 0.2] },
        },
      ],
    };
    const [, b] = rects(compileToScene(ir).primitives).map(rectCenter);
    expect(b[0]).toBeCloseTo(0.6);
    expect(b[1]).toBeCloseTo(0.45);
  });

  it('极大 offset 不溢出且参与 viewBox 计算', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        { type: 'node', id: 'B', position: { of: 'A', offset: [1e6, 1e6] } },
      ],
    };
    const scene = compileToScene(ir);
    const [, b] = rects(scene.primitives).map(rectCenter);
    expect(b[0]).toBeCloseTo(1e6, 0);
    expect(b[1]).toBeCloseTo(1e6, 0);
    // viewBox 跟随
    expect(scene.viewBox.width).toBeGreaterThan(1e5);
  });

  it('深链 4 层 OffsetPosition 累加（id 形式）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        { type: 'node', id: 'B', position: { of: 'A', offset: [10, 0] }, text: 'B' },
        { type: 'node', id: 'C', position: { of: 'B', offset: [10, 0] }, text: 'C' },
        { type: 'node', id: 'D', position: { of: 'C', offset: [10, 0] }, text: 'D' },
        { type: 'node', id: 'E', position: { of: 'D', offset: [10, 0] }, text: 'E' },
      ],
    };
    const cs = rects(compileToScene(ir).primitives).map(rectCenter);
    expect(cs[4][0]).toBeCloseTo(40);
    expect(cs[4][1]).toBeCloseTo(0);
  });
});

describe('OffsetPosition adversarial: step.to 首步 / 极端', () => {
  it('path 第一个 step（move）即 OffsetPosition 笛卡尔基准 → 起点解析为 base+offset', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            {
              type: 'step',
              kind: 'move',
              to: { of: [10, 10], offset: [5, 0] },
            },
            { type: 'step', kind: 'line', to: [50, 50] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const path = findPath(scene.primitives);
    expect(path).toBeDefined();
    // 首条 move 终点 = (10+5, 10+0) = (15, 10)
    const moveCmd = path!.commands.find(c => c.kind === 'move');
    expect(moveCmd?.kind).toBe('move');
    if (moveCmd?.kind === 'move') {
      expect(moveCmd.to[0]).toBeCloseTo(15);
      expect(moveCmd.to[1]).toBeCloseTo(10);
    }
  });

  it('path 内 OffsetPosition.of 引用 Path 之前定义的 Coordinate', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'anchor', position: [20, 30] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'line',
              to: { of: 'anchor', offset: [10, 0] },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const path = findPath(scene.primitives);
    expect(path).toBeDefined();
    const [ex, ey] = lastLineEnd(path!);
    expect(ex).toBeCloseTo(30);
    expect(ey).toBeCloseTo(30);
  });

  it('step.to OffsetPosition.of=未定义 id → emitPathPrimitive 返回 null，整个 path 不产 PathPrim', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            {
              type: 'step',
              kind: 'line',
              to: { of: 'unknown', offset: [10, 0] },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    expect(findPath(scene.primitives)).toBeUndefined();
  });
});

describe('OffsetPosition adversarial: JSON 序列化往返', () => {
  it('IR 含 OffsetPosition → JSON.stringify / parse 后 schema 仍校验通过 + compile 等价', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        {
          type: 'node',
          id: 'B',
          position: { of: 'A', offset: [30, 0] },
          text: 'B',
        },
      ],
    };
    const restored = JSON.parse(JSON.stringify(ir)) as IR;
    const before = rects(compileToScene(ir).primitives).map(rectCenter);
    const after = rects(compileToScene(restored).primitives).map(rectCenter);
    expect(after).toEqual(before);
  });
});
