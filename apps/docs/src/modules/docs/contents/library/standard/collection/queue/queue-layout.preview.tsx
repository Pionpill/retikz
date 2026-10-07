import { Layout } from '@retikz/react';
import { Queue } from '@retikz/standard-react/collection';

/** 本节交互参数 */
export type QueuePreviewValues = {
  direction: 'up' | 'down' | 'left' | 'right';
  border: boolean;
  padding: '0' | '8' | '16';
  input: boolean;
  output: boolean;
  styled: boolean;
  count: '0' | '1' | '3';
};
/** 进出箭头随排列方向旋转，样式独立配置 */
export const renderQueuePreview = (values: QueuePreviewValues) => (
  <Layout>
    <Queue
      items={['A', 'B', 'C'].slice(0, Number(values.count))}
      layout={{ direction: values.direction, width: 44, height: 32 }}
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
