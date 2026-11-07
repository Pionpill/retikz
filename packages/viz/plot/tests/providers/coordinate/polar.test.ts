import type { IRChild, IRNode, IRScope } from '@retikz/core';
import { DataFieldType, resolveScale } from '@retikz/data';
import { defineScale } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import { isPolarCoordinateFrame } from '../../../src/providers';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema, PolarInterpolation } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

/**
 * contract polar 投影 lowering 测试。
 * 断言 lowerPlots 产出的 core IR（node position / 结构），不碰内部 CoordinateFrame 方法。
 * 投影约定：θ=angleScale(angleValue) 度、r=radiusScale(radiusValue)，
 *   返回 [cx + r·cos(θ°), cy + r·sin(θ°)]；0°=+x、90°=+y（屏幕 y 向下）
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: IRPlot, datasets: Datasets, options?: PlotsLoweringOptions): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope;
};

/** 第一个 mark 图层 scope（外层 plot scope 的第一个子 scope） */
const firstLayer = (spec: IRPlot, datasets: Datasets, options?: PlotsLoweringOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 取一个 point 图层里所有 node 的 position（point 无 color 时为单层 nodeDefault + 裸 node） */
const positionsOf = (layer: IRScope): Array<[number, number]> =>
  layer.children.map(child => (child as IRNode).position as [number, number]);

const isNode = (child: IRChild): child is IRNode => child.type === 'node';

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';

const opts: PlotsLoweringOptions = { layout: { width: 480, height: 300 } };

const resolvedInterpolationOf = (
  spec: IRPlot,
  datasets: Datasets,
  options?: PlotsLoweringOptions,
): string | undefined => {
  const { dataArtifact } = lowerPlotWithDataArtifact(spec, datasets, {
    ...opts,
    ...options,
    layout: { ...opts.layout, ...options?.layout },
    textMeasurer: measureLabel,
  });
  const frame = [...dataArtifact.frameByCoordinateScopeId.values()][0];
  return isPolarCoordinateFrame(frame) ? frame.interpolation : undefined;
};

/** 角向 a / 径向 r，均线性；用裸 x/y 通道（复用语义）或显式 angle/radius 通道 */
const polarPointSpec = (encoding: Record<string, unknown>, extra: Partial<Record<string, unknown>> = {}): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'a', domainPadding: 0 },
      { type: 'linear', name: 'r', domainPadding: 0 },
    ],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r', ...extra },
    marks: [{ type: 'point', encodings: { position: encoding } }],
  });

describe('lowerPlots polar 投影几何 (contract)', () => {
  it('推断连续角度刻度的极坐标插值', () => {
    const spec = polarPointSpec({ x: { field: 'theta' }, y: { field: 'value' } });

    expect(resolvedInterpolationOf(spec, { d: [{ theta: 0, value: 1 }] })).toBe(PolarInterpolation.Polar);
  });

  it.each(['band', 'point'] as const)('推断 %s 角度刻度的弦插值', type => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type, name: 'a' },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } } }],
    });

    expect(resolvedInterpolationOf(spec, { d: [{ category: 'A', value: 1 }] })).toBe(PolarInterpolation.Chord);
  });

  it.each([
    ['linear', PolarInterpolation.Chord],
    ['point', PolarInterpolation.Polar],
  ] as const)('坐标插值覆盖 %s 与 %s 的连续性', (type, interpolation) => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type, name: 'a' },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r', interpolation },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'angle' }, y: { field: 'value' } } } }],
    });

    expect(resolvedInterpolationOf(spec, { d: [{ angle: type === 'point' ? 'A' : 0, value: 1 }] })).toBe(interpolation);
  });

  it.each([
    ['continuous', PolarInterpolation.Polar],
    ['discrete', PolarInterpolation.Chord],
  ] as const)('使用自定义位置刻度连续性=%s', (continuity, expected) => {
    const customScale = defineScale({
      type: `custom-${continuity}`,
      paramsSchema: strictObject({}),
      isFieldCompatible: fieldType => fieldType !== DataFieldType.Categorical,
      resolve: context => resolveScale({ type: 'linear', domain: [0, 1] }, context),
    });
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: `custom-${continuity}`, name: 'a' },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [
        {
          type: 'point',
          properties: { autoPadding: false },
          encodings: { position: { x: { field: 'angle' }, y: { field: 'value' } } },
        },
      ],
    });

    expect(
      resolvedInterpolationOf(
        spec,
        { d: [{ angle: 0, value: 1 }] },
        {
          definitions: {
            scales: [customScale],
            channels: [
              {
                kind: 'position',
                channel: 'custom-x',
                role: 'x',
                pick: () => 'angle',
                scales: { [customScale.type]: { continuity, allowsBaseline: true } },
              },
            ],
          },
        },
      ),
    ).toBe(expected);
  });

  it('极坐标完整圆在宽画布中居中', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0, domain: [0, 360] },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
    });

    const [leftmost] = positionsOf(firstLayer(spec, { d: [{ theta: 180, value: 10 }] }, opts));

    expect(leftmost[0]).toBeCloseTo(90, 6);
    expect(leftmost[1]).toBeCloseTo(150, 6);
  });

  it('角度标签边界保留中心可读半径', () => {
    const categories = ['University Farm', 'Waseca', 'Morris', 'Crookston', 'Grand Rapids', 'Duluth'];
    const rows = categories.flatMap(category => [
      { category, value: 0 },
      { category, value: 10 },
    ]);
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'a' },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    });

    const outer = expandOf(spec, { d: rows }, { layout: { width: 368, height: 362, fontSize: 11 } });
    const markLayer = outer.children
      .filter(isScope)
      .find(child => child.children.filter(isNode).some(node => node.text === undefined)) as IRScope;
    const markPositions = positionsOf(markLayer);
    const center = markPositions[0];
    const firstOuterPoint = markPositions[1];
    const outerRadius = Math.hypot(firstOuterPoint[0] - center[0], firstOuterPoint[1] - center[1]);
    const axisLayer = outer.children
      .filter(isScope)
      .find(child => child.children.filter(isNode).some(node => node.text === 'University Farm')) as IRScope;

    expect(center[0]).toBeCloseTo(184, 6);
    expect(center[1]).toBeCloseTo(181, 6);
    expect(outerRadius).toBeGreaterThan(80);

    for (const label of axisLayer.children.filter(isNode)) {
      const width = String(label.text).length * 11 * 0.6;
      const [x, y] = label.position as [number, number];

      expect(x - width / 2).toBeGreaterThanOrEqual(-1e-6);
      expect(x + width / 2).toBeLessThanOrEqual(368 + 1e-6);
      expect(y - 11 / 2).toBeGreaterThanOrEqual(-1e-6);
      expect(y + 11 / 2).toBeLessThanOrEqual(362 + 1e-6);
    }
  });

  // Happy path
  it('极坐标角度为零且半径最大时点位于中心右侧', () => {
    // 角向 domain 显式 [0,360]，行 angle=0 → θ=startAngle=0°；径向 domain [0,10]、值=10 → r=outerRadius
    // 期望屏幕点 [cx + outerRadius, cy]：x > cx、y ≈ cy（屏幕 y 不变）
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0, domain: [0, 360] },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
    });

    // 两行：一行落圆心（r=0），一行 angle=0 / r=max
    const rows = [
      { theta: 0, value: 0 }, // 圆心
      { theta: 0, value: 10 }, // 圆心右侧 outerRadius 处
    ];
    const layer = firstLayer(spec, { d: rows }, opts);
    const [center, rightmost] = positionsOf(layer);

    // angle=0、radius=0 → 圆心
    // angle=0、radius=max → [cx + outerRadius, cy]：同 y、x 更大
    expect(rightmost[1]).toBeCloseTo(center[1], 6);
    expect(rightmost[0]).toBeGreaterThan(center[0]);
  });

  it('极坐标转过四分之一圈后点位于中心下方', () => {
    // angle=90 → θ=90° → cos=0、sin=1 → [cx, cy + r]（屏幕 y 向下，90° 在圆心下方）
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0, domain: [0, 360] },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
    });
    const rows = [
      { theta: 0, value: 0 }, // 圆心
      { theta: 90, value: 10 }, // 圆心正下方 outerRadius 处
    ];
    const [center, quarter] = positionsOf(firstLayer(spec, { d: rows }, opts));

    expect(quarter[0]).toBeCloseTo(center[0], 6); // 同 x
    expect(quarter[1]).toBeGreaterThan(center[1]); // 屏幕下方（y 更大）
  });

  // 交互：polar 下 x/y 被坐标系重解释为 angle/radius（x/y 是唯一位置通道）
  it('极坐标 x、y 通道通过坐标系投影', () => {
    const rows = [
      { theta: 45, value: 7 },
      { theta: 200, value: 3 },
    ];
    const positions = positionsOf(
      firstLayer(polarPointSpec({ x: { field: 'theta' }, y: { field: 'value' } }), { d: rows }, opts),
    );

    expect(positions).toHaveLength(2);

    for (const [px, py] of positions) {
      expect(Number.isFinite(px)).toBe(true);
      expect(Number.isFinite(py)).toBe(true);
    }
  });

  // 边界：整圆 vs 半圆 — 角向 range 随 endAngle 缩放
  it('半圆与整圆按比例使用角度范围', () => {
    // 同一 angle 值（domain 中点）在整圆 vs 半圆下投影到不同角度
    const rows = [
      { theta: 0, value: 0 }, // 圆心，定 cx/cy
      { theta: 0.5, value: 10 }, // domain 中点
    ];
    const fullSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0, domain: [0, 1] },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' }, // endAngle=360
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
    });
    const halfSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0, domain: [0, 1] },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r', endAngle: 180 },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
    });
    const [fullCenter, fullMid] = positionsOf(firstLayer(fullSpec, { d: rows }, opts));
    const [halfCenter, halfMid] = positionsOf(firstLayer(halfSpec, { d: rows }, opts));

    // 整圆 domain 中点 θ=180° → 圆心左侧（x < cx）；半圆 domain 中点 θ=90° → 圆心下方（x ≈ cx, y > cy）
    expect(fullMid[0]).toBeLessThan(fullCenter[0]);
    expect(halfMid[0]).toBeCloseTo(halfCenter[0], 4);
    expect(halfMid[1]).toBeGreaterThan(halfCenter[1]);
  });

  // 边界：innerRadius>0 — radius domain min → frame.innerRadius（非圆心）
  it('内部半径最小值偏离中心', () => {
    const rows = [
      { theta: 0, value: 0 }, // radius domain min
      { theta: 0, value: 10 }, // radius domain max
    ];

    // 先求圆心：用 innerRadius=0 时 r=0 → 圆心
    const solidSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0, domain: [0, 360] },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
    });
    const [solidMin] = positionsOf(firstLayer(solidSpec, { d: rows }, opts)); // = 圆心

    // donut：innerRadius=0.5 → radius domain min 映射到 frame.innerRadius（圆心右侧、非圆心）
    const donutSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0, domain: [0, 360] },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r', innerRadius: 0.5 },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
    });
    const [donutMin, donutMax] = positionsOf(firstLayer(donutSpec, { d: rows }, opts));

    // angle=0 → 全在圆心 y 上、向右展开。donut 的 min 不在圆心（x 比 solid 的圆心大），且仍小于 max
    expect(donutMin[0]).toBeGreaterThan(solidMin[0]);
    expect(donutMin[0]).toBeLessThan(donutMax[0]);
    expect(donutMin[1]).toBeCloseTo(solidMin[1], 4);
  });

  // 边界：band 角向 scale — 类别绕圆周
  it('带角刻度将类别分布在圆周围', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'a' },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'cat' }, y: { field: 'value' } } } }],
    });
    const rows = [
      { cat: 'A', value: 10 },
      { cat: 'B', value: 10 },
      { cat: 'C', value: 10 },
      { cat: 'D', value: 10 },
    ];
    const positions = positionsOf(firstLayer(spec, { d: rows }, opts));

    expect(positions).toHaveLength(4);

    // 等半径、不同类别 → 不同角度 → 各点互异（绕圆周分布）
    const distinctX = new Set(positions.map(p => p[0].toFixed(3)));

    expect(distinctX.size).toBeGreaterThan(1);
  });

  // 边界：非有限值跳过
  it('非有限半径跳过', () => {
    const rows = [
      { theta: 0, value: 5 },
      { theta: 1, value: 'oops' }, // 非有限径向 → 跳过
      { theta: 2, value: 9 },
    ];

    expect(
      positionsOf(firstLayer(polarPointSpec({ x: { field: 'theta' }, y: { field: 'value' } }), { d: rows }, opts)),
    ).toHaveLength(2);
  });

  // 端到端：多行 point 各落对应极坐标点（结构完整）
  it('极坐标 Point 端到端处理会放置所有数据行', () => {
    const rows = [
      { theta: 0, value: 4 },
      { theta: 90, value: 6 },
      { theta: 180, value: 8 },
    ];
    const layer = firstLayer(
      polarPointSpec(
        { x: { field: 'theta' }, y: { field: 'value' } },
        { angle: 'a', radius: 'r', startAngle: 0, endAngle: 360 },
      ),
      { d: rows },
      opts,
    );

    expect(layer.defaults?.node?.shape).toBe('circle');
    expect(positionsOf(layer)).toHaveLength(3);
    expect(positionsOf(layer).every(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))).toBe(true);
  });

  // 交互：polar × color 编码 → 分色子 Scope（不受坐标系影响）
  it('极坐标按颜色分组到子作用域', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0, domain: [0, 360] },
        { type: 'linear', name: 'r', domainPadding: 0, domain: [0, 10] },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'g', scale: 'col' },
            position: { x: { field: 'theta' }, y: { field: 'value' } },
          },
        },
      ],
    });
    const rows = [
      { theta: 0, value: 5, g: 'X' },
      { theta: 90, value: 6, g: 'Y' },
      { theta: 180, value: 7, g: 'X' },
    ];
    const layer = firstLayer(spec, { d: rows }, opts);

    expect(layer.children).toHaveLength(2); // 2 类别 → 2 子 Scope
    expect((layer.children[0] as IRScope).defaults?.node?.style?.fill).toBe('#aa');
    expect((layer.children[1] as IRScope).defaults?.node?.style?.fill).toBe('#bb');
  });

  // 错误路径
  it('极坐标角度引用未知比例尺时抛出错误', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0 },
        { type: 'linear', name: 'r', domainPadding: 0 },
      ],
      coordinate: { type: 'polar2D', angle: 'missing', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' }, y: { field: 'value' } } } }],
    });

    expect(() => expandOf(spec, { d: [{ theta: 0, value: 1 }] }, opts)).toThrow(/missing|unknown scale/);
  });

  it('作为角度位置投掷的序数尺度', () => {
    // ordinal 不可作位置通道（复用 resolvePositionScale 守卫）
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'ordinal', name: 'a' },
        { type: 'linear', name: 'r', domainPadding: 0 },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'cat' }, y: { field: 'value' } } } }],
    });

    expect(() => expandOf(spec, { d: [{ cat: 'A', value: 1 }] }, opts)).toThrow(/ordinal/);
  });

  // 位置通道完整性由 coordinate 级 lowering 校验——
  // x/y 在 parse 期合法（可选），缺角色在 lowering fail-loud（polar2D / cartesian2D 都需 x+y）
  it('极坐标编码缺少 y 时在下沉阶段明确报错', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'a', domainPadding: 0 },
        { type: 'linear', name: 'r', domainPadding: 0 },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'theta' } } } }],
    });

    expect(() => expandOf(spec, { d: [{ theta: 0 }] }, opts)).toThrow(/polar2D|requires|y/i);
  });

  it('笛卡尔编码缺少 x 在下沉时失败', () => {
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [{ type: 'linear', name: 'x', domainPadding: 0 }],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'x' },
        marks: [{ type: 'point', encodings: { position: { y: { field: 'value' } } } }],
      }),
    ).toThrow();
  });
});

// 回归：cartesian2D point 产物与既有行为一致（frame 重构零行为改变）
describe('lowerPlots cartesian 回归 (contract)', () => {
  const SALES = [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ];
  const cartPointSpec: IRPlot = PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth', domainPadding: 0 },
      { type: 'linear', name: 'yRevenue', domainPadding: 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
  });

  it('笛卡尔点位置未更改', () => {
    // 无 guides → plot area 满；domain x[0,2]->[0,480]、y[9,14]->[300,0]
    const layer = firstLayer(cartPointSpec, { sales: SALES }, opts);
    const positions = positionsOf(layer);

    expect(positions[0]).toEqual([0, 240]);
    expect(positions[2][0]).toBe(480);
  });
});
