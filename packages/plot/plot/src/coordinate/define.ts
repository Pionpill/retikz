import type { Position } from '@retikz/math';
import type { IRScope } from '@retikz/core';
import { z } from 'zod';
import type { AxisGuide, CoordinateOp, ExternalRow, Mark, Scale } from '../ir';
import type { GuideContext, LoweredGuide } from '../guide';
import type { ProvenanceContext } from '../pipeline/provenance';
import type { LegendReserve, Margins } from '../pipeline/layout';
import type { PositionScale } from '../scale';
import { CARTESIAN_COORDINATES } from './cartesian';
import type { AxisFrame, DimensionRole, ResolvedCoordinate, ResolvedCustomCoordinate } from './types';
import type { Cell, CellGeometry } from './cell';
import { POLAR_COORDINATES } from './polar';
import { TERNARY_COORDINATES } from './ternary';

/** 坐标系解析后可用的绘图区矩形，单位是最终画布坐标。 */
export type CoordinatePlotArea = {
  /** 绘图区左上角 x 坐标。 */
  x: number;
  /** 绘图区左上角 y 坐标。 */
  y: number;
  /** 绘图区宽度。 */
  width: number;
  /** 绘图区高度。 */
  height: number;
};

/**
 * 坐标系 definition 的解析结果。
 * @description frame 负责 mark 投影；plotArea 供布局 / clipping / locator 使用；gridLayers 与 axisLayers
 *   是坐标系在解析阶段同步下沉出的 guide 层，避免 mark 与 guide 使用不同的临时投影状态。
 */
export type CoordinateResolution = {
  /** mark / guide / locator 共用的运行时坐标帧。 */
  frame: ResolvedCoordinate;
  /** 当前坐标系计算出的绘图区。 */
  plotArea: CoordinatePlotArea;
  /** guide grid 下沉后的 IR scope 列表。 */
  gridLayers: Array<IRScope>;
  /** guide axis 下沉后的 IR scope 列表。 */
  axisLayers: Array<IRScope>;
};

/**
 * 坐标系 definition.resolve 的共享上下文。
 * @description 这里暴露的是坐标系无关的能力：画布尺寸、数据取值、scale 解析、guide 下沉与 provenance。
 *   definition 不应该绕过这些 helper 另建平行数据 / scale 语义。
 */
export type CoordinateResolveContext = {
  /** 画布宽度。 */
  width: number;
  /** 画布高度。 */
  height: number;
  /** guide / label 使用的基础字号。 */
  fontSize: number;
  /** 用户传入的边距覆盖；自定义坐标系可选择是否消费。 */
  margin?: Partial<Margins>;
  /** legend 预留区域；内置坐标系用它收窄 plotArea，自定义坐标系 v1 通常保持满画布。 */
  legendReserve: LegendReserve;
  /** provenance 上下文，透传给 guide 下沉以保留诊断来源。 */
  provenance?: ProvenanceContext;
  /** 按定位角色收集 mark 通道原始值；includeBaseline 用于需要把 baseline 纳入连续域的值轴。 */
  collectRoleValues: (role: DimensionRole, opts?: { includeBaseline?: boolean }) => Array<unknown>;
  /** 按内置坐标系语义收集定位值；会保留 interval bounds / link endpoint / baseline 的既有特殊域贡献。 */
  collectPositionValues: (
    role: DimensionRole,
    opts?: { axis?: 'primary' | 'secondary'; includeBaseline?: boolean; includeLinkSource?: boolean; includeLinkTargets?: boolean },
  ) => Array<unknown>;
  /** 解析某个定位角色的 scale 定义；未指定 scaleName 时按数据推导默认 scale。 */
  resolveScaleForRole: (role: DimensionRole, scaleName: string | undefined, values: Array<unknown>, opts?: { includeLinkSource?: boolean }) => Scale;
  /** 把 scale 定义与数据域、屏幕 range 组合成可投影的位置 scale。 */
  buildPositionScale: (def: Scale, values: Array<unknown>, range: readonly [number, number]) => PositionScale;
  /** 校验 interval / area 等依赖 baseline 的 mark 是否可安全使用当前 scale 类型。 */
  assertBaselineScaleCompatible: (scaleType: Scale['type'], marks: ReadonlyArray<Mark>) => void;
  /** 当前 plot 内所有 axis guide；definition 决定如何将其下沉到 grid / axis 层。 */
  axisGuides: ReadonlyArray<AxisGuide>;
  /** 下沉直线 / 内置 guide 的通用入口。 */
  lowerGuide: (guide: AxisGuide, ctx: GuideContext, provenance?: ProvenanceContext) => LoweredGuide;
  /** 下沉曲线 / 自定义坐标轴的入口，依赖 frame.roleScales 与 frame.projectRoles。 */
  lowerCustomAxis: (frame: ResolvedCustomCoordinate, guide: AxisGuide, fontSize: number, provenance?: ProvenanceContext) => LoweredGuide;
  /** 已解析的外部数据行；高级坐标系可按需读取完整数据。 */
  rows: Array<ExternalRow>;
  /** 当前 plot 的 mark 列表；主要用于 scale 兼容性与坐标系特定校验。 */
  marks: ReadonlyArray<Mark>;
};

/**
 * 坐标系运行时定义。
 * @description definition 是含函数的运行时对象，不进入 JSON IR；IR 只保存 `{ type, ...config }` 形态的 coordinate op。
 */
export type CoordinateDefinition<TCoordinateOp extends CoordinateOp = CoordinateOp> = {
  /** 完整 coordinate op schema；必须含非空 z.literal('type') 供 registry 提取注册键。 */
  schema: z.ZodType<TCoordinateOp>;
  /** 该坐标系消费的定位角色序，用于 required-channel 与 guide-dimension 校验。 */
  roles: ReadonlyArray<DimensionRole>;
  /** 将 coordinate op 解析成运行时 frame 与 guide 层。 */
  resolve: (op: TCoordinateOp, ctx: CoordinateResolveContext) => CoordinateResolution;
};

/** 定义一个坐标系 definition，并保留 schema 与 resolve 之间的泛型关联。 */
export const defineCoordinate = <TCoordinateOp extends CoordinateOp>(def: CoordinateDefinition<TCoordinateOp>): CoordinateDefinition<TCoordinateOp> => def;

/** createCustomCoordinate 选项：roleScales 让 guide 画曲线轴、frameAlong 给精确切向、projectCell 支持 cell 类 mark；均可选。 */
export type CreateCustomCoordinateOptions = {
  /** 各角色位置 scale；供 guide 画轴。省略 → 该坐标系无轴 */
  roleScales?: Partial<Record<DimensionRole, PositionScale>>;
  /** 某角色轴曲线局部标架；曲线轴优先用其切向，省略 → guide 数值差分回落 */
  frameAlong?: (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null;
  /** 正交 cell → CellGeometry；实现了才支持 cell 类 mark（interval / sector），省略 → cell 类 mark fail-loud */
  projectCell?: (cell: Cell) => CellGeometry;
};

/**
 * 建自定义坐标帧：把 definition 给的 roles + projectRoles 包成 ResolvedCoordinate（point mark 经此投影）
 * @description 第三参 options 补充 guide 轴线、精确轴切向和 cell 几何投影能力；未提供的能力保持不可用。
 */
export const createCustomCoordinate = (
  roles: ReadonlyArray<DimensionRole>,
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null,
  options?: CreateCustomCoordinateOptions,
): ResolvedCustomCoordinate => ({
  type: 'custom',
  roles,
  project: () => null,
  projectRoles,
  ...(options?.roleScales !== undefined ? { roleScales: options.roleScales } : {}),
  ...(options?.frameAlong !== undefined ? { frameAlong: options.frameAlong } : {}),
  ...(options?.projectCell !== undefined ? { projectCell: options.projectCell } : {}),
});

/**
 * registry 内部使用的宽类型。
 * @description registry 需要存放不同 op 泛型的 definition；取出后由具体 schema parse 收窄，因此 resolve 入参在表内用 never 防止误调。
 */
export type AnyCoordinateDefinition = Omit<CoordinateDefinition<CoordinateOp>, 'schema' | 'resolve'> & {
  /** 不同 definition 的 schema 泛型不同，registry 只关心能从中提取 type 并执行 parse。 */
  schema: z.ZodType;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 op。 */
  resolve: (op: never, ctx: CoordinateResolveContext) => CoordinateResolution;
};

/**
 * 内置坐标系的 registry 元数据。
 * @description 内置坐标系与自定义坐标系走同一个 CoordinateDefinition.resolve 入口。
 */
export const BUILTIN_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [
  ...CARTESIAN_COORDINATES,
  ...POLAR_COORDINATES,
  ...TERNARY_COORDINATES,
];

/** 从 coordinate definition schema 的 `type: z.literal(...)` 中提取 registry key。 */
export const extractCoordinateType = (schema: z.ZodType): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('lowerPlots: coordinate registration schema must be a ZodObject with a literal type field');
  }
  const typeSchema = schema.shape.type;
  if (!(typeSchema instanceof z.ZodLiteral) || typeof typeSchema.value !== 'string' || typeSchema.value.length === 0) {
    throw new Error('lowerPlots: coordinate registration schema must declare type as a non-empty z.literal string');
  }
  return typeSchema.value;
};

/** 按 type 索引的内置坐标系元数据，供 lowering 快速判断内置 / 自定义分派。 */
export const BUILTIN_COORDINATE_DEFINITIONS_BY_TYPE: ReadonlyMap<string, AnyCoordinateDefinition> = new Map(
  BUILTIN_COORDINATES.map(def => [extractCoordinateType(def.schema), def] as const),
);

/**
 * 解析坐标系 registry。
 * @description 内置坐标系总是先注册；用户自定义 definition 不能覆盖内置 type，也不能彼此重复。
 */
export const resolveCoordinateRegistry = (custom?: ReadonlyArray<AnyCoordinateDefinition>): Map<string, AnyCoordinateDefinition> => {
  const registry = new Map<string, AnyCoordinateDefinition>();
  for (const def of BUILTIN_COORDINATES) {
    registry.set(extractCoordinateType(def.schema), def);
  }
  for (const def of custom ?? []) {
    const type = extractCoordinateType(def.schema);
    if (registry.has(type)) {
      throw new Error(`lowerPlots: duplicate coordinate registration: "${type}"`);
    }
    registry.set(type, def);
  }
  return registry;
};
