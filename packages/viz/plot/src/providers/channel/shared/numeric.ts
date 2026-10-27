import type { DataTransformModel, ExternalRow } from '@retikz/data';
import { DataFieldType, resolveFieldPath } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type { ChannelResolution } from '../../../contract';
import { channelScale, isBuiltinScaleOperation } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlot, IRPlotLinearScale, IRPlotChannel } from '../../../schemas';
import { BuiltinPlotScale } from '../../../schemas';
import { resolveLinearScale } from '../../scale';
import { createMarkValueResolver } from './common';

type NumericChannelOptions = {
  range?: readonly [number, number];
  clamp?: boolean;
};

/** 解析直接数值字段或显式线性尺度映射，供几何和路径通道共用 */
export const resolveNumericChannel = (
  node: IRPlot,
  rows: Array<ExternalRow>,
  model: DataTransformModel,
  channel: IRPlotChannel | undefined,
  channelName: string,
  options: NumericChannelOptions = {},
): ChannelResolution<number> | undefined => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  if (!channel) return undefined;

  const source = createMarkValueResolver<number>(channel, model, {
    channelName,
    expectedFieldType: DataFieldType.Continuous,
    parse: value => (isFiniteNumber(value) ? value : undefined),
  });
  if (!source) return undefined;
  if (source.field === undefined) return source;

  const numeric = rows.map(row => resolveFieldPath(row, source.field as string)).filter(isFiniteNumber);
  const scaleName = channelScale(channel);
  let scale: ((value: number) => number) | undefined;
  if (scaleName !== undefined || options.range !== undefined) {
    let def: IRPlotLinearScale = {
      type: BuiltinPlotScale.Linear,
      name: scaleName ?? `__path_${channelName}_${source.field}`,
      ...(options.range !== undefined ? { range: [options.range[0], options.range[1]] as [number, number] } : {}),
      ...(options.clamp !== undefined ? { clamp: options.clamp } : {}),
    };
    if (scaleName !== undefined) {
      const found = scaleByName.get(scaleName);
      if (!found)
        throw new RetikzPlotError(`lowerPlots: ${channelName} path channel references unknown scale "${scaleName}"`);
      if (!isBuiltinScaleOperation(found) || found.type !== BuiltinPlotScale.Linear)
        throw new RetikzPlotError(
          `lowerPlots: ${channelName} path channel scale "${scaleName}" must be a linear scale`,
        );

      def = { ...found, range: found.range ?? def.range, clamp: found.clamp ?? def.clamp };
    }

    scale = resolveLinearScale(def, numeric, options.range ?? [0, 1]);
  }

  return {
    resolver: row => {
      const value = source.resolver(row);
      if (value === undefined) return undefined;
      return scale ? scale(value) : value;
    },
    descriptor: source.descriptor,
  };
};
