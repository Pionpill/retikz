import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** IRStep 序列到路径命令与边标注的局部编译流程图 */
const Demo: FC = () => (
  <Layout>
    <Node
      id="step-ir"
      position={[-200, 0]}
      text={['Ordered', 'IRStep sequence']}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="compile-step"
      position={[0, 0]}
      text={['Target resolution', 'Cursor + kind lowering']}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
    />
    <Node
      id="path-output"
      position={[200, 0]}
      text={['Path commands', 'Edge-label geometry']}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.08, font: { size: 13 } }}
    />

    <Draw
      way={[
        'step-ir',
        { label: { text: 'read', side: 'top', sloped: true, textColor: 'gray', font: { size: 11 } } },
        'compile-step',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'compile-step',
        { label: { text: 'emit', side: 'top', sloped: true, textColor: 'gray', font: { size: 11 } } },
        'path-output',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
