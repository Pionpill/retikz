import { ChannelDefinitionKind, type MarkChannelDefinition, type ResolveLabel } from '../../../contract';
import { labelOf } from '../../data';
import { type MarkOperation, type TextChannel } from '../../../schemas';

export type BuiltinTextChannels = {
  label: MarkChannelDefinition<string>;
};

export type BuiltinTextChannelOptions = {
  resolveLabel?: Record<string, ResolveLabel>;
};

const labelContentChannel = (mark: MarkOperation): TextChannel | undefined => {
  const encodingText = (mark as { encoding?: { text?: TextChannel } }).encoding?.text;
  if (encodingText !== undefined) return encodingText;
  return (mark as { label?: { content?: TextChannel } }).label?.content;
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
