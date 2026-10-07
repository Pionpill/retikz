import { Layout } from '@retikz/react';
import { Stack } from '@retikz/standard-react/collection';

/** 本节交互参数 */
export type StackPreviewValues = {
  direction: 'up' | 'down' | 'left' | 'right';
  border: boolean;
  padding: '0' | '8' | '16';
  input: boolean;
  output: boolean;
  styled: boolean;
  reverseArrows: boolean;
};
/** 进出箭头随排列方向旋转，样式独立配置 */
export const renderStackPreview = (values: StackPreviewValues) => (
  <Layout>
    <Stack
      items={['A', 'B', 'C']}
      layout={{ direction: values.direction, reverseArrows: values.reverseArrows, width: 44, height: 32 }}
      border={values.border}
      padding={Number(values.padding)}
      arrow={{
        input:
          values.input &&
          (values.styled
            ? {
                style: { stroke: 'dodgerblue', strokeWidth: 2, dashPattern: [4, 3] },
                arrowDetail: { shape: 'openStealth' },
              }
            : true),
        output:
          values.output &&
          (values.styled
            ? { style: { stroke: 'darkorange', strokeWidth: 2 }, arrowDetail: { shape: 'normal' } }
            : true),
      }}
    />
  </Layout>
);
