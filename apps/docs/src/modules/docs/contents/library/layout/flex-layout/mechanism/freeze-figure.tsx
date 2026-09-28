import { Layout, Node } from '@retikz/react';
import { Rectangle } from '@retikz/standard-react/shape';
import { Fragment } from 'react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { figureI18n } from './freeze-figure.i18n';
/** 图示语言参数 */
export type FreezeFigureProps = { lang?: Lang };
/** 使用相同尺度展示边界钳制后再次分配的具体状态 */
const FreezeFigure: FC<FreezeFigureProps> = props => {
  const { lang = 'zh' } = props;
  const text = figureI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[
        [40, 40],
        [67, 100],
        [88, 100],
      ].map(([first, second], index) => {
        const y = index * 100;
        return (
          <Fragment key={index}>
            <Node
              position={[100, y - 26]}
              text={text.rows[index]}
              style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}
            />
            <Rectangle corner1={[0, y]} width={first} height={24} style={{ stroke: 'dodgerblue' }} />
            <Rectangle corner1={[first + 12, y]} width={second} height={24} style={{ stroke: 'darkorange' }} />
            <Node
              position={[first / 2, y + 12]}
              text={String(first)}
              style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}
            />
            <Node
              position={[first + 12 + second / 2, y + 12]}
              text={String(second)}
              style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}
            />
            <Rectangle
              corner1={[0, y - 4]}
              width={200}
              height={32}
              style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
            />
            <Node
              position={[370, y + 12]}
              text={text.notes[index]}
              style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}
            />
          </Fragment>
        );
      })}
      <Node
        position={[240, 256]}
        text={text.reference}
        style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}
      />
    </Layout>
  );
};
export default FreezeFigure;
