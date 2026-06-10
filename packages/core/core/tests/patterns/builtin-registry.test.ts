import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileOptions, CompileWarning } from '../../src/compile/compile';
import { BUILTIN_PATTERNS, definePattern } from '../../src/patterns';
import type { PatternDefinition, PatternEmitContext } from '../../src/patterns';
import { PaintSpecSchema } from '../../src/ir';
import type { IR, IRPaintSpec } from '../../src/ir';
import type {
  MarkerEllipsePrim,
  MarkerPathPrim,
  MarkerPrimitive,
  PaintResource,
  ResolvedPatternTile,
  SceneResource,
} from '../../src/primitive';

/**
 * Pattern Registry core 侧测试（emit-in-compile 契约）
 * @description 断言落点全在 compile 输出 `Scene.resources` 的 pattern 资源 `tile`（已解析 motif 几何）：
 *   - tile motif 几何（`tile.motif: MarkerPrimitive[]`，PatternDefinition.emit 产物）内置 3 等价旧 SVG switch
 *   - tile wrapper 参数（size / background / rotation）
 *   - 注册面（自定义 PatternDefinition、shape 开放 string、dedup、未注册 throw、override warn）
 *   - motif 窄子集运行时栅栏（emit 含 text 被拒，复用 marker 窄子集校验）
 *   - renderer-agnostic（tile 纯 JSON 数据无函数，Scene round-trip 等价）
 *   PatternDefinition 含函数、不进 IR：round-trip 只针对 IR（pattern.shape 字符串）与 Scene（tile 纯数据）。
 */

/** 含一个 pattern fill node 的 IR 工厂 */
const patternNodeIR = (spec: IRPaintSpec, second?: IRPaintSpec): IR => ({
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'A', position: [0, 0], text: 'A', fill: spec },
    ...(second ? [{ type: 'node' as const, id: 'B', position: [60, 0] as [number, number], text: 'B', fill: second }] : []),
  ],
});

/** 从 Scene.resources 取首个 pattern 资源（spec.kind === 'pattern'） */
const firstPatternResource = (resources: Array<SceneResource> | undefined): PaintResource | undefined =>
  (resources ?? []).find((r): r is PaintResource => r.kind === 'paint' && r.spec.kind === 'pattern');

/** 从 Scene.resources 取首个 pattern 资源的 tile（已解析 motif） */
const tileOf = (
  spec: IRPaintSpec,
  opts?: CompileOptions,
): ResolvedPatternTile | undefined => firstPatternResource(compileToScene(patternNodeIR(spec), opts).resources)?.tile;

/** 取 tile.motif 里首个 path 原语 */
const firstMotifPath = (tile: ResolvedPatternTile | undefined): MarkerPathPrim | undefined =>
  (tile?.motif ?? []).find((m): m is MarkerPathPrim => m.type === 'path');

/** 取 tile.motif 里首个 ellipse 原语 */
const firstMotifEllipse = (tile: ResolvedPatternTile | undefined): MarkerEllipsePrim | undefined =>
  (tile?.motif ?? []).find((m): m is MarkerEllipsePrim => m.type === 'ellipse');

/** 把 motif path 命令序列拍成紧凑 d 串（move/line/close，golden 对比用） */
const pathD = (prim: MarkerPathPrim): string =>
  prim.commands
    .map(c => {
      if (c.kind === 'move') return `M${c.to[0]},${c.to[1]}`;
      if (c.kind === 'line') return `L${c.to[0]},${c.to[1]}`;
      if (c.kind === 'close') return 'Z';
      return `?${c.kind}`;
    })
    .join(' ');

/** 自定义 pattern：单 path motif（斜十字横段），size 默认 10 */
const customPattern = (): PatternDefinition => definePattern({
  defaultSize: 10,
  emit: ({ size, color, lineWidth }): Array<MarkerPrimitive> => [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [size, size] },
      ],
      stroke: color,
      strokeWidth: lineWidth,
    },
  ],
});

/** 多 primitive 自定义 pattern：背景 rect + 两 motif 元素 */
const multiPrimPattern = (): PatternDefinition => definePattern({
  defaultSize: 12,
  emit: ({ size, color, background }): Array<MarkerPrimitive> => [
    ...(background ? ([{ type: 'rect', x: 0, y: 0, width: size, height: size, fill: background }] as Array<MarkerPrimitive>) : []),
    { type: 'ellipse', cx: size / 2, cy: size / 2, rx: 2, ry: 2, fill: color },
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [size, 0] },
      ],
      stroke: color,
    },
  ],
});

describe('Pattern registry — happy path', () => {
  it('builtin_3_via_registry：内置 lines/dots/grid 经 compileToScene → tile motif 等价旧 switch（golden）', () => {
    // lines：一个 path 横线居中 d "M0,4 L8,4"（size 缺省 8，中线 y=size/2=4，避免边缘半宽裁切）
    const linesTile = tileOf({ kind: 'pattern', shape: 'lines' });
    const linesPath = firstMotifPath(linesTile);
    expect(linesPath && pathD(linesPath)).toBe('M0,4 L8,4');

    // grid：一个 path 横竖居中 d "M0,4 L8,4 M4,0 L4,8"（横竖线均落在 tile 中线）
    const gridTile = tileOf({ kind: 'pattern', shape: 'grid' });
    const gridPath = firstMotifPath(gridTile);
    expect(gridPath && pathD(gridPath)).toBe('M0,4 L8,4 M4,0 L4,8');

    // dots：一个 ellipse（圆），cx=cy=4（size/2）、rx=ry=8/5=1.6（缺省半径 size/5）
    const dotsTile = tileOf({ kind: 'pattern', shape: 'dots' });
    const dotsEllipse = firstMotifEllipse(dotsTile);
    expect(dotsEllipse).toMatchObject({ cx: 4, cy: 4, rx: 1.6, ry: 1.6 });
  });

  it('custom_pattern_register：注册自定义 PatternDefinition → tile.motif 进资源', () => {
    const opts: CompileOptions = { patterns: { cross: customPattern() } };
    const ir = patternNodeIR({ kind: 'pattern', shape: 'cross' });
    expect(() => compileToScene(ir, opts)).not.toThrow();
    const tile = firstPatternResource(compileToScene(ir, opts).resources)?.tile;
    // 自定义 def.emit 几何进 tile.motif（size 缺省 = defaultSize 10）
    const mp = firstMotifPath(tile);
    expect(mp && pathD(mp)).toBe('M0,0 L10,10');
  });

  it('shape_open_string：pattern.shape=myMotif（已注册）合法编译', () => {
    const ir = patternNodeIR({ kind: 'pattern', shape: 'myMotif' });
    const scene = compileToScene(ir, { patterns: { myMotif: customPattern() } });
    expect(firstPatternResource(scene.resources)).toBeDefined();
  });

  it('pattern_dedup：同 pattern spec 多处 → 1 资源 1 tile', () => {
    const spec: IRPaintSpec = { kind: 'pattern', shape: 'lines', size: 6 };
    const scene = compileToScene(patternNodeIR(spec, spec));
    const patternResources = (scene.resources ?? []).filter((r): r is PaintResource => r.kind === 'paint' && r.spec.kind === 'pattern');
    expect(patternResources).toHaveLength(1);
    expect(patternResources[0].tile).toBeDefined();
  });
});

describe('Pattern registry — boundary', () => {
  it('default_size：缺省 size 8、dots 半径 size/5、color currentColor', () => {
    const tile = tileOf({ kind: 'pattern', shape: 'dots' });
    expect(tile?.size).toBe(8);
    const dot = firstMotifEllipse(tile);
    // 缺省半径 = size/5 = 1.6；缺省 color = currentColor → ellipse fill 'currentColor'
    expect(dot?.rx).toBe(1.6);
    expect(dot?.fill).toBe('currentColor');
  });

  it('size_background_rotation：size / background / rotation override 进 tile', () => {
    const tile = tileOf({ kind: 'pattern', shape: 'lines', size: 12, background: '#eee', rotation: 45 });
    expect(tile?.size).toBe(12);
    expect(tile?.background).toBe('#eee');
    expect(tile?.rotation).toBe(45);
    // size override 影响 motif 几何（横线到 x=12，中线 y=size/2=6）
    const mp = firstMotifPath(tile);
    expect(mp && pathD(mp)).toBe('M0,6 L12,6');
  });

  it('pattern_coexist_gradient：同场景 pattern + gradient → resources 不撞、id 各异', () => {
    const grad: IRPaintSpec = {
      kind: 'linearGradient',
      stops: [
        { offset: 0, color: '#4f8' },
        { offset: 1, color: '#08f' },
      ],
    };
    const pat: IRPaintSpec = { kind: 'pattern', shape: 'grid' };
    const scene = compileToScene(patternNodeIR(grad, pat));
    expect(scene.resources).toHaveLength(2);
    const ids = (scene.resources ?? []).map(r => r.id);
    expect(new Set(ids).size).toBe(2);
    // gradient 资源无 tile、pattern 资源有 tile
    const gradRes = (scene.resources ?? []).find((r): r is PaintResource => r.kind === 'paint' && r.spec.kind === 'linearGradient');
    const patRes = (scene.resources ?? []).find((r): r is PaintResource => r.kind === 'paint' && r.spec.kind === 'pattern');
    expect(gradRes?.tile).toBeUndefined();
    expect(patRes?.tile).toBeDefined();
  });
});

describe('Pattern registry — error path', () => {
  it('unregistered_pattern_throws：未注册 pattern 名 → 编译期 throw（带可用名）', () => {
    const ir = patternNodeIR({ kind: 'pattern', shape: 'nope' });
    expect(() => compileToScene(ir)).toThrow(/nope/);
    // 可用名（内置 3 字母序）出现在错误消息里
    expect(() => compileToScene(ir)).toThrow(/dots, grid, lines/);
  });

  it('same_name_override_warn：patterns 覆盖内置名 → PATTERN_OVERRIDES_BUILTIN warn（不静默）', () => {
    const warnings: Array<CompileWarning> = [];
    const ir = patternNodeIR({ kind: 'pattern', shape: 'lines' });
    compileToScene(ir, {
      patterns: { lines: customPattern() },
      onWarn: w => warnings.push(w),
    });
    expect(warnings.some(w => w.code === 'PATTERN_OVERRIDES_BUILTIN')).toBe(true);
  });

  it('motif_rejects_text：emit 返回含 text 的 primitive → 运行时窄子集栅栏拒', () => {
    // 窄子集编译期门控：MarkerPrimitive 不含 'text' 分支（@ts-expect-error 命中元素行）；
    // 同时实现阶段 emit 产物过运行时窄子集校验，含 text 编译期 throw。
    const badMotif: Array<MarkerPrimitive> = [
      // @ts-expect-error MarkerPrimitive 禁 text（窄子集杜绝 motif 内文本布局）
      { type: 'text', x: 0, y: 0, lines: [], measuredWidth: 0, measuredHeight: 0 },
    ];
    const badPattern: PatternDefinition = { emit: () => badMotif };
    const ir = patternNodeIR({ kind: 'pattern', shape: 'bad' });
    expect(() => compileToScene(ir, { patterns: { bad: badPattern } })).toThrow();
  });
});

describe('Pattern registry — interaction', () => {
  it('pattern_currentColor：motif color 缺省 currentColor（跟随 svg color）', () => {
    // lines motif 缺省 color → path stroke 'currentColor'（不冻结成纯色，主题反应）
    const tile = tileOf({ kind: 'pattern', shape: 'lines' });
    const mp = firstMotifPath(tile);
    expect(mp?.stroke).toBe('currentColor');
  });

  it('custom_motif_multiple_prims：emit 产多 MarkerPrimitive（背景 rect + 多 motif 元素）', () => {
    const opts: CompileOptions = { patterns: { multi: multiPrimPattern() } };
    const tile = firstPatternResource(
      compileToScene(patternNodeIR({ kind: 'pattern', shape: 'multi', background: '#fff' }), opts).resources,
    )?.tile;
    // 背景 rect + ellipse + path = 3 个 motif 元素
    expect(tile?.motif).toHaveLength(3);
    expect(tile?.motif.map(m => m.type)).toEqual(['rect', 'ellipse', 'path']);
  });

  it('round_trip_ir：含 pattern fill 的 IR JSON.stringify → parse 语义等价（shape 名保真）', () => {
    const spec = {
      kind: 'pattern' as const,
      shape: 'myMotif',
      color: 'red',
      background: '#eee',
      size: 10,
      lineWidth: 2,
      rotation: 30,
    };
    const original = PaintSpecSchema.parse(spec);
    const roundTripped = PaintSpecSchema.parse(JSON.parse(JSON.stringify(original)));
    expect(roundTripped).toEqual(original);
    // 开放 shape 名经 JSON 往返不丢
    expect(roundTripped.kind === 'pattern' && roundTripped.shape).toBe('myMotif');
  });

  it('round_trip_scene：Scene 的 pattern tile 纯 JSON 无函数（序列化往返不丢）', () => {
    const scene = compileToScene(patternNodeIR({ kind: 'pattern', shape: 'grid' }));
    const tile = firstPatternResource(scene.resources)?.tile;
    expect(tile).toBeDefined();
    // tile.motif 纯 JSON 数据（无函数）：序列化往返等价
    const json = JSON.parse(JSON.stringify(tile));
    expect(json).toEqual(tile);
    const hasFn = (tile?.motif ?? []).some(m => typeof (m as unknown) === 'function');
    expect(hasFn).toBe(false);
  });
});

describe('Pattern registry — BUILTIN_PATTERNS 注册表结构', () => {
  it('内置 3 注册键穷尽（lines / dots / grid）', () => {
    expect(Object.keys(BUILTIN_PATTERNS).sort()).toEqual(['dots', 'grid', 'lines']);
  });

  it('内置 3 defaultSize 对齐几何契约（缺省 8）', () => {
    expect(BUILTIN_PATTERNS.lines.defaultSize).toBe(8);
    expect(BUILTIN_PATTERNS.dots.defaultSize).toBe(8);
    expect(BUILTIN_PATTERNS.grid.defaultSize).toBe(8);
  });

  it('PatternEmitContext / PatternDefinition 类型门控：emit 产物限 MarkerPrimitive 窄子集（@ts-expect-error）', () => {
    // 正向：path / ellipse / rect / group 合法 motif
    const ok: PatternDefinition = {
      emit: (ctx: PatternEmitContext): Array<MarkerPrimitive> => [
        { type: 'path', commands: [{ kind: 'move', to: [0, 0] }] },
        { type: 'ellipse', cx: ctx.size / 2, cy: ctx.size / 2, rx: 1, ry: 1, fill: ctx.color },
      ],
    };
    expect(typeof ok.emit).toBe('function');
    // 反向：motif fill 禁 resourceRef（无外部 paint server 引用）——窄子集编译期门控
    const bad: Array<MarkerPrimitive> = [
      // @ts-expect-error marker fill 禁 resourceRef（pattern motif 内无外部资源引用）
      { type: 'path', commands: [], fill: { kind: 'resourceRef', id: 'g1' } },
    ];
    void bad;
  });
});
