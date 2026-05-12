import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathCommand, PathPrim, ScenePrimitive } from '../../src/primitive';
import { pathCommandsToD } from '../helpers/path-d';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  prims.find((p): p is PathPrim => p.type === 'path');

/**
 * ADR-01 测试象限对应的补强测试。
 * 关注点不与 path.test.ts 的回归测试重叠——这里专门挖 commands / transforms 切换后的边界
 */
describe('PathPrim.commands：结构化形态约束', () => {
  it('PathPrim 持有 commands 字段（不再是 d 字符串）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 5] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const p = findPathPrim(scene.primitives);
    expect(p).toBeDefined();
    expect(Array.isArray(p?.commands)).toBe(true);
    // 旧 d 字段必须不存在（防止双源 leakage）
    expect('d' in (p ?? {})).toBe(false);
  });

  it('commands 数组只包含 move/line/quad/cubic/arc/ellipseArc/close 七种 kind', () => {
    const allKinds = new Set([
      'move',
      'line',
      'quad',
      'cubic',
      'arc',
      'ellipseArc',
      'close',
    ]);
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', to: [10, 0], control: [5, -5] },
            {
              type: 'step',
              kind: 'cubic',
              to: [20, 0],
              control1: [12, 5],
              control2: [18, 5],
            },
            {
              type: 'step',
              kind: 'arc',
              radius: 5,
              startAngle: 0,
              endAngle: 90,
            },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives);
    expect(p).toBeDefined();
    for (const cmd of p!.commands) {
      expect(allKinds.has(cmd.kind)).toBe(true);
    }
  });

  it('arc step 编译为 arc PathCommand（center / radius / startAngle / endAngle 全填）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [5, 5] },
            { type: 'step', kind: 'arc', radius: 10, startAngle: 0, endAngle: 90 },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    const arcCmd = p.commands.find((c): c is Extract<PathCommand, { kind: 'arc' }> => c.kind === 'arc');
    expect(arcCmd).toBeDefined();
    expect(arcCmd!.center).toEqual([5, 5]);
    expect(arcCmd!.radius).toBe(10);
    expect(arcCmd!.startAngle).toBe(0);
    expect(arcCmd!.endAngle).toBe(90);
  });

  it('circlePath 编译为单个 ellipseArc 全 sweep（rx=ry=radius, 0→360）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 7 },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    const ellipseCmds = p.commands.filter(
      (c): c is Extract<PathCommand, { kind: 'ellipseArc' }> => c.kind === 'ellipseArc',
    );
    // 单个 ellipseArc 命令（adapter 内部拆 360° 退化）
    expect(ellipseCmds).toHaveLength(1);
    expect(ellipseCmds[0].radiusX).toBe(7);
    expect(ellipseCmds[0].radiusY).toBe(7);
    expect(ellipseCmds[0].startAngle).toBe(0);
    expect(ellipseCmds[0].endAngle).toBe(360);
  });

  it('ellipsePath 编译为单个 ellipseArc（rx ≠ ry）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'ellipsePath', radiusX: 15, radiusY: 10 },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    const ellipseCmds = p.commands.filter(
      (c): c is Extract<PathCommand, { kind: 'ellipseArc' }> => c.kind === 'ellipseArc',
    );
    expect(ellipseCmds).toHaveLength(1);
    expect(ellipseCmds[0].radiusX).toBe(15);
    expect(ellipseCmds[0].radiusY).toBe(10);
  });

  it('cycle 段 emit close PathCommand（不再是 Z token）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    expect(p.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('PathCommand 坐标在 compile 阶段已按 round 精度截断（2 位）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [1.234567, 2.345678] },
            { type: 'step', kind: 'line', to: [3.456789, 4.567890] },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    const move = p.commands[0];
    const line = p.commands[1];
    expect(move.kind).toBe('move');
    expect(line.kind).toBe('line');
    if (move.kind === 'move') {
      expect(move.to[0]).toBe(1.23);
      expect(move.to[1]).toBe(2.35);
    }
    if (line.kind === 'line') {
      expect(line.to[0]).toBe(3.46);
      expect(line.to[1]).toBe(4.57);
    }
  });

  it('curve step → quad PathCommand（IR 用 curve 但 primitive 一致用 quad 跨 adapter 名）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', to: [10, 0], control: [5, 5] },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    const quad = p.commands.find(
      (c): c is Extract<PathCommand, { kind: 'quad' }> => c.kind === 'quad',
    );
    expect(quad).toBeDefined();
    expect(quad!.control).toEqual([5, 5]);
    expect(quad!.to).toEqual([10, 0]);
  });

  it('bend step 折角 → cubic PathCommand（与 cubic 同形）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'left' },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    const cubic = p.commands.find(
      (c): c is Extract<PathCommand, { kind: 'cubic' }> => c.kind === 'cubic',
    );
    expect(cubic).toBeDefined();
  });
});

describe('GroupPrim.transforms：结构化形态约束', () => {
  it('rotate 节点 emit GroupPrim 持 transforms 数组（不再是 transform 字符串）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [10, 20], text: 'A', rotate: 30 },
      ],
    };
    const scene = compileToScene(ir);
    const grp = scene.primitives.find(p => p.type === 'group');
    expect(grp).toBeDefined();
    expect(grp?.type).toBe('group');
    if (grp?.type === 'group') {
      expect(Array.isArray(grp.transforms)).toBe(true);
      expect(grp.transforms).toHaveLength(1);
      const t = grp.transforms![0];
      expect(t.kind).toBe('rotate');
      if (t.kind === 'rotate') {
        expect(t.degrees).toBe(30);
        expect(t.cx).toBe(10);
        expect(t.cy).toBe(20);
      }
      // 旧 transform 字段必须不存在
      expect('transform' in grp).toBe(false);
    }
  });

  it('未 rotate 节点不外裹 group（transforms 缺省语义不浪费一层）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
    };
    const scene = compileToScene(ir);
    expect(scene.primitives.find(p => p.type === 'group')).toBeUndefined();
  });

  it('多 sub-path + arrow 包裹的 GroupPrim 不带 transforms（仅为分组）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [60, 0] },
        { type: 'node', id: 'C', position: [60, 60] },
        {
          type: 'path',
          arrow: '->',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'line', to: 'B' },
            { type: 'step', kind: 'line', to: 'C' },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const grp = scene.primitives.find(p => p.type === 'group');
    expect(grp).toBeDefined();
    if (grp?.type === 'group') {
      // 这种 group 是 sub-path 分组，无 transform 需求
      expect(grp.transforms).toBeUndefined();
    }
  });

  it("sloped label group 的 transforms 含 rotate kind（绕标签锚点）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0], label: { text: 'x', side: 'sloped' } },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const grp = scene.primitives.find(p => p.type === 'group');
    expect(grp).toBeDefined();
    if (grp?.type === 'group') {
      expect(grp.transforms).toHaveLength(1);
      const t = grp.transforms![0];
      expect(t.kind).toBe('rotate');
    }
  });
});

describe('交互：rotated node 与 path 在 rotated parent 中', () => {
  it('rotate node 编译结果与未 rotate 节点的 commands 在 transforms 包裹下视觉等价', () => {
    // 两个节点同位置同文本，一个 rotate=0、一个 rotate=45，验证 commands 结构相同（仅外层 group 存在/不存在差异）
    const irNoRot: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [10, 20], shape: 'diamond' },
      ],
    };
    const irRot: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [10, 20], shape: 'diamond', rotate: 45 },
      ],
    };
    const noRotPath = findPathPrim(compileToScene(irNoRot).primitives);
    const rotScene = compileToScene(irRot);
    const grp = rotScene.primitives.find(p => p.type === 'group');
    expect(grp?.type).toBe('group');
    if (grp?.type === 'group') {
      const inner = grp.children.find((c): c is PathPrim => c.type === 'path');
      expect(inner).toBeDefined();
      // 内层 path 的 commands 数量与未旋转版相同
      expect(inner!.commands.length).toBe(noRotPath!.commands.length);
    }
  });
});

describe('边界 / 错误路径', () => {
  it('单步 path（只有 move）→ emitPathPrimitive 返回 null，不产 primitive', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [{ type: 'step', kind: 'move', to: [0, 0] }],
        },
      ],
    };
    const scene = compileToScene(ir);
    expect(findPathPrim(scene.primitives)).toBeUndefined();
  });

  it('引用未定义节点 → 不产 PathPrim（防御性 null 返回）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'UNKNOWN' },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    expect(findPathPrim(scene.primitives)).toBeUndefined();
  });

  it('PathCommand 与 helper 转回 d 字符串后等价于旧 d 字段语义', () => {
    // 等价回归：两段 line + cycle 的 d 字符串与 1.x 实现一致
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    expect(pathCommandsToD(p.commands)).toBe('M 0 0 L 10 0 L 10 10 Z');
  });
});
