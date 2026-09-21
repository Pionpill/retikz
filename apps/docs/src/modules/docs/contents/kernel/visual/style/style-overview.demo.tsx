import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { styleOverviewI18n } from './style-overview.i18n';

/** 样式总览示意图的语言参数 */
export type StyleOverviewProps = { lang?: Lang };

/** 并列展示图案、阴影和混合各自作用的绘制阶段 */
const StyleOverview: FC<StyleOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = styleOverviewI18n[lang];
  const labelStyle = { fill: 'none', stroke: 'none', font: { size: 13 } } as const;

  return (
    <Layout viewBox={{ x: -230, y: -72, width: 460, height: 150 }} style={{ maxWidth: '100%', height: 'auto' }}>
      <Node position={[-145, -48]} style={labelStyle}>
        {text.pattern}
      </Node>
      <Node
        position={[-145, 14]}
        shape="rectangle"
        layout={{ minimumSize: { width: 104, height: 72 } }}
        style={{
          fill: { kind: 'pattern', shape: 'lines', color: '#2563eb', size: 8 },
          stroke: '#2563eb',
        }}
      />

      <Node position={[0, -48]} style={labelStyle}>
        {text.shadow}
      </Node>
      <Node
        position={[0, 14]}
        shape="rectangle"
        layout={{ minimumSize: { width: 104, height: 72 } }}
        style={{ fill: '#14b8a6', stroke: 'none', shadow: 'md' }}
      />

      <Node position={[145, -48]} style={labelStyle}>
        {text.blend}
      </Node>
      <Node
        position={[118, 14]}
        shape="circle"
        layout={{ minimumSize: 76 }}
        style={{ fill: '#f43f5e', stroke: 'none' }}
      />
      <Node
        position={[170, 14]}
        shape="circle"
        layout={{ minimumSize: 76 }}
        style={{ fill: '#0ea5e9', fillOpacity: 0.8, stroke: 'none', blendMode: 'multiply' }}
      />
    </Layout>
  );
};

export default StyleOverview;
