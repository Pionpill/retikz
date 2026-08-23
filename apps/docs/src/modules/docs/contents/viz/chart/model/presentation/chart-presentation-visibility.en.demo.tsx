import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';
import { ChartPresentationVisibilityPreview } from './chart-presentation-preview';
import { previewControlContract } from './chart-presentation-visibility.en.controls';

const copy = {
  title: 'Change across five observations',
  subtitle: 'Example scope · Common unit',
  note: 'Note: each switch only changes its matching item',
  source: 'Source: example data',
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
