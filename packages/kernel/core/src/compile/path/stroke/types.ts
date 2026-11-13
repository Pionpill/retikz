import type { PropertyPath, WithRequiredProperties } from '@retikz/foundation';

import type {
  GroupPrimitive,
  PathCommand,
  PathPrimitiveAppearance,
  ScenePrimitive,
  ScenePrimitiveBase,
  Transform,
} from '../../../contract';
import type { IRPosition } from '../../../schemas';
import type { CompiledTextBlockLayout } from '../../text';
import type { CompiledPathLabelLayout, PathLabelContent } from '../label';
import type { PathCompileContext, PathEmitOptions, PathEmitOutput, PathTargetContext } from '../types';
import type { StrokeCommandFragment, StrokeEndpointPlacements } from './decoration';
import type {
  PathCommandEmitter,
  StrokeCursor,
  StrokeLabelSample,
  StrokePathGeometry,
  StrokePositionModel,
  lowerStrokePathGeometry,
} from './geometry';

/** 描边路径降解与绘制共享的编译上下文 */
export type StrokePathCompileContext = Pick<PathTargetContext, 'targetView'> &
  Pick<PathCompileContext, 'round'> &
  Partial<Pick<PathCompileContext, 'measureText'>> & {
    /** 路径绘制可选服务 */
    options?: PathEmitOptions;
  };

/** 同一次 stroke 降级共享的查询、游标与写入能力；步骤事实由消费方单独传递 */
export type StrokeLoweringContext = PathTargetContext & {
  /** 当前路径的诊断出口 */
  warn: (code: string, message: string, subPath?: PropertyPath) => void;
  /** 当前路径的命令写入器 */
  commandEmitter: PathCommandEmitter;
  /** 当前步骤游标 */
  cursor: StrokeCursor;
};

/** 多个描边子路径共享的 Scene 基础属性与绘制外观 */
export type StrokePrimitiveAppearance = ScenePrimitiveBase & PathPrimitiveAppearance;

/** 已确定描边宽度的路径外观 */
export type CompiledStrokeAppearance = WithRequiredProperties<StrokePrimitiveAppearance, 'strokeWidth'>;

/** 基础路径降级结果，只保存几何命令、参数模型与边界点 */
export type LoweredStrokePathGeometry = NonNullable<ReturnType<typeof lowerStrokePathGeometry>>;

/** 标签的路径放置与断口定位，不包含文本测量 */
export type StrokeLabelPlacement = Omit<CompiledPathLabelLayout, 'block'> & {
  /** 需要断线或宿主定位时的逻辑路径采样 */
  logicalSample?: StrokeLabelSample;
};

/** 调用方确认有效的单标签布局；null 放置表示已确定无法定位 */
export type PreparedStrokeLabelLayout = {
  /** 独立于路径位置的文本排版 */
  measurement?: CompiledTextBlockLayout;
  /** 当前路径上的放置 */
  placement?: StrokeLabelPlacement | null;
};

/** 单标签的局部绘制与已放置图元 */
export type PreparedStrokeLabelEmit = {
  /** 原点处尚未舍入的文本/公式图元 */
  content?: PathLabelContent;
  /** 当前位置上的完整标签，null 表示无输出 */
  overall?: ScenePrimitive | null;
};

/** 按源步骤与宿主声明分别排列，不按最终绘制顺序编号 */
export type StrokeLabelSlots<TLabel> = {
  /** 与 children 的步骤下标对应，非标签步骤使用空对象 */
  steps?: Array<TLabel>;
  /** 与宿主 label 顺序对应 */
  host?: Array<TLabel>;
};

/** 沿截断前路径计算的标记位置与放置变换 */
export type StrokeMarkPlacement = {
  /** 原始路径采样位置，参与宿主范围计算 */
  point: IRPosition;
  /** 标记基准坐标到宿主局部坐标的变换 */
  transforms: Array<Transform>;
};

/** 调用方确认有效的单标记放置 */
export type PreparedStrokeMarkLayout = {
  /** 标记的路径定位及变换 */
  placement?: StrokeMarkPlacement;
};

/** 单标记的局部 provider 图元和已放置结果 */
export type PreparedStrokeMarkEmit = {
  /** 尚未应用宿主颜色、透明度与放置的局部图元 */
  content?: Array<ScenePrimitive>;
  /** 已放置并应用宿主外观的标记 */
  overall?: GroupPrimitive;
};

/** 首末端箭头的局部 provider 图元 */
export type PreparedStrokeArrowEmit = {
  /** 不包含沿路径接触修正的局部内容 */
  content?: Array<ScenePrimitive>;
};

/** 已截取的可见主线和与外观无关的端点接触修正 */
export type LoweredStrokeBody = {
  /** 首末端箭头的旋转与等比缩放补偿 */
  contacts: StrokeEndpointPlacements;
} & (
  | { kind: 'continuous'; commands: Array<PathCommand> }
  | { kind: 'interrupted'; fragments: Array<StrokeCommandFragment> }
);

/** 完整的标准描边布局，不包含 marker provider 图元或绘制外观 */
export type StrokePathLayout = {
  /** 基础几何与原始步骤参数模型 */
  geometry: LoweredStrokePathGeometry;
  /** 按实际消费需求建立的逻辑长度模型 */
  metrics?: StrokePathGeometry;
  /** 双模式定位索引 */
  positions?: StrokePositionModel;
  /** 已处理的步骤和宿主标签 */
  labels: Required<StrokeLabelSlots<PreparedStrokeLabelLayout>>;
  /** 按 marks 声明排列的放置 */
  marks: Array<WithRequiredProperties<PreparedStrokeMarkLayout, 'placement'>>;
  /** 断线与箭头截短后的可见主线 */
  body: LoweredStrokeBody;
};

/** 调用方确认有效的标准描边布局原子产物 */
export type PreparedStrokePathLayout = Partial<Pick<StrokePathLayout, 'metrics' | 'positions' | 'body'>> & {
  /** 仅圆角变化时可独立保留的原始度量，消费后并入 positions */
  originalMetrics?: StrokePathGeometry;
  /** 完整布局；null 表示已计算且路径不可绘制 */
  overall?: StrokePathLayout | null;
  /** 基础几何；null 表示已确定不可绘制 */
  geometry?: LoweredStrokePathGeometry | null;
  /** 可独立复用的逐标签测量和放置 */
  labels?: StrokeLabelSlots<PreparedStrokeLabelLayout>;
  /** 可独立复用的逐标记放置 */
  marks?: Array<PreparedStrokeMarkLayout>;
};

/** 调用方确认有效的标准描边绘制原子产物 */
export type PreparedStrokePathEmit = {
  /** 已完成宿主包装的描边输出；null 表示无输出 */
  overall?: PathEmitOutput | null;
  /** 尚未绑定宿主身份与整体变换的主线图元 */
  body?: ScenePrimitive;
  /** 标签局部内容及已放置图元 */
  labels?: StrokeLabelSlots<PreparedStrokeLabelEmit>;
  /** 端点箭头的局部内容 */
  arrows?: { start?: PreparedStrokeArrowEmit; end?: PreparedStrokeArrowEmit };
  /** 标记局部内容及已放置图元 */
  marks?: Array<PreparedStrokeMarkEmit>;
};

/** 与当前源路径对应的标准描边能力缓存，不适用于任意派生 Path */
export type PreparedStrokePathCompilation = {
  /** 布局原子产物 */
  layout?: PreparedStrokePathLayout;
  /** 绘制原子产物 */
  emit?: PreparedStrokePathEmit;
};

/** 标准描边能力返回的整体和本次已知局部产物 */
export type CompiledStrokePath = Pick<PreparedStrokePathCompilation, 'layout'> & {
  /** 整体绘制必定已计算 */
  emit: WithRequiredProperties<PreparedStrokePathEmit, 'overall'>;
};
