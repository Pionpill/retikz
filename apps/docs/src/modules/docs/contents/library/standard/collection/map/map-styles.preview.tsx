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
      layout={{ gap: 4 }}
      defaultCell={{
        style: { font: { size: 14 } },
        layout: { height: 36 },
        key: { style: { fill: 'dodgerblue' }, layout: { width: values.keyWidth } },
        value: { layout: { width: values.valueWidth } },
      }}
    />
  </Layout>
);
