import type { DataFieldType, IRDataTransform } from '@retikz/data';

/** Chart encoding mapping 允许连接的 scale capability */
type ChartEncodingScaleConsumer = Readonly<{
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
  /** 该槽位要求的输出字段类型 */
  outputType?: DataFieldType;
  /** 该槽位允许连接的尺度能力 */
  scale?: ChartEncodingScaleConsumer;
}>;

/** 已验证 scale operation 的 owner 与类型 */
export type CanonicalScaleSource = Readonly<{
  /** 已验证尺度所属的位置或视觉通道族 */
  family: 'position' | 'channel';
  /** 已验证的尺度操作类型 */
  type: string;
}>;

/** 聚合映射生成的数据操作与输出字段 */
export type ChartAggregateOperation = Readonly<{
  /** 聚合映射所属的字段槽位 */
  slot: string;
  /** 交给 Data 执行的汇总操作 */
  operation: IRDataTransform;
  /** 汇总操作产生的字段 */
  producedFields: ReadonlyArray<string>;
}>;
