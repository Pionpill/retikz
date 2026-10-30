import { FontSchema, NodeLabelSchema, PathLabelSchema } from '@retikz/core';
import { resolveFieldPath } from '@retikz/data';
import type { ZodType } from 'zod';

import type { ChannelValue, LabelChannelDefinition, LabelHost } from '../../../contract';
import { channelField, channelScale, defineLabelChannel } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import { booleanChannelValue } from '../shared';
import { OPACITY_MIN, resolveNumericNodeChannel } from './node';
import { makeColorChannelDefinition } from './paint';

/** 创建复用 Core 值约束的标签叶子通道 */
const labelChannel = (
  target: string,
  schemas: Partial<Record<LabelHost, ZodType>>,
  mapping: 'direct' | 'number' | 'color' | 'opacity' = 'direct',
): LabelChannelDefinition =>
  defineLabelChannel({
    channel: `label.${target}`,
    hosts: Object.keys(schemas) as Array<LabelHost>,
    resolve: (context, binding, host, mark) => {
      const field = channelField(binding);
      if (mapping === 'direct' && channelScale(binding) !== undefined)
        throw new RetikzPlotError(`Label ${target} only accepts a field binding`);
      const numeric =
        mapping === 'opacity' || (mapping === 'number' && channelScale(binding) !== undefined)
          ? resolveNumericNodeChannel(
              context,
              binding,
              `label.${target}`,
              mapping === 'opacity' ? { range: [OPACITY_MIN, 1], clamp: true } : {},
            )
          : undefined;
      const color =
        mapping === 'color'
          ? makeColorChannelDefinition({ channel: `label.${target}`, pick: () => binding }).resolve(context, mark)
          : undefined;
      return {
        resolver: row => {
          const raw = resolveFieldPath(row, field);
          if (raw === undefined || raw === null)
            throw new RetikzPlotError(`Label ${target} field "${field}" is missing`);
          const value = color ? color.resolver(row) : numeric ? numeric.resolver(row) : raw;
          const parsed = schemas[host]!.safeParse(
            target === 'sloped' || target === 'keepUpright' ? booleanChannelValue(value) : value,
          );
          if (!parsed.success || parsed.data === undefined)
            throw new RetikzPlotError(`Invalid label ${target} value from field "${field}"`);
          return parsed.data as ChannelValue;
        },
      };
    },
    deliver: (label, value) => {
      if (target.startsWith('font.')) {
        label.font = { ...label.font, [target.slice(5)]: value };
      } else Object.assign(label, { [target]: value });
    },
  });

const common = (schema: ZodType): Record<LabelHost, ZodType> => ({ node: schema, geometry: schema });

/** 内置标签通道，与扩展共用统一注册和宿主校验 */
export const LABEL_CHANNELS: ReadonlyArray<LabelChannelDefinition> = [
  ...(['size', 'weight', 'family', 'style'] as const).map(leaf =>
    labelChannel(
      `font.${leaf}`,
      common(FontSchema.shape[leaf]),
      leaf === 'size' || leaf === 'weight' ? 'number' : 'direct',
    ),
  ),
  labelChannel('textColor', common(NodeLabelSchema.shape.textColor), 'color'),
  labelChannel('opacity', common(NodeLabelSchema.shape.opacity), 'opacity'),
  ...(['position', 'distance'] as const).map(target =>
    labelChannel(target, {
      node: NodeLabelSchema.shape[target],
      geometry: PathLabelSchema.shape[target],
    }),
  ),
  ...(['placement', 'align', 'rotate', 'keepUpright'] as const).map(target =>
    labelChannel(target, { node: NodeLabelSchema.shape[target] }),
  ),
  ...(['side', 'sloped'] as const).map(target => labelChannel(target, { geometry: PathLabelSchema.shape[target] })),
];
