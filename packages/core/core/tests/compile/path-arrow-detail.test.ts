import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { ArrowEndSpec, MarkerFill, MarkerPrimitive, PathPrim, ScenePrimitive } from '../../src/primitive';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

/**
 * 从已解析 `ArrowEndSpec` 的 marker 几何抽主导颜色
 * @description 新契约：视觉输入 color / fill 在 compile 被消费，物化进 marker 几何（实心 fill / 空心 stroke）；
 *   contextStroke / 无 paint → undefined（继承，不冻结）。
 */
const markerPaint = (spec: ArrowEndSpec | undefined): string | undefined => {
  if (!spec) return undefined;
  const pickFill = (f: MarkerFill | undefined): string | undefined =>
    typeof f === 'string' ? f : undefined;
  const walk = (prims: ReadonlyArray<MarkerPrimitive>): string | undefined => {
    for (const p of prims) {
      if (p.type === 'group') {
        const c = walk(p.children);
        if (c !== undefined) return c;
        continue;
      }
      const c = pickFill(p.fill) ?? (typeof p.stroke === 'string' ? p.stroke : undefined);
      if (c !== undefined && c !== 'context-stroke') return c;
    }
    return undefined;
  };
  return walk(spec.marker);
};

/**
 * compile path.arrowDetail → PathPrim.arrowStart / arrowEnd（已解析 marker 描述）
 * @description emit-in-compile 契约：compile merge 视觉输入 → 查 effective arrow 表 → 调 def.emit 产几何，
 *   最终 `ArrowEndSpec` 是"已解析 marker 描述"（shape 标识 + baseSize / refX / markerWidth / markerHeight +
 *   marker 几何 + opacity）。视觉输入（scale / length / width / color / fill / lineWidth）不再出现在结果上：
 *   scale 乘进 markerWidth / markerHeight；color / fill 物化进 marker 几何；lineWidth 影响 refX / 空心描边。
 *  - 无 arrowDetail / `arrow="->"` → arrowEnd 仍解析为 shape 'stealth'（颜色走 contextStroke 缺省）
 *  - `arrowDetail.start` / `end` 子对象**逐字段 merge** 顶层默认：缺省字段继承，已填字段 override
 */
describe('compile arrowDetail：默认行为（不传 arrowDetail）', () => {
  it("arrow='->' 无 arrowDetail → arrowEnd.shape='stealth'，wrapper 参数走默认", () => {
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
    expect(path.arrowEnd?.shape).toBe('stealth');
    // 默认 baseSize 10、length/width 默认 6（scale 1）
    expect(path.arrowEnd?.baseSize).toBe(10);
    expect(path.arrowEnd?.markerWidth).toBe(6);
    expect(path.arrowEnd?.markerHeight).toBe(6);
    // stealth 实心 refX=3（V tip 凹口）
    expect(path.arrowEnd?.refX).toBe(3);
    // marker 是数组（def.emit 产物）
    expect(Array.isArray(path.arrowEnd?.marker)).toBe(true);
    // 颜色未冻结：未给 color → marker 走 contextStroke 继承（markerPaint undefined）
    expect(markerPaint(path.arrowEnd)).toBeUndefined();
    expect(path.arrowStart).toBeUndefined();
  });

  it("arrow='<->' 无 arrowDetail → 两端都 shape 'stealth'", () => {
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
    expect(path.arrowStart?.shape).toBe('stealth');
    expect(path.arrowEnd?.shape).toBe('stealth');
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

  it("color / scale / opacity 视觉输入解析进 marker 几何 / wrapper 参数（起末共享）", () => {
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
    // shape 标识 + opacity 落 wrapper；scale 乘进 markerWidth（默认 length 6 × 1.5 = 9）
    expect(path.arrowStart).toMatchObject({ shape: 'stealth', opacity: 0.7 });
    expect(path.arrowEnd).toMatchObject({ shape: 'stealth', opacity: 0.7 });
    expect(path.arrowStart?.markerWidth).toBeCloseTo(9, 5);
    expect(path.arrowEnd?.markerWidth).toBeCloseTo(9, 5);
    // color 物化进 marker 几何
    expect(markerPaint(path.arrowStart)).toBe('red');
    expect(markerPaint(path.arrowEnd)).toBe('red');
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
    // 异形 → refX 不同（normal 实心 0 / stealth 实心 3）
    expect(path.arrowStart?.refX).toBe(0);
    expect(path.arrowEnd?.refX).toBe(3);
  });

  it("逐字段 merge：顶层 shape='stealth' + start.color='red' → start.shape 继承 stealth、color 进 marker", () => {
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
    expect(markerPaint(path.arrowStart)).toBe('red');
    expect(path.arrowEnd?.shape).toBe('stealth');
    // end 无 color → 继承（contextStroke）
    expect(markerPaint(path.arrowEnd)).toBeUndefined();
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
    expect(path.arrowStart?.shape).toBe('stealth');
    expect(markerPaint(path.arrowStart)).toBe('red');
    expect(path.arrowEnd?.shape).toBe('stealth');
    expect(markerPaint(path.arrowEnd)).toBe('blue');
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
    expect(path.arrowStart?.shape).toBe('stealth');
    expect(path.arrowEnd).toBeUndefined(); // arrow direction 不含 end → end 配置静默丢
  });
});

describe('compile arrowDetail：空心 shape silent fill ignore', () => {
  it("shape='open' + fill='red' → 编译不抛；fill 不进 marker（空心 fill silent no-op）", () => {
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
    // 空心 shape 上 fill 被丢 → marker 无纯色 fill（red 不进 marker）
    expect(markerPaint(path.arrowEnd)).not.toBe('red');
  });

  it("空心 shape 但顶层 color='blue' → color 主导描边进 marker stroke", () => {
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
    // color 主导：blue 进 marker；fill='red' 被丢
    expect(markerPaint(path.arrowEnd)).toBe('blue');
  });

  it.each(['open', 'openStealth', 'openDiamond', 'openCircle'] as const)(
    "空心 shape %s 上 fill 全部丢弃（red 不进 marker）",
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
      expect(markerPaint(path.arrowEnd)).not.toBe('red');
    },
  );

  it.each(['normal', 'stealth', 'diamond', 'circle'] as const)(
    "实心 shape %s 上 fill 保留进 marker",
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
      expect(markerPaint(path.arrowEnd)).toBe('red');
    },
  );
});

describe('compile arrowDetail：scale × length / width 解析进 wrapper 参数', () => {
  it("顶层 length=10 scale=1.5 → markerWidth = 10 × 1.5 = 15（compile 已乘）", () => {
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
    expect(path.arrowEnd?.markerWidth).toBeCloseTo(15, 5);
  });

  it("顶层 width=8 scale=2 → markerHeight = 8 × 2 = 16", () => {
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
    expect(path.arrowEnd?.markerHeight).toBeCloseTo(16, 5);
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

  it("shape='openCircle' lineWidth=1 shrink matches the rendered circle edge", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowDetail: { shape: 'openCircle', lineWidth: 1 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).primitives);
    const last = path.commands[path.commands.length - 1];
    if (last.kind !== 'line') throw new Error('expected last to be line');
    expect(last.to[0]).toBe(94.15);
  });
});
