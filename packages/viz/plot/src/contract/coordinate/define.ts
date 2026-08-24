import type { IRScope } from '@retikz/core';
import type { ExternalRow, IRDataScalarValue } from '@retikz/data';
import type { Position } from '@retikz/math';
import type { ZodType } from 'zod';

import type {
  IRPlotAxisGuide,
  IRPlotCoordinateOperation,
  IRPlotMarkOperation,
  IRPlotScaleOperation,
} from '../../schemas';
import type { LegendReserve, Margins } from '../../shared';
import type { GuideContext, LoweredGuide } from '../guide';
import type { ProvenanceContext } from '../provenance';
import type { PositionScale, TickSet } from '../scale';
import type { Cell, CellGeometry } from './cell';
import type { AxisFrame, CoordinateFrame, DimensionRole } from './types';

/** 坐标系解析后可用的绘图区矩形，单位是最终画布坐标 */
export type CoordinatePlotArea = {
  /** 绘图区左上角 x 坐标 */
  x: number;
  /** 绘图区左上角 y 坐标 */
  y: number;
  /** 绘图区宽度 */
  width: number;
  /** 绘图区高度 */
  height: number;
};

/**
 * 坐标系 definition 的解析结果。
 * @description frame 负责 mark 投影；plotArea 供布局 / clipping / locator 使用；gridLayers 与 axisLayers
 *   是坐标系在解析阶段同步下沉出的 guide 层，避免 mark 与 guide 使用不同的临时投影状态
 */
export type CoordinateResolution = {
  /** mark / guide / locator 共用的运行时坐标帧 */
  frame: CoordinateFrame;
  /** 当前坐标系计算出的绘图区 */
  plotArea: CoordinatePlotArea;
  /** guide grid 下沉后的 IR scope 列表 */
  gridLayers: Array<IRScope>;
  /** guide axis 下沉后的 IR scope 列表 */
  axisLayers: Array<IRScope>;
};

/**
 * 坐标系 definition.resolve 的共享上下文。
 * @description 这里暴露的是坐标系无关的能力：画布尺寸、数据取值、scale 解析、guide 下沉与 provenance。
 *   definition 不应该绕过这些 helper 另建平行数据 / scale 语义
 */
/** 坐标 definition 由 provider 消费的窄运行时上下文 */
export type CoordinateDefinitionResolveContext = {
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
  /** guide / label 使用的基础字号 */
  fontSize: number;
  /** guide title / composition label 固定间距 */
  labelGap?: number;
  /** 用户传入的边距覆盖；自定义坐标系可选择是否消费 */
  margin?: Partial<Margins>;
  /** plot layout / decoration 触发的自动预留；内置坐标系把它叠加到自动 plotArea 边距 */
  layoutReserve?: Partial<Margins>;
  /** legend 预留区域；内置坐标系用它收窄 plotArea，自定义坐标系 v1 通常保持满画布 */
  legendReserve: LegendReserve;
  /** overlay scope 共享的目标 plotArea；给定时坐标系仍独立训练 scale，但使用该矩形作为 range */
  plotAreaOverride?: CoordinatePlotArea;
  /** 指定 role 的最终 range；用于 scaffold track 把局部 role 映射进 track band */
  roleRangeOverrides?: Partial<Record<DimensionRole, readonly [number, number]>>;
  /** provenance 上下文，透传给 guide 下沉以保留诊断来源 */
  provenance?: ProvenanceContext;
  /** 按定位角色收集 mark 通道原始值；includeBaseline 用于需要把 baseline 纳入连续域的值轴 */
  collectRoleValues: (role: DimensionRole, opts?: { includeBaseline?: boolean }) => Array<unknown>;
  /** 按内置坐标系语义收集定位值；会保留 interval bounds / baseline 的既有特殊域贡献 */
  collectPositionValues: (
    role: DimensionRole,
    opts?: { axis?: 'primary' | 'secondary'; includeBaseline?: boolean },
  ) => Array<unknown>;
  /** Override axis ticks for marks whose role position is derived from interval bounds. */
  collectAxisTicks: (role: DimensionRole) => TickSet | undefined;
  /** 解析轴 / 网格候选刻度；由 resolve 层注入，provider 不直接依赖 guide resolver */
  resolveGuideTicks: (
    scale: PositionScale,
    source?: NonNullable<IRPlotAxisGuide['ticks']>,
    labelFormat?: Exclude<IRPlotAxisGuide['tickLabels'], false | undefined>,
  ) => TickSet;
  /** 按 guide density 从候选刻度中筛出可见刻度；由 resolve 层注入 */
  resolveVisibleGuideTicks: (
    ticks: TickSet,
    source: NonNullable<IRPlotAxisGuide['ticks']> | undefined,
    coordinate: (value: IRDataScalarValue) => number,
  ) => TickSet;
  /** 解析某个定位角色的 scale operation；未指定 scaleName 时按数据推导默认 scale（含自定义 type） */
  resolveScaleForRole: (
    role: DimensionRole,
    scaleName: string | undefined,
    values: Array<unknown>,
  ) => IRPlotScaleOperation;
  /** 把 scale operation 与数据域、屏幕 range 组合成可投影的位置 scale */
  buildPositionScale: (
    def: IRPlotScaleOperation,
    values: Array<unknown>,
    range: readonly [number, number],
  ) => PositionScale;
  /** 校验 interval / area 等依赖 baseline 的 mark 是否可安全使用当前 scale 类型（type 串，含自定义） */
  assertBaselineScaleCompatible: (scaleType: string, marks: ReadonlyArray<IRPlotMarkOperation>) => void;
  /** 当前 plot 内所有 axis guide；definition 决定如何将其下沉到 grid / axis 层 */
  axisGuides: ReadonlyArray<IRPlotAxisGuide>;
  /** 下沉直线 / 内置 guide 的通用入口 */
  lowerGuide: (guide: IRPlotAxisGuide, ctx: GuideContext, provenance?: ProvenanceContext) => LoweredGuide;
  /** 下沉曲线坐标轴的入口，依赖 frame.roleScales 与 frame.projectRoles */
  lowerCustomAxis: (
    frame: CoordinateFrame,
    guide: IRPlotAxisGuide,
    fontSize: number,
    provenance?: ProvenanceContext,
  ) => LoweredGuide;
  /** 已解析的外部数据行；高级坐标系可按需读取完整数据 */
  rows: Array<ExternalRow>;
  /** 当前 plot 的 mark 列表；主要用于 scale 兼容性与坐标系特定校验 */
  marks: ReadonlyArray<IRPlotMarkOperation>;
};

/**
 * 坐标系运行时定义。
 * @description definition 是含函数的运行时对象，不进入 JSON IR；IR 只保存 `{ type, ...config }` 形态的 coordinate operation
 */
export type CoordinateDefinition<TCoordinateOperation extends IRPlotCoordinateOperation = IRPlotCoordinateOperation> = {
  /** 完整 coordinate operation schema；必须含非空 z.literal('type') 供 registry 提取注册键 */
  schema: ZodType<TCoordinateOperation>;
  /** 该坐标系消费的定位角色序，用于 required-channel 与 guide-dimension 校验 */
  roles: ReadonlyArray<DimensionRole>;
  /** 将 coordinate operation 解析成运行时 frame 与 guide 层 */
  resolve: (operation: TCoordinateOperation, ctx: CoordinateDefinitionResolveContext) => CoordinateResolution;
};

/**
 * 定义一个坐标系 definition。
 * @description 这是坐标系扩展的唯一注册单元：schema 决定 IR 中允许的 coordinate operation，
 *   roles 决定 mark 必填位置通道，resolve 把 JSON operation 解析成运行时 frame 与 guide 层。内置坐标系和
 *   自定义坐标系都应通过这个对象进入 registry，避免内置白名单与扩展补丁接口分叉。
 * @remarks 当前 helper 只做 `CoordinateDefinition` 类型约束并原样返回定义对象；保留稳定入口是为了与其它 registry API 对齐，并为后续运行时校验、默认值归一或泛型收敛预留 contract hook
 */
export const defineCoordinate = <TCoordinateOperation extends IRPlotCoordinateOperation>(
  def: CoordinateDefinition<TCoordinateOperation>,
): CoordinateDefinition<TCoordinateOperation> => def;

/** createCoordinateFrame 选项：roleScales 让 guide 画曲线轴、frameAlong 给精确切向、projectCell 支持 cell 类 mark；均可选 */
export type CreateCoordinateFrameOptions = {
  /** 各角色位置 scale；供 guide 画轴。省略 → 该坐标系无轴 */
  roleScales?: Partial<Record<DimensionRole, PositionScale>>;
  /** 某角色轴曲线局部标架；曲线轴优先用其切向，省略 → guide 数值差分回落 */
  frameAlong?: (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null;
  /** 正交 cell → CellGeometry；实现了才支持 cell 类 mark（interval / sector），省略 → cell 类 mark fail-loud */
  projectCell?: (cell: Cell) => CellGeometry;
};

/**
 * 建通用坐标帧。
 * @description 把 definition 注册 type、roles 与 projectRoles 包成 CoordinateFrame。`type` 会保留调用方注册的真实判别值，
 *   不会压成 `custom`；point/path/region 等按 `projectRoles` 投影。第三参 options 逐项声明额外能力：
 *   roleScales 允许 guide / interval 构造读取 scale，frameAlong 提供曲线轴精确切向，projectCell 开启 cell 类 mark。
 *   未声明的能力保持不可用并由消费方 fail-loud
 */
export const createCoordinateFrame = (
  type: string,
  roles: ReadonlyArray<DimensionRole>,
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null,
  options?: CreateCoordinateFrameOptions,
): CoordinateFrame => ({
  type,
  roles,
  project: () => null,
  projectRoles,
  ...(options?.roleScales !== undefined ? { roleScales: options.roleScales } : {}),
  ...(options?.frameAlong !== undefined ? { frameAlong: options.frameAlong } : {}),
  ...(options?.projectCell !== undefined ? { projectCell: options.projectCell } : {}),
});

/**
 * registry 内部使用的宽类型。
 * @description registry 需要存放不同 operation 泛型的 definition；取出后由具体 schema parse 收窄，因此 resolve 入参在表内用 never 防止误调
 */
export type AnyCoordinateDefinition = Omit<CoordinateDefinition<IRPlotCoordinateOperation>, 'schema' | 'resolve'> & {
  /** 不同 definition 的 schema 泛型不同，registry 只关心能从中提取 type 并执行 parse */
  schema: ZodType;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation */
  resolve: (operation: never, ctx: CoordinateDefinitionResolveContext) => CoordinateResolution;
};
