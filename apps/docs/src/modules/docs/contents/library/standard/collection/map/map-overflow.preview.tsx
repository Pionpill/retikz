import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';

/** 直接对应本节公开配置的参数 */
export type MapOverflowPreviewValues = {
  width: number;
  overflow: 'clip' | 'visible';
  reference: boolean;
};

/** 固定取景，观察配置对集合本身的影响 */
export const renderMapOverflowPreview = (values: MapOverflowPreviewValues) => (
  <Layout viewBox={{ x: -10, y: -10, width: 280, height: 144 }}>
    <Map
      layout={{ height: 36, key: { width: 56 } }}
      entries={[
        {
          key: 'task',
          value: {
            id: 'selected',
            content: 'a very long value',
            style: { stroke: 'dodgerblue' },
            layout: { width: values.width, overflow: values.overflow },
          },
        },
      ]}
    />
    {values.reference && <Draw way={['selected.bottom', [230, 112]]} arrow="->" style={{ stroke: 'dodgerblue' }} />}
  </Layout>
);
