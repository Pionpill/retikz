import { Layout, Node, Path, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { flowLayoutGeometryI18n } from './flow-layout-geometry.i18n';

/** 布局几何图的语言 */
export type FlowLayoutGeometryProps = Readonly<{ lang?: Lang }>;

/** 固定排列的整体平移保留尺寸与相对子项位置 */
const FlowLayoutGeometry: FC<FlowLayoutGeometryProps> = props => {
  const { lang = 'zh' } = props;
  const t = flowLayoutGeometryI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Scope>
        <Node
          cornerRadius={4}
          id="local"
          position={[96, 20]}
          layout={{ width: 192, minimumSize: { height: 40 }, padding: 0 }}
          style={{ fill: 'none', stroke: 'gray', dashPattern: [1, 4] }}
          label={{ text: t.local, font: { size: 12 }, opacity: 0.8 }}
        />
        <Node
          cornerRadius={4}
          id="localReceive"
          position={[40, 20]}
          text={t.receive}
          layout={{ width: 80, minimumSize: { height: 40 }, padding: 4 }}
          style={{ font: { size: 14 } }}
        />
        <Node
          cornerRadius={4}
          id="localVerify"
          position={[152, 20]}
          text={t.verify}
          layout={{ width: 80, minimumSize: { height: 40 }, padding: 4 }}
          style={{ font: { size: 14 } }}
        />
        <Path
          way={[
            [40, 60],
            [152, 60],
          ]}
          arrow="<->"
          label={{ text: t.spacing, font: { size: 12 }, textColor: 'gray', side: 'bottom' }}
        />
      </Scope>
      <Scope transforms={[{ kind: 'translate', x: 240, y: 120 }]}>
        <Node
          cornerRadius={4}
          id="placed"
          position={[96, 20]}
          layout={{ width: 192, minimumSize: { height: 40 }, padding: 0 }}
          style={{ fill: 'none', stroke: 'gray', dashPattern: [1, 4] }}
          label={{ text: t.placed, font: { size: 12 }, opacity: 0.8 }}
        />
        <Node
          cornerRadius={4}
          id="receive"
          position={[40, 20]}
          text={t.receive}
          layout={{ width: 80, minimumSize: { height: 40 }, padding: 4 }}
          style={{ font: { size: 14 } }}
        />
        <Node
          cornerRadius={4}
          id="verify"
          position={[152, 20]}
          text={t.verify}
          layout={{ width: 80, minimumSize: { height: 40 }, padding: 4 }}
          style={{ font: { size: 14 } }}
        />
        <Path way={['receive.right', 'verify.left']} arrow="->" />
        <Path
          way={[
            [40, 60],
            [152, 60],
          ]}
          arrow="<->"
          label={{ text: t.spacing, font: { size: 12 }, textColor: 'gray', side: 'bottom' }}
        />
        <Node
          cornerRadius={4}
          position={[96, 100]}
          text={t.size}
          style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
        />
      </Scope>
      <Path
        way={['local.right', [210, 90], [210, 140], 'placed.left']}
        arrow="->"
        label={{ text: t.move, font: { size: 12 }, textColor: 'gray', sloped: false, side: 'left', distance: 12 }}
      />
      <Node
        cornerRadius={4}
        position={[160, 250]}
        text={t.guide}
        style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};

export default FlowLayoutGeometry;
