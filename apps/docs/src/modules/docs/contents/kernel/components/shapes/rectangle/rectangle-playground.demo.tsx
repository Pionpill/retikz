import type { FC } from 'react';

import { Draw, Layout, Rectangle } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract,rectanglePlaygroundControls } from './rectangle-playground.controls';

export const previewControls = rectanglePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const halfWidth = values.width / 2;
  const halfHeight = values.height / 2;

  return (
    <Layout width={400} height={250} viewBox={{ x: -135, y: -95, width: 270, height: 190 }}>
      <Draw
        way={[
          [0, -86],
          [0, 86],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[
          [-126, 0],
          [126, 0],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[
          [-halfWidth, halfHeight + 16],
          [halfWidth, halfHeight + 16],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[
          [halfWidth + 16, -halfHeight],
          [halfWidth + 16, halfHeight],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Rectangle
        center={[0, 0]}
        width={values.width}
        height={values.height}
        cornerRadius={values.cornerRadius}
        fill={values.fill}
        stroke={values.stroke}
        strokeWidth={values.strokeWidth}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Rectangle 尺寸与圆角 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
