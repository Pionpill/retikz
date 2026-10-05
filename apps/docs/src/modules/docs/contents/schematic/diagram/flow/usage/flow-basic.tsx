import type { WebFontSizePreset, IRLine, IRTextBlock } from '@retikz/core';
import { FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';
import type { GraphStatus } from '@retikz/graph';
import type { FC, ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';
import { defineControlledPreview } from '@/modules/docs/preview';

import { flowBasicControls, createPreviewControlContract } from './flow-basic.controls';
import { flowBasicI18n } from './flow-basic.i18n';

/** 注册 controls 自动发现的回退导出 */
export const previewControls = flowBasicControls;

const subtitleFontSizes = ['xs', 'sm', 'base', 'lg'] as const;
const textAlignValues = ['start', 'middle', 'end'] as const;
const graphStatusValues: ReadonlyArray<GraphStatus> = ['error', 'success', 'warning', 'disabled'];

/** 判断副标题字号是否来自当前面板公开选项 */
const isSubtitleFontSize = (value: string): value is WebFontSizePreset =>
  subtitleFontSizes.some(size => size === value);

/** 判断文本对齐是否来自当前面板公开选项 */
const isTextAlign = (value: string): value is (typeof textAlignValues)[number] =>
  textAlignValues.some(align => align === value);

/** 将面板状态映射为可选 Graph status */
const isGraphStatus = (value: string): value is GraphStatus => graphStatusValues.some(status => status === value);

const statusOf = (value: string): GraphStatus | undefined => {
  if (value === 'none') return undefined;
  if (isGraphStatus(value)) return value;
  throw new Error(`Unsupported Flow status: ${value}`);
};

/** 只在已选择状态时传入 Flow Source 字段 */
const statusProps = (value: string): Readonly<{ status?: GraphStatus }> => {
  const status = statusOf(value);
  return status === undefined ? {} : { status };
};

/** 将面板文本组装为有效的多行 Flow Entity TextBlock */
const formTextOf = (values: PreviewControlValuesFor<typeof flowBasicControls>, lang: Lang): IRTextBlock => {
  const mainLines = values.formText.split('\n');
  const hasMainText = mainLines.some(line => line.trim().length > 0);
  const subtitle = values.formSubtitle.trim();
  const text: Array<IRLine> = hasMainText ? mainLines : subtitle.length > 0 ? [] : [flowBasicI18n[lang].fallback];

  if (subtitle.length > 0) {
    if (!isSubtitleFontSize(values.formSubtitleSize)) {
      throw new Error(`Unsupported Flow subtitle font size: ${values.formSubtitleSize}`);
    }
    text.push({ text: subtitle, fill: values.formSubtitleColor, font: { size: values.formSubtitleSize } });
  }

  return text;
};

/** 用指定 controls 值渲染中文表单填写流程 */
export const renderFlowBasicPreview = (
  values: PreviewControlValuesFor<typeof flowBasicControls>,
  lang: Lang,
): ReactElement => (
  <FlowDiagram>
    <FlowEntities
      items={[
        { id: 'user-input', text: flowBasicI18n[lang].user, role: 'participant' },
        {
          id: 'frontend-form',
          text: formTextOf(values, lang),
          role: values.formRole,
          ...statusProps(values.formStatus),
          layout: {
            align: isTextAlign(values.formTextAlign) ? values.formTextAlign : undefined,
            lineHeight: values.formLineHeight,
            maxTextWidth: values.formMaxTextWidth,
          },
        },
        { id: 'backend-validation', text: flowBasicI18n[lang].backend, role: 'activity' },
        { id: 'database-input', text: flowBasicI18n[lang].database, role: 'resource' },
      ]}
    />
    <FlowRelations
      items={[
        {
          source: 'user-input',
          target: 'frontend-form',
          role: values.relationRole,
          ...statusProps(values.relationStatus),
        },
        {
          source: 'frontend-form',
          target: 'backend-validation',
          role: values.relationRole,
          ...statusProps(values.relationStatus),
        },
        {
          source: 'backend-validation',
          target: 'database-input',
          role: values.relationRole,
          ...statusProps(values.relationStatus),
        },
      ]}
    />
  </FlowDiagram>
);

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowBasicPreview(values, lang));

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;

/** Flow 示例语言 */
export type FlowPreviewProps = Readonly<{ lang?: Lang }>;
/** 当前语言的 Flow 交互示例 */
const Demo: FC<FlowPreviewProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default Demo;
