import type { IRJsonObject } from '@retikz/core';
import type { IRDataScalarValue } from '@retikz/data';
import type { z, ZodType } from 'zod';

import type { DeepReadonly } from '../../shared';
import type { TableLegendDescriptorSchema } from './schema';

/** Visual scale 解析时可用的同次 Table style palette */
export type CellVisualScaleResolveContext = Readonly<{
  /** 分类颜色序列 */
  categoricalColors: ReadonlyArray<string>;
  /** 连续颜色端点 */
  sequentialColors: readonly [string, string];
}>;

/** 单个 visual scale 的运行时解析结果 */
export type CellVisualScaleResolution = Readonly<{
  /** 把一个 canonical raw scalar 映射为颜色 */
  of: (value: IRDataScalarValue) => string | undefined;
  /** Legend 表达形态 */
  legendForm: 'ramp' | 'swatch';
  /** 同源 descriptor domain */
  domain: ReadonlyArray<IRDataScalarValue>;
  /** 同源 descriptor color range */
  range: ReadonlyArray<string>;
  /** 可选 threshold edges */
  edges?: ReadonlyArray<number>;
}>;

/** Table Cell visual scale 作者契约 */
export type CellVisualScaleDefinition<TOptions extends IRJsonObject = IRJsonObject> = Readonly<{
  /** 稳定 registry 名称 */
  name: string;
  /** definition 自有 JSON options schema */
  optionsSchema: ZodType<TOptions>;
  /** 从 selected raw values 与 style palette 构造单次 resolution */
  resolve: (
    options: TOptions,
    values: ReadonlyArray<IRDataScalarValue>,
    context: CellVisualScaleResolveContext,
  ) => CellVisualScaleResolution | undefined;
}>;

/** 擦除 options 泛型后的 visual scale definition */
export type AnyCellVisualScaleDefinition = Omit<CellVisualScaleDefinition, 'optionsSchema' | 'resolve'> & {
  /** 异构 registry 消费的 options schema */
  optionsSchema: ZodType;
  /** options 经对应 schema 收窄后以 never 调用 */
  resolve: (
    options: never,
    values: ReadonlyArray<IRDataScalarValue>,
    context: CellVisualScaleResolveContext,
  ) => CellVisualScaleResolution | undefined;
};

/** Table 向通用 Legend 层交接的领域 descriptor */
export type TableLegendDescriptor = DeepReadonly<z.infer<typeof TableLegendDescriptorSchema>>;
