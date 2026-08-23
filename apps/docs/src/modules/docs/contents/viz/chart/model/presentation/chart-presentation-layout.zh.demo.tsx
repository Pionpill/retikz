import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';
import { previewControlContract } from './chart-presentation-layout.controls';
import { ChartPresentationLayoutPreview } from './chart-presentation-preview';

const copy = {
  title: '五个观测值的变化',
  subtitle: '示例范围 · 统一单位',
  note: '注：点位只用于说明整图布局',
  source: '来源：示例数据',
};

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ChartPresentationLayoutPreview copy={copy} inspect={values[CHART_PRESENTATION_CONTROL_IDS.inspect] === true} />
));
const canonicalPreview = defineControlledPreview(previewControlContract, () => (
  <ChartPresentationLayoutPreview copy={copy} inspect={false} />
));

export const previewSource = canonicalPreview.source;
export const previewControls = previewControlContract.controls;

/** 展示 Chart presentation 真实 Flex 布局的中文 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
