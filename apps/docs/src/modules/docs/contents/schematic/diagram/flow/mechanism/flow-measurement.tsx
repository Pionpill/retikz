import { Layout, Node, Path } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { flowMeasurementI18n } from './flow-measurement.i18n';

/** 测量图的语言 */
export type FlowMeasurementProps = Readonly<{ lang?: Lang }>;

/** 对照元素尺寸、容器内边距、标签尺寸与布局输入摘录 */
const FlowMeasurement: FC<FlowMeasurementProps> = props => {
  const { lang = 'zh' } = props;
  const t = flowMeasurementI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Node
        cornerRadius={4}
        id="group"
        position={[190, 65]}
        layout={{ width: 304, minimumSize: { height: 104 }, padding: 0 }}
        style={{ fill: 'none', dashed: true }}
        label={{ text: t.group, position: 'right', font: { size: 12 }, opacity: 0.8 }}
      />
      <Node
        cornerRadius={4}
        id="receive"
        position={[94, 65]}
        text={t.receive}
        layout={{ width: 80, minimumSize: { height: 40 }, padding: 4 }}
        style={{ font: { size: 14 } }}
      />
      <Node
        cornerRadius={4}
        id="verify"
        position={[286, 65]}
        text={t.verify}
        layout={{ width: 80, minimumSize: { height: 40 }, padding: 4 }}
        style={{ font: { size: 14 } }}
      />
      <Path
        way={['receive.right', 'verify.left']}
        arrow="->"
        label={{ text: t.next, font: { size: 12 }, sloped: false }}
      />
      <Node
        cornerRadius={4}
        position={[190, 31]}
        text={t.labelSize}
        style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Path
        way={[
          [168, 41],
          [212, 41],
          [212, 62],
          [168, 62],
          [168, 41],
        ]}
        style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Path
        way={[
          [54, 95],
          [134, 95],
        ]}
        arrow="<->"
        label={{ text: t.width, font: { size: 12 }, textColor: 'gray', side: 'bottom' }}
      />
      <Path
        way={[
          [18, 45],
          [18, 85],
        ]}
        arrow="<->"
        label={{ text: t.height, font: { size: 12 }, textColor: 'gray', side: 'left', sloped: false }}
      />
      <Path
        way={[
          [38, 117],
          [38, 135],
        ]}
        style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Path
        way={[
          [54, 85],
          [54, 135],
        ]}
        style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Path
        way={[
          [38, 135],
          [54, 135],
        ]}
        arrow="<->"
        label={{ text: t.insets, font: { size: 12 }, textColor: 'gray', sloped: false, side: 'bottom' }}
      />
      <Map
        id="input"
        position={[118, 170]}
        label={{ text: t.input, position: 'left', font: { size: 12 }, opacity: 0.8 }}
        style={{ font: { size: 13 } }}
        data={{ kind: 'leaf', id: 'receive', size: { width: 80, height: 40 } }}
      />
      <Path
        way={['group.bottom', 'input.top']}
        arrow="->"
        label={{ text: t.measure, font: { size: 12 }, textColor: 'gray', sloped: false, side: 'right', distance: 16 }}
      />
    </Layout>
  );
};

export default FlowMeasurement;
