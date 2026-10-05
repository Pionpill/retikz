import { Layout, Node } from '@retikz/react';
import { Rectangle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { figureI18n } from './occurrence-figure.i18n';

/** 图示语言参数 */
export type OccurrenceFigureProps = { lang?: Lang };

/** 展示嵌套容器的几何包含关系与独立局部 key 空间，编号仅为读图标记 */
const OccurrenceFigure: FC<OccurrenceFigureProps> = props => {
  const { lang = 'zh' } = props;
  const text = figureI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Rectangle corner1={[0, 0]} width={480} height={180} style={{ stroke: 'gray' }} />
      <Node position={[240, 24]} text={text.outer} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Rectangle corner1={[20, 52]} width={210} height={108} style={{ stroke: 'dodgerblue' }} />
      <Rectangle corner1={[250, 52]} width={210} height={108} style={{ stroke: 'darkorange' }} />
      <Node position={[125, 76]} text={text.left} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[355, 76]} text={text.right} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[125, 122]} text={text.child} cornerRadius={4} style={{ font: { size: 14 } }} />
      <Node position={[355, 122]} text={text.child} cornerRadius={4} style={{ font: { size: 14 } }} />
      <Node
        position={[240, 210]}
        text={text.note}
        style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}
      />
    </Layout>
  );
};
export default OccurrenceFigure;
