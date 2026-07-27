import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 位置比例尺从字段与图元语义到最终坐标和 guide 的解析链路 */
const Demo: FC = () => (
  <>
    <div className="hidden sm:block">
      <Layout width={780} height={160} style={{ maxWidth: '100%', height: 'auto' }}>
        <Node
          id="desktop-inputs"
          position={[-285, 0]}
          minimumSize={{ width: 150, height: 54 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>field + mark</Text>
          <Text fill="gray" font={{ size: 12 }}>
            type · role · baseline
          </Text>
        </Node>
        <Node
          id="desktop-scale"
          position={[-95, 0]}
          minimumSize={{ width: 150, height: 54 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>scale type</Text>
          <Text fill="gray" font={{ size: 12 }}>
            explicit · derived
          </Text>
        </Node>
        <Node
          id="desktop-resolve"
          position={[100, 0]}
          minimumSize={{ width: 160, height: 54 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>domain + range</Text>
          <Text fill="gray" font={{ size: 12 }}>
            data · coordinate extent
          </Text>
        </Node>
        <Node
          id="desktop-outputs"
          position={[300, 0]}
          minimumSize={{ width: 160, height: 54 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>position + bandwidth</Text>
          <Text fill="gray" font={{ size: 12 }}>
            mark · guide · ticks
          </Text>
        </Node>

        <Draw
          way={[
            'desktop-inputs',
            {
              label: {
                text: 'derive',
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'desktop-scale',
          ]}
          arrow="->"
        />
        <Draw
          way={[
            'desktop-scale',
            {
              label: {
                text: 'validate',
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'desktop-resolve',
          ]}
          arrow="->"
        />
        <Draw
          way={[
            'desktop-resolve',
            {
              label: {
                text: 'map',
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'desktop-outputs',
          ]}
          arrow="->"
        />
      </Layout>
    </div>

    <div className="sm:hidden">
      <Layout width={360} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
        <Node
          id="mobile-inputs"
          position={[-95, -30]}
          minimumSize={{ width: 130, height: 40 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={14}
        >
          <Text font={{ size: 14, weight: 'bold' }}>field + mark</Text>
          <Text fill="gray" font={{ size: 12 }}>
            type · role · baseline
          </Text>
        </Node>
        <Node
          id="mobile-scale"
          position={[95, -30]}
          minimumSize={{ width: 130, height: 40 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={14}
        >
          <Text font={{ size: 14, weight: 'bold' }}>scale type</Text>
          <Text fill="gray" font={{ size: 12 }}>
            explicit · derived
          </Text>
        </Node>
        <Node
          id="mobile-resolve"
          position={[95, 30]}
          minimumSize={{ width: 140, height: 40 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={14}
        >
          <Text font={{ size: 14, weight: 'bold' }}>domain + range</Text>
          <Text fill="gray" font={{ size: 12 }}>
            data · coordinate extent
          </Text>
        </Node>
        <Node
          id="mobile-outputs"
          position={[-95, 30]}
          minimumSize={{ width: 140, height: 40 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={14}
        >
          <Text font={{ size: 14, weight: 'bold' }}>position + bandwidth</Text>
          <Text fill="gray" font={{ size: 12 }}>
            mark · guide · ticks
          </Text>
        </Node>

        <Draw
          way={[
            'mobile-inputs',
            {
              label: {
                text: 'derive',
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'mobile-scale',
          ]}
          arrow="->"
        />
        <Draw
          way={[
            'mobile-scale',
            {
              label: {
                text: 'validate',
                position: 'midway',
                side: 'right',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'mobile-resolve',
          ]}
          arrow="->"
        />
        <Draw
          way={[
            'mobile-resolve',
            {
              label: {
                text: 'map',
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'mobile-outputs',
          ]}
          arrow="->"
        />
      </Layout>
    </div>
  </>
);

export default Demo;
