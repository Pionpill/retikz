import type {
  DataFieldType,
  DataTransformFieldEffect,
  DataTransformOutputDescriptor,
  DataTransformPhase,
  IRDataTransform,
  IRDataExecution,
} from '@retikz/data';

/** Chart encoding mapping 允许消费的 transform capability */
export type ChartTransformCapability = Readonly<{
  /** 当前字段映射允许的数据变换阶段 */
  phase: DataTransformPhase;
  /** 当前字段映射允许的字段结构影响 */
  fieldEffect: DataTransformFieldEffect;
}>;

/** Chart encoding mapping 允许连接的 scale capability */
export type ChartEncodingScaleConsumer = Readonly<{
  /** 允许的位置或视觉通道尺度族 */
  family: 'position' | 'channel';
  /** 可选的精确尺度类型限制 */
  type?: string;
  /** 该尺度所绑定的坐标位置角色 */
  positionRole?: string;
  /** 没有显式绑定时采用的 recipe 尺度名称与类型 */
  recipeFallback?: Readonly<{
    /** 缺省尺度的注册名称 */
    name: string;
    /** 缺省尺度的操作类型 */
    type: string;
  }>;
}>;

/**
 * exact recipe 中一个普通字段 slot 允许的 mapping 能力
 * @template TSlot 当前字段消费声明对应的槽位名称
 */
export type ChartEncodingFieldConsumer<TSlot extends string = string> = Readonly<{
  /** 当前 recipe 中被消费的字段映射槽位 */
  slot: TSlot;
  /** 该槽位允许的数据变换阶段与字段影响组合 */
  transforms?: ReadonlyArray<ChartTransformCapability>;
  /** 该槽位要求的输出字段类型 */
  outputType?: DataFieldType;
  /** 该槽位允许连接的尺度能力 */
  scale?: ChartEncodingScaleConsumer;
}>;

/** 已验证 scale operation 的 owner 与类型 */
export type ResolvedScaleSource = Readonly<{
  /** 已验证尺度所属的位置或视觉通道族 */
  family: 'position' | 'channel';
  /** 已验证的尺度操作类型 */
  type: string;
}>;

/** 单个 encoding-derived transform 的调度记录 */
export type TransformOperationRecord = Readonly<{
  /** 用于关联生产者与消费者的变换记录身份 */
  id: string;
  /** 生成该变换的字段映射槽位 */
  slot: string;
  /** 该槽位在 recipe 固定顺序中的零基索引 */
  slotIndex: number;
  /** 该变换执行的数据调度阶段 */
  phase: DataTransformPhase;
  /** 已通过对应定义校验的数据变换操作 */
  operation: IRDataTransform;
  /** 当前变换声明的稀疏执行配置 */
  dataExecution?: IRDataExecution;
  /** 该变换对字段结构的影响 */
  fieldEffect: DataTransformFieldEffect;
  /** 变换执行前必须可见的输入字段 */
  inputs: ReadonlyArray<string>;
  /** 变换声明的完整输出字段及类型 */
  outputs: ReadonlyArray<DataTransformOutputDescriptor>;
  /** 由该变换产生的字段名称 */
  producedFields: ReadonlyArray<string>;
  /** 替换字段模型后仍可见的完整字段集合 */
  fieldsAfterReplace?: ReadonlyArray<string>;
}>;

/** transform output field 的唯一 producer */
export type FieldProducer = Readonly<{
  /** 产生该字段的变换身份 */
  id: string;
  /** 产生该字段的映射槽位 */
  slot: string;
  /** 字段产生的数据调度阶段 */
  phase: DataTransformPhase;
  /** 生产者槽位在 recipe 固定顺序中的零基索引 */
  slotIndex: number;
}>;

/** transform 调度前需要可见的字段集合 */
export type FieldConsumer = Readonly<{
  /** 消费字段的变换或映射身份 */
  id: string;
  /** 需要字段的映射槽位 */
  slot: string;
  /** 字段必须可见的数据调度阶段 */
  phase: DataTransformPhase;
  /** 消费者槽位在 recipe 固定顺序中的零基索引 */
  slotIndex: number;
  /** 消费前必须可见的字段集合 */
  fields: ReadonlyArray<string>;
  /** 是否允许消费相同身份变换自身产生的字段 */
  allowsSelfOutput: boolean;
}>;
