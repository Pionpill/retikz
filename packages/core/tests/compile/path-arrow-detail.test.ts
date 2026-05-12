import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

/**
 * compile path.arrowDetail → PathPrim.arrowStart / arrowEnd（结构化 ArrowEndSpec）
 * @description ADR-03 合同：
 *  - 无 arrowDetail / `arrow="->"` → arrowEnd 仍解析为 { shape: 'normal' }（其余视觉字段不写，让 renderer 走 context-stroke 缺省）
 *  - `arrowDetail.shape` / `scale` / `color` / `fill` / `opacity` / `length` / `width` / `lineWidth` 顶层默认作为起末共享视觉
 *  - `arrowDetail.start` / `end` 子对象**逐字段 merge** 顶层默认：缺省字段继承，已填字段 override
 */
describe('compile arrowDetail：默认行为（不传 arrowDetail）', () => {
  it("arrow='->' 无 arrowDetail → arrowEnd = { shape: 'normal' }，无视觉字段", () => {
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
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowEnd).toEqual({ shape: 'normal' });
    expect(path.arrowStart).toBeUndefined();
  });

  it("arrow='<->' 无 arrowDetail → 两端都 { shape: 'normal' }", () => {
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
    expect(path.arrowStart).toEqual({ shape: 'normal' });
    expect(path.arrowEnd).toEqual({ shape: 'normal' });
  });

  it("arrowDetail={} 等同未传 arrowDetail（空对象 merge 不引入字段）", () => {
    const irEmpty: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: {},
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const irNone: IR = {
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
    const a = findPathPrim(compileToScene(irEmpty).primitives);
    const b = findPathPrim(compileToScene(irNone).primitives);
    expect(a.arrowEnd).toEqual(b.arrowEnd);
  });

  it("arrow='none' / 缺省 → 两端都不挂 marker", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: 'none',
          arrowDetail: { shape: 'stealth', color: 'red' },
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
});

describe("compile arrowDetail：顶层默认 + start/end merge", () => {
  it("arrowDetail.shape 透传起末共享", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          arrowDetail: { shape: 'stealth' },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart?.shape).toBe('stealth');
    expect(path.arrowEnd?.shape).toBe('stealth');
  });

  it("color / scale / opacity 等视觉字段透传到起末", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          arrowDetail: { shape: 'stealth', color: 'red', scale: 1.5, opacity: 0.7 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart).toMatchObject({ shape: 'stealth', color: 'red', scale: 1.5, opacity: 0.7 });
    expect(path.arrowEnd).toMatchObject({ shape: 'stealth', color: 'red', scale: 1.5, opacity: 0.7 });
  });

  it("起末异形：start.shape='normal' / end.shape='stealth'（顶层不写 shape）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          arrowDetail: {
            start: { shape: 'normal' },
            end: { shape: 'stealth' },
          },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart?.shape).toBe('normal');
    expect(path.arrowEnd?.shape).toBe('stealth');
  });

  it("逐字段 merge：顶层 shape='stealth' + start.color='red' → start.shape 继承 stealth、color=red", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          arrowDetail: { shape: 'stealth', start: { color: 'red' } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart?.shape).toBe('stealth');
    expect(path.arrowStart?.color).toBe('red');
    expect(path.arrowEnd?.shape).toBe('stealth');
    expect(path.arrowEnd?.color).toBeUndefined();
  });

  it("起末异色（顶层 shape 共享）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          arrowDetail: {
            shape: 'stealth',
            start: { color: 'red' },
            end: { color: 'blue' },
          },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart).toMatchObject({ shape: 'stealth', color: 'red' });
    expect(path.arrowEnd).toMatchObject({ shape: 'stealth', color: 'blue' });
  });

  it("end override 单端 arrow='<-' 时不挂 end spec（与 arrow direction 一致）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<-',
          arrowDetail: { end: { color: 'red' } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart?.shape).toBe('normal');
    expect(path.arrowEnd).toBeUndefined(); // arrow direction 不含 end → end 配置静默丢
  });
});

describe('compile arrowDetail：空心 shape silent fill ignore', () => {
  it("shape='open' + fill='red' → 编译 path 不抛错；arrowEnd.fill 字段被丢弃", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'open', fill: 'red' },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowEnd?.shape).toBe('open');
    expect(path.arrowEnd?.fill).toBeUndefined();
  });

  it("空心 shape 但顶层 color='blue' → arrowEnd.color='blue' 保留（color 主导描边）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'open', color: 'blue', fill: 'red' },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowEnd?.shape).toBe('open');
    expect(path.arrowEnd?.color).toBe('blue');
    expect(path.arrowEnd?.fill).toBeUndefined();
  });

  it.each(['open', 'openDiamond', 'openCircle'] as const)(
    "空心 shape %s 上 fill 全部丢弃",
    shape => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            arrow: '->',
            arrowDetail: { shape, fill: 'red' },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      };
      const path = findPathPrim(compileToScene(ir).primitives);
      expect(path.arrowEnd?.fill).toBeUndefined();
    },
  );

  it.each(['normal', 'stealth', 'diamond', 'circle'] as const)(
    "实心 shape %s 上 fill 保留",
    shape => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            arrow: '->',
            arrowDetail: { shape, fill: 'red' },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      };
      const path = findPathPrim(compileToScene(ir).primitives);
      expect(path.arrowEnd?.fill).toBe('red');
    },
  );
});

describe('compile arrowDetail：scale × length / width 乘法', () => {
  it("顶层 length=10 scale=1.5 → 起末 length 透传 10 / scale 透传 1.5（乘法由 render 层完成）", () => {
    // compile 不预乘，因为乘法发生在 renderer 算 markerWidth/Height；compile 保留 raw 值让 render 决策
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'normal', length: 10, scale: 1.5 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowEnd?.length).toBe(10);
    expect(path.arrowEnd?.scale).toBe(1.5);
  });
});

describe('compile arrowDetail：shrink（hollow shape）按 length / scale / lineWidth 动态算', () => {
  it("shape='open' 默认 shrink=5.25×strokeWidth（line 端点接在 back stroke 外缘）", () => {
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
    const path = findPathPrim(compileToScene(ir).primitives);
    // 默认 length=6, scale=1, lineWidth=1.5：shrink = (8 + 0.75) × 6 / 10 = 5.25
    const last = path.commands[path.commands.length - 1];
    if (last.kind !== 'line') throw new Error('expected last to be line');
    expect(last.to[0]).toBe(94.75);
  });
});
