import { Draw, Layout } from '@retikz/react';
import { Array, Stack } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 展示延迟路径计算前后警告来源栈的栈顶 */
const WarningStack: FC = () => (
  <Layout style={{ maxWidth: '100%', height: 'auto' }}>
    <Stack
      layout={{ direction: 'right' }}
      padding={4}
      position={[0, 0]}
      label={{ text: '① before' }}
      defaultCell={{ layout: { width: 140, height: 32 }, style: { font: { size: 13 } } }}
      items={[{ content: 'parent' }]}
    />
    <Stack
      layout={{ direction: 'right' }}
      padding={4}
      position={[0, 82]}
      label={{ text: '② push' }}
      defaultCell={{ layout: { width: 140, height: 32 }, style: { font: { size: 13 } } }}
      items={[{ content: 'parent' }, { content: 'path · top', id: 'path-top' }]}
    />
    <Stack
      layout={{ direction: 'right' }}
      padding={4}
      position={[0, 164]}
      label={{ text: '③ finally: pop' }}
      defaultCell={{ layout: { width: 140, height: 32 }, style: { font: { size: 13 } } }}
      items={[{ content: 'parent' }]}
    />
    <Array
      position={[355, 82]}
      label={{ text: 'diagnosticCollector.warnings' }}
      defaultCell={{ layout: { width: 190, height: 32 }, style: { font: { size: 13 } } }}
      items={[{ content: 'warning @ path', id: 'warning' }]}
    />
    <Draw way={['path-top.right', 'warning.left']} arrow="->" />
  </Layout>
);
export default WarningStack;
