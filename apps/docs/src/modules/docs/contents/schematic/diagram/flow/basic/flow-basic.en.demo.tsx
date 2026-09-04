import type { FontSizePresetValue, IRLine, IRTextBlock } from '@retikz/core';
import type { GraphStatusValue } from '@retikz/graph';
import type { ReactElement } from 'react';

import { FlowEntity, FlowRelation } from '@retikz/diagram-react/flow';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { flowBasicControls, previewControlContract } from './flow-basic.en.controls';

/** Fallback export for controls auto-discovery */
export const previewControls = flowBasicControls;

const subtitleFontSizes = ['xs', 'sm', 'base', 'lg'] as const;
const textAlignValues = ['start', 'middle', 'end'] as const;
const graphStatusValues: ReadonlyArray<GraphStatusValue> = ['error', 'success', 'warning', 'disabled'];

/** Check whether the subtitle size comes from the current panel options */
const isSubtitleFontSize = (value: string): value is FontSizePresetValue =>
  subtitleFontSizes.some(size => size === value);

/** Check whether the text alignment comes from the current panel options */
const isTextAlign = (value: string): value is (typeof textAlignValues)[number] =>
  textAlignValues.some(align => align === value);

/** Map a panel value to an optional Graph status */
const isGraphStatus = (value: string): value is GraphStatusValue => graphStatusValues.some(status => status === value);

const statusOf = (value: string): GraphStatusValue | undefined => {
  if (value === 'none') return undefined;
  if (isGraphStatus(value)) return value;
  throw new Error(`Unsupported Flow status: ${value}`);
};

/** Pass a Flow Source status only when the panel selects one */
const statusProps = (value: string): Readonly<{ status?: GraphStatusValue }> => {
  const status = statusOf(value);
  return status === undefined ? {} : { status };
};

/** Assemble panel text into a valid multiline Flow Entity TextBlock */
const formTextOf = (values: PreviewControlValuesFor<typeof flowBasicControls>): IRTextBlock => {
  const mainLines = values.formText.split('\n');
  const hasMainText = mainLines.some(line => line.trim().length > 0);
  const subtitle = values.formSubtitle.trim();
  const text: Array<IRLine> = hasMainText ? mainLines : subtitle.length > 0 ? [] : ['Frontend form'];

  if (subtitle.length > 0) {
    if (!isSubtitleFontSize(values.formSubtitleSize)) {
      throw new Error(`Unsupported Flow subtitle font size: ${values.formSubtitleSize}`);
    }
    text.push({ text: subtitle, fill: values.formSubtitleColor, font: { size: values.formSubtitleSize } });
  }

  return text;
};

/** Render the English form submission flow with explicit controls values */
export const renderFlowBasicPreview = (values: PreviewControlValuesFor<typeof flowBasicControls>): ReactElement => (
  <FlowDiagram
    width={600}
    height={220}
    viewBox={{ x: 0, y: -58, width: 600, height: 220 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <FlowEntity id="user-input" text="User input" role="participant" />
    <FlowEntity
      id="frontend-form"
      text={formTextOf(values)}
      role={values.formRole}
      {...statusProps(values.formStatus)}
      style={{
        align: isTextAlign(values.formTextAlign) ? values.formTextAlign : undefined,
        lineHeight: values.formLineHeight,
        maxTextWidth: values.formMaxTextWidth,
      }}
    />
    <FlowEntity id="backend-validation" text="Backend service" role="activity" />
    <FlowEntity id="database-input" text="Database input" role="resource" />
    <FlowRelation
      source="user-input"
      target="frontend-form"
      role={values.relationRole}
      {...statusProps(values.relationStatus)}
    />
    <FlowRelation
      source="frontend-form"
      target="backend-validation"
      role={values.relationRole}
      {...statusProps(values.relationStatus)}
    />
    <FlowRelation
      source="backend-validation"
      target="database-input"
      role={values.relationRole}
      {...statusProps(values.relationStatus)}
    />
  </FlowDiagram>
);

const controlledPreview = defineControlledPreview(previewControlContract, renderFlowBasicPreview);

export const previewSource = controlledPreview.source;
export default controlledPreview.Component;
