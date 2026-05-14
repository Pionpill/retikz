import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { GroupPrim, ScenePrimitive, TextPrim } from '../../src/primitive';

const findTextPrims = (prims: Array<ScenePrimitive>): Array<TextPrim> =>
  prims.filter((p): p is TextPrim => p.type === 'text');

const findGroupPrim = (prims: Array<ScenePrimitive>): GroupPrim | undefined =>
  prims.find((p): p is GroupPrim => p.type === 'group');

const linePathIR = (label: NonNullable<Parameters<typeof JSON.stringify>[0]>): IR => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        // line step 携带 label
        { type: 'step', kind: 'line', to: [10, 0], label: label as never },
      ],
    },
  ],
});

describe('step.label：line 段的 label 几何', () => {
  it('默认 (position=midway, side=above)：TextPrim 落在中点上方，align=middle baseline=bottom', () => {
    const scene = compileToScene(linePathIR({ text: 'accept' }));
    const labels = findTextPrims(scene.primitives);
    expect(labels).toHaveLength(1);
    const t = labels[0];
    expect(t.x).toBe(5);
    // above 默认 4px 偏移（compile/path 内部常量）；y 不可超过原始中点
    expect(t.y).toBeLessThan(0);
    expect(t.align).toBe('middle');
    expect(t.baseline).toBe('bottom');
    expect(t.lines).toEqual([{ text: 'accept' }]);
  });

  it('position=near-start → t=0.25 处', () => {
    const scene = compileToScene(linePathIR({ text: 'x', position: 'near-start' }));
    const labels = findTextPrims(scene.primitives);
    expect(labels[0].x).toBe(2.5);
  });

  it('position=near-end → t=0.75 处', () => {
    const scene = compileToScene(linePathIR({ text: 'x', position: 'near-end' }));
    const labels = findTextPrims(scene.primitives);
    expect(labels[0].x).toBe(7.5);
  });

  it('side=below → align=middle baseline=top，y 在中点下方', () => {
    const scene = compileToScene(linePathIR({ text: 'x', side: 'below' }));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.align).toBe('middle');
    expect(t.baseline).toBe('top');
    expect(t.y).toBeGreaterThan(0);
  });

  it('side=left → align=end baseline=middle，x 在中点左侧', () => {
    const scene = compileToScene(linePathIR({ text: 'x', side: 'left' }));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.align).toBe('end');
    expect(t.baseline).toBe('middle');
    expect(t.x).toBeLessThan(5);
    expect(t.y).toBe(0);
  });

  it('side=right → align=start baseline=middle，x 在中点右侧', () => {
    const scene = compileToScene(linePathIR({ text: 'x', side: 'right' }));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.align).toBe('start');
    expect(t.baseline).toBe('middle');
    expect(t.x).toBeGreaterThan(5);
    expect(t.y).toBe(0);
  });

  it('side=sloped → 外裹 group 旋转，水平段 angle=0', () => {
    const scene = compileToScene(linePathIR({ text: 'x', side: 'sloped' }));
    const grp = findGroupPrim(scene.primitives);
    expect(grp).toBeDefined();
    expect(grp!.transforms).toEqual([{ kind: 'rotate', degrees: 0, cx: 5, cy: 0 }]);
    const inner = grp!.children.find((c): c is TextPrim => c.type === 'text');
    expect(inner).toBeDefined();
    // 锚点不偏移
    expect(inner!.x).toBe(5);
    expect(inner!.y).toBe(0);
  });

  it('sloped 在垂直段上 angle=90', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [0, 10], label: { text: 'x', side: 'sloped' } },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const grp = findGroupPrim(scene.primitives);
    expect(grp!.transforms).toEqual([{ kind: 'rotate', degrees: 90, cx: 0, cy: 5 }]);
  });
});

describe('step.label：覆盖各 step kind', () => {
  it('curve 段 label 在 t=0.5 处的二次贝塞尔顶点上方', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            // 对称二次贝塞尔：from(0,0) - control(5, -10) - to(10, 0)
            // 注意 SVG y 向下，control y=-10 表示视觉向上凸
            {
              type: 'step',
              kind: 'curve',
              control: [5, -10],
              to: [10, 0],
              label: { text: 'q' },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // 二次贝塞尔 t=0.5 顶点：(5, -5)；above 再向上偏 4
    expect(t.x).toBe(5);
    expect(t.y).toBeLessThan(-5);
    expect(t.lines[0].text).toBe('q');
  });

  it('cubic 段 label 在 t=0.5 处', () => {
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
              kind: 'cubic',
              control1: [4, -8],
              control2: [6, -8],
              to: [10, 0],
              label: { text: 'c' },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(5);
    // cubic 对称、控制点 y=-8 → t=0.5 顶点 y=0.375*-8 + 0.375*-8 = -6
    expect(t.y).toBeLessThan(-6);
  });

  it('fold (step) 段 label 默认 midway 落在 corner 上', () => {
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
              kind: 'step',
              via: '-|',
              to: [10, 5],
              label: { text: 'f' },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // via='-|' corner=(10, 0)；above 向 -y 偏 4
    expect(t.x).toBe(10);
    expect(t.y).toBeLessThan(0);
  });

  it('arc 段 label 在扫过区间中点角', () => {
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
              label: { text: 'a' },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // 圆心 = move 终点 (0, 0)；t=0.5 → angle=45°
    expect(t.x).toBeCloseTo(Math.cos(Math.PI / 4) * 10, 1);
    expect(t.y).toBeLessThan(Math.sin(Math.PI / 4) * 10); // above 偏移
  });

  it('circlePath 段 label 默认在 t=0.5 (west)', () => {
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
              kind: 'circlePath',
              radius: 10,
              label: { text: 'c' },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // 圆心 (0,0)，t=0.5 → angle=180° → (-10, 0)
    expect(t.x).toBeCloseTo(-10, 6);
    expect(t.y).toBeLessThan(0);
  });

  it('move / cycle step 不挂 label——schema 已禁止；这里只验编译期同样不发 TextPrim', () => {
    // schema 上 move/cycle 没 label 字段；构造一个对象绕过 TS（运行时 in-check 兜底）
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [5, 0] },
            { type: 'step', kind: 'cycle', label: { text: 'never' } },
          ],
        },
      ],
    } as IR;
    const scene = compileToScene(ir);
    expect(findTextPrims(scene.primitives)).toHaveLength(0);
  });

  it('多个 step 各自带 label → 每个 step 一个 TextPrim，顺序与 step 一致', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0], label: { text: 'one' } },
            { type: 'step', kind: 'line', to: [10, 10], label: { text: 'two' } },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const labels = findTextPrims(scene.primitives);
    expect(labels.map(t => t.lines[0].text)).toEqual(['one', 'two']);
  });
});

describe('step.label：layout 把标签纳入 bbox', () => {
  it('side=above 时 label 锚点在路径外，layout 至少要包住其外接四角', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0], label: { text: 'hello world' } },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    // 不假设 padding 具体值，只验 layout y 上界包住 label 上沿
    // label y < 0；measuredHeight ≈ 16；layout.y ≤ label.y - measuredHeight/2 - padding
    expect(scene.layout.y).toBeLessThan(-10);
  });
});

// =============================================================================
// label.position 扩展：7 keyword + 任意数值 t（0..1）的几何参数化
// =============================================================================

/** 直线段（长度 L=100）通用 IR 构造器：label.position 自由传 */
const lineWithLabel = (position: unknown): IR => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        {
          type: 'step',
          kind: 'line',
          to: [100, 0],
          label: { text: 'L', position: position as never },
        },
      ],
    },
  ],
});

describe('label on line：keyword + 数值 t', () => {
  it('label_keyword_at_start：position="at-start" → x=0（直线起点）', () => {
    const scene = compileToScene(lineWithLabel('at-start'));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(0);
  });
  it('label_keyword_very_near_start：position="very-near-start" → x=12.5（t=0.125）', () => {
    const scene = compileToScene(lineWithLabel('very-near-start'));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(12.5);
  });
  it('label_keyword_near_start：position="near-start" → x=25', () => {
    const scene = compileToScene(lineWithLabel('near-start'));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(25);
  });
  it('label_keyword_midway：position="midway" → x=50', () => {
    const scene = compileToScene(lineWithLabel('midway'));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(50);
  });
  it('label_keyword_near_end：position="near-end" → x=75', () => {
    const scene = compileToScene(lineWithLabel('near-end'));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(75);
  });
  it('label_keyword_very_near_end：position="very-near-end" → x=87.5（t=0.875）', () => {
    const scene = compileToScene(lineWithLabel('very-near-end'));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(87.5);
  });
  it('label_keyword_at_end：position="at-end" → x=100（直线终点）', () => {
    const scene = compileToScene(lineWithLabel('at-end'));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(100);
  });
  it('label_numeric_0_3_line：position=0.3 → x=30', () => {
    const scene = compileToScene(lineWithLabel(0.3));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(30);
  });
  it('label_numeric_0_0_line：position=0 → x=0（直线起点）', () => {
    const scene = compileToScene(lineWithLabel(0));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(0);
  });
  it('label_numeric_1_0_line：position=1 → x=100（直线终点）', () => {
    const scene = compileToScene(lineWithLabel(1));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(100);
  });
  it('label_at_start_equals_t_0：keyword "at-start" 与数值 0 几何位置相同', () => {
    const a = compileToScene(lineWithLabel('at-start'));
    const b = compileToScene(lineWithLabel(0));
    expect(findTextPrims(a.primitives)[0].x).toBe(findTextPrims(b.primitives)[0].x);
  });
  it('label_at_end_equals_t_1：keyword "at-end" 与数值 1 几何位置相同', () => {
    const a = compileToScene(lineWithLabel('at-end'));
    const b = compileToScene(lineWithLabel(1));
    expect(findTextPrims(a.primitives)[0].x).toBe(findTextPrims(b.primitives)[0].x);
  });
});

describe('label on fold (step kind="step")：N=2 段等 t 拼接、拐角恒在 t=0.5', () => {
  /** via='-\|' from (0,0) to (40, 30) → corner (40, 0)；段长悬殊：段1 长 40，段 2 长 30 */
  const foldIR = (position: unknown): IR => ({
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          {
            type: 'step',
            kind: 'step',
            via: '-|',
            to: [40, 30],
            label: { text: 'F', position: position as never },
          },
        ],
      },
    ],
  });

  it('label_fold_t_0_5_at_corner：position=0.5 落在拐角 (40, 0)', () => {
    const scene = compileToScene(foldIR(0.5));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(40);
    // above 偏移：y < 0
    expect(t.y).toBeLessThan(0);
  });
  it('label_fold_t_0_25_segment_1_mid：position=0.25 落在段 1 中点 (20, 0)', () => {
    const scene = compileToScene(foldIR(0.25));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(20);
  });
  it('label_fold_t_0_75_segment_2_mid：position=0.75 落在段 2 中点 (40, 15)', () => {
    const scene = compileToScene(foldIR(0.75));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(40);
    // 段 2 中点 y=15，above 上移 4 → y ≈ 15（左/右偏移不挪 y；above 挪 y-）
    expect(t.y).toBeCloseTo(15 - 4, 2);
  });
  it('label_fold_t_0_at_start：position=0 落在 (0, 0)', () => {
    const scene = compileToScene(foldIR(0));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(0);
    expect(t.y).toBeLessThan(0);
  });
  it('label_fold_t_1_at_end：position=1 落在 (40, 30)', () => {
    const scene = compileToScene(foldIR(1));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(40);
    expect(t.y).toBeCloseTo(30 - 4, 2);
  });
  it('label_fold_unequal_segments_corner_still_at_t_0_5：段长悬殊，拐角恒在 t=0.5', () => {
    // 段 1 长 100 / 段 2 长 1：via='-|' from (0,0) to (100, 1) → corner (100, 0)
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
              kind: 'step',
              via: '-|',
              to: [100, 1],
              label: { text: 'F', position: 0.5 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // 拐角 (100, 0)，above 上移
    expect(t.x).toBe(100);
    expect(t.y).toBeLessThan(0);
  });
});

describe('label on curve (quadratic Bezier)：Bezier 参数 t（非弧长）', () => {
  /** 对称二次贝塞尔 from(0,0) control(50,-100) to(100,0)：t=0.5 顶点 (50, -50) */
  const curveIR = (position: unknown): IR => ({
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
            control: [50, -100],
            to: [100, 0],
            label: { text: 'Q', position: position as never },
          },
        ],
      },
    ],
  });

  it('label_curve_t_0_5_at_bezier_midpoint：position=0.5 → Bezier t=0.5 顶点 (50, -50)', () => {
    const scene = compileToScene(curveIR(0.5));
    const t = findTextPrims(scene.primitives)[0];
    // 二次贝塞尔 t=0.5：(1-t)²·P0 + 2(1-t)t·P1 + t²·P2 = 0.25·0 + 0.5·50 + 0.25·100 = 50
    // y = 0.25·0 + 0.5·(-100) + 0.25·0 = -50；above 再上移 → y < -50
    expect(t.x).toBe(50);
    expect(t.y).toBeLessThan(-50);
  });
  it('label_curve_t_0_25_at_bezier_0_25：position=0.25 → Bezier t=0.25', () => {
    const scene = compileToScene(curveIR(0.25));
    const t = findTextPrims(scene.primitives)[0];
    // Bx(0.25) = 0.5625·0 + 0.375·50 + 0.0625·100 = 25；By = 0.375·(-100) = -37.5
    expect(t.x).toBe(25);
    // 上移后 y < -37.5
    expect(t.y).toBeLessThan(-37.5);
  });
  it('label_curve_t_0_5_not_arc_length_midpoint：Bezier t=0.5 通常 ≠ 视觉弧长中点（验 x=50 而非弧长中心）', () => {
    // 不对称曲线：control 拉偏让 Bezier t=0.5 与弧长中点显著不同
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
              control: [10, -100],
              to: [100, 0],
              label: { text: 'Q', position: 0.5 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // Bezier t=0.5 x: 0.25·0 + 0.5·10 + 0.25·100 = 30（不是 50 视觉中点）
    expect(t.x).toBe(30);
  });
});

describe('label on cubic Bezier：Bezier 参数 t', () => {
  /** 对称 cubic from(0,0) c1(0,-100) c2(100,-100) to(100,0)：t=0.5 → (50, -75) */
  const cubicIR = (position: unknown): IR => ({
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          {
            type: 'step',
            kind: 'cubic',
            control1: [0, -100],
            control2: [100, -100],
            to: [100, 0],
            label: { text: 'C', position: position as never },
          },
        ],
      },
    ],
  });

  it('label_cubic_t_0_5_at_bezier_midpoint：position=0.5 → cubic Bezier t=0.5 位置', () => {
    const scene = compileToScene(cubicIR(0.5));
    const t = findTextPrims(scene.primitives)[0];
    // P(0.5) x = 0.125·0 + 0.375·0 + 0.375·100 + 0.125·100 = 50
    // y = 0.375·(-100) + 0.375·(-100) = -75
    expect(t.x).toBe(50);
    expect(t.y).toBeLessThan(-75);
  });
  it('label_cubic_t_0_25：position=0.25', () => {
    const scene = compileToScene(cubicIR(0.25));
    const t = findTextPrims(scene.primitives)[0];
    // x = 0.4219·0 + 0.4219·0 + 0.1406·100 + 0.0156·100 = 15.625（round 后 15.63）
    expect(t.x).toBeCloseTo(15.625, 1);
  });
});

describe('label on bend：lower 成 cubic 后 Bezier t', () => {
  it('label_bend_lowered_cubic_same_t_behavior：bend 段 label 在 t=0.5 处（与对称 cubic 行为一致）', () => {
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
              kind: 'bend',
              to: [100, 0],
              bendDirection: 'left',
              bendAngle: 30,
              label: { text: 'B', position: 0.5 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // bend 对称：t=0.5 x = 50；y 在 above 偏移后是负值
    expect(t.x).toBe(50);
    // bend left：control 把曲线推到 y<0 侧；above 偏移再 -4
    expect(t.y).toBeLessThan(0);
  });
});

describe('label on arc：角度参数化 startAngle..endAngle', () => {
  it('label_arc_t_0_5_at_mid_angle：position=0.5 → (start+end)/2 角度', () => {
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
              radius: 100,
              label: { text: 'A', position: 0.5 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // center=(0,0)，t=0.5 → 45° → (cos45·100, sin45·100) = (70.71, 70.71)
    expect(t.x).toBeCloseTo(Math.cos(Math.PI / 4) * 100, 1);
    // 切线 above 偏移后 y < sin45·100
    expect(t.y).toBeLessThan(Math.sin(Math.PI / 4) * 100);
  });
  it('label_arc_t_0_25_at_quarter_angle：position=0.25 → start + (end-start)·0.25', () => {
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
              radius: 100,
              label: { text: 'A', position: 0.25 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // t=0.25 → 22.5° → (cos22.5·100, sin22.5·100)
    expect(t.x).toBeCloseTo(Math.cos((22.5 * Math.PI) / 180) * 100, 1);
  });
  it('label_arc_keyword_at_start：keyword "at-start" → 起始角度位置', () => {
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
              radius: 100,
              label: { text: 'A', position: 'at-start' },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // t=0 → angle=0° → (100, 0)
    expect(t.x).toBe(100);
  });
});

describe('label on circlePath：整圆 t∈[0,1]，t=0 = angle 0 (+x), CCW', () => {
  const circleIR = (position: unknown): IR => ({
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          {
            type: 'step',
            kind: 'circlePath',
            radius: 100,
            label: { text: 'C', position: position as never },
          },
        ],
      },
    ],
  });

  it('label_circlePath_t_0_at_pos_x：position=0 → angle 0° (100, 0)', () => {
    const scene = compileToScene(circleIR(0));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(100);
    expect(t.y).toBeCloseTo(0 - 4, 2); // above 偏移
  });
  it('label_circlePath_t_0_25_at_90deg：position=0.25 → 90° (0, +100)（SVG y 朝下视觉朝下）', () => {
    const scene = compileToScene(circleIR(0.25));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBeCloseTo(0, 1);
    // 90° in math convention with SVG y-down → y = sin(90)·100 = 100
    expect(t.y).toBeGreaterThan(95); // above 偏移 -4，y ≈ 96
  });
  it('label_circlePath_t_0_5_at_180deg：position=0.5 → 180° (-100, 0)', () => {
    const scene = compileToScene(circleIR(0.5));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBeCloseTo(-100, 1);
  });
  it('label_circlePath_t_0_75_at_270deg：position=0.75 → 270° (0, -100)（屏幕上方）', () => {
    const scene = compileToScene(circleIR(0.75));
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBeCloseTo(0, 1);
    // 270° → y = sin(270)·100 = -100；above 偏移 → y < -100
    expect(t.y).toBeLessThan(-100);
  });
  it('label_circlePath_keyword_midway_equals_t_0_5：keyword 与数值 0.5 同位置', () => {
    const a = compileToScene(circleIR('midway'));
    const b = compileToScene(circleIR(0.5));
    expect(findTextPrims(a.primitives)[0].x).toBeCloseTo(findTextPrims(b.primitives)[0].x, 6);
    expect(findTextPrims(a.primitives)[0].y).toBeCloseTo(findTextPrims(b.primitives)[0].y, 6);
  });
});

describe('label on ellipsePath：同 circlePath 角度参数化（非弧长）', () => {
  it('label_ellipsePath_t_0_5_at_180deg：rx≠ry，position=0.5 → angle 180° (-rx, 0)', () => {
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
              kind: 'ellipsePath',
              radiusX: 150,
              radiusY: 50,
              label: { text: 'E', position: 0.5 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBeCloseTo(-150, 1);
  });
  it('label_ellipsePath_t_0_at_pos_x：position=0 → (rx, 0)', () => {
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
              kind: 'ellipsePath',
              radiusX: 150,
              radiusY: 50,
              label: { text: 'E', position: 0 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(150);
  });
});

describe('label.position schema 边界：异常值由 zod 拒绝（不在 compile 阶段 clamp）', () => {
  // 用 IR 通过 PathSchema / StepLabelSchema 解析；构造直接喂 path schema 验证
  it('label_position_below_0_rejected：position=-0.1 → schema 校验失败', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: -0.1 });
    expect(result.success).toBe(false);
  });
  it('label_position_above_1_rejected：position=1.5 → schema 校验失败', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: 1.5 });
    expect(result.success).toBe(false);
  });
  it('label_unknown_keyword_rejected：position="unknown" → schema 校验失败', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: 'unknown' });
    expect(result.success).toBe(false);
  });
  it('label_legacy_3_keywords_still_accepted：旧 IR 的 "midway"/"near-start"/"near-end" 仍合法', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    for (const k of ['midway', 'near-start', 'near-end']) {
      const result = StepLabelSchema.safeParse({ text: 'x', position: k });
      expect(result.success).toBe(true);
    }
  });
  it('label_all_7_keywords_accepted：7 个新 keyword 全部合法', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const keywords = [
      'at-start',
      'very-near-start',
      'near-start',
      'midway',
      'near-end',
      'very-near-end',
      'at-end',
    ];
    for (const k of keywords) {
      const result = StepLabelSchema.safeParse({ text: 'x', position: k });
      expect(result.success).toBe(true);
    }
  });
  it('label_numeric_0_and_1_accepted：边界 0 / 1 合法', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    expect(StepLabelSchema.safeParse({ text: 'x', position: 0 }).success).toBe(true);
    expect(StepLabelSchema.safeParse({ text: 'x', position: 1 }).success).toBe(true);
  });
});

// =============================================================================
// Adversarial：bug hunter 视角，专找参数化 / schema / 端点漏网之鱼
// =============================================================================

describe('label.position adversarial：构造让实现挂的输入', () => {
  it('adv_NaN_rejected：position=NaN → zod 拒绝（NaN 不在 [0,1] 区间）', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: Number.NaN });
    expect(result.success).toBe(false);
  });
  it('adv_Infinity_rejected：position=+Infinity → 拒绝', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: Number.POSITIVE_INFINITY });
    expect(result.success).toBe(false);
  });
  it('adv_neg_zero_accepted：position=-0 → 接受（IEEE -0 == 0 在数学上等价 t=0）', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: -0 });
    expect(result.success).toBe(true);
  });
  it('adv_just_above_1_rejected：position=1.0000000001 → 拒绝', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: 1.0000000001 });
    expect(result.success).toBe(false);
  });
  it('adv_boolean_rejected：position=true → 拒绝（不是 enum 也不是 number）', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: true });
    expect(result.success).toBe(false);
  });
  it('adv_null_rejected：position=null → 拒绝（optional 接受 undefined 但不接受 null）', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: null });
    expect(result.success).toBe(false);
  });
  it('adv_undefined_uses_default：position 缺省 → tForLabelPosition 回退 midway (t=0.5)', () => {
    // 直接用直线段 + 不写 position，期望 x=50
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'X' } },
          ],
        },
      ],
    });
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(50);
  });
  it('adv_keyword_camelCase_rejected：position="atStart" 驼峰拒绝（必须 kebab）', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: 'atStart' });
    expect(result.success).toBe(false);
  });
  it('adv_keyword_space_rejected：position="at start" 含空格拒绝（TikZ 用空格 retikz 用连字符）', async () => {
    const { StepLabelSchema } = await import('../../src/ir/path/step');
    const result = StepLabelSchema.safeParse({ text: 'x', position: 'at start' });
    expect(result.success).toBe(false);
  });
  it('adv_arc_cw_sweep：endAngle<startAngle 时 t 仍线性映射（不强制 CCW）', () => {
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
              startAngle: 90,
              endAngle: 0, // CW sweep
              radius: 100,
              label: { text: 'A', position: 0.5 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // t=0.5 → angle=90 + 0.5·(0-90) = 45° → (70.71, 70.71)
    expect(t.x).toBeCloseTo(Math.cos(Math.PI / 4) * 100, 1);
  });
  it('adv_circle_t_1_wraps_to_start：t=1 → angle 360° = angle 0°（同 t=0 位置）', () => {
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'circlePath',
              radius: 100,
              label: { text: 'C', position: 1 },
            },
          ],
        },
      ],
    });
    const t = findTextPrims(scene.primitives)[0];
    // 360° = 0° → (100, 0)
    expect(t.x).toBeCloseTo(100, 1);
  });
  it('adv_fold_via_pipe_dash：via="|-" t=0.5 仍落 corner（对称性）', () => {
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
              kind: 'step',
              via: '|-',
              to: [40, 30],
              label: { text: 'F', position: 0.5 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // via='|-' corner=(0, 30)
    expect(t.x).toBe(0);
    // above 偏移 corner y=30 → y ≈ 26
    expect(t.y).toBeCloseTo(30 - 4, 2);
  });
  it('adv_fold_t_just_above_half：t=0.500001 落第二段起点（边界刚过）', () => {
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
              kind: 'step',
              via: '-|',
              to: [40, 30],
              label: { text: 'F', position: 0.500001 },
            },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const t = findTextPrims(scene.primitives)[0];
    // corner=(40,0)；t=0.5+eps 段 2 内 (2t-1) ≈ 2e-6 → 几乎贴 corner
    expect(t.x).toBe(40);
    expect(t.y).toBeCloseTo(0 - 4, 2);
  });
  it('adv_line_keyword_vs_number_consistency：每个 keyword 与对应数值 t 落点完全相同', () => {
    const pairs: Array<[string, number]> = [
      ['at-start', 0],
      ['very-near-start', 0.125],
      ['near-start', 0.25],
      ['midway', 0.5],
      ['near-end', 0.75],
      ['very-near-end', 0.875],
      ['at-end', 1],
    ];
    for (const [kw, num] of pairs) {
      const a = compileToScene(lineWithLabel(kw));
      const b = compileToScene(lineWithLabel(num));
      expect(findTextPrims(a.primitives)[0].x).toBe(findTextPrims(b.primitives)[0].x);
      expect(findTextPrims(a.primitives)[0].y).toBe(findTextPrims(b.primitives)[0].y);
    }
  });
  it('adv_curve_t_0_at_start_endpoint：position=0 落在起点（不要因 Bezier 公式 NaN 漂移）', () => {
    const scene = compileToScene({
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
              control: [50, -100],
              to: [100, 0],
              label: { text: 'Q', position: 0 },
            },
          ],
        },
      ],
    });
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(0);
  });
  it('adv_curve_t_1_at_end_endpoint：position=1 落在终点', () => {
    const scene = compileToScene({
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
              control: [50, -100],
              to: [100, 0],
              label: { text: 'Q', position: 1 },
            },
          ],
        },
      ],
    });
    const t = findTextPrims(scene.primitives)[0];
    expect(t.x).toBe(100);
  });
  it('adv_ellipse_aspect_ratio_extreme：rx >> ry，t=0.25 → 90° 在 (0, ry)', () => {
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'ellipsePath',
              radiusX: 500,
              radiusY: 5,
              label: { text: 'E', position: 0.25 },
            },
          ],
        },
      ],
    });
    const t = findTextPrims(scene.primitives)[0];
    // angle 90° → (500·cos90, 5·sin90) = (0, 5)；y above 上移
    expect(t.x).toBeCloseTo(0, 1);
    expect(t.y).toBeLessThan(5);
  });
});
