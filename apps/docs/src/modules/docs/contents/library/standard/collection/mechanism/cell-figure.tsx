import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { cellFigureI18n } from './cell-figure.i18n';

/** 图示属性 */
export type CellFigureProps = { lang?: Lang };

/** 展示当前小节的集合处理机制 */
const CellFigure: FC<CellFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = cellFigureI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        label={{ text: t.cell, position: 'top', font: { size: 12 }, opacity: 0.8 }}
        entries={[
          { key: 'content', value: t.content },
          { key: 'style', value: t.style },
          { key: 'layout', value: t.layout },
          { key: 'id', value: t.id },
        ]}
        style={{ font: { size: 14 } }}
      />
      <Map
        transforms={[{ kind: 'translate', x: 310, y: 0 }]}
        label={{ text: t.priority, position: 'top', font: { size: 12 }, opacity: 0.8 }}
        entries={[
          { key: t.local, value: 'padding: 4' },
          { key: t.role, value: 'padding: 6' },
          { key: t.overall, value: 'padding: 10' },
          { key: t.fallback, value: 'padding: 8' },
        ]}
        style={{ font: { size: 14 } }}
      />
    </Layout>
  );
};

export default CellFigure;
