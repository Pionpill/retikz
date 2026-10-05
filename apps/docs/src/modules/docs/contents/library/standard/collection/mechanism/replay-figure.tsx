import { Layout, Node } from '@retikz/react';
import { Array, ArrayItem } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { replayFigureI18n } from './replay-figure.i18n';

/** 内容回放图属性 */
export type ReplayFigureProps = { lang?: Lang };

/** 同一内容保持尺寸，以格子边框对照 visible 与 clip */
const ReplayFigure: FC<ReplayFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = replayFigureI18n[lang];
  const content = (
    <Node
      position={[25, 10]}
      text="Bbbb"
      shape="rectangle"
      layout={{ minimumSize: { width: 80, height: 36 }, padding: 0, margin: 0 }}
      style={{ fill: 'darkorange', fillOpacity: 0.4, stroke: 'none', font: { size: 14 } }}
    />
  );
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[
        { x: 0, width: 120, overflow: 'visible' as const, text: t.roomy },
        { x: 240, width: 60, overflow: 'visible' as const, text: t.visible },
        { x: 440, width: 60, overflow: 'clip' as const, text: t.clip },
      ].map(item => (
        <Array
          key={item.x}
          transforms={[{ kind: 'translate', x: item.x, y: 0 }]}
          layout={{ width: item.width, height: 60, padding: 8, overflow: item.overflow }}
          style={{ stroke: 'gray' }}
          label={{ text: item.text, position: 'top', font: { size: 12 }, opacity: 0.8 }}
        >
          <ArrayItem>{content}</ArrayItem>
        </Array>
      ))}
      <Node position={[260, 110]} text={t.unchanged} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }} />
    </Layout>
  );
};

export default ReplayFigure;
