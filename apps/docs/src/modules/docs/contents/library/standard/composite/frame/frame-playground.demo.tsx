import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { framePlaygroundControls, previewControlContract } from './frame-playground.controls';

export const previewControls = framePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const borderLineStyle =
    values.borderLineStyle === 'dashed'
      ? { dashPattern: [6, 4] }
      : values.borderLineStyle === 'dotted'
        ? { dashPattern: [1, 4], lineCap: 'round' as const }
        : {};
  const borderStyle = {
    stroke: values.borderStroke,
    strokeWidth: values.strokeWidth,
    strokeOpacity: values.strokeOpacity,
    fill: 'dodgerblue',
    fillOpacity: values.fillOpacity,
    ...borderLineStyle,
  };

  return (
    <Layout
      width={420}
      height={260}
      viewBox={{ x: 0, y: 0, width: 420, height: 260 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Frame
        id="frame-playground"
        padding={{ x: values.paddingX, y: values.paddingY }}
        gap={values.gap}
        headerDirection={values.headerDirection}
        border={{ style: borderStyle, cornerRadius: values.borderCornerRadius }}
      >
        <FrameTitle
          padding={values.titlePadding}
          fill="dodgerblue"
          fillOpacity={values.titleFillOpacity}
          font={{ size: values.titleFontSize, weight: values.titleFontWeight }}
        >
          FrameTitle
        </FrameTitle>
        <FrameDescription font={{ size: values.descriptionFontSize }} opacity={values.descriptionOpacity}>
          FrameDescription
        </FrameDescription>
        <Node id="A" position={[130, 165]} text={values.nodeAText} />
        <Node id="B" position={[290, 165]} text={values.nodeBText} />
      </Frame>
      {values.connected ? <Draw way={['A', 'B']} stroke="gray" /> : null}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Frame 布局、边框与 header Node 字段 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
