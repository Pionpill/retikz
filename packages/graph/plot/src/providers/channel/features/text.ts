import { type IRNodeLabel } from '@retikz/core';

import type { MarkChannelDefinition, ResolveLabel } from '../../../contract';

import { ChannelDefinitionKind } from '../../../contract';
import { type MarkLabelContent, type MarkOperation, type TextChannel } from '../../../schemas';
import { labelOf } from '../../data';

export type BuiltinTextChannels = {
  label: MarkChannelDefinition<IRNodeLabel['text']>;
};

export type BuiltinTextChannelOptions = {
  resolveLabel?: Record<string, ResolveLabel>;
};

const labelContentChannel = (mark: MarkOperation): TextChannel | MarkLabelContent | undefined => {
  const encodingText = (mark as { encoding?: { text?: TextChannel } }).encoding?.text;
  if (encodingText !== undefined) return encodingText;
  const label = (mark as { label?: { content?: MarkLabelContent } | Array<{ content?: MarkLabelContent }> }).label;
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
