import type { IRDataTransformDeclaration } from '@retikz/data';
import {
  IntervalAnnotation,
  PathAnnotation,
  Plot,
  PlotAxis,
  PlotScale,
  PointAnnotation,
  PointMark,
} from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { annotationRows } from './annotation-data.data';

/** 聚合标注的交互参数 */
export type AnnotationDataValues = {
  coordinate: 'cartesian' | 'polar2D';
  grouped: boolean;
  statistic: 'mean' | 'median';
  fullX: boolean;
};

/** 分组时按稳定顺序选择聚合行，使常量样式与分组颜色对应 */
const selectAnnotationGroup = (
  transform: Array<IRDataTransformDeclaration>,
  grouped: boolean,
  index: number,
): Array<IRDataTransformDeclaration> =>
  grouped
    ? [
        ...transform,
        {
          operation: {
            kind: 'select',
            params: {
              selector: { kind: 'nth', orderBy: [{ field: 'group', order: 'ascending' }], index },
            },
          },
        },
      ]
    : transform;

/** 三个示例共用的固定坐标与输入观测 */
const AnnotationDataPlot: FC<{
  children: ReactNode;
  coordinate: AnnotationDataValues['coordinate'];
  grouped?: boolean;
}> = props => {
  const { children, coordinate, grouped = false } = props;
  return (
    <Layout viewBox={{ x: -45, y: -30, width: 400, height: 310 }}>
      <Plot
        data={annotationRows}
        width={320}
        height={240}
        coordinate={coordinate === 'cartesian' ? undefined : coordinate}
      >
        <PlotScale dimension="x" type="linear" domain={[0, 10]} domainPadding={0} />
        <PlotScale dimension="y" type="linear" domain={[0, 10]} domainPadding={0} />
        {children}
        <PointMark x="x" y="y" fill={grouped ? { kind: 'field', value: 'group' } : 'gray'} stroke="none" size={4} />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" />
      </Plot>
    </Layout>
  );
};

/** 将每个聚合结果的两轴统计量绑定为参考点 */
export const AnnotationDataPointPreview: FC<AnnotationDataValues> = props => {
  const { coordinate, grouped, statistic } = props;
  const colors = grouped ? ['dodgerblue', 'darkorange'] : ['dodgerblue'];
  const transform: Array<IRDataTransformDeclaration> = [
    {
      operation: {
        kind: 'summarize',
        params: {
          groupBy: grouped ? ['group'] : [],
          metrics: [
            { kind: statistic, field: 'x', as: 'centerX' },
            { kind: statistic, field: 'y', as: 'centerY' },
          ],
        },
      },
    },
  ];
  return (
    <AnnotationDataPlot coordinate={coordinate} grouped={grouped}>
      {colors.map((color, index) => (
        <PointAnnotation
          key={color}
          transform={selectAnnotationGroup(transform, grouped, index)}
          x={{ field: 'centerX' }}
          y={{ field: 'centerY' }}
          size={9}
          fill={grouped ? undefined : color}
          defaultColorIndex={index}
          stroke="none"
        />
      ))}
    </AnnotationDataPlot>
  );
};
/** 每组统计量生成一条路径，端点可切换字段极值或视图边界 */
export const AnnotationDataPathPreview: FC<AnnotationDataValues> = props => {
  const { coordinate, grouped, statistic, fullX } = props;
  const groups = grouped ? [0, 1] : [0];
  return (
    <AnnotationDataPlot coordinate={coordinate} grouped={grouped}>
      {groups.map(index => (
        <PathAnnotation
          key={index}
          transform={selectAnnotationGroup(
            [
              {
                operation: {
                  kind: 'summarize',
                  params: {
                    groupBy: grouped ? ['group'] : [],
                    metrics: [
                      { kind: statistic, field: 'y', as: 'reference' },
                      { kind: 'min', field: 'x', as: 'xMin' },
                      { kind: 'max', field: 'x', as: 'xMax' },
                    ],
                  },
                },
              },
            ],
            grouped,
            index,
          )}
          from={{ x: fullX ? { edge: 'start' } : { field: 'xMin' }, y: { field: 'reference' } }}
          to={{ x: fullX ? { edge: 'end' } : { field: 'xMax' }, y: { field: 'reference' } }}
          stroke={grouped ? undefined : 'dodgerblue'}
          defaultColorIndex={index}
          strokeWidth={3}
        />
      ))}
    </AnnotationDataPlot>
  );
};

/** 聚合各轴极值，生成包含观测范围的区域 */
export const AnnotationDataIntervalPreview: FC<AnnotationDataValues> = props => {
  const { coordinate, grouped, fullX } = props;
  const groups = grouped ? [0, 1] : [0];
  return (
    <AnnotationDataPlot coordinate={coordinate} grouped={grouped}>
      {groups.map(index => (
        <IntervalAnnotation
          key={index}
          transform={selectAnnotationGroup(
            [
              {
                operation: {
                  kind: 'summarize',
                  params: {
                    groupBy: grouped ? ['group'] : [],
                    metrics: [
                      { kind: 'min', field: 'x', as: 'xMin' },
                      { kind: 'max', field: 'x', as: 'xMax' },
                      { kind: 'min', field: 'y', as: 'yMin' },
                      { kind: 'max', field: 'y', as: 'yMax' },
                    ],
                  },
                },
              },
            ],
            grouped,
            index,
          )}
          x={{ from: fullX ? { edge: 'start' } : { field: 'xMin' }, to: fullX ? { edge: 'end' } : { field: 'xMax' } }}
          y={{ from: { field: 'yMin' }, to: { field: 'yMax' } }}
          fill={grouped ? undefined : 'dodgerblue'}
          defaultColorIndex={index}
          opacity={0.2}
          stroke="none"
        />
      ))}
    </AnnotationDataPlot>
  );
};
