import type { ExternalRow } from '@retikz/data';
import type {
  IRPlotPointMark,
  IRPlotPathMark,
  IRPlotIntervalMark,
  IRPlotRelationMark,
  IRPlotMarkNodeLabel,
  IRPlotMarkGeometryLabel,
  IRPlotMarkOpacityStyle,
  IRPlotChannel,
  IRPlotRelationPathGeometry,
  IRPlotRelationRouteStep,
  IRPlotRelationStepLabel,
} from '@retikz/plot';

/** 字段路径，直接保留为 Source 字符串 */
export type InputPlotFieldName = string;

/** 工厂的视图绑定糖，不进入 Plot Source */
export type InputPlotCoordinateScope = {
  coordinateView?: string;
  facetId?: string;
  trackId?: string;
  xAxisId?: string;
  yAxisId?: string;
};

/** 仅在运行时注入的文本解析器 */
export type InputPlotDatumLabel = {
  resolveLabel?: (row: ExternalRow) => string;
};

export type InputPlotPointMark = Omit<IRPlotPointMark, 'type' | 'kind'> &
  InputPlotCoordinateScope &
  InputPlotDatumLabel;
export type InputPlotPathMark = Omit<IRPlotPathMark, 'type' | 'kind'> & InputPlotCoordinateScope & InputPlotDatumLabel;
export type InputPlotRelationMark = Omit<IRPlotRelationMark, 'type' | 'kind'> &
  InputPlotCoordinateScope &
  InputPlotDatumLabel;

/** 区间构造糖保持 Data 变换语义，视觉目标与 Source 使用同一分组 */
export type InputPlotIntervalMark = Omit<IRPlotIntervalMark, 'type' | 'kind'> &
  InputPlotCoordinateScope &
  InputPlotDatumLabel & {
    /** 饼环份额字段，展开为累积区间 */
    angle?: string;
    /** 直方区间起点字段 */
    x0?: string;
    /** 直方区间终点字段 */
    x1?: string;
    /** 比例区间权重字段 */
    width?: string;
    /** 柱方向 */
    direction?: 'vertical' | 'horizontal';
    /** 排布使用的分组字段 */
    group?: string;
    /** 多系列排布方式 */
    arrangement?: 'dodge' | 'stack' | 'normalize-stack';
    /** 堆叠基线算法 */
    stackOffset?: 'zero' | 'normalize' | 'diverging' | 'center' | 'overlap';
    /** 百分比堆叠简写 */
    percent?: boolean;
    /** 堆叠简写 */
    stack?: boolean;
  };

export type InputPlotCoreNodeChannels = Pick<InputPlotPointMark, 'encodings' | 'properties'>;
export type InputPlotCorePathChannels = Pick<InputPlotPathMark, 'encodings' | 'properties'>;
export type InputPlotOpacity = IRPlotMarkOpacityStyle;
export type InputPlotNodeLabel = IRPlotMarkNodeLabel;
export type InputPlotGeometryLabel = IRPlotMarkGeometryLabel;
export type InputPlotMarkNodeLabel = IRPlotMarkNodeLabel;
export type InputPlotMarkGeometryLabel = IRPlotMarkGeometryLabel;
export type InputPlotExtensionChannel = IRPlotChannel;
export type InputPlotRelationPathGeometry = IRPlotRelationPathGeometry;
export type InputPlotRelationRouteStep = IRPlotRelationRouteStep;
export type InputPlotRelationStepLabel = IRPlotRelationStepLabel;
