import type { IRScope } from '@retikz/core';
import type { DataFieldTypeMap, ExternalRow, IRDataScalarValue } from '@retikz/data';

import type {
  AnyCoordinateDefinition,
  AnyScaleDefinition,
  CoordinateFrame,
  DimensionRole,
  GuideLowerer,
  LoweredGuide,
  PositionScale,
  ProvenanceContext,
  TickSet,
} from '../../contract';
import type { IRPlotAxisGuide, IRPlotCoordinateOperation, IRPlotMarkOperation } from '../../schemas';
import type { LegendReserve, Margins, Rect } from '../../shared';

/** 单个图元及其当前可见数据行的 lowering 视图 */
export type MarkDataView = {
  mark: IRPlotMarkOperation;
  rows: Array<ExternalRow>;
};

/** 曲线坐标轴下沉器，由 pipeline 提供，resolve 只消费其窄 contract */
export type CoordinateAxisLowerer = (
  frame: CoordinateFrame,
  guide: IRPlotAxisGuide,
  fontSize: number,
  provenance?: ProvenanceContext,
) => LoweredGuide;

/**
 * 坐标 frame 解析所需的窄运行时上下文
 * @description source IR 通过 resolveCoordinateFrame 的首个参数传入；context 只携带数据、registry、布局输入与 pipeline 注入的下沉回调
 */
export type CoordinateResolveContext = {
  /** composition 已确定的有效坐标 operation；source.coordinate 缺省时由 pipeline 提供 */
  coordinate?: IRPlotCoordinateOperation;
  /** 当前 plot 绑定的数据行 */
  rows: Array<ExternalRow>;
  /** 字段类型表 */
  fieldTypes: DataFieldTypeMap;
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
  /** guide / label 使用的基础字号 */
  fontSize: number;
  /** guide title / composition label 固定间距 */
  labelGap?: number;
  /** 用户传入的边距覆盖 */
  margin?: Partial<Margins>;
  /** layout / decoration 触发的自动预留 */
  layoutReserve?: Partial<Margins>;
  /** legend 预留区域，由 pipeline 在 layout 协调阶段计算 */
  legendReserve?: LegendReserve;
  /** overlay scope 共享的目标 plotArea */
  plotAreaOverride?: Rect;
  /** 指定 role 的最终 range */
  roleRangeOverrides?: Partial<Record<DimensionRole, readonly [number, number]>>;
  /** provenance 上下文 */
  provenance?: ProvenanceContext;
  /** 已合并的 coordinate definitions */
  coordinateRegistry: ReadonlyMap<string, AnyCoordinateDefinition>;
  /** 已合并的 scale definitions */
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>;
  /** 按 mark 切分的数据视图 */
  markDataViews?: Array<MarkDataView>;
  /** 某 role 的共享数据视图覆盖 */
  roleMarkDataViews?: Record<string, Array<MarkDataView>>;
  /** 直线 / 内置 guide 下沉器 */
  lowerGuide: GuideLowerer;
  /** 曲线坐标轴下沉器 */
  lowerCustomAxis: CoordinateAxisLowerer;
  /** 解析轴 / 网格候选刻度；由 resolve 层实现，provider 通过 contract callback 消费 */
  resolveGuideTicks: (
    scale: PositionScale,
    source?: NonNullable<IRPlotAxisGuide['ticks']>,
    labelFormat?: Exclude<IRPlotAxisGuide['tickLabels'], false | undefined>,
  ) => TickSet;
  /** 按 guide density 从候选刻度中筛出可见刻度 */
  resolveVisibleGuideTicks: (
    ticks: TickSet,
    source: NonNullable<IRPlotAxisGuide['ticks']> | undefined,
    coordinate: (value: IRDataScalarValue) => number,
  ) => TickSet;
};

/** mark / guide 共用的坐标投影帧及其已下沉 guide 层 */
export type CoordinateFrameResolution = {
  /** mark、guide 与 locator 共用的坐标投影帧 */
  frame: CoordinateFrame;
  /** 网格层 */
  gridLayers: Array<IRScope>;
  /** 轴层 */
  axisLayers: Array<IRScope>;
  /** 已扣除 decoration 预留的绘图区 */
  plotArea: Rect;
};
