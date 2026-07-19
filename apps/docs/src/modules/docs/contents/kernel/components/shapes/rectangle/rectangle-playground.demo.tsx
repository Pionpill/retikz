import type { FC } from 'react';

import { Draw, Layout, Rectangle } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { rectanglePlaygroundControls } from './rectangle-playground.controls';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** Rectangle 尺寸与圆角 playground */
const Demo: FC = () => {
  const values = usePreviewControls(rectanglePlaygroundControls);
  const halfWidth = values.width / 2;
  const halfHeight = values.height / 2;

  return (
    <Layout width={420} height={250} viewBox={{ x: -135, y: -95, width: 270, height: 190 }}>
      <Draw
        way={[
          [0, -86],
          [0, 86],
        ]}
        stroke="lightgray"
        dashPattern={[3, 3]}
      />
      <Draw
        way={[
          [-126, 0],
          [126, 0],
        ]}
        stroke="lightgray"
        dashPattern={[3, 3]}
      />
      <Draw
        way={[
          [-halfWidth, halfHeight + 16],
          [halfWidth, halfHeight + 16],
        ]}
        stroke="gray"
      />
      <Draw
        way={[
          [halfWidth + 16, -halfHeight],
          [halfWidth + 16, halfHeight],
        ]}
        stroke="gray"
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
};

export default Demo;
