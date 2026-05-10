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
        // ADR-0004：line step 携带 label
        { type: 'step', kind: 'line', to: [10, 0], label: label as never },
      ],
    },
  ],
});

describe('ADR-0004 step.label：line 段的 label 几何', () => {
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
    expect(grp!.transform).toMatch(/^rotate\(0 5 0\)$/);
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
    expect(grp!.transform).toMatch(/^rotate\(90 0 5\)$/);
  });
});

describe('ADR-0004 step.label：覆盖各 step kind', () => {
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

describe('ADR-0004 step.label：viewBox 把标签纳入 bbox', () => {
  it('side=above 时 label 锚点在路径外，viewBox 至少要包住其外接四角', () => {
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
    // 不假设 padding 具体值，只验 viewBox y 上界包住 label 上沿
    // label y < 0；measuredHeight ≈ 16；viewBox.y ≤ label.y - measuredHeight/2 - padding
    expect(scene.viewBox.y).toBeLessThan(-10);
  });
});
