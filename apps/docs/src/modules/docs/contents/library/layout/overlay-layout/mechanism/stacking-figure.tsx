import { Layout, Node } from '@retikz/react';
import { Rectangle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { figureI18n } from './stacking-figure.i18n';

/** 图示语言 */
export type FigureProps = { lang?: Lang };

/** 用固定几何参照展示本节的独立事实 */
const Figure: FC<FigureProps> = props => {
  const { lang = 'zh' } = props;
  const text = figureI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Rectangle corner1={[0, 90]} width={160} height={65} style={{ stroke: 'dodgerblue', fill: 'dodgerblue' }} />
      <Rectangle corner1={[80, 112]} width={160} height={65} style={{ stroke: 'darkorange', fill: 'darkorange' }} />
      <Rectangle corner1={[160, 134]} width={160} height={65} style={{ stroke: 'seagreen', fill: 'seagreen' }} />
      <Node position={[160, 10]} text={text[0]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[160, 42]} text={text[1]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[160, 228]} text={text[2]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[160, 260]} text={text[3]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[160, 290]} text={text[4]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} />
      <Node position={[50, 110]} text="Second" style={{ stroke: 'none', fill: 'none', textColor: 'black' }} />
      <Node position={[135, 142]} text="First" style={{ stroke: 'none', fill: 'none', textColor: 'black' }} />
      <Node position={[240, 177]} text="Third" style={{ stroke: 'none', fill: 'none', textColor: 'black' }} />
    </Layout>
  );
};
export default Figure;
