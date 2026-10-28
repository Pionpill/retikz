import type { IRChild } from '@retikz/core';
import type { ZodType } from 'zod';

import type {
  MarkLoweringContext,
  LabelHost,
  ChannelDefinitionKind,
  FieldCollector,
  MarkChannels,
  Cell,
  CoordinateFrame,
  MarkDomainPaddingCapability,
  MarkPlacementTarget,
  MarkInstance,
  InputMarkInstance,
  IntervalContext,
} from '../../contract';
import type { IRPlotMark } from '../../schemas';

/**
 * 内置图元的编译行为定义（仅 provider 内部使用，行为函数不进 IR）
 * @description Plot mark schema 仍是 JSON IR 的静态单一真源；本接口承载字段收集、几何能力与下沉行为，按封闭的 type 集合分派
 * @template T schema 校验并交给字段收集、通道选择与下沉回调的 mark 类型
 */
export type MarkDefinition<T extends IRPlotMark = IRPlotMark> = {
  /** 完整 mark operation schema；对应内置图元的静态 schema */
  schema: ZodType<T>;
  /** 收集该 mark 额外引用的用户源字段；通用 encoding / label 字段由 data 层统一处理 */
  collectFields?: (mark: T, fields: FieldCollector) => void;
  /** 附属标签的 Core 宿主；有标签样式编码时必须声明 */
  labelHost?: LabelHost;
  /**
   * 声明该 mark 能消费哪些通道交付面
   * @description channel registry 会据此只解析 mark 实际会下沉的 channel definition。比如 point 可消费 mark / scope / node
   *   通道，path 可消费 mark / scope / path 通道；内置图元按自己的 lowering 产物声明，避免 channel 层写死 mark type
   */
  channelKinds?: (mark: T) => ReadonlySet<ChannelDefinitionKind>;
  /** 区间类 mark：某行 → 正交 Cell（interval 用；非区间类省略） */
  buildCell?: (mark: T, instance: MarkInstance, frame: CoordinateFrame, ctx?: IntervalContext) => Cell | null;
  /** 可选 Mark Placement 能力；只有显式声明的 Mark 才能消费 `placement` */
  placement?: {
    /** 按稳定顺序枚举可调整的位置目标 */
    targets: (mark: T, instances: InputMarkInstance, frame: CoordinateFrame) => Array<MarkPlacementTarget>;
    /** 目标沿指定屏幕单位法向的 glyph extent；无法证明时返回 undefined */
    normalExtent?: (
      mark: T,
      target: MarkPlacementTarget,
      unitNormal: readonly [number, number],
      channels: MarkChannels,
    ) => number | undefined;
  };
  /** 逐点域留白目标，与 placement 及 renderer 无关 */
  domainPadding?: MarkDomainPaddingCapability<T>;
  /** 下沉到 core IR 图层（无可绘制图元返回 null；不支持的 mark × coordinate 由实现 fail-loud） */
  lower: (
    mark: T,
    instances: InputMarkInstance,
    frame: CoordinateFrame,
    channels: MarkChannels,
    ctx?: MarkLoweringContext,
  ) => IRChild | null;
};

/**
 * registry 内部使用的宽类型
 * @description registry 需要存放不同 mark 子类型的 definition；真正调用前由 lowerMark 按 type 取出，行为函数入参用 never 防误调
 */
export type AnyMarkDefinition = {
  /** 注册后按具体 operation 调用的域留白能力 */
  domainPadding?: MarkDomainPaddingCapability<never>;
  /** 不同 definition 的 schema 泛型不同，内部行为表只消费运行时 parse */
  schema: ZodType;
  /** 内部宽类型占位；按 type 取出后调用方已知具体 mark */
  collectFields?: (mark: never, fields: FieldCollector) => void;
  /** 附属标签的 Core 宿主；有标签样式编码时必须声明 */
  labelHost?: LabelHost;
  /** 内部宽类型占位；语义同 MarkDefinition.channelKinds，供 registry 按 type 分发后调用 */
  channelKinds?: (mark: never) => ReadonlySet<ChannelDefinitionKind>;
  /** 内部宽类型占位；按 type 取出后调用方已知具体 mark */
  buildCell?: (mark: never, instance: MarkInstance, frame: CoordinateFrame, ctx?: IntervalContext) => Cell | null;
  /** 内部宽类型占位；语义同 MarkDefinition.placement */
  placement?: {
    /** 从有效数据行提取具有稳定键和角色值的待定位目标 */
    targets: (mark: never, instances: InputMarkInstance, frame: CoordinateFrame) => Array<MarkPlacementTarget>;
    /** 计算目标沿给定单位法向的视觉外延，无法确定时返回 undefined */
    normalExtent?: (
      mark: never,
      target: MarkPlacementTarget,
      unitNormal: readonly [number, number],
      channels: MarkChannels,
    ) => number | undefined;
  };
  /** 内部宽类型占位；按 type 取出后调用方已知具体 mark */
  lower: (
    mark: never,
    instances: InputMarkInstance,
    frame: CoordinateFrame,
    channels: MarkChannels,
    ctx?: MarkLoweringContext,
  ) => IRChild | null;
};
