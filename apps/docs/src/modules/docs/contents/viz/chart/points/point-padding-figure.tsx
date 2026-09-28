import { Layout, Node } from '@retikz/react';
import { Fragment } from 'react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pointPaddingFigureI18n } from './point-padding-figure.i18n';

/** 点图自动留白示意图的语言参数 */
export type PointPaddingFigureProps = { lang?: Lang };

/** 在线性坐标中对比零留白与一个点半径的范围留白 */
const PointPaddingFigure: FC<PointPaddingFigureProps> = props => {
  const { lang = 'zh' } = props;
  const text = pointPaddingFigureI18n[lang];
  const radius = 16;
  const samples = [
    [0, 0],
    [0.3, 0.65],
    [0.65, 0.35],
    [1, 1],
  ];
  const labelStyle = { fill: 'none', stroke: 'none', font: { size: 14 } };
  return (
    <Layout viewBox={{ x: 0, y: 0, width: 720, height: 290 }} style={{ maxWidth: '100%', height: 'auto' }}>
      {[false, true].map((automatic, index) => {
        const left = 50 + index * 360;
        const inset = automatic ? radius : 0;
        return (
          <Fragment key={index}>
            <Node key={`title-${index}`} position={[left + 120, 25]} style={labelStyle}>
              {automatic ? text.automatic : text.zero}
            </Node>
            <Node
              key={`frame-${index}`}
              position={[left + 120, 130]}
              shape="rectangle"
              layout={{ minimumSize: { width: 240, height: 120 }, padding: 0 }}
              style={{ fill: 'none', stroke: 'gray' }}
            />
            {samples.map(([x, y], point) => (
              <Node
                key={`point-${index}-${point}`}
                position={[left + inset + x * (240 - 2 * inset), 70 + inset + y * (120 - 2 * inset)]}
                shape="circle"
                layout={{ minimumSize: radius * 2, padding: 0 }}
                style={{ fill: 'dodgerblue', fillOpacity: 0.25, stroke: 'dodgerblue' }}
              />
            ))}
            <Node
              key={`label-${index}`}
              position={[left + 120, 232]}
              style={{ ...labelStyle, font: { size: 12 }, textColor: 'gray' }}
            >
              {automatic ? text.inside : text.outside}
            </Node>
          </Fragment>
        );
      })}
      <Node position={[360, 270]} style={{ ...labelStyle, font: { size: 12 }, textColor: 'gray' }}>
        {text.note}
      </Node>
    </Layout>
  );
};

export default PointPaddingFigure;
