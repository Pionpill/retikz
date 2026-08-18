import type { IRDataModel } from '@retikz/data';
import type { IRPlotMark, IRPlotScale, IRPlotTransform } from '@retikz/plot';

import { DataFieldType } from '@retikz/data';
import { PlotScale } from '@retikz/plot';

import type {
  InputPlotCoordinate,
  InputPlotPolar2DCoordinate,
  MarkTransformShortcutDefinition,
  NormalizationState,
} from './contracts';
import type { InputPlotPositionScaleType, InputPlotScale, InputPlotScaleDimension } from './input-scales';

import { RetikzPlotVanillaError } from '../../error';

const AUTO_X = '__x';
const AUTO_Y = '__y';
const AUTO_ANGLE = '__angle';
const AUTO_COLOR = '__color';

type Collected = NormalizationState;

/** 按颜色字段模型选择连续或分类比例尺 */
export const buildColorScale = (colorFields: Array<string>, model: IRDataModel | undefined): IRPlotScale => {
  if (model !== undefined) {
    const typeByField = new Map(model.map(field => [field.name, field.type] as const));
    const anyContinuous = colorFields.some(field => {
      const type = typeByField.get(field);
      return type === DataFieldType.Continuous || type === DataFieldType.Temporal;
    });
    if (anyContinuous) return { type: PlotScale.Sequential, name: AUTO_COLOR };
  }
  return { type: PlotScale.Ordinal, name: AUTO_COLOR };
};

type ContinuousScaleProps = Extract<InputPlotScale, { type: Exclude<InputPlotPositionScaleType, 'band' | 'point'> }>;
type BandScaleProps = Extract<InputPlotScale, { type: 'band' }>;
type PointScaleProps = Extract<InputPlotScale, { type: 'point' }>;
type PositionScaleOptions = Pick<
  ContinuousScaleProps,
  'base' | 'constant' | 'domain' | 'domainPadding' | 'singleValueSpan'
>;

const isContinuousScaleProps = (options: InputPlotScale | undefined): options is ContinuousScaleProps =>
  options !== undefined && options.type !== 'band' && options.type !== 'point';

const continuousPositionScaleOptions = (options: PositionScaleOptions | undefined): PositionScaleOptions => ({
  ...(options?.base !== undefined ? { base: options.base } : {}),
  ...(options?.constant !== undefined ? { constant: options.constant } : {}),
  ...(options?.domain !== undefined ? { domain: options.domain } : {}),
  ...(options?.domainPadding !== undefined ? { domainPadding: options.domainPadding } : {}),
  ...(options?.singleValueSpan !== undefined ? { singleValueSpan: options.singleValueSpan } : {}),
});

const pointPositionScaleOptions = (
  options: PointScaleProps | undefined,
): Pick<PointScaleProps, 'align' | 'domain' | 'padding'> => ({
  ...(options?.domain !== undefined ? { domain: options.domain } : {}),
  ...(options?.padding !== undefined ? { padding: options.padding } : {}),
  ...(options?.align !== undefined ? { align: options.align } : {}),
});

const bandPositionScaleOptions = (
  options: BandScaleProps | undefined,
): Pick<BandScaleProps, 'align' | 'domain' | 'paddingInner' | 'paddingOuter'> => ({
  ...(options?.domain !== undefined ? { domain: options.domain } : {}),
  ...(options?.paddingInner !== undefined ? { paddingInner: options.paddingInner } : {}),
  ...(options?.paddingOuter !== undefined ? { paddingOuter: options.paddingOuter } : {}),
  ...(options?.align !== undefined ? { align: options.align } : {}),
});

/** 按作者侧位置比例尺类型与选项构造规范 Plot 比例尺 */
export const buildPositionScale = (
  name: string,
  type: InputPlotPositionScaleType,
  options?: InputPlotScale,
): IRPlotScale => {
  const scaleOptions = continuousPositionScaleOptions(isContinuousScaleProps(options) ? options : undefined);
  const bandOptions = bandPositionScaleOptions(options?.type === 'band' ? options : undefined);
  const pointOptions = pointPositionScaleOptions(options?.type === 'point' ? options : undefined);
  switch (type) {
    case 'linear':
      return { type: PlotScale.Linear, name, ...scaleOptions };
    case 'time':
      return { type: PlotScale.Time, name, ...scaleOptions };
    case 'band':
      return { type: PlotScale.Band, name, ...bandOptions };
    case 'point':
      return { type: PlotScale.Point, name, ...pointOptions };
    case 'log':
      return { type: PlotScale.Log, name, ...scaleOptions };
    case 'sqrt':
      return { type: PlotScale.Sqrt, name, ...scaleOptions };
    case 'symlog':
      return { type: PlotScale.Symlog, name, ...scaleOptions };
    case 'radial':
      return { type: PlotScale.Radial, name, ...scaleOptions };
    default: {
      // 穷尽守卫：新增 InputPlotPositionScaleType 未在此映射时 never 编译报错，杜绝静默回退 linear
      const exhaustive: never = type;
      throw new RetikzPlotVanillaError(`buildPlotIR: unsupported position scale type "${String(exhaustive)}"`);
    }
  }
};

/** cartesian x scale 类型：含 <IntervalMark> 或 <IntervalMark> → band；否则按 <Scale dimension="x"> 或缺省 linear */
export const buildCartesianXScale = (forceBand: boolean, explicit: InputPlotScale | undefined): IRPlotScale => {
  if (forceBand && explicit !== undefined && explicit.type !== 'band') {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: <IntervalMark> (bar / heatmap) requires a band x scale; omit <Scale dimension="x" /> or set type="band"',
    );
  }
  if (forceBand) return buildPositionScale(AUTO_X, 'band', explicit);
  return buildPositionScale(AUTO_X, explicit?.type ?? 'linear', explicit);
};

/** cartesian y（值轴）scale 类型：含 <IntervalMark>（heatmap 双 band）→ band；否则按 <Scale dimension="y"> 或缺省 linear；log / sqrt 由 lowering L1 守住仅 point/line */
export const buildCartesianYScale = (hasRect: boolean, explicit: InputPlotScale | undefined): IRPlotScale => {
  if (hasRect && explicit !== undefined && explicit.type !== 'band') {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: <IntervalMark> (heatmap) requires a band y scale; omit <Scale dimension="y" /> or set type="band"',
    );
  }
  if (hasRect) return buildPositionScale(AUTO_Y, 'band', explicit);
  return buildPositionScale(AUTO_Y, explicit?.type ?? 'linear', explicit);
};

/**
 * polar 角向 scale 类型推断：IntervalMark angle → linear（连续累积角界）；IntervalMark x/y → band（径向柱分类）；
 *   闭合 line（雷达）→ point（类别落等距点）；否则 linear（极坐标折线）
 */
export const buildAngleScale = (collected: Collected, explicit: InputPlotScale | undefined): IRPlotScale => {
  if (collected.hasBar && explicit !== undefined && explicit.type !== 'band') {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: <IntervalMark> in polar coordinates requires a band angle scale; omit <Scale dimension="x" /> or set type="band"',
    );
  }
  if (collected.hasSector && explicit !== undefined && explicit.type !== 'linear') {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: <IntervalMark angle> requires a linear angle scale; omit <Scale dimension="angle" /> or use type="linear"',
    );
  }
  if (explicit !== undefined) return buildPositionScale(AUTO_ANGLE, explicit.type, explicit);
  if (collected.hasSector) return { type: PlotScale.Linear, name: AUTO_ANGLE };
  if (collected.hasBar) return { type: PlotScale.Band, name: AUTO_ANGLE };
  if (collected.hasClosedLine) return { type: PlotScale.Point, name: AUTO_ANGLE };
  return { type: PlotScale.Linear, name: AUTO_ANGLE };
};

type ScaleRole = 'x' | 'y' | 'angle' | 'radius';

/** 按规范坐标角色索引的显式比例尺集合 */
export type ExplicitScaleMap = Partial<Record<ScaleRole, InputPlotScale>>;

const validScaleDimensionsOf = (
  coordKind: ReturnType<typeof coordinateTypeOf>,
): ReadonlyArray<InputPlotScaleDimension> => {
  if (coordKind === 'cartesian2D') return ['x', 'y'];
  if (coordKind === 'polar2D') return ['x', 'y'];
  if (coordKind === 'cartesian1D') return ['x'];
  if (coordKind === 'polar1D') return ['x'];
  return [];
};

const scaleRoleOf = (
  dimension: InputPlotScaleDimension,
  coordKind: ReturnType<typeof coordinateTypeOf>,
): ScaleRole | undefined => {
  if (coordKind === 'cartesian2D') return dimension;
  if (coordKind === 'polar2D') {
    if (dimension === 'x') return 'angle';
    return 'radius';
  }
  if (coordKind === 'cartesian1D') return dimension === 'x' ? 'x' : undefined;
  if (coordKind === 'polar1D') return dimension === 'x' ? 'angle' : undefined;
  return undefined;
};

/** 校验显式比例尺维度并映射到当前坐标系的规范角色 */
export const collectExplicitScales = (
  declared: Array<InputPlotScale>,
  coordKind: ReturnType<typeof coordinateTypeOf>,
): ExplicitScaleMap => {
  const out: ExplicitScaleMap = {};
  const valid = validScaleDimensionsOf(coordKind);
  for (const scale of declared) {
    const role = scaleRoleOf(scale.dimension, coordKind);
    if (role === undefined) {
      throw new RetikzPlotVanillaError(
        `buildPlotIR: ${coordKind} coordinate system does not support scale dimension "${scale.dimension}" (valid dimensions: ${valid.join(', ') || 'none'})`,
      );
    }
    if (out[role] !== undefined) {
      throw new RetikzPlotVanillaError(
        `buildPlotIR: duplicate scale for "${role}" role (dimension "${scale.dimension}")`,
      );
    }
    out[role] = scale;
  }
  return out;
};

/** 按 mark type 执行作者侧 transform shortcuts 并保持定义顺序 */
export const buildShortcutTransforms = (
  marks: ReadonlyArray<IRPlotMark>,
  definitions: ReadonlyArray<MarkTransformShortcutDefinition> | undefined,
): Array<IRPlotTransform> => {
  if (definitions === undefined || definitions.length === 0) return [];
  return marks.flatMap((mark, markIndex) =>
    definitions
      .filter(definition => definition.markType === mark.type)
      .flatMap(definition => definition.build({ mark, markIndex, marks }) ?? []),
  );
};

/** polar coordinate IR 的角向区间 / 内半径默认值（与 Polar2DSchema 的 .default() 一致，buildPlotIR 即填满，等价手写无需再补） */
const POLAR_DEFAULT_START_ANGLE = 0;
const POLAR_DEFAULT_END_ANGLE = 360;
const POLAR_DEFAULT_INNER_RADIUS = 0;

/** coordinate 入口判别串（缺省 cartesian2D）；字符串简写与对象 .type 统一取值 */
export const BUILTIN_COORDINATE_INPUT_TYPES = new Set(['cartesian2D', 'polar2D', 'cartesian1D', 'polar1D']);

/** 把坐标入口归类为内置坐标类型或自定义坐标 */
export const coordinateTypeOf = (
  input: InputPlotCoordinate | undefined,
): 'cartesian2D' | 'polar2D' | 'cartesian1D' | 'polar1D' | 'custom' => {
  if (input === undefined) return 'cartesian2D';
  const type = typeof input === 'string' ? input : input.type;
  return BUILTIN_COORDINATE_INPUT_TYPES.has(type)
    ? (type as 'cartesian2D' | 'polar2D' | 'cartesian1D' | 'polar1D')
    : 'custom';
};

/** 归一化 polar2D coordinate 选项为配置（非 polar2D 返回 undefined），缺省字段填 schema 默认值 */
export type PolarConfig = { innerRadius: number; startAngle: number; endAngle: number };

/** 提取并补全 polar2D 配置，其他坐标返回 `undefined` */
export const toPolarConfig = (coordinate: InputPlotCoordinate | undefined): PolarConfig | undefined => {
  if (coordinate === 'polar2D') {
    return {
      innerRadius: POLAR_DEFAULT_INNER_RADIUS,
      startAngle: POLAR_DEFAULT_START_ANGLE,
      endAngle: POLAR_DEFAULT_END_ANGLE,
    };
  }
  if (typeof coordinate === 'object' && coordinate.type === 'polar2D') {
    const polar = coordinate as InputPlotPolar2DCoordinate;
    return {
      innerRadius: polar.innerRadius ?? POLAR_DEFAULT_INNER_RADIUS,
      startAngle: polar.startAngle ?? POLAR_DEFAULT_START_ANGLE,
      endAngle: polar.endAngle ?? POLAR_DEFAULT_END_ANGLE,
    };
  }
  return undefined;
};
