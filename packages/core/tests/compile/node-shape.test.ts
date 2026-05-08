import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { ScenePrimitive } from '../../src/primitive';

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  prims.find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

describe("Node shape multimorphism (ADR-0003)", () => {
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
    expect(p!.d).toMatch(/^M /); // M 开头
    expect(p!.d).toMatch(/Z$/); // Z 结尾
    expect(p!.d.match(/[MLZ]/g)).toEqual(['M', 'L', 'L', 'L', 'Z']);
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

describe("Node shape boundary clip 在 path 端点贴边时按 shape 多态 (ADR-0003)", () => {
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
            { type: 'step', kind: 'move', to: 'A' },
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
      expect(linePath.d).toBe('M 11.31 0 L 100 0');
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
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'line', to: [100, 100] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { precision: 4 });
    // 找连接 line（不带 Z 的 path，diamond 形状自带 Z）
    const linePath = scene.primitives.find(
      p => p.type === 'path' && !p.d.includes('Z'),
    );
    expect(linePath).toBeDefined();
    // 菱形 halfA = halfB = 16（无 text 时 innerHalf = padding = 8，diamond bound = 2 × 8 = 16）
    // 沿 (1, 1) 方向求边界：|t|/16 + |t|/16 = 1 → t = 8
    // 端点 = (8, 8)
    if (linePath?.type === 'path') {
      expect(linePath.d).toBe('M 8 8 L 100 100');
    }
  });
});
