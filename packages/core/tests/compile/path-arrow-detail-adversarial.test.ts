import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import { ArrowDetailSchema } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

/**
 * Adversarial / bug hunter 测试
 * @description 攻击 ADR-03 4 项决策细节的边缘 case + ADR 测试象限的错误路径
 */

describe('adv 1: 字段名 = arrowDetail（旧字段 arrowShape 不偷偷生效）', () => {
  it("写已删字段 arrowShape='normal' → compile 结果 shape 仍是 'stealth'（不偷偷读旧字段）", () => {
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowShape: 'normal',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    } as unknown as IR;
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowEnd?.shape).toBe('stealth');
  });
});

describe('adv 2: merge 语义 = 逐字段（不是"完全替换"）', () => {
  it("顶层 shape='stealth' + start.color='red' → start.shape 仍 'stealth'（顶层继承）", () => {
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
    expect(path.arrowStart).toEqual({ shape: 'stealth', color: 'red' });
    expect(path.arrowEnd).toEqual({ shape: 'stealth' });
  });

  it("顶层 scale=2 + start.shape='diamond' → start.scale 仍 2（继承非 shape 字段）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          arrowDetail: { scale: 2, color: 'blue', start: { shape: 'diamond' } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart).toMatchObject({ shape: 'diamond', scale: 2, color: 'blue' });
  });

  it("end 完全空对象 + 顶层全填 → end 拿到全部顶层字段（不丢失）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'stealth', scale: 1.5, color: 'red', end: {} },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowEnd).toMatchObject({ shape: 'stealth', scale: 1.5, color: 'red' });
  });

  it("end.shape 显式 override 顶层 shape（不被吞）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          arrowDetail: { shape: 'stealth', end: { shape: 'circle' } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart?.shape).toBe('stealth');
    expect(path.arrowEnd?.shape).toBe('circle');
  });
});

describe('adv 3: scale × length / width 关系（render 层验，compile 透传 raw）', () => {
  it("length=10 scale=1.5 → compile 透传 raw（10 + 1.5），render 层乘", () => {
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

  it("width=8 scale=2 → compile 透传 raw 不预乘", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'normal', width: 8, scale: 2 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowEnd?.width).toBe(8);
    expect(path.arrowEnd?.scale).toBe(2);
  });
});

describe('adv 4: 空心 shape silent fill no-op（4 子象限：实/空 × 有/无 fill）', () => {
  it.each(['open', 'openDiamond', 'openCircle'] as const)(
    "空心 %s + fill='red' → 输出 arrowEnd.fill undefined（fill 被丢）",
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
      // color 主导，描边 / 不丢
      expect(path.arrowEnd?.shape).toBe(shape);
    },
  );

  it.each(['normal', 'stealth', 'diamond', 'circle'] as const)(
    "实心 %s + fill='red' → fill 保留",
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

  it("空心 shape + end.fill='red'（end 子对象上写）也被丢", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'open', end: { fill: 'red' } },
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

  it("起末异形：start 实心 + end 空心，各端 fill 行为独立", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          arrowDetail: {
            fill: 'red', // 顶层共享
            start: { shape: 'diamond' },
            end: { shape: 'open' },
          },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    // start 实心 → fill 保留
    expect(path.arrowStart?.fill).toBe('red');
    // end 空心 → fill silent drop
    expect(path.arrowEnd?.fill).toBeUndefined();
  });
});

describe('adv 5: 起末异形产 2 不同 marker spec', () => {
  it("start.shape='normal' / end.shape='stealth' → 2 个 spec shape 不同", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '<->',
          arrowDetail: { start: { shape: 'normal' }, end: { shape: 'stealth' } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart?.shape).not.toBe(path.arrowEnd?.shape);
  });

  it("start.color='red' / end.color='blue' （同 shape）→ 2 个 spec object 字段不同", () => {
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
    expect(path.arrowStart?.color).toBe('red');
    expect(path.arrowEnd?.color).toBe('blue');
  });
});

describe('adv 6: schema 边界（NaN / Infinity / 字符串数字 / boolean）', () => {
  it('scale=NaN 拒绝', () => {
    expect(ArrowDetailSchema.safeParse({ scale: NaN }).success).toBe(false);
  });
  it('scale=Infinity 接受（zod number 不拒绝 Infinity，但 positive 要求 > 0）', () => {
    // 这里记录现行行为：zod number().positive() 不拒绝 Infinity
    expect(ArrowDetailSchema.safeParse({ scale: Number.POSITIVE_INFINITY }).success).toBe(true);
  });
  it('opacity=NaN 拒绝（min(0) 检查 NaN 失败）', () => {
    expect(ArrowDetailSchema.safeParse({ opacity: NaN }).success).toBe(false);
  });
  it("shape='Normal'（大写）拒绝", () => {
    expect(ArrowDetailSchema.safeParse({ shape: 'Normal' }).success).toBe(false);
  });
  it("shape='circle ' (trailing space) 拒绝", () => {
    expect(ArrowDetailSchema.safeParse({ shape: 'circle ' }).success).toBe(false);
  });
  it("scale='1' 字符串数字拒绝（zod number 不接受字符串）", () => {
    expect(ArrowDetailSchema.safeParse({ scale: '1' }).success).toBe(false);
  });
  it('opacity=true 拒绝（boolean 不通过 number schema）', () => {
    expect(ArrowDetailSchema.safeParse({ opacity: true }).success).toBe(false);
  });
  it('start=null 拒绝（null 不是 object）', () => {
    expect(ArrowDetailSchema.safeParse({ start: null }).success).toBe(false);
  });
});

describe('adv 7: arrowDetail 与 arrow direction 交互（单端配置不漏到另一端）', () => {
  it("arrow='->' + arrowDetail.start={...} → start spec 被丢（方向不含 start）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { start: { shape: 'diamond', color: 'red' } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    expect(path.arrowStart).toBeUndefined();
    // end 走顶层默认（顶层无 shape 字段 → 默认 stealth）
    expect(path.arrowEnd?.shape).toBe('stealth');
  });

  it("arrow='none' + arrowDetail={全配置} → 两端都不挂", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: 'none',
          arrowDetail: { shape: 'stealth', color: 'red', scale: 2 },
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

  it("arrow 缺省（undefined）+ arrowDetail={...} → 两端都不挂（arrow 主导）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrowDetail: { shape: 'stealth' },
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
