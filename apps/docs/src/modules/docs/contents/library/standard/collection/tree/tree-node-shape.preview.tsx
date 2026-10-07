import { Layout } from '@retikz/react';
import { Tree } from '@retikz/standard-react/collection';

/** 单节点形状与文字的演示参数 */
export type TreeNodeShapePreviewValues = {
  shape: 'rectangle' | 'ellipse';
  cornerRadius: number;
  content: string;
};

/** 仅覆盖长文本节点，其余节点继续使用默认圆形 */
export const renderTreeNodeShapePreview = (values: TreeNodeShapePreviewValues) => (
  <Layout viewBox={{ x: -24, y: -36, width: 440, height: 190 }}>
    <Tree
      root={{
        content: 'A',
        children: [
          {
            content: values.content,
            node: {
              shape:
                values.shape === 'rectangle'
                  ? { type: 'rectangle', params: { cornerRadius: values.cornerRadius } }
                  : 'ellipse',
              layout: { padding: { x: 12, y: 8 } },
              style: { stroke: 'dodgerblue' },
            },
          },
          'C',
        ],
      }}
      layout={{ levelGap: 40 }}
    />
  </Layout>
);
