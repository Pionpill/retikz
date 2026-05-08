import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

describe('compile path: line baseline', () => {
  it('两段 line 产出 M ... L ...', () => {
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
    expect(findPathPrim(scene.primitives).d).toBe('M 0 0 L 10 5');
  });
});

describe("compile path: 'step' 折角 (ADR-0001)", () => {
  it("via '-|' 等价于 line(curr.x, prev.y) → line(curr) 拆解", () => {
    const folded: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'step', via: '-|', to: [10, 5] },
          ],
        },
      ],
    };
    const manual: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] }, // 先水平
            { type: 'step', kind: 'line', to: [10, 5] }, // 再垂直
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(folded).primitives).d).toBe(
      findPathPrim(compileToScene(manual).primitives).d,
    );
  });

  it("via '|-' 等价于 line(prev.x, curr.y) → line(curr) 拆解", () => {
    const folded: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'step', via: '|-', to: [10, 5] },
          ],
        },
      ],
    };
    const manual: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [0, 5] }, // 先垂直
            { type: 'step', kind: 'line', to: [10, 5] }, // 再水平
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(folded).primitives).d).toBe(
      findPathPrim(compileToScene(manual).primitives).d,
    );
  });

  it('折角中间点参与 viewBox 计算（不会被裁掉）', () => {
    // 起点 (0,0)，终点 (40, 30)，via='-|' → 中点 (40, 0)
    // 三个点的 bbox: x in [0,40], y in [0,30]；padding=10 → viewBox [-10,-10,60,50]
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'step', via: '-|', to: [40, 30] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { padding: 10 });
    expect(scene.viewBox).toEqual({ x: -10, y: -10, width: 60, height: 50 });
  });

  it('折角与节点引用配合：节点 ref 端点贴 boundary 后再插中点', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
        },
        {
          type: 'node',
          id: 'B',
          position: [100, 60],
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'step', via: '-|', to: 'B' },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const d = findPathPrim(scene.primitives).d;
    const matches = d.match(/[ML]/g);
    expect(matches).toEqual(['M', 'L', 'L']); // M start, L corner, L end
  });

  it('折角中点对齐节点几何中心，不取 boundary 偏移（bugfix）', () => {
    // A=(0,0)，B=(100,60)，无文本默认 width=height=2*padding=16
    // 期望 corner = (B.center.x=100, A.center.y=0)
    // A 端点向 (100, 0) 切 boundary → A.east = (8, 0)
    // B 端点向 (100, 0) 切 boundary → B.north = (100, 52)
    // 路径："M 8 0 L 100 0 L 100 52"
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'step', via: '-|', to: 'B' },
          ],
        },
      ],
    };
    const d = findPathPrim(compileToScene(ir).primitives).d;
    expect(d).toBe('M 8 0 L 100 0 L 100 52');
  });

  it("via '|-' 中点对齐：corner = (A.center.x, B.center.y)", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'step', via: '|-', to: 'B' },
          ],
        },
      ],
    };
    const d = findPathPrim(compileToScene(ir).primitives).d;
    expect(d).toBe('M 0 8 L 0 60 L 92 60');
  });
});

describe("compile path: 'cycle' 闭合", () => {
  it("cycle 段在 d 字符串末尾追加 'Z'", () => {
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
    const d = findPathPrim(compileToScene(ir).primitives).d;
    expect(d).toBe('M 0 0 L 10 0 L 10 10 Z');
  });

  it('cycle 不引入新 endpoints，viewBox 与不带 cycle 的等价路径一致', () => {
    const irWith: IR = {
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
    const irWithout: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
        },
      ],
    };
    expect(compileToScene(irWith).viewBox).toEqual(
      compileToScene(irWithout).viewBox,
    );
  });

  it('cycle 与节点 ref 配合：每段独立 clip，cycle 段不能用 Z（闭合点与 lastEnd 不同）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [60, 0] },
        { type: 'node', id: 'C', position: [60, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'line', to: 'B' },
            { type: 'step', kind: 'line', to: 'C' },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const d = findPathPrim(compileToScene(ir).primitives).d;
    // 三段独立：A→B、B→C、C→A，每段都 M 开头；不出现 Z
    expect(d).not.toContain('Z');
    expect(d.match(/M/g) ?? []).toHaveLength(3);
  });
});

describe("compile path: arrow 箭头 (ADR-0002)", () => {
  it("arrow: '->' → PathPrim arrowEnd: 'normal'，arrowStart 不写", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const path = findPathPrim(scene.primitives);
    expect(path.arrowEnd).toBe('normal');
    expect(path.arrowStart).toBeUndefined();
  });

  it("arrow: '<-' → arrowStart: 'normal'", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<-',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart).toBe('normal');
    expect(path.arrowEnd).toBeUndefined();
  });

  it("arrow: '<->' → 两端都 'normal'", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart).toBe('normal');
    expect(path.arrowEnd).toBe('normal');
  });

  it("arrow: 'none' / 缺省 → 两端都不挂 marker", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart).toBeUndefined();
    expect(path.arrowEnd).toBeUndefined();
  });

  it("多 sub-path + arrow → 拆成 GroupPrim：首段独占 marker-start，末段独占 marker-end", () => {
    // A → B → C 多节点路径，'->'。期望产出 GroupPrim 内 2 个 PathPrim：
    //   首段 d="M ... L ..."（无 arrow）
    //   末段 d="M ... L ..."（arrowEnd: 'normal'）
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
    const group = scene.primitives.find(
      (p): p is Extract<ScenePrimitive, { type: 'group' }> => p.type === 'group',
    );
    expect(group).toBeDefined();
    expect(group?.children).toHaveLength(2);
    const [first, last] = group!.children as Array<PathPrim>;
    expect(first.arrowStart).toBeUndefined();
    expect(first.arrowEnd).toBeUndefined();
    expect(last.arrowStart).toBeUndefined();
    expect(last.arrowEnd).toBe('normal');
  });

  it("单 sub-path + arrow → 不拆 group，直接一个 PathPrim 挂 marker", () => {
    // 直接坐标，无 boundary clip 差异，单 sub-path
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    expect(scene.primitives.find(p => p.type === 'group')).toBeUndefined();
    const path = findPathPrim(scene.primitives);
    expect(path.arrowEnd).toBe('normal');
  });
});

describe('compile path: 多节点连线段独立 clip（bugfix tikz-from-ir.demo）', () => {
  it("A → B → C → A：B 出口端点不同于 B 入口端点，路径在 B 处可见地断开", () => {
    // A=(0,0)、B=(120,0)、C=(60,60)，无文本默认 16x16
    // 段 A→B：A.east(8,0) → B.west(112,0)
    // 段 B→C：B.center=(120,0) 朝 C.center=(60,60)，方向 (-60,60) 等比例 → 角点 → B.south-west=(112,8)；
    //         C.center=(60,60) 朝 B.center，方向 (60,-60) → C.north-east=(68,52)
    // 段 C→A：C 朝 A 方向 (-60,-60) → C.south-west=(52,52)；A 朝 C 方向 (60,60) → A.north-east=(8,8)
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [120, 0] },
        { type: 'node', id: 'C', position: [60, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'line', to: 'B' },
            { type: 'step', kind: 'line', to: 'C' },
            { type: 'step', kind: 'line', to: 'A' },
          ],
        },
      ],
    };
    const d = findPathPrim(compileToScene(ir).primitives).d;
    // 关键：3 个 M（每段独立起点），共 3 个 L
    expect(d.match(/M/g) ?? []).toHaveLength(3);
    expect(d.match(/L/g) ?? []).toHaveLength(3);
    // 关键：B 入口（112,0，从 A 那段）≠ B 出口（112,8，朝向 C 的那段）
    expect(d).toContain('L 112 0');
    expect(d).toContain('M 112 8');
  });

  it("直接坐标点 + 折角混合：cursor 复用（无 clip 差异时不起新 sub-path）", () => {
    // 全直接点，每段 fromClip 等于 lastEnd → 复用 cursor，全程一个 sub-path
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'step', via: '-|', to: [20, 5] },
          ],
        },
      ],
    };
    const d = findPathPrim(compileToScene(ir).primitives).d;
    // 期望单 sub-path：M 一次 + L 三次
    expect(d.match(/M/g) ?? []).toHaveLength(1);
    expect(d).toBe('M 0 0 L 10 0 L 20 0 L 20 5');
  });
});

