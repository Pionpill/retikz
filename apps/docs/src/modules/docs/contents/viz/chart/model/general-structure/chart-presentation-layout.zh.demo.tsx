import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './chart-presentation-layout.controls';
import { ChartPresentationLayoutPreview } from './chart-presentation-preview';
import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';

const copy = {
  title: '五个观测值的变化',
  subtitle: '示例范围 · 统一单位',
  note: '注：点位只用于说明整图布局',
  source: '来源：示例数据',
};

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) => (
  <ChartPresentationLayoutPreview
    copy={copy}
    inspect={values[CHART_PRESENTATION_CONTROL_IDS.inspect] === true}
    visibility={{
      title: values[CHART_PRESENTATION_CONTROL_IDS.showTitle] === true,
      subtitle: values[CHART_PRESENTATION_CONTROL_IDS.showSubtitle] === true,
      note: values[CHART_PRESENTATION_CONTROL_IDS.showNote] === true,
      source: values[CHART_PRESENTATION_CONTROL_IDS.showSource] === true,
    }}
    dimensions={dimensions}
  />
));

const canonicalPreview = defineControlledPreview(previewControlContract, () => (
  <ChartPresentationLayoutPreview copy={copy} inspect={false} />
));

export const previewSource = canonicalPreview.source;

export const previewControls = previewControlContract.controls;

/** 展示 Chart presentation 真实 Flex 布局的中文 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
