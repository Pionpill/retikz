import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';

/** 直接对应本节公开配置的参数 */
export type MapLabelsPreviewValues = {
  position: 'top' | 'right' | 'bottom' | 'left';
  distance: number;
  pin: boolean;
};

/** 固定取景，观察配置对集合本身的影响 */
export const renderMapLabelsPreview = (values: MapLabelsPreviewValues) => (
  <Layout viewBox={{ x: -90, y: -55, width: 290, height: 180 }}>
    <Map
      entries={[
        { key: 'id', value: 'a' },
        { key: 'ok', value: 'yes' },
      ]}
      label={{
        text: 'record',
        position: values.position,
        distance: values.distance,
        textColor: 'dodgerblue',
        pin: values.pin ? { stroke: 'dodgerblue' } : false,
      }}
      defaultCell={{ layout: { height: 32 }, key: { layout: { width: 40 } }, value: { layout: { width: 60 } } }}
    />
  </Layout>
);
