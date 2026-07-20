import type { EllipseProps } from '@retikz/react';
import type { FC } from 'react';

import { Draw, Ellipse, Layout, Rectangle } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { ellipsePlaygroundControls } from './ellipse-playground.controls';

export const previewControls = ellipsePlaygroundControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

type EllipsePlaygroundValues = PreviewControlValuesFor<typeof ellipsePlaygroundControls>;

/** 根据面板选择构造 Ellipse 的几何输入 */
const ellipsePropsOf = (values: EllipsePlaygroundValues): EllipseProps => {
  const adjustment =
    values.adjustment === 'inset'
      ? { inset: values.adjustmentAmount }
      : values.adjustment === 'outset'
        ? { outset: values.adjustmentAmount }
        : {};
  const segment = values.segment
    ? { startAngle: values.startAngle, endAngle: values.endAngle, closed: values.closed }
    : {};

  switch (values.construction) {
    case 'radius':
      return { center: [0, 0], radius: { x: values.radiusX, y: values.radiusY }, ...segment };
    case 'diameter':
      return {
        center: [0, 0],
        diameterX: values.radiusX * 2,
        diameterY: values.radiusY * 2,
        ...segment,
      };
    case 'corners':
      return {
        corner1: [-values.boxWidth / 2, -values.boxHeight / 2],
        corner2: [values.boxWidth / 2, values.boxHeight / 2],
        ...adjustment,
        ...segment,
      };
    case 'box':
      return {
        box: {
          x: -values.boxWidth / 2,
          y: -values.boxHeight / 2,
          width: values.boxWidth,
          height: values.boxHeight,
        },
        ...adjustment,
        ...segment,
      };
  }
};

/** 读取当前构造输入的参考框尺寸 */
const inputBoxOf = (values: EllipsePlaygroundValues): { width: number; height: number } =>
  values.construction === 'radius' || values.construction === 'diameter'
    ? { width: values.radiusX * 2, height: values.radiusY * 2 }
    : { width: values.boxWidth, height: values.boxHeight };

/** Ellipse 构造与局部弧段 playground */
const Demo: FC = () => {
  const values = usePreviewControls(ellipsePlaygroundControls);
  const inputBox = inputBoxOf(values);

  return (
    <Layout width={400} height={260} viewBox={{ x: -130, y: -100, width: 260, height: 200 }}>
      <Draw
        way={[
          [0, -92],
          [0, 92],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[
          [-122, 0],
          [122, 0],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Rectangle
        center={[0, 0]}
        width={inputBox.width}
        height={inputBox.height}
        stroke="lightgray"
        strokeOpacity={0.5}
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Ellipse
        {...ellipsePropsOf(values)}
        fill={values.fill}
        fillOpacity={values.segment && values.closed === 'open' ? 0 : 0.45}
        stroke={values.stroke}
        strokeWidth={2.5}
      />
    </Layout>
  );
};

export default Demo;
