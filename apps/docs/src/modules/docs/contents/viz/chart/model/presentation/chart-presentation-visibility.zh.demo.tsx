import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';
import { ChartPresentationVisibilityPreview } from './chart-presentation-preview';
import { previewControlContract } from './chart-presentation-visibility.controls';

const copy = {
  title: '五个观测值的变化',
  subtitle: '示例范围 · 统一单位',
  note: '注：开关只改变对应展示项',
  source: '来源：示例数据',
  xAxis: '变量 x',
  yAxis: '变量 y',
};

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ChartPresentationVisibilityPreview
    copy={copy}
    showTitle={values[CHART_PRESENTATION_CONTROL_IDS.showTitle] === true}
    showSubtitle={values[CHART_PRESENTATION_CONTROL_IDS.showSubtitle] === true}
    showNote={values[CHART_PRESENTATION_CONTROL_IDS.showNote] === true}
    showSource={values[CHART_PRESENTATION_CONTROL_IDS.showSource] === true}
  />
));

export const previewSource = controlledPreview.source;
export const previewControls = previewControlContract.controls;

/** 切换四个 shorthand 是否进入 canonical presentation */
const Demo: FC = controlledPreview.Component;

export default Demo;
