import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileOptions, CompileWarning } from '../../src/compile/compile';
import type { IR, IRPaintSpec } from '../../src/ir';
import type { MarkerPathPrim, MarkerPrimitive, PaintResource, ResolvedPatternTile, SceneResource } from '../../src/primitive';
import type { PatternDefinition } from '../../src/patterns';

/**
 * Pattern 注册面（ADR-04 emit-in-compile）对抗回归
 *
 * 来自 Bug Hunter 的边角 IR / pattern def。`compileToScene` 直接消费 IR、不再跑 zod schema，故
 * size / lineWidth / rotation 的 `.finite().positive()` 在手搓 IR 时被绕过——现在 compile 是唯一关口，
 * 非 finite / 非正 size / rotation 在 `resolvePatternTile` 抛清晰错，motif 非 finite 坐标由共享
 * `validateMarkerPrimitives` 的 finite 栅栏拦下（与 arrow 路径对齐），守 Scene 100% JSON 可序列化。
 * 可接受的边角（空 motif / dedup / override / 错误质量 / 交叉资源 / background 透传）保持稳定行为。
 */

const patternNodeIR = (spec: IRPaintSpec, second?: IRPaintSpec): IR => ({
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'A', position: [0, 0], text: 'A', fill: spec },
    ...(second
      ? [{ type: 'node' as const, id: 'B', position: [60, 0] as [number, number], text: 'B', fill: second }]
      : []),
  ],
});

const firstPatternResource = (resources: Array<SceneResource> | undefined): PaintResource | undefined =>
  (resources ?? []).find((r): r is PaintResource => r.kind === 'paint' && r.spec.type === 'pattern');

const tileOf = (spec: IRPaintSpec, opts?: CompileOptions): ResolvedPatternTile | undefined =>
  firstPatternResource(compileToScene(patternNodeIR(spec), opts).resources)?.tile;

const firstMotifPath = (tile: ResolvedPatternTile | undefined): MarkerPathPrim | undefined =>
  (tile?.motif ?? []).find((m): m is MarkerPathPrim => m.type === 'path');

const compilePattern = (spec: IRPaintSpec, opts?: CompileOptions): void => {
  compileToScene(patternNodeIR(spec), opts);
};

// ─────────────────────────────────────────────────────────────────────────────
// 攻击面 1：非 finite size / lineWidth / rotation → 编译期抛（守 Scene finite）
// ─────────────────────────────────────────────────────────────────────────────
describe('ADV — 非 finite size / lineWidth / rotation 抛', () => {
  it('size_infinity → 抛 invalid size', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'lines', size: Infinity })).toThrow(
      /invalid size/i,
    );
  });
  it('size_nan → 抛 invalid size', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'lines', size: NaN })).toThrow(
      /invalid size/i,
    );
  });
  it('linewidth_infinity → 抛 invalid lineWidth', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'lines', lineWidth: Infinity })).toThrow(
      /invalid lineWidth/i,
    );
  });
  it('dots_linewidth_infinity → 抛 invalid lineWidth', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'dots', lineWidth: Infinity })).toThrow(
      /invalid lineWidth/i,
    );
  });
  it('rotation_nan → 抛 non-finite rotation', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'lines', rotation: NaN })).toThrow(
      /non-finite rotation/i,
    );
  });
  it('rotation_infinity → 抛 non-finite rotation', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'lines', rotation: Infinity })).toThrow(
      /non-finite rotation/i,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 攻击面 2：round-trip——非 finite 源头被拦，干净 pattern Scene round-trip 无损
// ─────────────────────────────────────────────────────────────────────────────
describe('ADV — JSON round-trip', () => {
  it('infinity_size_rejected_before_scene：Infinity size 不进 Scene（编译期抛）', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'lines', size: Infinity })).toThrow();
  });
  it('clean_pattern_scene_roundtrip：合法 pattern Scene round-trip 等价 + 全 finite', () => {
    const scene = compileToScene(patternNodeIR({ type: 'pattern', shape: 'dots', size: 10 }));
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
    expect(JSON.stringify(scene)).not.toMatch(/:null/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 攻击面 3：极端 / 非正 size → 抛
// ─────────────────────────────────────────────────────────────────────────────
describe('ADV — 极端 / 非正 size', () => {
  it('size_huge_overflow：size=1e308 + emit 做 size×1e10 溢出 Infinity 坐标 → finite 栅栏抛', () => {
    const overflowPattern: PatternDefinition = {
      emit: ({ size }): Array<MarkerPrimitive> => [
        { type: 'rect', x: 0, y: 0, width: size * 1e10, height: size },
      ],
    };
    expect(() =>
      compilePattern({ type: 'pattern', shape: 'huge', size: 1e308 }, {
        patterns: { huge: overflowPattern },
      }),
    ).toThrow(/non-finite number/i);
  });
  it('size_negative：size=-8 → 抛 invalid size（compile 是 positive 的唯一关口）', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'lines', size: -8 })).toThrow(
      /invalid size/i,
    );
  });
  it('size_zero：size=0 → 抛 invalid size', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'lines', size: 0 })).toThrow(
      /invalid size/i,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 攻击面 4：emit 产物绕窄子集 / finite 栅栏
// ─────────────────────────────────────────────────────────────────────────────
describe('ADV — emit 产物栅栏', () => {
  it('motif_nonfinite_coords：custom emit 产 NaN 坐标 → finite 栅栏抛（含 pattern 名）', () => {
    const nanPattern: PatternDefinition = {
      emit: (): Array<MarkerPrimitive> => [{ type: 'ellipse', cx: NaN, cy: 0, rx: 0 / 0, ry: 1, fill: 'red' }],
    };
    expect(() =>
      compilePattern({ type: 'pattern', shape: 'nanmotif' }, { patterns: { nanmotif: nanPattern } }),
    ).toThrow(/non-finite number/i);
  });

  it('motif_returns_non_iterable：emit 返回 undefined → 清晰错（含 pattern 名）', () => {
    const badPattern = { emit: () => undefined } as unknown as PatternDefinition;
    let err: unknown;
    try {
      compilePattern({ type: 'pattern', shape: 'noniter' }, { patterns: { noniter: badPattern } });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message)).toMatch(/noniter|pattern/i);
  });

  it('motif_returns_null：emit 返回 null → 清晰错（含 pattern 名）', () => {
    const badPattern = { emit: () => null } as unknown as PatternDefinition;
    let err: unknown;
    try {
      compilePattern({ type: 'pattern', shape: 'nullret' }, { patterns: { nullret: badPattern } });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message)).toMatch(/nullret|pattern/i);
  });

  it('motif_function：emit 产物含函数（绕 TS）→ assertNoFunction 拦', () => {
    const fnPattern = {
      emit: () => [{ type: 'rect', x: 0, y: 0, width: 4, height: 4, fill: 'red', onClick: () => 1 }],
    } as unknown as PatternDefinition;
    expect(() =>
      compilePattern({ type: 'pattern', shape: 'fn' }, { patterns: { fn: fnPattern } }),
    ).toThrow(/function/i);
  });

  it('empty_motif：emit 返回 [] → 空 tile，不崩', () => {
    const emptyPattern: PatternDefinition = { emit: (): Array<MarkerPrimitive> => [] };
    const tile = tileOf({ type: 'pattern', shape: 'empty' }, { patterns: { empty: emptyPattern } });
    expect(tile?.motif).toEqual([]);
    expect(tile?.size).toBeGreaterThan(0);
  });

  it('emit_throws：emit 内部 throw → 包成含 pattern 名 + cause 的清晰错', () => {
    const throwPattern: PatternDefinition = {
      emit: () => {
        throw new Error('internal boom xyz123');
      },
    };
    let err: unknown;
    try {
      compilePattern({ type: 'pattern', shape: 'boom' }, { patterns: { boom: throwPattern } });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message)).toMatch(/boom/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 攻击面 5：未注册名错误质量
// ─────────────────────────────────────────────────────────────────────────────
describe('ADV — 未注册名错误质量', () => {
  it('whitespace_name：shape=" lines "（带空格）→ 未注册 throw + 可用名清单', () => {
    expect(() => compilePattern({ type: 'pattern', shape: ' lines ' })).toThrow(/dots, grid, lines/);
  });
  it('case_mismatch：shape="Lines"（大写）→ 未注册 throw，可用名含 lines', () => {
    expect(() => compilePattern({ type: 'pattern', shape: 'Lines' })).toThrow(/available:.*lines/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 攻击面 6：dedup / override / 交叉资源
// ─────────────────────────────────────────────────────────────────────────────
describe('ADV — dedup / override / 交叉', () => {
  it('dedup_different_size：同 motif 不同 size → 2 资源、tile.size 各异', () => {
    const scene = compileToScene(
      patternNodeIR({ type: 'pattern', shape: 'lines', size: 6 }, { type: 'pattern', shape: 'lines', size: 10 }),
    );
    const pats = (scene.resources ?? []).filter((r): r is PaintResource => r.kind === 'paint' && r.spec.type === 'pattern');
    expect(pats).toHaveLength(2);
    expect(pats.map(p => p.tile?.size).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([6, 10]);
  });

  it('override_geometry_takes_effect：覆盖内置 lines 几何 → tile 真按覆盖 def 变（内置名走注册表）', () => {
    const customLines: PatternDefinition = {
      defaultSize: 8,
      emit: ({ size, color }): Array<MarkerPrimitive> => [
        { type: 'path', commands: [{ kind: 'move', to: [0, 0] }, { kind: 'line', to: [0, size] }], stroke: color },
      ],
    };
    const tile = tileOf({ type: 'pattern', shape: 'lines' }, { patterns: { lines: customLines } });
    expect(firstMotifPath(tile)?.commands).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [0, 8] },
    ]);
  });

  it('cross_feature_ids：pattern + gradient + image 同场景 → id 不撞、仅 pattern 带 tile', () => {
    const grad: IRPaintSpec = {
      type: 'linearGradient',
      stops: [{ offset: 0, color: '#000' }, { offset: 1, color: '#fff' }],
    };
    const img: IRPaintSpec = { type: 'image', href: 'data:image/png;base64,AAAA' };
    const pat: IRPaintSpec = { type: 'pattern', shape: 'grid' };
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A', fill: grad },
        { type: 'node', id: 'B', position: [60, 0], text: 'B', fill: img },
        { type: 'node', id: 'C', position: [120, 0], text: 'C', fill: pat },
      ],
    };
    const scene = compileToScene(ir);
    const ids = (scene.resources ?? []).map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(3);
    const withTile = (scene.resources ?? []).filter((r): r is PaintResource => r.kind === 'paint' && r.tile !== undefined);
    expect(withTile).toHaveLength(1);
    expect(withTile[0].spec.type).toBe('pattern');
  });

  it('pattern_on_path_fill：pattern 用在 path.fill（非 node）→ tile 正常解析', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          fill: { type: 'pattern', shape: 'dots' },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    } as unknown as IR;
    const tile = firstPatternResource(compileToScene(ir).resources)?.tile;
    expect(tile?.motif.some(m => m.type === 'ellipse')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 攻击面 7：override warn / background 透传
// ─────────────────────────────────────────────────────────────────────────────
describe('ADV — override warn / background', () => {
  it('override_warn_even_if_unused：注册同名内置但场景未用 → 仍发 PATTERN_OVERRIDES_BUILTIN warn', () => {
    const warnings: Array<CompileWarning> = [];
    const customLines: PatternDefinition = { emit: (): Array<MarkerPrimitive> => [] };
    compileToScene(patternNodeIR({ type: 'pattern', shape: 'grid' }), {
      patterns: { lines: customLines },
      onWarn: w => warnings.push(w),
    });
    expect(warnings.some(w => w.code === 'PATTERN_OVERRIDES_BUILTIN')).toBe(true);
  });

  it('background_arbitrary_string：background 任意串 → 原样进 tile（CSS 串透传）', () => {
    const tile = tileOf({ type: 'pattern', shape: 'lines', background: 'not-a-color;}<x>' });
    expect(tile?.background).toBe('not-a-color;}<x>');
  });
});
