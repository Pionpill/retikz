import type { IRDataTransformDeclaration } from '@retikz/data';
import { IntervalMark, PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { referenceRows } from './reference-data.data';

/** 聚合图元的交互参数 */
export type ReferenceDataValues = {
  coordinate: 'cartesian' | 'polar2D';
  grouped: boolean;
  statistic: 'mean' | 'median';
  fullX: boolean;
  fullY?: boolean;
};

/** 分组时按稳定顺序选择聚合行，使常量样式与分组颜色对应 */
const selectReferenceGroup = (
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
const ReferenceDataPlot: FC<{
  children: ReactNode;
  coordinate: ReferenceDataValues['coordinate'];
  grouped?: boolean;
}> = props => {
  const { children, coordinate, grouped = false } = props;
  return (
    <Layout viewBox={{ x: -45, y: -30, width: 400, height: 310 }}>
      <Plot
        data={referenceRows}
        width={320}
        height={240}
        coordinate={coordinate === 'cartesian' ? undefined : coordinate}
      >
        <PlotScale dimension="x" type="linear" domain={[0, 10]} domainPadding={0} />
        <PlotScale dimension="y" type="linear" domain={[0, 10]} domainPadding={0} />
        {children}
        <PointMark
          encodings={{ ...(grouped ? { fill: 'group' } : {}), position: { x: { field: 'x' }, y: { field: 'y' } } }}
          properties={{ fill: grouped ? undefined : 'gray', stroke: 'none', size: 4 }}
        />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" />
      </Plot>
    </Layout>
  );
};

/** 将每个聚合结果的两轴统计量绑定为参考点 */
export const ReferenceDataPointPreview: FC<ReferenceDataValues> = props => {
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
    <ReferenceDataPlot coordinate={coordinate} grouped={grouped}>
      {colors.map((color, index) => (
        <PointMark
          contributeToDomain={false}
          key={color}
          transforms={selectReferenceGroup(transform, grouped, index)}
          defaultColorIndex={index}
          encodings={{ position: { x: { field: 'centerX' }, y: { field: 'centerY' } } }}
          properties={{ size: 9, fill: grouped ? undefined : color, stroke: 'none' }}
        />
      ))}
    </ReferenceDataPlot>
  );
};
/** 每组统计量生成一条路径，端点可切换字段极值或视图边界 */
export const ReferenceDataPathPreview: FC<ReferenceDataValues> = props => {
  const { coordinate, grouped, statistic, fullX } = props;
  const groups = grouped ? [0, 1] : [0];
  return (
    <ReferenceDataPlot coordinate={coordinate} grouped={grouped}>
      {groups.map(index => (
        <PathMark
          contributeToDomain={false}
          key={index}
          transforms={selectReferenceGroup(
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
          defaultColorIndex={index}
          encodings={{
            from: { x: fullX ? { edge: 'start' } : { field: 'xMin' }, y: { field: 'reference' } },
            to: { x: fullX ? { edge: 'end' } : { field: 'xMax' }, y: { field: 'reference' } },
          }}
          properties={{
            stroke: grouped ? undefined : 'dodgerblue',
            strokeWidth: 3,
          }}
        />
      ))}
    </ReferenceDataPlot>
  );
};

/** 聚合各轴极值，生成包含观测范围的区域 */
export const ReferenceDataIntervalPreview: FC<ReferenceDataValues> = props => {
  const { coordinate, grouped, fullX, fullY = false } = props;
  const fullView = fullX && fullY;
  const groups = grouped && !fullView ? [0, 1] : [0];
  return (
    <ReferenceDataPlot coordinate={coordinate} grouped={grouped}>
      {groups.map(index => (
        <IntervalMark
          contributeToDomain={false}
          key={index}
          transforms={
            fullView
              ? undefined
              : selectReferenceGroup(
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
                )
          }
          defaultColorIndex={index}
          encodings={{
            bounds: {
              x: {
                from: fullX ? { edge: 'start' } : { field: 'xMin' },
                to: fullX ? { edge: 'end' } : { field: 'xMax' },
              },
              y: {
                from: fullY ? { edge: 'start' } : { field: 'yMin' },
                to: fullY ? { edge: 'end' } : { field: 'yMax' },
              },
            },
          }}
          properties={{
            fill: grouped ? undefined : 'dodgerblue',
            opacity: { overall: 0.2 },
            stroke: 'none',
            bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } },
          }}
        />
      ))}
    </ReferenceDataPlot>
  );
};
