import { FlowEntity, FlowRelation } from '@retikz/diagram-react/flow';
import type { FC, ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';
import { defineControlledPreview } from '@/modules/docs/preview';

import { flowThemeControls, createPreviewControlContract } from './flow-theme.controls';
import { flowThemeI18n } from './flow-theme.i18n';

/** 注册 controls 自动发现的回退导出 */
export const previewControls = flowThemeControls;

/** 用指定 controls 值渲染中文 Flow 全局配置 */
export const renderFlowThemePreview = (
  values: PreviewControlValuesFor<typeof flowThemeControls>,
  lang: Lang,
): ReactElement => (
  <FlowDiagram
    viewBox={{ x: -71, y: -82.5, width: 420, height: 240 }}
    flowDefaults={{
      entity: {
        style: {
          color: values.entityColor,
          fillOpacity: values.entityFillOpacity,
          strokeWidth: values.entityStrokeWidth,
        },
      },
      relation: {
        style: {
          stroke: values.relationStroke,
          strokeWidth: values.relationStrokeWidth,
          strokeOpacity: values.relationStrokeOpacity,
        },
      },
    }}
  >
    <FlowEntity id="draft" text={flowThemeI18n[lang].draft} role="state" />
    <FlowEntity id="review" text={flowThemeI18n[lang].review} role="activity" />
    <FlowEntity id="publish" text={flowThemeI18n[lang].publish} role="event" />
    <FlowRelation source="draft" target="review" />
    <FlowRelation source="review" target="publish" />
  </FlowDiagram>
);

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowThemePreview(values, lang));

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
