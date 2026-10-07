import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';

/** 直接对应本节公开配置的参数 */
export type MapStylesPreviewValues = {
  keyWidth: number;
  valueWidth: number;
  local: boolean;
};

/** 固定取景，观察配置对集合本身的影响 */
export const renderMapStylesPreview = (values: MapStylesPreviewValues) => (
  <Layout viewBox={{ x: -10, y: -10, width: 280, height: 112 }}>
    <Map
      layout={{ gap: 4, height: 36, key: { width: values.keyWidth }, value: { width: values.valueWidth } }}
      style={{ font: { size: 14 }, key: { fill: 'dodgerblue' } }}
      entries={[
        {
          key: 'id',
          value: {
            content: 'node-a',
            ...(values.local ? { style: { fill: 'darkorange' }, layout: { width: 88, height: 44 } } : {}),
          },
        },
        { key: 'state', value: 'ready' },
      ]}
    />
  </Layout>
);
