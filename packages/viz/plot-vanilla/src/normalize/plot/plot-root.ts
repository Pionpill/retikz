import type { IRPlotCoordinateOperation, IRPlotScale } from '@retikz/plot';

import { PlotCoordinate, PlotGuide, PlotMark } from '@retikz/plot';

import type {
  AxisBoundGuide,
  NormalizationState,
  PlotAuthoringContext,
  PlotAuthoringRuntime,
  PlotMemberFragment,
} from './contracts';
import type { PolarConfig } from './scale-coordinate';

import { normalizePlotBindings } from './bindings';
import {
  buildAngleScale,
  buildCartesianXScale,
  buildCartesianYScale,
  buildColorScale,
  buildPositionScale,
  BUILTIN_COORDINATE_INPUT_TYPES,
  collectExplicitScales,
  coordinateTypeOf,
  toPolarConfig,
} from './scale-coordinate';
import { assembledTransformsOf } from './topology';

const AUTO_X = '__x';
const AUTO_Y = '__y';
const AUTO_ANGLE = '__angle';
const AUTO_RADIUS = '__radius';

type PlotRootNormalizationContext = PlotAuthoringContext & {
  deferPositionScaleInference?: boolean;
};

/** 将已收集成员归一化为完整 Plot-root fragment 与 runtime sidecar */
export const normalizePlotRoot = (
  context: PlotAuthoringContext,
  collected: NormalizationState,
): { fragment: PlotMemberFragment; runtime: PlotAuthoringRuntime } => {
  const rootContext = context as PlotRootNormalizationContext;
  // transform 装配序：<Plot transforms> 直传 → <Transform> 收集 → mark shortcut transforms
  // 按 stack 签名（x / y / groupBy）去重：仅抑制与某条显式 stack 完全同签名的 shortcut stack（那条会二次堆叠），
  // 不同签名的 shortcut stack 保留——否则该 mark 仍是 arrangement='stack' 却没有对应 y0/y1，lower 阶段读空累积界出错
  const transforms = assembledTransformsOf(collected, context);
  const coordinateInput = context.coordinate?.value;
  const coordKind = coordinateTypeOf(coordinateInput);
  if (collected.hasSector && coordKind !== 'polar2D') {
    throw new Error('buildPlotIR: <IntervalMark angle> is only valid under coordinate="polar2D"');
  }
  if (collected.hasHorizontalBar && coordKind !== 'cartesian2D') {
    throw new Error(
      'buildPlotIR: <IntervalMark direction="horizontal"> is only valid under coordinate="cartesian2D"',
    );
  }
  if (coordKind === 'polar2D' && collected.marks.some(mark => mark.type === PlotMark.Path && mark.closed !== false)) {
    collected.hasClosedLine = true;
  }
  const explicitScales = collectExplicitScales(collected.scales, coordKind);

  // 有 model 或 Plot 入口要求延迟推断时，未显式声明 <Scale> 的维度省略 AUTO 绑定，交给 expand 按字段类型派生
  // 直接调用 buildPlotIR 且无 model 时，沿用 AUTO 绑定 + 默认推断（向后兼容）
  const shouldDeferPositionScales = context.model !== undefined || rootContext.deferPositionScaleInference === true;
  let coordinate: IRPlotCoordinateOperation;
  let scales: Array<IRPlotScale>;
  if (coordKind === 'polar2D') {
    const polar = toPolarConfig(coordinateInput) as PolarConfig;
    const angleScale = buildAngleScale(collected, explicitScales.angle);
    const radiusScale = buildPositionScale(AUTO_RADIUS, explicitScales.radius?.type ?? 'linear', explicitScales.radius);
    coordinate = shouldDeferPositionScales
      ? {
          type: PlotCoordinate.Polar2D,
          ...(explicitScales.angle !== undefined ? { angle: AUTO_ANGLE } : {}),
          ...(explicitScales.radius !== undefined ? { radius: AUTO_RADIUS } : {}),
          startAngle: polar.startAngle,
          endAngle: polar.endAngle,
          innerRadius: polar.innerRadius,
        }
      : {
          type: PlotCoordinate.Polar2D,
          angle: AUTO_ANGLE,
          radius: AUTO_RADIUS,
          startAngle: polar.startAngle,
          endAngle: polar.endAngle,
          innerRadius: polar.innerRadius,
        };
    scales = [
      ...(!shouldDeferPositionScales || explicitScales.angle !== undefined ? [angleScale] : []),
      ...(!shouldDeferPositionScales || explicitScales.radius !== undefined ? [radiusScale] : []),
    ];
  } else if (coordKind === 'cartesian1D') {
    // 单维直线：orientation 取对象配置；单一位置 scale 可由 <Scale dimension="x"> 覆盖（rug 默认 linear、timeline 可 time）
    const orientation =
      typeof coordinateInput === 'object' && coordinateInput.type === 'cartesian1D'
        ? coordinateInput.orientation
        : undefined;
    const xScale = buildCartesianXScale(false, explicitScales.x);
    coordinate = shouldDeferPositionScales
      ? {
          type: PlotCoordinate.Cartesian1D,
          ...(explicitScales.x !== undefined ? { x: AUTO_X } : {}),
          ...(orientation !== undefined ? { orientation } : {}),
        }
      : { type: PlotCoordinate.Cartesian1D, x: AUTO_X, ...(orientation !== undefined ? { orientation } : {}) };
    scales = !shouldDeferPositionScales || explicitScales.x !== undefined ? [xScale] : [];
  } else if (coordKind === 'polar1D') {
    // 单角向圆周：半径占比 + 角向区间取对象配置；角向 scale 默认 linear（无 model；周期连续量）
    const cfg = typeof coordinateInput === 'object' && coordinateInput.type === 'polar1D' ? coordinateInput : undefined;
    const geom = {
      ...(cfg?.radius !== undefined ? { radius: cfg.radius } : {}),
      ...(cfg?.startAngle !== undefined ? { startAngle: cfg.startAngle } : {}),
      ...(cfg?.endAngle !== undefined ? { endAngle: cfg.endAngle } : {}),
    };
    const angleScale = buildPositionScale(AUTO_ANGLE, explicitScales.angle?.type ?? 'linear', explicitScales.angle);
    coordinate = shouldDeferPositionScales
      ? { type: PlotCoordinate.Polar1D, ...(explicitScales.angle !== undefined ? { angle: AUTO_ANGLE } : {}), ...geom }
      : { type: PlotCoordinate.Polar1D, angle: AUTO_ANGLE, ...geom };
    scales = !shouldDeferPositionScales || explicitScales.angle !== undefined ? [angleScale] : [];
  } else if (coordKind === 'custom') {
    // 自定义坐标系：IR 直接存 { type:<customType>, ...config }；roles / 投影函数来自运行时 CoordinateDefinition
    if (
      typeof coordinateInput !== 'object' ||
      coordinateInput.type.trim().length === 0 ||
      BUILTIN_COORDINATE_INPUT_TYPES.has(coordinateInput.type) ||
      coordinateInput.type === 'custom'
    ) {
      throw new Error(
        'buildPlotIR: custom coordinates must use a non-built-in type string, for example { type: "arch", archHeight: 30 }',
      );
    }
    coordinate = { ...coordinateInput };
    scales = [];
  } else {
    const xScale = buildCartesianXScale(collected.hasBar, explicitScales.x);
    const yScale = buildCartesianYScale(collected.hasRect, explicitScales.y);
    coordinate = shouldDeferPositionScales
      ? {
          type: PlotCoordinate.Cartesian2D,
          ...(explicitScales.x !== undefined ? { x: AUTO_X } : {}),
          ...(explicitScales.y !== undefined ? { y: AUTO_Y } : {}),
        }
      : { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y };
    scales = [
      ...(!shouldDeferPositionScales || explicitScales.x !== undefined ? [xScale] : []),
      ...(!shouldDeferPositionScales || explicitScales.y !== undefined ? [yScale] : []),
    ];
  }
  if (collected.colored) scales.push(buildColorScale(collected.colorFields, context.model));

  // 薄 Plot 不补默认轴：只有用户显式声明 <Axis>/<Legend> 才生成 guides
  // 需要默认轴与网格的上层组件可复用 decorateDefaultGuides
  const explicitAxes = collected.guides.filter(guide => guide.type === PlotGuide.Axis);
  const legends = collected.guides.filter(guide => guide.type === PlotGuide.Legend);
  const guides: Array<AxisBoundGuide> = [...explicitAxes, ...legends];
  const normalizedAxisBinding = normalizePlotBindings({
    marks: collected.marks,
    guides,
    scales,
    coordinate,
    composition: context.composition?.value,
    facets: collected.facets,
    scaffolds: collected.scaffolds,
  });
  // topology 规范化会为 framework-neutral plain authoring 补 cartesian 默认 scale；React defer 路径只移除本次补出的维度，
  // 保留用户显式 <Scale> 与多轴 binding 需要的派生 scale，让 lowering 继续按实际字段类型推断
  const normalizedScales =
    shouldDeferPositionScales &&
    coordKind === 'cartesian2D' &&
    (collected.facets.length > 0 || collected.scaffolds.length > 0)
      ? normalizedAxisBinding.scales.filter(
          scale =>
            (scale.name !== AUTO_X || explicitScales.x !== undefined) &&
            (scale.name !== AUTO_Y || explicitScales.y !== undefined),
        )
      : normalizedAxisBinding.scales;

  const fragment: PlotMemberFragment = {
    ...(transforms.length > 0 ? { transform: transforms } : {}),
    scales: normalizedScales,
    ...(normalizedAxisBinding.composition !== undefined
      ? { composition: normalizedAxisBinding.composition }
      : { coordinate: normalizedAxisBinding.coordinate }),
    marks: normalizedAxisBinding.marks,
    guides: normalizedAxisBinding.guides,
  };
  const runtime: PlotAuthoringRuntime =
    Object.keys(collected.resolveLabels).length === 0 ? {} : { resolveLabel: collected.resolveLabels };
  return { fragment, runtime };
};
