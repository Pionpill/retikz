import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { integrationI18n } from './animation-integration.i18n';

/** 组件对接示例参数 */
export type IntegrationDemoProps = { lang?: Lang };
/** 比较 Scope 提供的配置和图元局部配置 */
const IntegrationDemo: FC<IntegrationDemoProps> = props => {
  const { lang = 'zh' } = props;
  const text = integrationI18n[lang];
  return (
    <Layout viewBox={{ x: -65, y: -65, width: 330, height: 155 }}>
      <Scope
        animations={[
          {
            property: 'translateY',
            keyframes: [
              { at: 0, value: 0 },
              { at: 0.5, value: -15 },
              { at: 1, value: 0 },
            ],
            duration: 1800,
            iterations: 'infinite',
          },
        ]}
      >
        <Node position={[0, 0]} layout={{ minimumSize: 75 }}>
          {text.inherited}
        </Node>
        <Path>
          <Step kind="move" to={[60, 35]} />
          <Step kind="line" to={[105, -40]} />
          <Step kind="line" to={[145, 35]} />
          <Step kind="cycle" />
        </Path>
        <Node position={[200, 0]} layout={{ minimumSize: 75 }} style={{ fill: 'darkorange' }}>
          {text.overridden}
        </Node>
      </Scope>
    </Layout>
  );
};
export default IntegrationDemo;
