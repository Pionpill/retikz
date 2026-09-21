import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { periodI18n } from './pattern-period.i18n';
/** 重复周期示意参数 */
export type PatternPeriodProps = { lang?: Lang };
/** 比较单个周期与平铺区域 */
const PatternPeriod: FC<PatternPeriodProps> = props => {
  const { lang = 'zh' } = props;
  const text = periodI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Scope
        style={{
          fill: {
            kind: 'pattern',
            shape: 'lines',
            size: 10,
            color: 'dodgerblue',
            lineStyleCycle: { period: 3, overrides: [{ index: 0, style: { color: 'darkorange', lineWidth: 2 } }] },
          },
        }}
      >
        <Node position={[0, 0]} layout={{ minimumSize: 30, padding: 0 }} />
        <Node position={[170, 0]} layout={{ minimumSize: 90, padding: 0 }} />
      </Scope>
      <Node position={[0, 65]} style={{ stroke: 'none', fill: 'none' }}>
        {text[0]}
      </Node>
      <Node position={[170, 65]} style={{ stroke: 'none', fill: 'none' }}>
        {text[1]}
      </Node>
      <Node position={[85, 100]} style={{ stroke: 'none', fill: 'none' }}>
        {text[2]}
      </Node>
    </Layout>
  );
};
export default PatternPeriod;
