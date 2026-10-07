import { Draw, Layout } from '@retikz/react';
import { Tree } from '@retikz/standard-react/collection';

/** 路由与外部引用的演示参数 */
export type TreeConnectionsPreviewValues = {
  route: 'straight' | '-|' | '|-' | '-|-' | '|-|';
  fraction: number;
  arrows: boolean;
  reference: boolean;
};

/** 固定节点位置，观察连接路由与真实节点引用 */
export const renderTreeConnectionsPreview = (values: TreeConnectionsPreviewValues) => (
  <Layout viewBox={{ x: -24, y: -40, width: 300, height: 190 }}>
    <Tree
      root={{ content: 'A', children: ['B', { id: 'selected', content: 'C' }] }}
      layout={{ levelGap: 56, siblingGap: 72 }}
      connection={{
        ...(values.route === '-|-' || values.route === '|-|'
          ? { route: values.route, fraction: values.fraction }
          : { route: values.route }),
        path: { marks: values.arrows ? [{ pos: 1, mark: { kind: 'arrow' } }] : [] },
      }}
    />
    {values.reference && (
      <Draw
        way={[[248, 104], { id: 'selected', anchor: 'right' }]}
        arrow="->"
        style={{ stroke: 'dodgerblue', dashPattern: [4, 3] }}
      />
    )}
  </Layout>
);
