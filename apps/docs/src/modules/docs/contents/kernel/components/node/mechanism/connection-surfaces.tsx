import { Coordinate, Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { connectionSurfacesI18n } from './connection-surfaces.i18n';

export type ConnectionSurfacesProps = { lang?: Lang };
/** 同一视觉形状下比较连接面与外边距 */
const ConnectionSurfaces: FC<ConnectionSurfacesProps> = props => {
  const { lang } = props;
  const labels = connectionSurfacesI18n[lang ?? 'zh'];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[0, 1, 2].map(index => (
        <Scope key={index} localNamespace transforms={[{ kind: 'translate', x: index * 180, y: 0 }]}>
          <Node
            position={[0, -70]}
            text={labels.titles[index]}
            style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}
          />
          <Node
            id="q"
            position={[0, 0]}
            text="Q"
            shape="circle"
            boundary={index === 0 ? 'shape' : 'rectangle'}
            layout={{ minimumSize: 80, padding: 0, margin: index === 2 ? 12 : 0 }}
            style={{ fill: 'none', stroke: 'currentColor' }}
          />
          {index > 0 && (
            <Node
              position={[0, 0]}
              layout={{ minimumSize: index === 2 ? 104 : 80, padding: 0 }}
              style={{ fill: 'none', stroke: 'gray', dashPattern: [1, 4] }}
            />
          )}
          <Coordinate id="target" position={[70, 65]} />
          <Draw way={['target', 'q']} arrow="->" style={{ stroke: 'gray' }} />
        </Scope>
      ))}
      <Node
        position={[180, 100]}
        text={labels.guide}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};
export default ConnectionSurfaces;
