import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineFlexPreview } from '../preview';
import { previewControlContract } from './flex-limits.controls';

export { createPreviewControlContract } from './flex-limits.controls';
export const previewControls = previewControlContract.controls;

const preview = defineFlexPreview(previewControlContract, values => (
  <Layout>
    <FlexLayout
      size={{ x: { kind: 'fixed', value: values.width }, y: { kind: 'content' } }}
      padding={12}
      gap={8}
      alignItems="center"
    >
      <FlexLayoutItem
        itemKey="a"
        basis={values.basis}
        grow={values.grow}
        shrink={values.shrink}
        min={values.min}
        max={values.max}
      >
        <Node text="First Node" layout={{ minimumSize: { width: 32, height: 36 } }} style={{ stroke: 'dodgerblue' }} />
      </FlexLayoutItem>
      <FlexLayoutItem itemKey="b" basis={80} grow={1} shrink={1} min={32}>
        <Node text="Secondary Node" layout={{ minimumSize: { width: 32, height: 36 } }} style={{ stroke: 'gray' }} />
      </FlexLayoutItem>
    </FlexLayout>
  </Layout>
));

export const previewSource = preview.source;

/** 当前功能的交互示例 */
const Demo: FC = preview.Component;
export default Demo;
