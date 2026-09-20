import { Draw, Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';
import { Fragment } from 'react';

import type { Lang } from '@/i18n';

import { arrowContactI18n } from './arrow-contact.i18n';
/** 箭头接合图的语言 */
export type ArrowContactProps = Readonly<{ lang?: Lang }>;
/** 对照轮廓后缘、描边接合点与尖端，展示后缘对齐端点的平移 */
const ArrowContact: FC<ArrowContactProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = arrowContactI18n[lang];
  return (
    <Layout>
      <Draw
        way={[
          [150, -45],
          [150, 175],
        ]}
        style={{ stroke: 'gray', dashPattern: [2, 4] }}
      />
      <Node position={[150, -65]} style={{ stroke: 'none', font: { size: 12 } }}>
        {i18n.endpoint}
      </Node>
      {[0, 1].map(overlap => {
        const y = overlap * 120;
        const back = 90 + overlap * 60;
        return (
          <Fragment key={overlap}>
            <Draw
              way={[
                [0, y],
                [back + 15, y],
              ]}
              style={{ stroke: 'dodgerblue', strokeWidth: 3 }}
            />
            <Path style={{ fill: 'dodgerblue', stroke: 'none' }}>
              <Step kind="move" to={[back, y - 20]} />
              <Step kind="line" to={[back + 60, y]} />
              <Step kind="line" to={[back, y + 20]} />
              <Step kind="line" to={[back + 15, y]} />
              <Step kind="cycle" />
            </Path>
            <Node position={[-55, y]} style={{ stroke: 'none', font: { size: 12 } }}>
              {overlap ? i18n.shifted : i18n.initial}
            </Node>
            <Node position={[back - 10, y - 35]} style={{ stroke: 'none', font: { size: 11 } }}>
              backX
            </Node>
            <Node position={[back + 15, y + 40]} style={{ stroke: 'none', font: { size: 11 } }}>
              lineContactX
            </Node>
            <Node position={[back + 75, y - 25]} style={{ stroke: 'none', font: { size: 11 } }}>
              tipX
            </Node>
          </Fragment>
        );
      })}
      <Node position={[90, 200]} style={{ stroke: 'none', font: { size: 11 } }}>
        {i18n.note}
      </Node>
    </Layout>
  );
};
export default ArrowContact;
