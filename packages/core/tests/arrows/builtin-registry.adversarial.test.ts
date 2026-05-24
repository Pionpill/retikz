import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileWarning } from '../../src/compile/compile';
import { PathSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import type {
  PathCommand,
  PathPrim,
  ScenePrimitive,
} from '../../src/primitive';
import type { ArrowDefinition } from '../../src/arrows';
import { flattenPrims } from '../helpers/flatten';

/**
 * Arrow Registry（ADR-01）对抗回归
 * @description 来自 Adversarial Bug Hunter 的边角输入；坏 def（NaN / 0 baseSize / 缺字段 / emit 异常 /
 *   绕窄子集注入 text·resourceRef·函数）现在都被 compile 运行时栅栏拦下、抛含 shape 名的清晰错（便于
 *   第三方 / LLM 自修），不放任 NaN 污染 path 坐标或非 JSON 值偷进 Scene。可接受的边角（极大但有限 /
 *   空 marker / 短 path 反向）保持稳定行为。
 */

const horizontalPathIR = (
  arrow: '->' | '<-' | '<->',
  detail: Record<string, unknown> = {},
  to: [number, number] = [100, 0],
): IR => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      arrow,
      arrowDetail: detail,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to },
      ],
    } as never,
  ],
});

const firstPath = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  flattenPrims(prims).find((p): p is PathPrim => p.type === 'path');

const endpointTo = (path: PathPrim): [number, number] | undefined => {
  const last = path.commands[path.commands.length - 1];
  if (last.kind === 'line' || last.kind === 'move') return last.to;
  return undefined;
};

const allCoords = (commands: Array<PathCommand>): Array<number> => {
  const out: Array<number> = [];
  for (const c of commands) {
    if (c.kind === 'move' || c.kind === 'line') out.push(c.to[0], c.to[1]);
    else if (c.kind === 'quad') out.push(c.control[0], c.control[1], c.to[0], c.to[1]);
    else if (c.kind === 'cubic') out.push(...c.control1, ...c.control2, ...c.to);
    else if (c.kind === 'arc') out.push(...c.center, c.radius);
    else if (c.kind === 'ellipseArc') out.push(...c.center, c.radiusX, c.radiusY);
  }
  return out;
};

const allFinite = (xs: Array<number>): boolean => xs.every(Number.isFinite);

const compileArrow = (detail: Record<string, unknown>, arrows: Record<string, ArrowDefinition>) =>
  compileToScene(horizontalPathIR('->', detail), { arrows, onWarn: () => {} });

// ───────────────────────────────────────────────────────────────────────────
// 攻击面 1：def 几何非有限 → 不放任 NaN/Infinity 污染 path 坐标，抛清晰错
// ───────────────────────────────────────────────────────────────────────────
describe('ADV — def 几何 finite 守卫', () => {
  it('baseSize_zero：自定义 def baseSize=0 → 抛（不产 NaN 端点）', () => {
    const def: ArrowDefinition = {
      baseSize: 0,
      lineContactX: 0,
      emit: () => [{ type: 'path', commands: [{ kind: 'move', to: [0, 0] }] }],
    };
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/invalid baseSize/i);
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/'z'/);
  });

  it('lineContactX_NaN：def.lineContactX=NaN → 抛 non-finite lineContactX', () => {
    const def: ArrowDefinition = {
      lineContactX: NaN,
      emit: () => [{ type: 'path', commands: [{ kind: 'move', to: [0, 0] }] }],
    };
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/non-finite lineContactX/i);
  });

  it('lineContactX_Infinity：def.lineContactX=Infinity → 抛 non-finite lineContactX', () => {
    const def: ArrowDefinition = {
      lineContactX: Infinity,
      emit: () => [{ type: 'path', commands: [{ kind: 'move', to: [0, 0] }] }],
    };
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/non-finite lineContactX/i);
  });

  it('tipX_NaN：def.tipX=NaN → 抛 non-finite tipX', () => {
    const def: ArrowDefinition = {
      lineContactX: 0,
      tipX: NaN,
      emit: () => [{ type: 'path', commands: [{ kind: 'move', to: [0, 0] }] }],
    };
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/non-finite tipX/i);
  });

  it('lineWidth_huge：hollow def + 极大 lineWidth（有限）→ 端点仍 finite（不抛，TikZ 同不 clamp）', () => {
    const def: ArrowDefinition = {
      hollow: true,
      lineContactX: 1,
      tipX: 9,
      emit: ctx => [
        {
          type: 'path',
          commands: [{ kind: 'move', to: [1, 1] }, { kind: 'line', to: [9, 5] }, { kind: 'close' }],
          stroke: typeof ctx.stroke === 'string' ? ctx.stroke : 'context-stroke',
          strokeWidth: ctx.lineWidth,
        },
      ],
    };
    const scene = compileArrow({ shape: 'z', lineWidth: 1e9 }, { z: def });
    const path = firstPath(scene.primitives);
    const end = path && endpointTo(path);
    expect(end && allFinite(end)).toBe(true);
  });

  it('length_huge_scale_huge：length=1e10 scale=1e10（有限）→ markerWidth finite，不抛', () => {
    const scene = compileToScene(
      horizontalPathIR('->', { shape: 'normal', length: 1e10, scale: 1e10 }),
    );
    const path = firstPath(scene.primitives);
    expect(Number.isFinite(path?.arrowEnd?.markerWidth)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 攻击面 2：emit 异常 → 包成含 shape 名清晰错；窄子集运行时栅栏拦非法产物
// ───────────────────────────────────────────────────────────────────────────
describe('ADV — emit 异常 / 窄子集栅栏', () => {
  it('emit_empty_array：emit 返回 []（空 marker）→ 不抛、marker=[]', () => {
    const def: ArrowDefinition = { lineContactX: 0, emit: () => [] };
    const scene = compileArrow({ shape: 'z' }, { z: def });
    expect(firstPath(scene.primitives)?.arrowEnd?.marker).toEqual([]);
  });

  it('emit_generator：emit 返回 generator（非数组 Iterable）→ 正常收集', () => {
    const def: ArrowDefinition = {
      lineContactX: 0,
      *emit() {
        yield { type: 'path', commands: [{ kind: 'move', to: [0, 0] }] };
        yield { type: 'ellipse', cx: 5, cy: 5, rx: 5, ry: 5 };
      },
    };
    const scene = compileArrow({ shape: 'z' }, { z: def });
    expect(firstPath(scene.primitives)?.arrowEnd?.marker).toHaveLength(2);
  });

  it('emit_throws：emit 抛异常 → 包成含 shape 名 + 原因的清晰错', () => {
    const def: ArrowDefinition = {
      lineContactX: 0,
      emit: () => {
        throw new Error('boom in emit');
      },
    };
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/Arrow 'z' emit failed: boom in emit/);
  });

  it('emit_non_iterable：emit 返回 null（绕 TS）→ 包成含 shape 名清晰错（不泄漏内部变量名）', () => {
    const def = { lineContactX: 0, emit: () => null } as unknown as ArrowDefinition;
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/Arrow 'z' emit failed/);
    expect(() => compileArrow({ shape: 'z' }, { z: def })).not.toThrow(/geometry\.def/);
  });

  it('emit_injects_text：emit 产含 text 的 primitive（绕窄子集 TS）→ 抛 invalid marker primitive type', () => {
    const def = {
      lineContactX: 0,
      emit: () => [
        { type: 'text', x: 0, y: 0, lines: ['<script>'], measuredWidth: 0, measuredHeight: 0 },
      ],
    } as unknown as ArrowDefinition;
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(
      /invalid marker primitive type 'text'/,
    );
  });

  it('emit_injects_resourceRef_fill：emit 产 resourceRef fill（绕 MarkerFill）→ 抛 marker fill must be', () => {
    const def = {
      lineContactX: 0,
      emit: () => [
        {
          type: 'path',
          commands: [{ kind: 'move', to: [0, 0] }],
          fill: { kind: 'resourceRef', id: 'g-not-exist' },
        },
      ],
    } as unknown as ArrowDefinition;
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/marker fill must be/i);
  });

  it('emit_injects_function：emit 产物含函数字段（绕 TS）→ 抛（守 Scene JSON 可序列化）', () => {
    const def = {
      lineContactX: 0,
      emit: () => [
        { type: 'path', commands: [{ kind: 'move', to: [0, 0] }], onClick: () => 'gotcha' },
      ],
    } as unknown as ArrowDefinition;
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/containing a function/i);
  });

  it('marker_group_recursive_validation：group 内含 text（绕 TS）→ 递归校验抛', () => {
    const def = {
      lineContactX: 0,
      emit: () => [
        { type: 'group', children: [{ type: 'text', x: 0, y: 0, lines: [], measuredWidth: 0, measuredHeight: 0 }] },
      ],
    } as unknown as ArrowDefinition;
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/invalid marker primitive type 'text'/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 攻击面 3：override 缺字段（运行时 JS 漏字段）→ 清晰错
// ───────────────────────────────────────────────────────────────────────────
describe('ADV — override 缺字段', () => {
  it('override_missing_emit：override 内置但 def 缺 emit → 抛 missing an emit function（含 shape 名）', () => {
    const def = { lineContactX: 0 } as unknown as ArrowDefinition;
    expect(() =>
      compileToScene(horizontalPathIR('->', { shape: 'stealth' }), {
        arrows: { stealth: def },
        onWarn: () => {},
      }),
    ).toThrow(/'stealth' is missing an emit function/);
  });

  it('override_missing_lineContactX：def 缺 lineContactX → 抛 non-finite lineContactX', () => {
    const def = {
      emit: () => [{ type: 'path', commands: [{ kind: 'move', to: [0, 0] }] }],
    } as unknown as ArrowDefinition;
    expect(() => compileArrow({ shape: 'z' }, { z: def })).toThrow(/non-finite lineContactX/i);
  });

  it('duplicate_override_same_name：覆盖内置 stealth 触发恰一次 ARROW_OVERRIDES_BUILTIN warn', () => {
    const warnings: Array<CompileWarning> = [];
    compileToScene(horizontalPathIR('->', { shape: 'stealth' }), {
      arrows: { stealth: { lineContactX: 0, emit: () => [] } },
      onWarn: w => warnings.push(w),
    });
    expect(warnings.filter(w => w.code === 'ARROW_OVERRIDES_BUILTIN')).toHaveLength(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 攻击面 4：未注册 shape 错误质量（大小写 / 空格 / 空表）
// ───────────────────────────────────────────────────────────────────────────
describe('ADV — 未注册 shape 错误质量', () => {
  it('case_mismatch：shape="Stealth"（大写）→ throw，消息含可用名列表（LLM 可看出大小写错）', () => {
    expect(() => compileToScene(horizontalPathIR('->', { shape: 'Stealth' }))).toThrow(
      /Unknown arrow shape 'Stealth'/,
    );
    expect(() => compileToScene(horizontalPathIR('->', { shape: 'Stealth' }))).toThrow(/stealth/);
  });

  it('trailing_space：shape="stealth " → throw（带引号可见尾空格）', () => {
    expect(() => compileToScene(horizontalPathIR('->', { shape: 'stealth ' }))).toThrow(
      /Unknown arrow shape 'stealth '/,
    );
  });

  it('empty_registry：arrows={} 不覆盖内置 → stealth 仍可用', () => {
    const scene = compileToScene(horizontalPathIR('->', { shape: 'stealth' }), {
      arrows: {},
      onWarn: () => {},
    });
    expect(firstPath(scene.primitives)?.arrowEnd?.shape).toBe('stealth');
  });

  it('start_one_side_custom_other_builtin：<-> 一端自定义一端内置', () => {
    const def: ArrowDefinition = {
      lineContactX: 2,
      emit: () => [{ type: 'path', commands: [{ kind: 'move', to: [0, 0] }] }],
    };
    const scene = compileToScene(
      horizontalPathIR('<->', { start: { shape: 'myTip' }, end: { shape: 'stealth' } }),
      { arrows: { myTip: def }, onWarn: () => {} },
    );
    const path = firstPath(scene.primitives);
    expect(path?.arrowStart?.shape).toBe('myTip');
    expect(path?.arrowEnd?.shape).toBe('stealth');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 攻击面 5：极端几何 + 既有功能交叉（可接受的稳定行为）
// ───────────────────────────────────────────────────────────────────────────
describe('ADV — 极端几何 / 功能交叉', () => {
  it('path_shorter_than_shrink：path 极短（长 1）< shrink 量 → 端点穿过起点（finite，TikZ 同不 clamp）', () => {
    const scene = compileToScene(horizontalPathIR('->', { shape: 'normal' }, [1, 0]));
    const path = firstPath(scene.primitives);
    const end = path && endpointTo(path);
    expect(end && allFinite(end)).toBe(true);
    expect(end?.[0]).toBe(-5);
  });

  it('zero_length_path：起点==终点 → shiftToward len=0 短路、不 NaN', () => {
    const scene = compileToScene(horizontalPathIR('->', { shape: 'normal' }, [0, 0]));
    const path = firstPath(scene.primitives);
    const end = path && endpointTo(path);
    expect(end && allFinite(end)).toBe(true);
  });

  it('scale_nonpositive_rejected：scale<=0 被 schema 拒（NaN 路径不可达）', () => {
    const r = PathSchema.safeParse({
      type: 'path',
      arrow: '->',
      arrowDetail: { shape: 'normal', scale: 0 },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    });
    expect(r.success).toBe(false);
  });

  it('length_zero：length=0 合法 → markerWidth=0、shrink=0（端点不缩）', () => {
    const scene = compileToScene(horizontalPathIR('->', { shape: 'normal', length: 0 }));
    const path = firstPath(scene.primitives);
    expect(path?.arrowEnd?.markerWidth).toBe(0);
    expect(path && endpointTo(path)).toEqual([100, 0]);
  });

  it('arrow_in_transformed_scope：arrow 在 scale scope 内 → 端点 finite', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 100, y: 100 }],
          children: [
            {
              type: 'path',
              arrow: '->',
              arrowDetail: { shape: 'stealth' },
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        } as never,
      ],
    };
    const path = firstPath(compileToScene(ir, { onWarn: () => {} }).primitives);
    expect(path).toBeDefined();
    expect(allFinite(allCoords(path!.commands))).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 攻击面 6：Scene round-trip / contextStroke 链路
// ───────────────────────────────────────────────────────────────────────────
describe('ADV — Scene round-trip / contextStroke', () => {
  it('scene_roundtrip_builtin_7：每个内置 7 compile 产物 JSON round-trip 等价', () => {
    const shapes = ['normal', 'open', 'stealth', 'diamond', 'openDiamond', 'circle', 'openCircle'];
    for (const shape of shapes) {
      const scene = compileToScene(horizontalPathIR('<->', { shape }));
      expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
    }
  });

  it('scene_roundtrip_color_override：color override 后 marker fill 纯色 round-trip', () => {
    const scene = compileToScene(horizontalPathIR('->', { shape: 'stealth', color: 'red' }));
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
    const mp = firstPath(scene.primitives)?.arrowEnd?.marker[0] as { fill?: unknown };
    expect(mp.fill).toBe('red');
  });

  it('contextStroke_no_color：默认 stealth marker fill 是 contextStroke 对象（主题不冻结）', () => {
    const spec = firstPath(
      compileToScene(horizontalPathIR('->', { shape: 'stealth' })).primitives,
    )?.arrowEnd;
    const mp = spec?.marker[0] as { fill?: unknown };
    expect(mp.fill).toEqual({ kind: 'contextStroke' });
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
  });

  it('hollow_fill_override_color：hollow + fill override（应丢）+ color → 只 color 进 stroke', () => {
    const spec = firstPath(
      compileToScene(horizontalPathIR('->', { shape: 'open', fill: 'red', color: 'green' })).primitives,
    )?.arrowEnd;
    const mp = spec?.marker[0] as { fill?: unknown; stroke?: unknown };
    expect(mp.fill).not.toBe('red');
    expect(mp.stroke).toBe('green');
  });

  it('opacity_zero：arrowDetail.opacity=0 合法 → ArrowEndSpec.opacity=0 不被吞', () => {
    const spec = firstPath(
      compileToScene(horizontalPathIR('->', { shape: 'stealth', opacity: 0 })).primitives,
    )?.arrowEnd;
    expect(spec?.opacity).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 攻击面 7：zod parse 错误信息质量
// ───────────────────────────────────────────────────────────────────────────
describe('ADV — zod parse 错误质量', () => {
  it('shape_as_number：shape 写成数字 → schema 拒 + 错误指明 shape', () => {
    const r = PathSchema.safeParse({
      type: 'path',
      arrow: '->',
      arrowDetail: { shape: 7 },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(JSON.stringify(r.error.issues)).toContain('shape');
  });

  it('color_as_number：color 写成数字 → schema 拒', () => {
    const r = PathSchema.safeParse({
      type: 'path',
      arrow: '->',
      arrowDetail: { shape: 'stealth', color: 0xff0000 },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    });
    expect(r.success).toBe(false);
  });

  // 已知（接受）：IR schema 非 strict，typo 字段被静默剥离——全局 IR 行为，不在本 ADR 范围。
  it('extra_field_typo：拼错字段名 lenght 被静默剥离（全局 IR strip 行为，记录现状）', () => {
    const r = PathSchema.safeParse({
      type: 'path',
      arrow: '->',
      arrowDetail: { shape: 'stealth', lenght: 10 },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const detail = r.data.arrowDetail as Record<string, unknown>;
      expect('lenght' in detail).toBe(false);
    }
  });
});
