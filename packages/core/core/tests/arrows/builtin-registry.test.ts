import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileOptions, CompileWarning } from '../../src/compile/compile';
import { BUILTIN_ARROWS } from '../../src/arrows';
import type { ArrowDefinition } from '../../src/arrows';
import { PathSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import type {
  ArrowEndSpec,
  MarkerEllipsePrim,
  MarkerFill,
  MarkerPathPrim,
  MarkerPrimitive,
  PathPrim,
  ScenePrimitive,
} from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

/**
 * Arrow Registry（ADR-01）core 侧测试（emit-in-compile 契约）
 * @description 断言落点全在 compile 输出（`PathPrim.arrowEnd` 已解析 marker 描述）：
 *   - marker 几何（`arrowEnd.marker: MarkerPrimitive[]`，def.emit 产物）内置 8 零回归 golden
 *   - wrapper 参数（baseSize / refX / markerWidth / markerHeight）
 *   - 端点 shrink 坐标（shrink 在 compile，与 emit 落点无关）
 *   - renderer-agnostic（Scene 无 SVG `<marker>` 元素；ArrowEndSpec.marker 纯 JSON 数据）
 *   - 错误 / 交互 / override（含 override_builtin_geometry_takes_effect 逼出"内置名真走注册表"）
 *   ArrowDefinition 含函数、不进 IR：round-trip 只针对 IR（arrowDetail.shape 字符串）。
 */

/** 水平直线 path（end 箭头作用在末端 [100,0]，start 作用在首端 [0,0]）的 IR 工厂 */
const horizontalPathIR = (
  arrow: '->' | '<-' | '<->',
  detail: Record<string, unknown> = {},
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
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    } as never,
  ],
});

/** 从 Scene 取首个 PathPrim（穿透 group 包裹） */
const firstPath = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  flattenPrims(prims).find((p): p is PathPrim => p.type === 'path');

/** 末端 line 命令的 to 坐标（shrink 后的端点） */
const endpointTo = (path: PathPrim): [number, number] | undefined => {
  const last = path.commands[path.commands.length - 1];
  if (last.kind === 'line' || last.kind === 'move') return last.to;
  return undefined;
};

/** 末端已解析 ArrowEndSpec（end 箭头）；compile 单端水平 path 工厂用 */
const endSpecOf = (
  arrow: '->' | '<-' | '<->',
  detail: Record<string, unknown> = {},
  opts?: CompileOptions,
): ArrowEndSpec | undefined => {
  const path = firstPath(compileToScene(horizontalPathIR(arrow, detail), opts).primitives);
  return path?.arrowEnd;
};

/** 把 marker 几何里首个 path 命令序列拍成 SVG-like 紧凑 d 串（仅 move/line/close，golden 对比用） */
const pathD = (prim: MarkerPathPrim): string =>
  prim.commands
    .map(c => {
      if (c.kind === 'move') return `M${c.to[0]},${c.to[1]}`;
      if (c.kind === 'line') return `L${c.to[0]},${c.to[1]}`;
      if (c.kind === 'close') return 'Z';
      return `?${c.kind}`;
    })
    .join(' ');

/** 取 marker 数组里首个 path 原语 */
const firstMarkerPath = (marker: ReadonlyArray<MarkerPrimitive>): MarkerPathPrim | undefined =>
  marker.find((m): m is MarkerPathPrim => m.type === 'path');

/** 取 marker 数组里首个 ellipse 原语 */
const firstMarkerEllipse = (
  marker: ReadonlyArray<MarkerPrimitive>,
): MarkerEllipsePrim | undefined =>
  marker.find((m): m is MarkerEllipsePrim => m.type === 'ellipse');

/** marker 主导颜色（实心 fill / 空心 stroke；contextStroke / 无 → undefined） */
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

/** 一个最小自定义 arrow：lineContactX=2、tipX 缺省（=baseSize 10）、emit 产单 path marker */
const customArrow = (): ArrowDefinition => ({
  lineContactX: 2,
  emit: ({ stroke }): Array<MarkerPrimitive> => [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 5] },
        { kind: 'line', to: [0, 10] },
        { kind: 'close' },
      ],
      fill: typeof stroke === 'string' ? stroke : { kind: 'contextStroke' },
    },
  ],
});

describe('Arrow registry — happy path', () => {
  it('builtin_8_via_registry：内置 8 经 compileToScene 末端坐标 shrink 后逐一等价旧行为', () => {
    // stealth shrink 4.2 × strokeWidth 1 → 末端 [100,0] 朝 [0,0] 缩到 [95.8, 0]
    const stealth = firstPath(compileToScene(horizontalPathIR('->', { shape: 'stealth' })).primitives);
    expect(stealth && endpointTo(stealth)).toEqual([95.8, 0]);
    // normal shrink 6 → [94, 0]
    const normal = firstPath(compileToScene(horizontalPathIR('->', { shape: 'normal' })).primitives);
    expect(normal && endpointTo(normal)).toEqual([94, 0]);
    // open shrink 5.25 → [94.75, 0]
    const open = firstPath(compileToScene(horizontalPathIR('->', { shape: 'open' })).primitives);
    expect(open && endpointTo(open)).toEqual([94.75, 0]);
    // openStealth: tipX 9, contactX 3 - 0.75 → shrink 4.05 → [95.95, 0]
    const openStealth = firstPath(compileToScene(horizontalPathIR('->', { shape: 'openStealth' })).primitives);
    expect(openStealth && endpointTo(openStealth)).toEqual([95.95, 0]);
  });

  it('builtin_marker_geometry_golden：内置 8 marker 几何零回归（compile 输出 ArrowEndSpec.marker）', () => {
    // 实心三角 normal：一个 path，commands 等价 d "M0,0 L10,5 L0,10 Z"
    const normal = endSpecOf('->', { shape: 'normal' });
    const normalPath = firstMarkerPath(normal?.marker ?? []);
    expect(normalPath && pathD(normalPath)).toBe('M0,0 L10,5 L0,10 Z');

    // V 形 stealth：一个 path，d "M0,0 L10,5 L0,10 L3,5 Z"
    const stealth = endSpecOf('->', { shape: 'stealth' });
    const stealthPath = firstMarkerPath(stealth?.marker ?? []);
    expect(stealthPath && pathD(stealthPath)).toBe('M0,0 L10,5 L0,10 L3,5 Z');

    // 空心 V 形 openStealth：一个 path，d "M1,1 L9,5 L1,9 L3,5 Z"
    const openStealth = endSpecOf('->', { shape: 'openStealth' });
    const openStealthPath = firstMarkerPath(openStealth?.marker ?? []);
    expect(openStealthPath && pathD(openStealthPath)).toBe('M1,1 L9,5 L1,9 L3,5 Z');
    expect(openStealthPath?.strokeLinejoin).toBe('miter');

    // 实心菱形 diamond：一个 path，d "M0,5 L5,0 L10,5 L5,10 Z"
    const diamond = endSpecOf('->', { shape: 'diamond' });
    const diamondPath = firstMarkerPath(diamond?.marker ?? []);
    expect(diamondPath && pathD(diamondPath)).toBe('M0,5 L5,0 L10,5 L5,10 Z');

    // 实心圆 circle：一个 ellipse，cx=cy=5、rx=ry=5
    const circle = endSpecOf('->', { shape: 'circle' });
    const circleEllipse = firstMarkerEllipse(circle?.marker ?? []);
    expect(circleEllipse).toMatchObject({ cx: 5, cy: 5, rx: 5, ry: 5 });

    // 空心三角 open：一个 path，d "M1,1 L9,5 L1,9 Z"
    const open = endSpecOf('->', { shape: 'open' });
    const openPath = firstMarkerPath(open?.marker ?? []);
    expect(openPath && pathD(openPath)).toBe('M1,1 L9,5 L1,9 Z');

    // 空心菱形 openDiamond：一个 path，d "M1,5 L5,1 L9,5 L5,9 Z"
    const openDiamond = endSpecOf('->', { shape: 'openDiamond' });
    const openDiamondPath = firstMarkerPath(openDiamond?.marker ?? []);
    expect(openDiamondPath && pathD(openDiamondPath)).toBe('M1,5 L5,1 L9,5 L5,9 Z');

    // 空心圆 openCircle：一个 ellipse，cx=cy=5、rx=ry=4.25
    const openCircle = endSpecOf('->', { shape: 'openCircle' });
    const openCircleEllipse = firstMarkerEllipse(openCircle?.marker ?? []);
    expect(openCircleEllipse).toMatchObject({ cx: 5, cy: 5, rx: 4.25, ry: 4.25 });
  });

  it('wrapper_params：baseSize / refX / markerWidth / markerHeight 解析正确', () => {
    // stealth：baseSize 10、refX 3（V tip 凹口）、默认 length/width 6
    const stealth = endSpecOf('->', { shape: 'stealth' });
    expect(stealth).toMatchObject({ baseSize: 10, refX: 3, markerWidth: 6, markerHeight: 6 });

    // 实心 normal/diamond/circle：refX 0（back 外缘 x=0）
    expect(endSpecOf('->', { shape: 'normal' })?.refX).toBe(0);
    expect(endSpecOf('->', { shape: 'diamond' })?.refX).toBe(0);
    expect(endSpecOf('->', { shape: 'circle' })?.refX).toBe(0);

    // 空心 open / openDiamond：refX = back centerline 1 - lineWidth/2（默认 1.5）= 0.25
    expect(endSpecOf('->', { shape: 'open' })?.refX).toBe(0.25);
    expect(endSpecOf('->', { shape: 'openDiamond' })?.refX).toBe(0.25);
    // openStealth：refX = 凹口接触点 3 - lineWidth/2（默认 1.5）= 2.25
    expect(endSpecOf('->', { shape: 'openStealth' })?.refX).toBe(2.25);
    // openCircle：圆外缘左 x 0.75 - lineWidth/2 = 0
    expect(endSpecOf('->', { shape: 'openCircle' })?.refX).toBe(0);
  });

  it('custom_arrow_register：注册自定义 ArrowDefinition → compile 不抛、marker 几何进 arrowEnd', () => {
    const ir = horizontalPathIR('->', { shape: 'myTip' });
    const opts: CompileOptions = { arrows: { myTip: customArrow() } };
    expect(() => compileToScene(ir, opts)).not.toThrow();
    const spec = endSpecOf('->', { shape: 'myTip' }, opts);
    expect(spec?.shape).toBe('myTip');
    // 自定义 def.emit 几何进 marker
    const mp = firstMarkerPath(spec?.marker ?? []);
    expect(mp && pathD(mp)).toBe('M0,0 L10,5 L0,10 Z');
  });

  it('shape_open_string：arrowDetail.shape=myTip（已注册）合法编译', () => {
    const ir = horizontalPathIR('->', { shape: 'myTip' });
    const scene = compileToScene(ir, { arrows: { myTip: customArrow() } });
    expect(firstPath(scene.primitives)).toBeDefined();
  });

  it('marker_renderer_agnostic：core 输出 ArrowEndSpec、无 SVG <marker> 元素', () => {
    const scene = compileToScene(horizontalPathIR('->', { shape: 'stealth' }));
    const path = firstPath(scene.primitives);
    expect(path?.arrowEnd).toBeDefined();
    expect(path?.arrowEnd?.shape).toBe('stealth');
    // Scene primitive 树里不存在任何 'marker' type 元素（marker 是几何数据，不是 SVG marker 标签）
    const allTypes = flattenPrims(scene.primitives).map(p => p.type);
    expect(allTypes).not.toContain('marker');
    // ArrowEndSpec.marker 是纯 JSON 数据（无函数）：序列化往返不丢
    const json = JSON.parse(JSON.stringify(path?.arrowEnd));
    expect(json.marker).toEqual(path?.arrowEnd?.marker);
    const hasFn = (path?.arrowEnd?.marker ?? []).some(m => typeof (m as unknown) === 'function');
    expect(hasFn).toBe(false);
  });
});

describe('Arrow registry — boundary', () => {
  it('hollow_linewidth：空心箭头 lineWidth 影响 shrink（open lineWidth 1 → 末端 95.1）', () => {
    // open: tipX 9, lineContactX = 1 - lineWidth/2; lineWidth 1 → lineContactX 0.5 → shrink (9-0.5)*6/10 = 5.1
    const path = firstPath(
      compileToScene(horizontalPathIR('->', { shape: 'open', lineWidth: 1 })).primitives,
    );
    expect(path && endpointTo(path)).toEqual([94.9, 0]);
  });

  it('hollow_linewidth：空心箭头 color 主导描边进 marker、fill 被丢', () => {
    const spec = endSpecOf('->', { shape: 'openStealth', fill: 'red', color: 'blue' });
    // 空心：color 主导（blue 进 marker stroke）；fill='red' 被丢
    expect(markerPaint(spec)).toBe('blue');
    expect(markerPaint(spec)).not.toBe('red');
  });

  it('scale_length_width：scale 乘 length → markerWidth + shrink 翻倍', () => {
    // normal length 10 → shrink 10 → 末端 90
    const longPath = firstPath(
      compileToScene(horizontalPathIR('->', { shape: 'normal', length: 10 })).primitives,
    );
    expect(longPath && endpointTo(longPath)).toEqual([90, 0]);
    // stealth default length 6 × scale 2 → shrink 8.4 → 末端 91.6；markerWidth = 6×2 = 12
    const scaled = endSpecOf('->', { shape: 'stealth', scale: 2 });
    expect(scaled?.markerWidth).toBeCloseTo(12, 5);
    const scaledPath = firstPath(
      compileToScene(horizontalPathIR('->', { shape: 'stealth', scale: 2 })).primitives,
    );
    expect(scaledPath && endpointTo(scaledPath)).toEqual([91.6, 0]);
  });

  it('start_end_override：<-> 起末端 def 各自 resolve（不同 shape）', () => {
    const path = firstPath(
      compileToScene(
        horizontalPathIR('<->', { start: { shape: 'open' }, end: { shape: 'stealth' } }),
      ).primitives,
    );
    expect(path?.arrowStart?.shape).toBe('open');
    expect(path?.arrowEnd?.shape).toBe('stealth');
    // 各自 refX：open 0.25 / stealth 3
    expect(path?.arrowStart?.refX).toBe(0.25);
    expect(path?.arrowEnd?.refX).toBe(3);
  });

  it('start_end_override：<-> compile 末端两端都缩（start [4.2,0] / end [95.8,0]，shape stealth）', () => {
    const path = firstPath(compileToScene(horizontalPathIR('<->', { shape: 'stealth' })).primitives);
    expect(path?.arrowStart).toBeDefined();
    expect(path?.arrowEnd).toBeDefined();
    // 首段 move 端点缩到 [4.2, 0]，末端 line 缩到 [95.8, 0]
    const moveCmd = path?.commands.find(c => c.kind === 'move');
    expect(moveCmd?.kind === 'move' ? moveCmd.to : undefined).toEqual([4.2, 0]);
    expect(path && endpointTo(path)).toEqual([95.8, 0]);
  });
});

describe('Arrow registry — error path', () => {
  it('unregistered_shape_throws：未注册 shape 名 → 编译期 throw（带可用名列表）', () => {
    const ir = horizontalPathIR('->', { shape: 'nope' });
    expect(() => compileToScene(ir)).toThrow(/Unknown arrow shape 'nope'/);
    // 可用名排序列表（内置 8 字母序）
    expect(() => compileToScene(ir)).toThrow(
      /circle, diamond, normal, open, openCircle, openDiamond, openStealth, stealth/,
    );
  });

  it('same_name_override_warn：arrows 覆盖内置名 → ARROW_OVERRIDES_BUILTIN warn（不静默）', () => {
    const warnings: Array<CompileWarning> = [];
    const ir = horizontalPathIR('->', { shape: 'stealth' });
    compileToScene(ir, {
      arrows: { stealth: customArrow() },
      onWarn: w => warnings.push(w),
    });
    expect(warnings.some(w => w.code === 'ARROW_OVERRIDES_BUILTIN')).toBe(true);
  });

  it('marker_primitive_rejects_text：MarkerPrimitive 窄子集类型层面拒 text（@ts-expect-error）', () => {
    // 运行时无断言——靠 TS 编译期门控：MarkerPrimitive 不含 'text' 分支。
    // 若窄子集被改宽（误纳 TextPrim），@ts-expect-error 失效 → tsc 报"unused expect-error" → CI 红。
    const bad: Array<MarkerPrimitive> = [
      // @ts-expect-error MarkerPrimitive 禁 text（窄子集杜绝 marker 内文本布局）
      { type: 'text', x: 0, y: 0, lines: [], measuredWidth: 0, measuredHeight: 0 },
    ];
    void bad;
    // 同时正向证明 path / ellipse / rect / group 合法
    const ok: Array<MarkerPrimitive> = [
      { type: 'path', commands: [{ kind: 'move', to: [0, 0] }] },
      { type: 'ellipse', cx: 5, cy: 5, rx: 5, ry: 5 },
      { type: 'rect', x: 0, y: 0, width: 10, height: 10 },
      { type: 'group', children: [{ type: 'path', commands: [{ kind: 'close' }] }] },
    ];
    expect(ok).toHaveLength(4);
  });

  it('marker_primitive_rejects_resourceRef_fill：fill 收窄到 string | contextStroke（@ts-expect-error）', () => {
    const ok: MarkerPrimitive = { type: 'path', commands: [], fill: { kind: 'contextStroke' } };
    expect(ok.type).toBe('path');
    const bad: Array<MarkerPrimitive> = [
      // @ts-expect-error marker fill 禁 resourceRef（无外部 paint server 引用）
      { type: 'path', commands: [], fill: { kind: 'resourceRef', id: 'g1' } },
    ];
    void bad;
  });
});

describe('Arrow registry — interaction', () => {
  it('context_stroke_theme：默认箭头无 color override → marker 走 contextStroke（主题反应不冻结）', () => {
    // compile 不冻结颜色：未给 color 时 marker 几何 fill/stroke 为 contextStroke，主题切换仍生效
    const spec = endSpecOf('->', { shape: 'stealth' });
    expect(markerPaint(spec)).toBeUndefined();
    // 实心 stealth：marker path fill 应为 contextStroke 对象（不冻结成纯色）
    const mp = firstMarkerPath(spec?.marker ?? []);
    expect(mp?.fill).toEqual({ kind: 'contextStroke' });
  });

  it('custom_arrow_with_path_stroke：自定义箭头不带 color → emit 收 contextStroke（继承 path stroke）', () => {
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            arrow: '->',
            stroke: 'crimson',
            arrowDetail: { shape: 'myTip' },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          } as never,
        ],
      },
      { arrows: { myTip: customArrow() } },
    );
    const path = firstPath(scene.primitives);
    expect(path?.stroke).toBe('crimson');
    // 箭头未给 color override → emit 收 contextStroke，customArrow fill 落 contextStroke
    const mp = firstMarkerPath(path?.arrowEnd?.marker ?? []);
    expect(mp?.fill).toEqual({ kind: 'contextStroke' });
  });

  it('arrow_with_shrink：自定义 lineContactX → path 端点收缩量正确（lineContactX 2 → shrink 4.8）', () => {
    const ir = horizontalPathIR('->', { shape: 'myTip' });
    const path = firstPath(compileToScene(ir, { arrows: { myTip: customArrow() } }).primitives);
    // myTip tipX 缺省 10, lineContactX 2 → shrink (10-2)*6/10 = 4.8 → 末端 [100-4.8, 0] = [95.2, 0]
    expect(path && endpointTo(path)).toEqual([95.2, 0]);
  });

  it('override_builtin_geometry_takes_effect：覆盖内置 stealth 的几何 → 该 path shrink 真按覆盖值变（内置名真查注册表）', () => {
    // 内置 stealth 默认 tipX 10 / lineContactX 3 → shrink (10-3)*6/10 = 4.2 → 末端 95.8
    // 覆盖成 lineContactX 99 / tipX 10：若内置名仍走旧 switch（不查 effectiveArrows），shrink 不变（95.8）；
    // 若真查注册表，shrink = (10-99)*6/10 = -53.4（端点坐标随之变）。断言端点 != 95.8 证明走注册表。
    const overridden: ArrowDefinition = {
      lineContactX: 99,
      tipX: 10,
      emit: () => [
        { type: 'path', commands: [{ kind: 'move', to: [0, 0] }, { kind: 'line', to: [10, 5] }, { kind: 'close' }] },
      ],
    };
    const path = firstPath(
      compileToScene(horizontalPathIR('->', { shape: 'stealth' }), {
        arrows: { stealth: overridden },
        onWarn: () => {},
      }).primitives,
    );
    const x = path && endpointTo(path)?.[0];
    // 端点必须随覆盖几何而变（不再是内置 95.8）——证明内置名走 effectiveArrows 而非保留 switch
    expect(x).not.toBe(95.8);
    // shrink (10-99)*6/10 = -53.4 → 末端 100 - (-53.4) = 153.4
    expect(x).toBeCloseTo(153.4, 1);
  });
});

describe('Arrow registry — JSON round-trip / zod parse', () => {
  it('round_trip：含 arrowDetail 的 IR JSON.stringify → parse 语义等价（shape 字符串保真）', () => {
    const path = {
      type: 'path',
      arrow: '<->',
      arrowDetail: {
        shape: 'myTip',
        scale: 1.5,
        start: { shape: 'open', color: 'red' },
        end: { shape: 'stealth' },
      },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    };
    const original = PathSchema.parse(path);
    const roundTripped = PathSchema.parse(JSON.parse(JSON.stringify(original)));
    expect(roundTripped).toEqual(original);
    // 开放 shape 名经 JSON 往返不丢
    expect(roundTripped.arrowDetail?.shape).toBe('myTip');
    expect(roundTripped.arrowDetail?.start?.shape).toBe('open');
  });

  it('zod_parse_error：空串 shape 被 schema 拒（min(1)）', () => {
    const r = PathSchema.safeParse({
      type: 'path',
      arrow: '->',
      arrowDetail: { shape: '' },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    });
    expect(r.success).toBe(false);
  });

  it('zod_parse_pass：任意非空 shape 名 schema 接受（未注册名拒绝移到 compile 期）', () => {
    const r = PathSchema.safeParse({
      type: 'path',
      arrow: '->',
      arrowDetail: { shape: 'totally-custom-name' },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe('Arrow registry — BUILTIN_ARROWS 注册表结构', () => {
  it('内置 8 注册键穷尽（normal/open/stealth/openStealth/diamond/openDiamond/circle/openCircle）', () => {
    expect(Object.keys(BUILTIN_ARROWS).sort()).toEqual(
      ['circle', 'diamond', 'normal', 'open', 'openCircle', 'openDiamond', 'openStealth', 'stealth'],
    );
  });

  it('内置 8 几何字段对齐 ADR 几何契约（lineContactX 静态 base / tipX / hollow）', () => {
    // 实心 lineContactX base：normal/diamond/circle = 0, stealth = 3
    expect(BUILTIN_ARROWS.normal.lineContactX).toBe(0);
    expect(BUILTIN_ARROWS.diamond.lineContactX).toBe(0);
    expect(BUILTIN_ARROWS.circle.lineContactX).toBe(0);
    expect(BUILTIN_ARROWS.stealth.lineContactX).toBe(3);
    // 空心 base：open/openDiamond = 1 + tipX 9 + hollow; openCircle = 0.75 + hollow
    expect(BUILTIN_ARROWS.open.lineContactX).toBe(1);
    expect(BUILTIN_ARROWS.open.tipX).toBe(9);
    expect(BUILTIN_ARROWS.open.hollow).toBe(true);
    expect(BUILTIN_ARROWS.openDiamond.lineContactX).toBe(1);
    expect(BUILTIN_ARROWS.openDiamond.tipX).toBe(9);
    expect(BUILTIN_ARROWS.openStealth.lineContactX).toBe(3);
    expect(BUILTIN_ARROWS.openStealth.tipX).toBe(9);
    expect(BUILTIN_ARROWS.openStealth.hollow).toBe(true);
    expect(BUILTIN_ARROWS.openCircle.lineContactX).toBe(0.75);
    expect(BUILTIN_ARROWS.openCircle.hollow).toBe(true);
  });
});
