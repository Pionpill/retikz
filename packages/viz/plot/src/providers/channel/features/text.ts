import { type IRNodeLabel } from '@retikz/core';

import type { MarkChannelDefinition, ResolveLabel } from '../../../contract';

import { ChannelDefinitionKind } from '../../../contract';
import { type IRPlotMarkLabelContent, type IRPlotMarkOperation, type IRPlotTextChannel } from '../../../schemas';
import { labelOf } from '../shared';

/** 内置文本通道 definition 的按名称索引类型。 */
export type BuiltinTextChannels = {
  label: MarkChannelDefinition<IRNodeLabel['text']>;
};

/** 创建内置文本通道时可注入的运行时 label resolver。 */
export type BuiltinTextChannelOptions = {
  resolveLabel?: Record<string, ResolveLabel>;
};

const labelContentChannel = (mark: IRPlotMarkOperation): IRPlotTextChannel | IRPlotMarkLabelContent | undefined => {
  const encodingText = (mark as { encoding?: { text?: IRPlotTextChannel } }).encoding?.text;
  if (encodingText !== undefined) return encodingText;
  const label = (mark as { label?: { content?: IRPlotMarkLabelContent } | Array<{ content?: IRPlotMarkLabelContent }> })
    .label;
  return Array.isArray(label) ? label[0]?.content : label?.content;
};

/** 创建内置 text channel definitions。 */
export const createBuiltinTextChannels = (options: BuiltinTextChannelOptions = {}): BuiltinTextChannels => ({
  label: {
    channel: 'label',
    kind: ChannelDefinitionKind.Mark,
    resolve: ctx => mark => {
      const content = labelContentChannel(mark);
      const id = (mark as { id?: string }).id;
      const runtime = id !== undefined ? options.resolveLabel?.[id] : undefined;
      if (content === undefined && runtime === undefined) return undefined;
      const fieldType = content?.field !== undefined ? ctx.fieldTypes.get(content.field) : undefined;
      const effectiveContent = content ?? { value: '' };
      return { resolver: row => labelOf(effectiveContent, row, fieldType, runtime) };
    },
  },
});
