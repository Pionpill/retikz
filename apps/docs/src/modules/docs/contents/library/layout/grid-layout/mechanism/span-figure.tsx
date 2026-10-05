import { Layout, Node } from '@retikz/react';
import { Rectangle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { figureI18n } from './span-figure.i18n';

/** 图示语言 */
export type FigureProps = { lang?: Lang };
/** 用固定几何参照展示本节的独立事实 */
const Figure: FC<FigureProps> = props => {
  const { lang = 'zh' } = props;
  const text = figureI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Rectangle corner1={[0, 30]} width={100} height={60} style={{ stroke: 'dodgerblue', fill: 'none' }} />
      <Rectangle corner1={[112, 30]} width={140} height={60} style={{ stroke: 'darkorange', fill: 'none' }} />
      <Rectangle corner1={[0, 125]} width={252} height={42} style={{ stroke: 'seagreen', fill: 'none' }} />
      <Node position={[50, 12]} text={text[0]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[106, 108]} text={text[1]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[182, 12]} text={text[2]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[126, 188]} text={text[3]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[126, 220]} text={text[4]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
    </Layout>
  );
};
export default Figure;
