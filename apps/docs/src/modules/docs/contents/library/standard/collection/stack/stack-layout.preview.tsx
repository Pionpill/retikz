import { Layout } from '@retikz/react';
import { Stack } from '@retikz/standard-react/collection';

/** 本节交互参数 */
export type StackPreviewValues = {
  direction: 'up' | 'down' | 'left' | 'right';
  border: boolean;
  padding: '0' | '8' | '16';
  top: boolean;
};
/** 只通过公开属性组合栈的当前快照 */
export const renderStackPreview = (values: StackPreviewValues) => (
  <Layout viewBox={{ x: -16, y: -48, width: 210, height: 200 }}>
    <Stack
      items={['A', 'B', 'C']}
      layout={{ direction: values.direction, width: 44, height: 32, gap: 4 }}
      border={values.border}
      padding={Number(values.padding)}
      {...(values.top
        ? {
            topLabel: {
              text: 'top',
              position: values.direction === 'left' || values.direction === 'right' ? 'top' : 'right',
            },
          }
        : {})}
    />
  </Layout>
);
