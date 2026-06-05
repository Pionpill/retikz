import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR, IRNode } from '../../src/ir';
import { NodeSchema } from '../../src/ir';
import type { ScenePrimitive } from '../../src/primitive';
import { line, move } from '../helpers/path-command-factory';
import { flattenPrims } from '../helpers/flatten';

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

describe("Node shape multimorphism", () => {
  it("默认 shape = rectangle，emit RectPrim", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
    };
    const scene = compileToScene(ir);
    expect(findByType(scene.primitives, 'rect')).toBeDefined();
    expect(findByType(scene.primitives, 'ellipse')).toBeUndefined();
  });

  it("shape='circle' emit EllipsePrim 且 rx == ry（外接圆）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'circle', position: [0, 0], text: 'A' },
      ],
    };
    const scene = compileToScene(ir);
    const el = findByType(scene.primitives, 'ellipse');
    expect(el).toBeDefined();
    expect(el!.rx).toBe(el!.ry); // 圆形 rx = ry
  });

  it("shape='ellipse' emit EllipsePrim 且 rx ≠ ry（外接椭圆）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        // 给点宽文本让 rx > ry
        { type: 'node', id: 'A', shape: 'ellipse', position: [0, 0], text: 'long text' },
      ],
    };
    const scene = compileToScene(ir);
    const el = findByType(scene.primitives, 'ellipse');
    expect(el).toBeDefined();
    expect(el!.rx).toBeGreaterThan(el!.ry);
  });

  it("shape='diamond' emit PathPrim（4 顶点 + Z）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'diamond', position: [0, 0], text: 'A' },
      ],
    };
    const scene = compileToScene(ir);
    const p = findByType(scene.primitives, 'path');
    expect(p).toBeDefined();
    const cmds = p!.commands;
    expect(cmds[0].kind).toBe('move'); // move 开头
    expect(cmds[cmds.length - 1].kind).toBe('close'); // close 结尾
    expect(cmds.map(c => c.kind)).toEqual(['move', 'line', 'line', 'line', 'close']);
  });

  it("rectangle 默认 = 显式传 'rectangle'（向后兼容）", () => {
    const ir1: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
    };
    const ir2: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'rectangle', position: [0, 0], text: 'A' },
      ],
    };
    expect(compileToScene(ir1).primitives).toEqual(compileToScene(ir2).primitives);
  });
});

describe("Target 字符串锚点扩展", () => {
  it("`'A.east'` → 端点固定在 east anchor，不受 toward 影响", () => {
    // 矩形 A=(0,0)，无文本，padding=8 → 16x16；east = (8, 0)
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A', anchor: 'east' } },
            { type: 'step', kind: 'line', to: [100, 50] },
          ],
        },
      ],
    };
    const linePath = compileToScene(ir).primitives.find(p => p.type === 'path');
    if (linePath?.type === 'path') {
      // move(8, 0)：固定 east
      expect(linePath.commands[0]).toEqual(move([8, 0]));
    }
  });

  it("`'A.30'` → 端点在 30° 方向上的视觉边界（圆形 r 半径处）", () => {
    // 圆形 A=(0,0)，无文本，r = sqrt(8² + 8²) ≈ 11.31
    // 30° → (cos 30°, sin 30°) = (0.866, 0.5) × r = (9.798, 5.657)
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'circle', position: [0, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A', anchor: 30 } },
            { type: 'step', kind: 'line', to: [100, 50] },
          ],
        },
      ],
    };
    const linePath = compileToScene(ir).primitives.find(p => p.type === 'path');
    if (linePath?.type === 'path') {
      // move 后第一个点 ≈ (r·cos(30°), r·sin(30°)) = (9.8, 5.66)
      expect(linePath.commands[0]).toEqual(move([9.8, 5.66]));
    }
  });

  it("不同 shape 的 'A.north' anchor 都在最高点", () => {
    // rectangle / circle / ellipse / diamond 4 shape，A.north 都应在节点 north
    for (const shape of ['rectangle', 'circle', 'ellipse', 'diamond'] as const) {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', shape, position: [0, 0] },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'A', anchor: 'north' } },
              { type: 'step', kind: 'line', to: [0, -100] },
            ],
          },
        ],
      };
      const linePath = compileToScene(ir).primitives.find(
        (p): p is Extract<ScenePrimitive, { type: 'path' }> =>
          p.type === 'path' && !p.commands.some(c => c.kind === 'close'),
      );
      if (linePath?.type === 'path') {
        // north 的 x = 0（中心 x），y < 0（节点上方）
        const first = linePath.commands[0];
        expect(first.kind).toBe('move');
        if (first.kind === 'move') {
          expect(first.to[0]).toBe(0);
          expect(first.to[1]).toBeLessThan(0);
        }
      }
    }
  });

  it("'A.center' 等价于节点几何中心（任意 shape）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'circle', position: [10, 20] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A', anchor: 'center' } },
            { type: 'step', kind: 'line', to: [100, 100] },
          ],
        },
      ],
    };
    const linePath = compileToScene(ir).primitives.find(p => p.type === 'path');
    if (linePath?.type === 'path') {
      expect(linePath.commands[0]).toEqual(move([10, 20]));
    }
  });
});

describe("ellipse nested params IR round-trip", () => {
  it("含 ellipse {circumscribe:'equal'} 的 Node IR → JSON → parse 等价（params 全在 IR）", () => {
    const node = {
      type: 'node',
      id: 'A',
      position: [0, 0],
      shape: { type: 'ellipse', params: { circumscribe: 'equal' } },
    };
    const parsed = NodeSchema.parse(node);
    const roundTripped = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
    expect(roundTripped.shape).toEqual({ type: 'ellipse', params: { circumscribe: 'equal' } });
  });

  it("非法 circumscribe 枚举 → NodeSchema 不 reject（shape 枚举校验在编译期 paramsSchema），但编译期 throw", () => {
    // ShapeRefSchema 的 params 是开放 JSON object（IR 层不知具体 shape 的 paramsSchema），
    // 枚举校验落在 compile 的 shapeDef.paramsSchema.parse —— 非法枚举编译期 throw。
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          shape: { type: 'ellipse', params: { circumscribe: 'diagonal' } },
          position: [0, 0],
        },
      ],
    };
    expect(() => compileToScene(ir)).toThrow();
  });
});

describe("circle 收为 ellipse equal preset 别名", () => {
  // 以下 case 依赖实现 Agent 的 circle 规范化（compile/node.ts 把裸 'circle' →
  // { type: 'ellipse', params: { circumscribe: 'equal' } }，并删 circle.ts 独立几何）。
  // 规范化未落地前此刻 fail —— 预期。
  it("circle_normalizes_to_ellipse_equal：shape:'circle' 编译等价显式 ellipse equal", () => {
    const bareIr: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', shape: 'circle', position: [0, 0], text: 'long text' }],
    };
    const explicitIr: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          shape: { type: 'ellipse', params: { circumscribe: 'equal' } },
          position: [0, 0],
          text: 'long text',
        },
      ],
    };
    expect(compileToScene(bareIr).primitives).toEqual(compileToScene(explicitIr).primitives);
  });

  it("circle_emit_equivalent：circle 规范化后 emit EllipsePrim 且 rx == ry（等轴）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      // 非正方内框（宽文本）下仍须 rx == ry，验证走的是 equal（等轴）而非 proportional
      children: [{ type: 'node', id: 'A', shape: 'circle', position: [0, 0], text: 'long text' }],
    };
    const el = findByType(compileToScene(ir).primitives, 'ellipse');
    expect(el).toBeDefined();
    expect(el!.rx).toBe(el!.ry);
  });

  it("circle_with_extra_params_rejected：{type:'ellipse', params:{foo:1}} → strictObject reject", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          // params 是开放 JSON object（IR 层不查具体 shape 的 paramsSchema）；非法字段编译期被 strictObject 拒
          shape: { type: 'ellipse', params: { foo: 1 } },
          position: [0, 0],
        },
      ],
    };
    expect(() => compileToScene(ir)).toThrow();
  });

  it("circle_with_scale：circle 规范化后 × scale → 尺寸协同放大、仍正圆（rx == ry）", () => {
    const base = compileToScene({
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', shape: 'circle', position: [0, 0], text: 'X' }],
    });
    const scaled = compileToScene({
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', shape: 'circle', position: [0, 0], text: 'X', scale: 2 }],
    });
    const baseEl = findByType(base.primitives, 'ellipse');
    const scaledEl = findByType(scaled.primitives, 'ellipse');
    expect(baseEl).toBeDefined();
    expect(scaledEl).toBeDefined();
    expect(scaledEl!.rx).toBe(scaledEl!.ry); // 仍正圆
    expect(scaledEl!.rx).toBeGreaterThan(baseEl!.rx); // 尺寸协同放大
  });

  it("circle_anchor_matches_legacy：circle 各命名 anchor 与 ellipse equal 一致", () => {
    // circle 与显式 ellipse-equal 在所有命名 anchor 落点一致（回归：收敛不改 anchor 几何）
    for (const anchor of [
      'center',
      'north',
      'south',
      'east',
      'west',
      'north-east',
      'north-west',
      'south-east',
      'south-west',
    ] as const) {
      const mk = (shape: IRNode['shape']): IR => ({
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', shape, position: [0, 0], text: 'long text' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'A', anchor } },
              { type: 'step', kind: 'line', to: [200, 200] },
            ],
          },
        ],
      });
      const findLine = (ir: IR) =>
        compileToScene(ir).primitives.find(
          (p): p is Extract<ScenePrimitive, { type: 'path' }> =>
            p.type === 'path' && !p.commands.some(c => c.kind === 'close'),
        );
      const circleLine = findLine(mk('circle'));
      const ellipseLine = findLine(mk({ type: 'ellipse', params: { circumscribe: 'equal' } }));
      expect(circleLine?.commands[0]).toEqual(ellipseLine?.commands[0]);
    }
  });
});

describe("Node shape boundary clip 在 path 端点贴边时按 shape 多态", () => {
  it("circle 节点 path 端点贴圆周（距中心 = radius）", () => {
    // A=(0,0) 圆形 + B=(100,0) 笛卡尔点；line 从 A 到 B
    // A 的圆周半径 = sqrt((textHalfW+p)² + (textHalfH+p)²)
    // 端点应该距 A 中心 = radius 且在朝向 B 的方向
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'circle', position: [0, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    // circle 走 EllipsePrim，不会和 line PathPrim 撞；直接拿 path
    const linePath = scene.primitives.find(p => p.type === 'path');
    expect(linePath).toBeDefined();
    // d 形如 "M r 0 L 100 0"，r = 圆形半径（无 text 时 r = sqrt(p²+p²) = p√2）
    // 默认 padding=8 → r = 8√2 ≈ 11.31 → "M 11.31 0 L 100 0"
    if (linePath?.type === 'path') {
      expect(linePath.commands).toEqual([move([11.31, 0]), line([100, 0])]);
    }
  });

  it("diamond 节点 path 端点贴菱形边（满足 |x|/halfA + |y|/halfB = 1）", () => {
    // A=(0,0) diamond + B=(100,100); line A→B 沿 (1,1) 方向
    // diamond 自身也是 PathPrim（"M ... Z"）；连接 line 是不带 Z 的 PathPrim
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'diamond', position: [0, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: [100, 100] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { precision: 4 });
    // 找连接 line（不带 close 的 path，diamond 形状自带 close）
    const linePath = scene.primitives.find(
      (p): p is Extract<ScenePrimitive, { type: 'path' }> =>
        p.type === 'path' && !p.commands.some(c => c.kind === 'close'),
    );
    expect(linePath).toBeDefined();
    // 菱形 halfA = halfB = 16（无 text 时 innerHalf = padding = 8，diamond bound = 2 × 8 = 16）
    // 沿 (1, 1) 方向求边界：|t|/16 + |t|/16 = 1 → t = 8
    // 端点 = (8, 8)
    if (linePath?.type === 'path') {
      expect(linePath.commands).toEqual([move([8, 8]), line([100, 100])]);
    }
  });
});
