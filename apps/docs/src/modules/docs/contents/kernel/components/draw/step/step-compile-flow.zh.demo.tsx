import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** IRStep 序列到路径命令与边标注的局部编译流程图 */
const Demo: FC = () => (
  <Layout width={540} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="step-ir"
      position={[-200, 0]}
      text={['IRStep', '有序序列']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="compile-step"
      position={[0, 0]}
      text={['目标解析', '游标 + kind 降级']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    />
    <Node
      id="path-output"
      position={[200, 0]}
      text={['路径命令', '边标注几何']}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />

    <Draw
      way={[
        'step-ir',
        { label: { text: '读取', side: 'top', sloped: true, textColor: 'gray', font: { size: 11 } } },
        'compile-step',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'compile-step',
        { label: { text: '发射', side: 'top', sloped: true, textColor: 'gray', font: { size: 11 } } },
        'path-output',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
