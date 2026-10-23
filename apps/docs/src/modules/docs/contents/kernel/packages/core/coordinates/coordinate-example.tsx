import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { coordinateExampleI18n } from './coordinate-example.i18n';

/** 坐标解析案例的语言 */
export type CoordinateExampleProps = { lang?: Lang };

/** 用嵌套坐标、局部命名和外部引用展示同一次编译 */
const CoordinateExample: FC<CoordinateExampleProps> = props => {
  const { lang = 'zh' } = props;
  const text = coordinateExampleI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Scope
        defaults={{ node: { shape: 'rectangle', cornerRadius: 4, layout: { minimumSize: { width: 88, height: 36 } } } }}
      >
        <Node id="A" position={[0, 0]}>
          {text.outer}
        </Node>
        <Scope id="cluster" position={[180, -40]} localNamespace>
          {/* 路径先入队，等本层节点与 Scope 包络完成后再绑定引用 */}
          <Path arrow="->">
            <Step kind="move" to={{ id: 'A', anchor: 'bottom' }} />
            <Step kind="line" to={{ id: 'C', anchor: 'top' }} />
          </Path>
          <Node id="A" position={[0, 0]}>
            {text.inner}
          </Node>
          <Node id="B" position={{ of: 'A', offset: [120, 0] }}>
            {text.following}
          </Node>
          <Scope position={[0, 80]}>
            <Node id="C" position={[0, 0]}>
              {text.nested}
            </Node>
          </Scope>
        </Scope>
        <Node
          id="D"
          position={{ kind: 'anchor', target: { id: 'cluster', anchor: 'bottom', offset: [0, 48] }, selfAnchor: 'top' }}
        >
          {text.aligned}
        </Node>
        <Path arrow="->">
          <Step kind="move" to={{ id: 'A', anchor: 'right' }} />
          <Step kind="line" to={{ id: 'cluster', anchor: 'left' }} />
        </Path>
      </Scope>
    </Layout>
  );
};

export default CoordinateExample;
