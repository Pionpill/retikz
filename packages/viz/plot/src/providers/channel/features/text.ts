import type { IRNodeLabel } from '@retikz/core';

import type { MarkChannelDefinition, ResolveLabel } from '../../../contract';
import { ChannelDefinitionKind, labelEntries } from '../../../contract';
import type { IRPlotMark } from '../../../schemas';
import { labelOf } from '../shared';

/** 内置文本通道 definition 的按名称索引类型 */
type BuiltinTextChannels = {
  /** 把数据值解析为 mark 标签内容的通道 */
  label: MarkChannelDefinition<IRNodeLabel['text']>;
};

/** 创建内置文本通道时可注入的运行时 label resolver */
export type BuiltinTextChannelOptions = {
  /** 按 mark id 索引的运行时标签回调 */
  resolveLabel?: Record<string, ResolveLabel>;
};

/** 文本目标的字段来源、固定内容与显示配置 */
type LabelContentSources = {
  field?: string;
  text?: IRNodeLabel['text'];
  displayFormat?: string;
};

const labelContentSources = (mark: IRPlotMark): LabelContentSources => {
  const source = mark as {
    encodings?: { text?: string; label?: string | { text?: string } | Array<string | { text?: string }> };
    properties?: {
      text?: IRNodeLabel['text'];
      displayFormat?: string;
      label?:
        | string
        | { text?: IRNodeLabel['text']; displayFormat?: string }
        | Array<string | { text?: IRNodeLabel['text']; displayFormat?: string }>;
    };
  };
  if (source.encodings?.text !== undefined || source.properties?.text !== undefined) {
    return {
      field: source.encodings?.text,
      text: source.properties?.text,
      displayFormat: source.properties?.displayFormat,
    };
  }
  const labels = source.properties?.label;
  const label = labelEntries(labels).at(0);
  const encodings = source.encodings?.label;
  const encoding = labelEntries(encodings).at(0);
  return {
    field: encoding?.text,
    text: label?.text,
    displayFormat: label && 'displayFormat' in label ? label.displayFormat : undefined,
  };
};

/**
 * 创建内置 text channel definitions
 * @param options 按图元标识注入标签回调；省略时只读取声明的标签绑定
 * @returns 包含 label 通道的新定义集合
 */
export const createBuiltinTextChannels = (options: BuiltinTextChannelOptions = {}): BuiltinTextChannels => ({
  label: {
    channel: 'label',
    kind: ChannelDefinitionKind.Mark,
    resolve: (ctx, mark) => {
      const { field, text, displayFormat } = labelContentSources(mark);
      const id = mark.id;
      const runtime = id !== undefined ? options.resolveLabel?.[id] : undefined;
      if (field === undefined && text === undefined && runtime === undefined) return undefined;

      const fieldType = field === undefined ? undefined : ctx.model.find(definition => definition.name === field)?.type;
      return { resolver: row => labelOf(text, row, fieldType, runtime, field, displayFormat) };
    },
  },
});
