import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './chart-presentation-layout.en.controls';
import { ChartPresentationLayoutPreview } from './chart-presentation-preview';
import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';

const copy = {
  title: 'Change across five observations',
  subtitle: 'Example scope · Common unit',
  note: 'Note: points only illustrate chart-wide layout',
  source: 'Source: example data',
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

/** 展示 Chart presentation 真实 Flex 布局的英文 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
