import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineFlexPreview } from '../preview';
import { previewControlContract } from './flex-baseline.controls';

export { createPreviewControlContract } from './flex-baseline.controls';
export const previewControls = previewControlContract.controls;

const preview = defineFlexPreview(previewControlContract, values => (
  <Layout>
    <FlexLayout
      size={{ x: { kind: 'fixed', value: 310 }, y: { kind: 'fixed', value: 150 } }}
      padding={12}
      gap={12}
      alignItems={values.alignItems}
    >
      <FlexLayoutItem itemKey="a" basis={130} grow={0} shrink={0}>
        <Node text={'First\nNode'} style={{ font: { size: values.fontA }, stroke: 'dodgerblue' }} />
      </FlexLayoutItem>
      <FlexLayoutItem
        itemKey="b"
        basis={130}
        grow={0}
        shrink={0}
        {...(values.alignSelf === 'auto' ? {} : { alignSelf: values.alignSelf })}
      >
        <Node text="Secondary Node" style={{ font: { size: values.fontB }, stroke: 'gray' }} />
      </FlexLayoutItem>
    </FlexLayout>
  </Layout>
));

export const previewSource = preview.source;

/** 当前功能的交互示例 */
const Demo: FC = preview.Component;
export default Demo;
