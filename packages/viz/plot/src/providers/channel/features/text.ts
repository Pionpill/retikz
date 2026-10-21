import type { IRNodeLabel } from '@retikz/core';

import type { MarkChannelDefinition, ResolveLabel } from '../../../contract';
import { ChannelDefinitionKind } from '../../../contract';
import type { IRPlotMarkLabelContent, IRPlotMarkOperation } from '../../../schemas';
import { labelOf } from '../shared';

/** 内置文本通道 definition 的按名称索引类型 */
export type BuiltinTextChannels = {
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
  content?: IRPlotMarkLabelContent;
  displayFormat?: string;
};

const labelContentSources = (mark: IRPlotMarkOperation): LabelContentSources => {
  const source = mark as {
    encodings?: { text?: string; label?: { content?: string } | Array<{ content?: string }> };
    properties?: {
      text?: IRPlotMarkLabelContent;
      displayFormat?: string;
      label?:
        | { content?: IRPlotMarkLabelContent; displayFormat?: string }
        | Array<{ content?: IRPlotMarkLabelContent; displayFormat?: string }>;
    };
  };
  if (source.encodings?.text !== undefined || source.properties?.text !== undefined) {
    return {
      field: source.encodings?.text,
      content: source.properties?.text,
      displayFormat: source.properties?.displayFormat,
    };
  }
  const labels = source.properties?.label;
  const label = Array.isArray(labels) ? labels[0] : labels;
  const encodings = source.encodings?.label;
  const encoding = Array.isArray(encodings) ? encodings[0] : encodings;
  return { field: encoding?.content, content: label?.content, displayFormat: label?.displayFormat };
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
      const { field, content, displayFormat } = labelContentSources(mark);
      const id = mark.id;
      const runtime = id !== undefined ? options.resolveLabel?.[id] : undefined;
      if (field === undefined && content === undefined && runtime === undefined) return undefined;

      const fieldType = field === undefined ? undefined : ctx.model.find(definition => definition.name === field)?.type;
      return { resolver: row => labelOf(content, row, fieldType, runtime, field, displayFormat) };
    },
  },
});
