import { Layout } from '@retikz/react';
import { List } from '@retikz/standard-react/container';

/** 图形参数 */
export type ListLabelsPreviewValues = {
  text: string;
  positionMode: 'direction' | 'boundary';
  boundary: 'top' | 'right' | 'bottom' | 'left';
  fraction: number;
  direction: 'top' | 'right' | 'bottom' | 'left';
  align: 'start' | 'middle' | 'end';
  distance: number;
  rotate: number;
  fontSize: number;
  color: string;
  pin: boolean;
};

/** 绘制示例图形 */
export const renderListLabelsPreview = (values: ListLabelsPreviewValues) => (
  <Layout viewBox={{ x: -120, y: -120, width: 440, height: 280 }}>
    <List
      items={['A', 'B', 'C']}
      layout={{ width: 56, height: 40, gap: 6 }}
      label={{
        text: values.text,
        position:
          values.positionMode === 'boundary'
            ? { boundary: values.boundary, fraction: values.fraction }
            : values.direction,
        align: values.align,
        distance: values.distance,
        rotate: values.rotate,
        font: { size: values.fontSize },
        textColor: values.color,
        pin: values.pin ? { stroke: values.color, strokeWidth: 1 } : false,
      }}
    />
  </Layout>
);
