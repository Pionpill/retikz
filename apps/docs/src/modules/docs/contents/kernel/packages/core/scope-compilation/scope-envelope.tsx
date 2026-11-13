import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scopeEnvelopeI18n } from './scope-envelope.i18n';

/** 示意图语言 */
export type ScopeEnvelopeProps = { lang?: Lang };

/** 用同一对象对照本节的几何与状态变化 */
const ScopeEnvelope: FC<ScopeEnvelopeProps> = props => {
  const { lang = 'zh' } = props;
  const text = scopeEnvelopeI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} position={[i * 310, 0]}>
          <Node position={[90, -140]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Node
            position={[90, 0]}
            shape={i === 0 ? 'rectangle' : 'circle'}
            layout={{
              minimumSize: { width: i === 0 ? 240 : 2 * Math.sqrt(14800), height: i === 0 ? 40 : 2 * Math.sqrt(14800) },
              padding: 0,
            }}
            style={{ fill: 'none', stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          {[0, 180].map((x, index) => (
            <Node
              key={x}
              position={[x, 0]}
              shape="rectangle"
              layout={{ minimumSize: { width: 60, height: 40 }, padding: 0 }}
              style={{ fill: 'dodgerblue', opacity: { fill: 0.12 }, stroke: 'dodgerblue', font: { size: 12 } }}
            >
              {index === 0 ? 'A' : 'B'}
            </Node>
          ))}
          <Node
            position={[90, 0]}
            shape="circle"
            layout={{ minimumSize: 6, padding: 0 }}
            style={{ fill: 'darkorange', stroke: 'none' }}
          />
          <Node position={[90, 140]} style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
            {text.notes[i]}
          </Node>
        </Scope>
      ))}
      <Node position={[245, 165]} style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
        {text.footer}
      </Node>
    </Layout>
  );
};
export default ScopeEnvelope;
