import { Layout } from '@retikz/react';
import { Tree } from '@retikz/standard-react/collection';

/** 节点与连接的演示参数 */
export type TreePreviewValues = {
  direction: 'down' | 'up' | 'left' | 'right';
  gap: '0' | '32' | '64';
  empty: boolean;
  missing: boolean;
  arrows: boolean;
  styled: boolean;
};
/** 用文字与对象配置展示空槽及外观 */
export const renderTreePreview = (values: TreePreviewValues) => {
  return (
    <Layout>
      <Tree
        root={
          values.empty
            ? null
            : {
                content: '1',
                children: [
                  { content: '2', children: ['3', '4'] },
                  { content: '5', children: [...(values.missing ? [null] : []), '6'] },
                ],
              }
        }
        layout={{ direction: values.direction, levelGap: Number(values.gap) }}
        {...(values.styled ? { node: { style: { stroke: 'dodgerblue', strokeWidth: 2 } } } : {})}
        connection={{
          path: {
            marks: values.arrows ? [{ pos: 1, mark: { kind: 'arrow' } }] : [],
            ...(values.styled ? { style: { stroke: 'darkorange', dashPattern: [4, 3] } } : {}),
          },
        }}
      />
    </Layout>
  );
};
