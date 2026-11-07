import { DataFieldType, resolveFieldPath } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type { ChannelDefinitionResolveContext, ChannelResolution } from '../../../contract';
import { channelField, channelScale, isBuiltinScaleOperation } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotChannel, IRPlotScaleOperation } from '../../../schemas';

/** 数值属性通道的默认映射和输出约束 */
export type NumericChannelOptions = {
  /** 默认输出区间 */
  range?: readonly [number, number];
  /** 自动映射使用的输入区间 */
  domain?: readonly [number, number];
  /** 内置连续映射的默认钳位策略 */
  clamp?: boolean;
  /** 是否对输出取整 */
  integer?: boolean;
  /** 自动映射采用的算法 */
  type?: 'linear' | 'sqrt';
};

/** 通过共享数学定义注册表解析数值属性 */
export const resolveNumericChannel = (
  context: ChannelDefinitionResolveContext,
  channel: IRPlotChannel | undefined,
  channelName: string,
  options: NumericChannelOptions = {},
): ChannelResolution<number> | undefined => {
  if (channel === undefined) return undefined;
  const field = channelField(channel);
  const fieldType = context.model.find(item => item.name === field)?.type;
  const scaleName = channelScale(channel);
  const values = context.rows.map(row => resolveFieldPath(row, field));
  if (scaleName === undefined && fieldType !== undefined && fieldType !== DataFieldType.Continuous)
    throw new RetikzPlotError(`${channelName} requires a continuous field`);
  let operation: IRPlotScaleOperation | undefined;
  if (scaleName !== undefined) {
    operation = context.node.scales.find(item => item.name === scaleName);
    if (operation === undefined) throw new RetikzPlotError(`${channelName} references unknown scale "${scaleName}"`);
  } else if (options.range !== undefined) {
    operation = {
      type: options.type ?? 'linear',
      name: `__${channelName}_${field}`,
      domain: options.domain === undefined ? undefined : [...options.domain],
      range: [...options.range],
      clamp: options.clamp,
    };
  }
  if (
    operation !== undefined &&
    options.clamp !== undefined &&
    isBuiltinScaleOperation(operation) &&
    (operation.type === 'linear' ||
      operation.type === 'log' ||
      operation.type === 'pow' ||
      operation.type === 'sqrt' ||
      operation.type === 'symlog' ||
      operation.type === 'radial' ||
      operation.type === 'time')
  ) {
    operation = { ...operation, clamp: ('clamp' in operation ? operation.clamp : undefined) ?? options.clamp };
  }
  const mapping =
    operation === undefined
      ? undefined
      : context.resolveScaleMapping(operation, {
          values: values.map(value =>
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null,
          ),
          fieldType,
          defaultRange: options.range === undefined ? [0, 1] : [...options.range],
        });
  const checked = (value: unknown): number | undefined => {
    if (value === undefined) return undefined;
    if (!isFiniteNumber(value)) throw new RetikzPlotError(`${channelName} scale must produce finite numbers`);
    if (
      (channelName.toLowerCase().includes('opacity') && (value < 0 || value > 1)) ||
      ((channelName === 'size' || channelName === 'strokeWidth' || channelName === 'cornerRadius') && value < 0)
    )
      throw new RetikzPlotError(`${channelName} scale produced an out-of-range value ${value}`);
    return options.integer ? Math.trunc(value) : value;
  };
  if (mapping !== undefined) for (const value of mapping.range) checked(value);
  return {
    resolver: row => {
      const raw = resolveFieldPath(row, field);
      if (mapping === undefined) return isFiniteNumber(raw) ? (options.integer ? Math.trunc(raw) : raw) : undefined;
      const scalar = typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean' ? raw : null;
      return checked(mapping.map(scalar));
    },
    descriptor:
      mapping === undefined || operation === undefined
        ? undefined
        : {
            channel: channelName,
            scaleType: operation.type,
            scaleName: operation.name,
            domain: mapping.domain,
            range: mapping.range,
            field,
            fieldType,
            mapping,
          },
  };
};
