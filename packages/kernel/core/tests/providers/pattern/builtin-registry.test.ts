import { describe, expect, it } from 'vitest';

import type { CompileOptions } from '../../../src/compile/compile';
import type {
  MarkerEllipsePrim,
  MarkerPathPrim,
  MarkerPrimitive,
  PaintResource,
  PatternDefinition,
  PatternEmitContext,
  ResolvedPatternTile,
  SceneResource,
} from '../../../src/contract';
import type { IRPaintSpec, IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { definePattern } from '../../../src/contract';
import { BUILTIN_PATTERNS } from '../../../src/providers/pattern';
import { PaintSpecSchema } from '../../../src/schemas';

/** 含一个 pattern fill node 的 IR 工厂 */
const patternNodeIR = (spec: IRPaintSpec, second?: IRPaintSpec): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'A', position: [0, 0], text: 'A', fill: spec },
    ...(second
      ? [{ type: 'node' as const, id: 'B', position: [60, 0] as [number, number], text: 'B', fill: second }]
      : []),
  ],
});

/** 从 Scene.resources 取首个 pattern 资源（spec.kind === 'pattern'） */
const firstPatternResource = (resources: Array<SceneResource> | undefined): PaintResource | undefined =>
  (resources ?? []).find((r): r is PaintResource => r.kind === 'paint' && r.spec.kind === 'pattern');

/** 从 Scene.resources 取首个 pattern 资源的 tile（已解析 motif） */
const tileOf = (spec: IRPaintSpec, opts?: CompileOptions): ResolvedPatternTile | undefined =>
  firstPatternResource(compileToScene(patternNodeIR(spec), opts).scene.resources)?.tile;

/** 取 tile.motif 里首个 path 原语 */
const firstMotifPath = (tile: ResolvedPatternTile | undefined): MarkerPathPrim | undefined =>
  (tile?.motif ?? []).find((m): m is MarkerPathPrim => m.type === 'path');

/** 取 tile.motif 中的全部 path 原语 */
const motifPaths = (tile: ResolvedPatternTile | undefined): Array<MarkerPathPrim> =>
  (tile?.motif ?? []).filter((motif): motif is MarkerPathPrim => motif.type === 'path');

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
const customPattern = (): PatternDefinition =>
  definePattern({
    name: 'customPattern',
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
const multiPrimPattern = (): PatternDefinition =>
  definePattern({
    name: 'multiPrimPattern',
    defaultSize: 12,
    emit: ({ size, color, background }): Array<MarkerPrimitive> => [
      ...(background
        ? ([{ type: 'rect', x: 0, y: 0, width: size, height: size, fill: background }] as Array<MarkerPrimitive>)
        : []),
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

    // grid：横纵方向是两个独立 path，均落在 tile 中线
    const gridTile = tileOf({ kind: 'pattern', shape: 'grid' });
    expect(motifPaths(gridTile).map(pathD)).toEqual(['M0,4 L8,4', 'M4,0 L4,8']);

    // dots：一个 ellipse（圆），cx=cy=4（size/2）、rx=ry=8/5=1.6（缺省半径 size/5）
    const dotsTile = tileOf({ kind: 'pattern', shape: 'dots' });
    const dotsEllipse = firstMotifEllipse(dotsTile);
    expect(dotsEllipse).toMatchObject({ cx: 4, cy: 4, rx: 1.6, ry: 1.6 });
  });

  it('custom_pattern_register：注册自定义 PatternDefinition → tile.motif 进资源', () => {
    const opts: CompileOptions = { patterns: [{ ...customPattern(), name: 'cross' }] };
    const ir = patternNodeIR({ kind: 'pattern', shape: 'cross' });
    expect(() => compileToScene(ir, opts).scene).not.toThrow();
    const tile = firstPatternResource(compileToScene(ir, opts).scene.resources)?.tile;
    // 自定义 def.emit 几何进 tile.motif（size 缺省 = defaultSize 10）
    const mp = firstMotifPath(tile);
    expect(mp && pathD(mp)).toBe('M0,0 L10,10');
  });

  it('shape_open_string：pattern.shape=myMotif（已注册）合法编译', () => {
    const ir = patternNodeIR({ kind: 'pattern', shape: 'myMotif' });
    const scene = compileToScene(ir, { patterns: [{ ...customPattern(), name: 'myMotif' }] }).scene;
    expect(firstPatternResource(scene.resources)).toBeDefined();
  });

  it('pattern_dedup：同 pattern spec 多处 → 1 资源 1 tile', () => {
    const spec: IRPaintSpec = { kind: 'pattern', shape: 'lines', size: 6 };
    const scene = compileToScene(patternNodeIR(spec, spec)).scene;
    const patternResources = (scene.resources ?? []).filter(
      (r): r is PaintResource => r.kind === 'paint' && r.spec.kind === 'pattern',
    );
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

  it('line_style：grid motif 复用 dash、offset、cap 与 join', () => {
    const path = firstMotifPath(
      tileOf({
        kind: 'pattern',
        shape: 'grid',
        dashPattern: [6, 3],
        dashOffset: 2,
        lineCap: 'round',
        lineJoin: 'bevel',
      }),
    );
    expect(path).toMatchObject({
      dashPattern: [6, 3],
      dashOffset: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'bevel',
    });
  });

  it('grid_direction_style：横纵 path 分别覆盖基础样式且互不泄漏', () => {
    const [horizontal, vertical] = motifPaths(
      tileOf({
        kind: 'pattern',
        shape: 'grid',
        color: '#64748b',
        lineWidth: 1,
        dashed: true,
        horizontalStyle: {
          color: '#2563eb',
          dotted: true,
          lineCap: 'round',
        },
        verticalStyle: {
          color: '#dc2626',
          lineWidth: 2,
          dashPattern: [6, 2],
        },
      }),
    );

    expect(horizontal).toMatchObject({
      stroke: '#2563eb',
      strokeWidth: 1,
      dashPattern: [1, 2],
      strokeLinecap: 'round',
    });
    expect(vertical).toMatchObject({
      stroke: '#dc2626',
      strokeWidth: 2,
      dashPattern: [6, 2],
    });
    expect(vertical.strokeLinecap).toBeUndefined();
  });

  it('line_style_cycle_every_n：每 5 条主线扩展 tile，稀疏位置继承基础样式', () => {
    const tile = tileOf({
      kind: 'pattern',
      shape: 'lines',
      size: 6,
      color: '#64748b',
      lineWidth: 1,
      dotted: true,
      lineStyleCycle: {
        period: 5,
        overrides: [{ index: 0, style: { lineWidth: 3, dashed: true } }],
      },
    });
    const paths = motifPaths(tile);

    expect(tile?.size).toBe(30);
    expect(paths.map(pathD)).toEqual(['M0,3 L30,3', 'M0,9 L30,9', 'M0,15 L30,15', 'M0,21 L30,21', 'M0,27 L30,27']);
    expect(paths[0]).toMatchObject({ strokeWidth: 3, dashPattern: [4, 2] });
    expect(paths[1]).toMatchObject({ strokeWidth: 1, dashPattern: [1, 2] });
    expect(paths[4]).toMatchObject({ strokeWidth: 1, dashPattern: [1, 2] });
  });

  it('line_style_cycle_sequence：override 按 index 形成任意周期，并可显式恢复实线', () => {
    const paths = motifPaths(
      tileOf({
        kind: 'pattern',
        shape: 'lines',
        size: 8,
        color: '#64748b',
        dashed: true,
        lineStyleCycle: {
          period: 3,
          overrides: [
            { index: 2, style: { dashed: false, color: '#16a34a' } },
            { index: 0, style: { color: '#dc2626' } },
            { index: 1, style: { dotted: true, color: '#2563eb' } },
          ],
        },
      }),
    );

    expect(paths.map(path => path.stroke)).toEqual(['#dc2626', '#2563eb', '#16a34a']);
    expect(paths[0]?.dashPattern).toEqual([4, 2]);
    expect(paths[1]?.dashPattern).toEqual([1, 2]);
    expect(paths[2]?.dashPattern).toBeUndefined();
  });

  it('dashed_preset：dashed 解析为 [4, 2]', () => {
    expect(firstMotifPath(tileOf({ kind: 'pattern', shape: 'lines', dashed: true }))?.dashPattern).toEqual([4, 2]);
  });

  it('dotted_preset：dotted 解析为 [1, 2]', () => {
    expect(firstMotifPath(tileOf({ kind: 'pattern', shape: 'lines', dotted: true }))?.dashPattern).toEqual([1, 2]);
  });

  it('dash_priority：显式 dashPattern 优先于 dashed / dotted', () => {
    const path = firstMotifPath(
      tileOf({
        kind: 'pattern',
        shape: 'lines',
        dashed: true,
        dotted: true,
        dashPattern: [8, 3, 2, 3],
      }),
    );
    expect(path?.dashPattern).toEqual([8, 3, 2, 3]);
  });

  it('preset_priority：dashed 优先于 dotted', () => {
    const path = firstMotifPath(tileOf({ kind: 'pattern', shape: 'lines', dashed: true, dotted: true }));
    expect(path?.dashPattern).toEqual([4, 2]);
  });

  it('dots_line_style：内置 dots 保持填充圆点语义并忽略线型字段', () => {
    const dot = firstMotifEllipse(
      tileOf({
        kind: 'pattern',
        shape: 'dots',
        dashed: true,
        dashOffset: 2,
        lineCap: 'round',
        lineJoin: 'bevel',
      }),
    );
    expect(dot).toMatchObject({ type: 'ellipse', fill: 'currentColor' });
    expect(dot?.dashPattern).toBeUndefined();
    expect(dot?.dashOffset).toBeUndefined();
  });

  it('custom_pattern_line_style：自定义 definition 收到解析后的低层线型字段', () => {
    const echo = definePattern({
      name: 'echo',
      emit: context => [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [context.size, 0] },
          ],
          stroke: context.color,
          dashPattern: context.dashPattern,
          dashOffset: context.dashOffset,
          strokeLinecap: context.lineCap,
          strokeLinejoin: context.lineJoin,
        },
      ],
    });
    const path = firstMotifPath(
      tileOf(
        {
          kind: 'pattern',
          shape: 'echo',
          dotted: true,
          dashOffset: -1,
          lineCap: 'round',
          lineJoin: 'bevel',
        },
        { patterns: [echo] },
      ),
    );
    expect(path).toMatchObject({
      dashPattern: [1, 2],
      dashOffset: -1,
      strokeLinecap: 'round',
      strokeLinejoin: 'bevel',
    });
  });

  it('custom_pattern_grouped_styles：自定义 definition 收到已继承和展开的方向/周期样式', () => {
    let captured: PatternEmitContext | undefined;
    const capture = definePattern({
      name: 'capture',
      emit: context => {
        captured = context;
        return [];
      },
    });

    tileOf(
      {
        kind: 'pattern',
        shape: 'capture',
        color: '#64748b',
        lineWidth: 1,
        dashed: true,
        horizontalStyle: { color: '#2563eb', dotted: true, lineCap: 'round' },
        verticalStyle: { color: '#dc2626', dashPattern: [6, 2], lineWidth: 2 },
        lineStyleCycle: {
          period: 2,
          overrides: [
            { index: 0, style: { lineWidth: 3 } },
            { index: 1, style: { dashed: false, dotted: false } },
          ],
        },
      },
      { patterns: [capture] },
    );

    expect(captured?.horizontalStyle).toEqual({
      color: '#2563eb',
      lineWidth: 1,
      dashPattern: [1, 2],
      lineCap: 'round',
    });
    expect(captured?.verticalStyle).toEqual({
      color: '#dc2626',
      lineWidth: 2,
      dashPattern: [6, 2],
    });
    expect(captured?.lineStyleCycle).toEqual({
      period: 2,
      styles: [
        { color: '#64748b', lineWidth: 3, dashPattern: [4, 2] },
        { color: '#64748b', lineWidth: 1 },
      ],
    });
  });

  it('custom_pattern_tile_size：result object 覆盖 tile 周期，Iterable 输出保持默认周期', () => {
    const expanded = definePattern({
      name: 'expanded',
      emit: ({ size }) => ({
        tileSize: size * 3,
        motif: [
          {
            type: 'path' as const,
            commands: [
              { kind: 'move' as const, to: [0, 0] as [number, number] },
              { kind: 'line' as const, to: [size * 3, 0] as [number, number] },
            ],
          },
        ],
      }),
    });

    expect(tileOf({ kind: 'pattern', shape: 'expanded', size: 8 }, { patterns: [expanded] })?.size).toBe(24);
    expect(tileOf({ kind: 'pattern', shape: 'customPattern', size: 8 }, { patterns: [customPattern()] })?.size).toBe(8);
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
    const scene = compileToScene(patternNodeIR(grad, pat)).scene;
    expect(scene.resources).toHaveLength(2);
    const ids = (scene.resources ?? []).map(r => r.id);
    expect(new Set(ids).size).toBe(2);
    // gradient 资源无 tile、pattern 资源有 tile
    const gradRes = (scene.resources ?? []).find(
      (r): r is PaintResource => r.kind === 'paint' && r.spec.kind === 'linearGradient',
    );
    const patRes = (scene.resources ?? []).find(
      (r): r is PaintResource => r.kind === 'paint' && r.spec.kind === 'pattern',
    );
    expect(gradRes?.tile).toBeUndefined();
    expect(patRes?.tile).toBeDefined();
  });
});

describe('Pattern registry — error path', () => {
  it('unregistered_pattern_throws：未注册 pattern 名 → 编译期 throw（带可用名）', () => {
    const ir = patternNodeIR({ kind: 'pattern', shape: 'nope' });
    expect(() => compileToScene(ir).scene).toThrow(/nope/);
    // 可用名（内置 3 字母序）出现在错误消息里
    expect(() => compileToScene(ir).scene).toThrow(/dots, grid, lines/);
  });

  it('same_name_duplicate_rejected：patterns 覆盖内置名 → duplicate error（不静默）', () => {
    const ir = patternNodeIR({ kind: 'pattern', shape: 'lines' });
    expect(
      () =>
        compileToScene(ir, {
          patterns: [{ ...customPattern(), name: 'lines' }],
        }).scene,
    ).toThrow(/duplicate pattern shape registration: "lines"/);
  });

  it('motif_rejects_text：emit 返回含 text 的 primitive → 运行时窄子集栅栏拒', () => {
    // 窄子集编译期门控：MarkerPrimitive 不含 'text' 分支（@ts-expect-error 命中元素行）；
    // 同时实现阶段 emit 产物过运行时窄子集校验，含 text 编译期 throw。
    const badMotif: Array<MarkerPrimitive> = [
      // @ts-expect-error MarkerPrimitive 禁 text（窄子集杜绝 motif 内文本布局）
      { type: 'text', x: 0, y: 0, lines: [], measuredWidth: 0, measuredHeight: 0 },
    ];
    const badPattern: PatternDefinition = { name: 'bad', emit: () => badMotif };
    const ir = patternNodeIR({ kind: 'pattern', shape: 'bad' });
    expect(() => compileToScene(ir, { patterns: [{ ...badPattern, name: 'bad' }] }).scene).toThrow();
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
    const opts: CompileOptions = { patterns: [{ ...multiPrimPattern(), name: 'multi' }] };
    const tile = firstPatternResource(
      compileToScene(patternNodeIR({ kind: 'pattern', shape: 'multi', background: '#fff' }), opts).scene.resources,
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
    const scene = compileToScene(patternNodeIR({ kind: 'pattern', shape: 'grid' })).scene;
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
    expect(BUILTIN_PATTERNS.map(def => def.name).sort()).toEqual(['dots', 'grid', 'lines']);
  });

  it('内置 3 defaultSize 对齐几何契约（缺省 8）', () => {
    expect(BUILTIN_PATTERNS.lines.defaultSize).toBe(8);
    expect(BUILTIN_PATTERNS.dots.defaultSize).toBe(8);
    expect(BUILTIN_PATTERNS.grid.defaultSize).toBe(8);
  });

  it('PatternEmitContext / PatternDefinition 类型门控：emit 产物限 MarkerPrimitive 窄子集（@ts-expect-error）', () => {
    // 正向：path / ellipse / rect / group 合法 motif
    const ok: PatternDefinition = {
      name: 'ok',
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
