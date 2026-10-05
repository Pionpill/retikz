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
  phase: DataTransformPhase;
  fieldEffect: DataTransformFieldEffect;
}>;

/** Chart encoding mapping 允许连接的 scale capability */
export type ChartEncodingScaleConsumer = Readonly<{
  family: 'position' | 'channel';
  type?: string;
  positionRole?: string;
  recipeFallback?: Readonly<{
    name: string;
    type: string;
  }>;
}>;

/** exact recipe 中一个普通字段 slot 允许的 mapping 能力 */
export type ChartEncodingFieldConsumer<TSlot extends string = string> = Readonly<{
  slot: TSlot;
  transforms?: ReadonlyArray<ChartTransformCapability>;
  outputType?: DataFieldType;
  scale?: ChartEncodingScaleConsumer;
}>;

/** 已验证 scale operation 的 owner 与类型 */
export type ResolvedScaleSource = Readonly<{
  family: 'position' | 'channel';
  type: string;
}>;

/** 单个 encoding-derived transform 的调度记录 */
export type TransformOperationRecord = Readonly<{
  id: string;
  slot: string;
  slotIndex: number;
  phase: DataTransformPhase;
  operation: IRDataTransform;
  dataExecution?: IRDataExecution;
  fieldEffect: DataTransformFieldEffect;
  inputs: ReadonlyArray<string>;
  outputs: ReadonlyArray<DataTransformOutputDescriptor>;
  producedFields: ReadonlyArray<string>;
  fieldsAfterReplace?: ReadonlyArray<string>;
}>;

/** transform output field 的唯一 producer */
export type FieldProducer = Readonly<{
  id: string;
  slot: string;
  phase: DataTransformPhase;
  slotIndex: number;
}>;

/** transform 调度前需要可见的字段集合 */
export type FieldConsumer = Readonly<{
  id: string;
  slot: string;
  phase: DataTransformPhase;
  slotIndex: number;
  fields: ReadonlyArray<string>;
  allowsSelfOutput: boolean;
}>;
