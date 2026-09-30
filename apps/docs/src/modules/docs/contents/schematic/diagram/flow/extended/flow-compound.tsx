import { FlowEntity, FlowGroup, FlowLayout, FlowRelation } from '@retikz/diagram-react/flow';
import type { FlowDirectionValue } from '@retikz/diagram/flow';
import type { FC, ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';
import { defineControlledPreview } from '@/modules/docs/preview';

import { flowCompoundControls, createPreviewControlContract } from './flow-compound.controls';
import { flowCompoundI18n } from './flow-compound.i18n';

/** 注册 controls 自动发现的回退导出 */
export const previewControls = flowCompoundControls;

const flowDirections: ReadonlyArray<FlowDirectionValue> = ['up', 'right', 'down', 'left'];

/** 将 controls 值收窄为公开 Flow direction */
const flowDirectionOf = (value: string): FlowDirectionValue => {
  const direction = flowDirections.find(candidate => candidate === value);
  if (direction === undefined) throw new Error(`Unsupported Flow direction: ${value}`);
  return direction;
};

/** 用指定 controls 值渲染中文 Flow 分组排布 */
export const renderFlowCompoundPreview = (
  values: PreviewControlValuesFor<typeof flowCompoundControls>,
  lang: Lang,
): ReactElement => (
  <FlowDiagram viewBox={{ x: -92, y: -120, width: 400, height: 460 }}>
    <FlowLayout kind="linear" id="sections" direction="down" gap={28} align="center">
      <FlowGroup
        id="service"
        caption={{ title: { text: flowCompoundI18n[lang].service } }}
        layout={{
          direction: flowDirectionOf(values.groupDirection),
          nodeGap: values.groupNodeGap,
          rankGap: values.groupRankGap,
        }}
      >
        <FlowEntity id="request" text={flowCompoundI18n[lang].request} role="gateway" />
        <FlowEntity id="validate" text={flowCompoundI18n[lang].validate} role="activity" />
        <FlowEntity id="authorize" text={flowCompoundI18n[lang].authorize} role="activity" />
      </FlowGroup>
      <FlowLayout kind="linear" id="storage" direction={flowDirectionOf(values.layoutDirection)} gap={values.layoutGap}>
        <FlowEntity id="queue" text={flowCompoundI18n[lang].queue} role="state" />
        <FlowEntity id="database" text={flowCompoundI18n[lang].database} role="resource" />
      </FlowLayout>
    </FlowLayout>
    <FlowRelation source="request" target="validate" />
    <FlowRelation source="request" target="authorize" />
    <FlowRelation source="service" target="queue" />
    <FlowRelation source="queue" target="database" />
  </FlowDiagram>
);

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowCompoundPreview(values, lang));

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
