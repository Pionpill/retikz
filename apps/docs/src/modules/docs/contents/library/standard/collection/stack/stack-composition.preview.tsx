import { Layout, Draw, Node } from '@retikz/react';
import { Stack, StackItem, Matrix } from '@retikz/standard-react/collection';

/** 本节交互参数 */
export type StackPreviewValues = { matrix: boolean; dashed: boolean; connect: boolean };
/** 只通过公开属性组合栈的当前快照 */
export const renderStackPreview = (values: StackPreviewValues) => (
  <Layout>
    <Stack layout={{ width: 80 }}>
      <StackItem text="A" />
      <StackItem
        id="selected"
        {...(values.dashed ? { style: { fill: 'none', stroke: 'dodgerblue', dashPattern: [4, 3] } } : {})}
      >
        {values.matrix ? (
          <Matrix skeleton={{ rows: 2, columns: 2 }} layout={{ width: 18, height: 18, padding: 0 }} />
        ) : (
          <Node text="B" />
        )}
      </StackItem>
    </Stack>
    {values.connect && <Draw way={[[180, 27], 'selected']} arrow="->" style={{ stroke: 'dodgerblue' }} />}
  </Layout>
);
