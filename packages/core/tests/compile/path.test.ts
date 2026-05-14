import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';
import { arc, close, cubic, ellipseArc, line, move, quad } from '../helpers/path-command-factory';

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
    expect(findPathPrim(scene.primitives).commands).toEqual([
      move([0, 0]),
      line([10, 5]),
    ]);
  });
});

describe("compile path: 'step' 折角", () => {
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
    expect(findPathPrim(compileToScene(folded).primitives).commands).toEqual(
      findPathPrim(compileToScene(manual).primitives).commands,
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
    expect(findPathPrim(compileToScene(folded).primitives).commands).toEqual(
      findPathPrim(compileToScene(manual).primitives).commands,
    );
  });

  it('折角中间点参与 layout 计算（不会被裁掉）', () => {
    // 起点 (0,0)，终点 (40, 30)，via='-|' → 中点 (40, 0)
    // 三个点的 bbox: x in [0,40], y in [0,30]；padding=10 → layout [-10,-10,60,50]
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
    expect(scene.layout).toEqual({ x: -10, y: -10, width: 60, height: 50 });
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
    const commands = findPathPrim(scene.primitives).commands;
    expect(commands.map(c => c.kind)).toEqual(['move', 'line', 'line']); // M start, L corner, L end
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
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([8, 0]),
      line([100, 0]),
      line([100, 52]),
    ]);
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
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 8]),
      line([0, 60]),
      line([92, 60]),
    ]);
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
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([10, 10]),
      close(),
    ]);
  });

  it('cycle 不引入新 endpoints，layout 与不带 cycle 的等价路径一致', () => {
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
    expect(compileToScene(irWith).layout).toEqual(
      compileToScene(irWithout).layout,
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
    const commands = findPathPrim(compileToScene(ir).primitives).commands;
    // 三段独立：A→B、B→C、C→A，每段都 M 开头；不出现 close
    expect(commands.some(c => c.kind === 'close')).toBe(false);
    expect(commands.filter(c => c.kind === 'move')).toHaveLength(3);
  });
});

describe('compile path: fill / fillRule', () => {
  it('缺省 fill = none（仅描边，向后兼容）', () => {
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
    expect(path.fill).toBe('none');
    expect(path.fillRule).toBeUndefined();
  });

  it('显式 fill 透传到 PathPrim', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          fill: '#3b82f6',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.fill).toBe('#3b82f6');
  });

  it("fillRule 'evenodd' 透传", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          fill: 'red',
          fillRule: 'evenodd',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.fillRule).toBe('evenodd');
  });
});

describe("compile path: arrow 箭头", () => {
  it("arrow: '->' → PathPrim arrowEnd shape='normal'，arrowStart 不写", () => {
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
    expect(path.arrowEnd?.shape).toBe('normal');
    expect(path.arrowStart).toBeUndefined();
  });

  it("arrow: '<-' → arrowStart shape='normal'", () => {
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
    expect(path.arrowStart?.shape).toBe('normal');
    expect(path.arrowEnd).toBeUndefined();
  });

  it("arrow: '<->' → 两端都 shape='normal'", () => {
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
    expect(path.arrowStart?.shape).toBe('normal');
    expect(path.arrowEnd?.shape).toBe('normal');
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
    //   末段 d="M ... L ..."（arrowEnd shape='normal'）
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
    expect(last.arrowEnd?.shape).toBe('normal');
  });

  it("arrowDetail.shape 透传到 PathPrim 作为 arrowEnd / arrowStart 的 shape", () => {
    for (const shape of ['normal', 'open', 'stealth', 'diamond', 'circle'] as const) {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            arrow: '->',
            arrowDetail: { shape },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      };
      const path = findPathPrim(compileToScene(ir).primitives);
      expect(path.arrowEnd?.shape).toBe(shape);
    }
  });

  it("open shape 让 path 末端向内缩 5.25×strokeWidth（line 端点接在 back stroke 外缘）", () => {
    // 默认 length=6, scale=1, lineWidth=1.5：shrink = (8 + 1.5/2) × 6 / 10 = 5.25 path 单位
    // 线段 (0,0) → (100,0)，shrink 后变 (0,0) → (94.75, 0)；line 端点不再贯穿 back outline
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'open' },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([94.75, 0]),
    ]);
  });

  it("strokeWidth 翻倍时 shrink 也翻倍（5.25 × strokeWidth）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'open' },
          strokeWidth: 2,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    // shrink = 5.25 × 2 = 10.5 → (100 - 10.5, 0) = (89.5, 0)
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([89.5, 0]),
    ]);
  });

  it.each([
    ['normal', 94],   // shrink = length × scale = 6
    ['diamond', 94],
    ['circle', 94],
    ['stealth', 95.8], // shrink = 0.7 × length × scale = 4.2（V tip x=3，line 嵌进凹口）
  ] as const)("实心 shape %s 也 shrink（line 端点接在 arrow 尾部，低 opacity 下不透出 line）", (shape, expectedEndX) => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([expectedEndX, 0]),
    ]);
  });

  it("arrowDetail 缺省时 shape 回退 'normal'", () => {
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
    expect(findPathPrim(compileToScene(ir).primitives).arrowEnd?.shape).toBe('normal');
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
    expect(path.arrowEnd?.shape).toBe('normal');
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
    const commands = findPathPrim(compileToScene(ir).primitives).commands;
    // 关键：3 个 move（每段独立起点），共 3 个 line
    expect(commands.filter(c => c.kind === 'move')).toHaveLength(3);
    expect(commands.filter(c => c.kind === 'line')).toHaveLength(3);
    // 关键：B 入口（112,0，从 A 那段）≠ B 出口（112,8，朝向 C 的那段）
    expect(commands).toContainEqual(line([112, 0]));
    expect(commands).toContainEqual(move([112, 8]));
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
    const commands = findPathPrim(compileToScene(ir).primitives).commands;
    // 期望单 sub-path：move 一次 + line 三次
    expect(commands.filter(c => c.kind === 'move')).toHaveLength(1);
    expect(commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([20, 0]),
      line([20, 5]),
    ]);
  });
});

describe("compile path: 'curve'", () => {
  it('curve 直接坐标 → M ... Q cx,cy x,y', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', to: [10, 0], control: [5, 8] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      quad([5, 8], [10, 0]),
    ]);
  });

  it('curve 与 line 混用：line → curve → line 串联', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [5, 0] },
            { type: 'step', kind: 'curve', to: [10, 5], control: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([5, 0]),
      quad([10, 0], [10, 5]),
      line([10, 10]),
    ]);
  });

  it('curve 接 cycle：闭合段是直线', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', to: [10, 0], control: [5, 8] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      quad([5, 8], [10, 0]),
      close(),
    ]);
  });
});

describe("compile path: 'cubic'", () => {
  it('cubic 直接坐标 → M ... C c1x c1y c2x c2y x y', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', to: [10, 0], control1: [3, 5], control2: [7, 5] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      cubic([3, 5], [7, 5], [10, 0]),
    ]);
  });

  it('cubic 与 line 混用', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', to: [10, 0], control1: [2, 5], control2: [8, 5] },
            { type: 'step', kind: 'line', to: [20, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      cubic([2, 5], [8, 5], [10, 0]),
      line([20, 0]),
    ]);
  });

  it('cubic + cycle', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', to: [10, 10], control1: [5, 0], control2: [10, 5] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      cubic([5, 0], [10, 5], [10, 10]),
      close(),
    ]);
  });
});

describe("compile path: 'bend'", () => {
  it('bend left 30° on horizontal chord → C 命令，控制点 y < 0', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [12, 0], bendDirection: 'left', bendAngle: 30 },
          ],
        },
      ],
    };
    const offset = (12 * Math.tan((15 * Math.PI) / 180) * 4) / 3;
    const r = (n: number) => Math.round(n * 100) / 100;
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      cubic([4, r(-offset)], [8, r(-offset)], [12, 0]),
    ]);
  });

  it('bend 默认角度 30°（省略 bendAngle）等价于显式 30°', () => {
    const irImplicit: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [12, 0], bendDirection: 'left' },
          ],
        },
      ],
    };
    const irExplicit: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [12, 0], bendDirection: 'left', bendAngle: 30 },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(irImplicit).primitives).commands).toEqual(
      findPathPrim(compileToScene(irExplicit).primitives).commands,
    );
  });

  it('bend right 与 left 关于 chord 对称（控制点 y 互为相反数）', () => {
    const irL: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'left', bendAngle: 45 },
          ],
        },
      ],
    };
    const irR: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'right', bendAngle: 45 },
          ],
        },
      ],
    };
    const cmdsL = findPathPrim(compileToScene(irL).primitives).commands;
    const cmdsR = findPathPrim(compileToScene(irR).primitives).commands;
    // 期望第二个 command 是 cubic：control 点 y 关于 chord 对称
    const cubL = cmdsL[1];
    const cubR = cmdsR[1];
    expect(cubL.kind).toBe('cubic');
    expect(cubR.kind).toBe('cubic');
    if (cubL.kind !== 'cubic' || cubR.kind !== 'cubic') return;
    expect(cubL.control1[1]).toBeCloseTo(-cubR.control1[1], 4);
    expect(cubL.control2[1]).toBeCloseTo(-cubR.control2[1], 4);
  });

  it('bend 与 line 混用', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'bend', to: [12, 0], bendDirection: 'left', bendAngle: 30 },
            { type: 'step', kind: 'line', to: [20, 0] },
          ],
        },
      ],
    };
    const commands = findPathPrim(compileToScene(ir).primitives).commands;
    // 起头是 move(0,0) → cubic ...，结尾是 line(20, 0)
    expect(commands[0]).toEqual(move([0, 0]));
    expect(commands[1].kind).toBe('cubic');
    expect(commands[commands.length - 1]).toEqual(line([20, 0]));
  });
});

describe("compile path: 'arc'", () => {
  it('arc 0°→90° 在 [0,0] 圆心 r=10 → M 10,0 A 10 10 0 0 1 0 10', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 90),
    ]);
  });

  it('arc 0°→270°（large arc）→ largeArc flag = 1', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 270, radius: 10 },
          ],
        },
      ],
    };
    // 结构化期望：move 到 startPt (10,0)，再 arc 段角度跨 270° → adapter 自行计算 largeArc=1
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 270),
    ]);
  });

  it('arc 之后接 line：line 起点是弧的终点（不是圆心）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
            { type: 'step', kind: 'line', to: [50, 50] },
          ],
        },
      ],
    };
    // 弧终点 = (0, 10)；line 从 (0, 10) → (50, 50)
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 90),
      line([50, 50]),
    ]);
  });

  it('arc 圆心带偏移（move 到 [5,5]）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [5, 5] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
          ],
        },
      ],
    };
    // 起点 = (5+10, 5) = (15, 5)；圆心 = (5,5)，r=10
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([15, 5]),
      arc([5, 5], 10, 0, 90),
    ]);
  });
});

describe("compile path: 'circlePath'", () => {
  it('circlePath 在原点 r=10 → 两段半弧', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 10 },
          ],
        },
      ],
    };
    // circlePath 产 ellipseArc full sweep (0→360)；adapter 自行拆 SVG 两段
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 360),
    ]);
  });

  it('circle 之后接 line：line 起点是圆心（不是圆周）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 10 },
            { type: 'step', kind: 'line', to: [50, 50] },
          ],
        },
      ],
    };
    // 圆画完 lastEnd 回到 center (0,0) → line 从 (0,0) → (50,50)
    // 由于 (0,0) 不等于 ellipseArc 终点 (10, 0)，会先发 move 然后 line
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 360),
      move([0, 0]),
      line([50, 50]),
    ]);
  });

  it('circle 圆心带偏移', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [20, 30] },
            { type: 'step', kind: 'circlePath', radius: 5 },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([25, 30]),
      ellipseArc([20, 30], 5, 5, 0, 360),
    ]);
  });
});

describe("compile path: 'ellipsePath'", () => {
  it('ellipsePath rx=15 / ry=10 → 两段半弧', () => {
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
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([15, 0]),
      ellipseArc([0, 0], 15, 10, 0, 360),
    ]);
  });

  it('ellipse rx == ry 时与 circle 等价输出', () => {
    const fromEllipse: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'ellipsePath', radiusX: 7, radiusY: 7 },
          ],
        },
      ],
    };
    const fromCircle: IR = {
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
    expect(findPathPrim(compileToScene(fromEllipse).primitives).commands).toEqual(
      findPathPrim(compileToScene(fromCircle).primitives).commands,
    );
  });
});

describe("compile path: 'relative' / 'relativeAccumulate'", () => {
  it('relative 解析为 prevEnd + offset；prevEnd 不更新（链式 relative 全相对同一锚点）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: { relative:[5, 0] } },
            { type: 'step', kind: 'line', to: { relative:[3, 0] } },
          ],
        },
      ],
    };
    // (10,0) prevEnd 锚定；两条 rel 都从 (10,0) 出发
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([15, 0]),
      line([13, 0]),
    ]);
  });

  it('relativeAccumulate 解析为 prevEnd + offset；更新 prevEnd（链式累积）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: { relativeAccumulate:[5, 0] } },
            { type: 'step', kind: 'line', to: { relativeAccumulate:[3, 0] } },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([15, 0]),
      line([18, 0]),
    ]);
  });

  it('relative + relativeAccumulate 混用', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { relative:[10, 0] } },          // → (10,0)，prevEnd 留 (0,0)
            { type: 'step', kind: 'line', to: { relativeAccumulate:[5, 5] } }, // → (5,5)，prevEnd → (5,5)
            { type: 'step', kind: 'line', to: { relative:[-3, 0] } },          // → (2,5)，prevEnd 留 (5,5)
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([5, 5]),
      line([2, 5]),
    ]);
  });

  it('relative 与曲线 step 混用（curve 后 prevEnd 是曲线终点）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'curve',
              to: [10, 0],
              control: [5, -5],
            },
            { type: 'step', kind: 'line', to: { relative:[5, 0] } },
          ],
        },
      ],
    };
    // 曲线后 prevEnd = (10,0)；rel 解析到 (15,0)
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      quad([5, -5], [10, 0]),
      line([15, 0]),
    ]);
  });

  it('relative 在 arc 之后：以 arc 终点为锚点', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'arc',
              startAngle: 0,
              endAngle: 90,
              radius: 10,
            },
            { type: 'step', kind: 'line', to: { relative:[5, 0] } },
          ],
        },
      ],
    };
    // arc endpoint (polar y-down) = (0, 10)；relative 解析到 (5, 10)
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 90),
      line([5, 10]),
    ]);
  });

  it('relative 在 circle 之后：以圆心为锚点（prevEnd 不变）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 10 },
            { type: 'step', kind: 'line', to: { relative:[5, 5] } },
          ],
        },
      ],
    };
    // circle 画完 prevEnd 仍是 (0,0)；relative 解析到 (5,5)
    // ellipseArc 后 lastEnd 是 (10,0)（弧终点）；line 起点是
    // penOverride = center = (0,0)，所以会发 move 然后 line
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 360),
      move([0, 0]),
      line([5, 5]),
    ]);
  });

  it('首步是 relative（无 prevEnd）回退到 [0,0]', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            // 首步 move 用 relative：prevEnd 为 null，回退到 [0,0]，relative 解析到 (5, 3)
            { type: 'step', kind: 'move', to: { relative:[5, 3] } },
            { type: 'step', kind: 'line', to: [10, 3] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([5, 3]),
      line([10, 3]),
    ]);
  });

  it('relative 与等价绝对坐标产 IR 不同但 SVG d 相同', () => {
    const irRel: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { relative:[10, 5] } },
            { type: 'step', kind: 'line', to: { relativeAccumulate:[5, 0] } },
          ],
        },
      ],
    };
    const irAbs: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 5] }, // relative 不更新 prevEnd → 但 line 自己更新；这里用绝对值刚好等价
            { type: 'step', kind: 'line', to: [5, 0] },  // relativeAccumulate [5,0] 从 prevEnd (0,0)
          ],
        },
      ],
    };
    // 注意：relative [10,5] 后 prevEnd 留 (0,0)；relativeAccumulate [5,0] 解析到 (0+5, 0+0) = (5,0)
    expect(findPathPrim(compileToScene(irRel).primitives).commands).toEqual(
      findPathPrim(compileToScene(irAbs).primitives).commands,
    );
  });
});

describe('alpha.3 P2：lineCap / lineJoin', () => {
  it('lineCap 透传到 PathPrim.strokeLinecap', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          lineCap: 'round',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeLinecap).toBe('round');
  });

  it('lineJoin 透传到 PathPrim.strokeLinejoin', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          lineJoin: 'bevel',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeLinejoin).toBe('bevel');
  });

  it('未指定时 PathPrim 字段为 undefined（不写 SVG 默认值）', () => {
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
    const p = findPathPrim(compileToScene(ir).primitives);
    expect(p.strokeLinecap).toBeUndefined();
    expect(p.strokeLinejoin).toBeUndefined();
  });
});

describe('alpha.3 P2：thickness 语义档位', () => {
  it.each([
    ['ultraThin', 0.25],
    ['veryThin', 0.5],
    ['thin', 1],
    ['semithick', 1.5],
    ['thick', 2],
    ['veryThick', 3],
    ['ultraThick', 4],
  ] as const)('thickness=%s → strokeWidth=%s', (thickness, width) => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          thickness,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeWidth).toBe(width);
  });

  it('显式 strokeWidth 始终覆盖 thickness（thickness 仅在 strokeWidth 缺省时生效）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          thickness: 'thick',
          strokeWidth: 7,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeWidth).toBe(7);
  });

  it('两者都缺省时退回默认 1', () => {
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
    expect(findPathPrim(compileToScene(ir).primitives).strokeWidth).toBe(1);
  });
});

describe('alpha.3 P2：path 级 opacity / fillOpacity / drawOpacity', () => {
  it('opacity 透传到 PathPrim.opacity', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          opacity: 0.5,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).opacity).toBe(0.5);
  });

  it('fillOpacity 透传', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          fill: 'red',
          fillOpacity: 0.3,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).fillOpacity).toBe(0.3);
  });

  it('IR drawOpacity → PathPrim.strokeOpacity（命名映射，与 Node 一致）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          drawOpacity: 0.7,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeOpacity).toBe(0.7);
  });

  it('未指定时三个 opacity 字段都是 undefined', () => {
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
    const p = findPathPrim(compileToScene(ir).primitives);
    expect(p.opacity).toBeUndefined();
    expect(p.fillOpacity).toBeUndefined();
    expect(p.strokeOpacity).toBeUndefined();
  });
});
