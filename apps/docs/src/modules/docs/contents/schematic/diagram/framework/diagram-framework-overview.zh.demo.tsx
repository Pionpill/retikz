import type { FC } from 'react';

import { FlexLayout, LayoutItem } from '@retikz/layout-react';
import { Layout, Node, Text } from '@retikz/react';
import { LegendContentKind } from '@retikz/standard';
import { Legend, LegendItem, LegendTitle, Surface } from '@retikz/standard-react';

/** 展示 Diagram Framework 对 Presentation、绘图核心、图例与外框的统一装配 */
const Demo: FC = () => (
  <Layout width={640} height={350} style={{ maxWidth: '100%', height: 'auto' }}>
    <Surface
      id="diagram-frame"
      padding={{ x: 28, y: 24 }}
      border={{ stroke: 'lightgray', strokeWidth: 1.5 }}
      cornerRadius={8}
    >
      <FlexLayout
        direction="column"
        gap={{ column: 0, row: 18 }}
        size={{ x: { kind: 'fixed', value: 540 }, y: { kind: 'fixed', value: 250 } }}
      >
        <LayoutItem kind="flex" itemKey="presentation" shrink={0}>
          <FlexLayout direction="column" gap={{ column: 0, row: 6 }} alignItems="start">
            <LayoutItem kind="flex" itemKey="title">
              <Node
                id="diagram-title"
                position={[0, 0]}
                text="系统流程图"
                stroke="none"
                font={{ size: 18, weight: 'bold' }}
              />
            </LayoutItem>
            <LayoutItem kind="flex" itemKey="description">
              <Node
                id="diagram-description"
                position={[0, 0]}
                text="Presentation：标题、说明与显式图例"
                stroke="none"
                textColor="gray"
                font={{ size: 13 }}
              />
            </LayoutItem>
          </FlexLayout>
        </LayoutItem>
        <LayoutItem kind="flex" itemKey="main" grow={1}>
          <FlexLayout
            gap={{ column: 20, row: 0 }}
            alignItems="center"
            size={{ x: { kind: 'fixed', value: 540 }, y: { kind: 'fixed', value: 185 } }}
          >
            <LayoutItem kind="flex" itemKey="drawing" grow={1}>
              <Node
                id="drawing-core"
                position={[0, 0]}
                minimumSize={{ width: 350, height: 142 }}
                padding={{ x: 18, y: 14 }}
                fill="lightgray"
                fillOpacity={0.45}
                stroke="gray"
                strokeWidth={1.5}
                dashPattern={[7, 5]}
                cornerRadius={4}
                lineHeight={19}
              >
                <Text font={{ size: 14, weight: 'bold' }}>Drawing Core</Text>
                <Text font={{ size: 13 }}>由具体 Diagram 类型提供</Text>
              </Node>
            </LayoutItem>
            <LayoutItem kind="flex" itemKey="legend" shrink={0}>
              <Legend kind={LegendContentKind.Items} gap={{ row: 9, column: 6 }} padding={10} sampleGap={9}>
                <LegendTitle>
                  <Node
                    id="legend-title"
                    position={[0, 0]}
                    text="图例"
                    stroke="none"
                    font={{ size: 14, weight: 'bold' }}
                  />
                </LegendTitle>
                <LegendItem
                  itemKey="content"
                  sample={
                    <Node
                      id="legend-content-sample"
                      position={[0, 0]}
                      minimumSize={{ width: 22, height: 12 }}
                      fill="lightgray"
                      stroke="gray"
                      cornerRadius={4}
                    />
                  }
                >
                  <Node id="legend-content-label" position={[0, 0]} text="领域内容" stroke="none" font={{ size: 13 }} />
                </LegendItem>
              </Legend>
            </LayoutItem>
          </FlexLayout>
        </LayoutItem>
      </FlexLayout>
    </Surface>
  </Layout>
);

export default Demo;
