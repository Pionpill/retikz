import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';
import { previewControlContract } from './chart-presentation-layout.en.controls';
import { ChartPresentationLayoutPreview } from './chart-presentation-preview';

const copy = {
  title: 'Change across five observations',
  subtitle: 'Example scope · Common unit',
  note: 'Note: points only illustrate chart-wide layout',
  source: 'Source: example data',
  xAxis: 'Variable x',
  yAxis: 'Variable y',
};

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ChartPresentationLayoutPreview copy={copy} inspect={values[CHART_PRESENTATION_CONTROL_IDS.inspect] === true} />
));
const canonicalPreview = defineControlledPreview(previewControlContract, () => (
  <ChartPresentationLayoutPreview copy={copy} inspect={false} />
));

export const previewSource = canonicalPreview.source;
export const previewControls = previewControlContract.controls;

/** 展示 Chart presentation 真实 Flex 布局的英文 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
