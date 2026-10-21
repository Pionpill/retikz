import { IntervalAnnotation, PathAnnotation, Plot, PlotAxis, PlotScale, PointAnnotation } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { annotationX, annotationXScale } from './annotation-coordinate';
import type { AnnotationCoordinate } from './annotation-coordinate';

/** 独立标注试验场参数 */
export type AnnotationPreviewProps = {
  coordinate: AnnotationCoordinate;
  /** 参考位置 */
  threshold: number;
};

/** 空数组仍是显式根数据绑定，三种标注各产生一个实例 */
export const AnnotationPreview: FC<AnnotationPreviewProps> = props => {
  const { threshold, coordinate } = props;
  return (
    <Layout viewBox={{ x: -32, y: -24, width: 384, height: 268 }}>
      <Plot data={[]} width={320} height={220} coordinate={coordinate === 'cartesian' ? undefined : 'polar2D'}>
        <PlotScale dimension="x" {...annotationXScale(coordinate)} />
        <PlotScale dimension="y" type="linear" domain={[0, 100]} domainPadding={0} />
        <IntervalAnnotation
          properties={{
            fill: '#dbeafe',
            bounds: {
              x: { from: annotationX(coordinate, 20, 'B'), to: annotationX(coordinate, 40, 'C') },
              y: { from: { edge: 'start' }, to: { edge: 'end' } },
            },
          }}
        />
        <PathAnnotation
          properties={{
            from: { x: { edge: 'start' }, y: threshold },
            to: { x: { edge: 'end' }, y: threshold },
            stroke: '#dc2626',
            dashPattern: [4, 3],
          }}
        />
        <PointAnnotation
          properties={{ text: '80', textColor: 'darkorange', position: { x: annotationX(coordinate, 80, 'E'), y: 80 } }}
        />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" />
      </Plot>
    </Layout>
  );
};
