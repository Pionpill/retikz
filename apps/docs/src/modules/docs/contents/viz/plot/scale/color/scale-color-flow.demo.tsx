import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 颜色比例尺从自动派生或显式配置到图元与图例共用映射的解析链路 */
const Demo: FC = () => (
  <>
    <div className="hidden sm:block">
      <Layout width={780} height={160} style={{ maxWidth: '100%', height: 'auto' }}>
        <Node
          id="desktop-field"
          position={[-300, -35]}
          minimumSize={{ width: 140, height: 46 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={15}
        >
          <Text font={{ size: 14, weight: 'bold' }}>field contract</Text>
          <Text fill="gray" font={{ size: 12 }}>
            ordinal · sequential
          </Text>
        </Node>
        <Node
          id="desktop-explicit"
          position={[-300, 35]}
          minimumSize={{ width: 140, height: 46 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={15}
        >
          <Text font={{ size: 14, weight: 'bold' }}>IRPlotScale</Text>
          <Text fill="gray" font={{ size: 12 }}>
            explicit definition
          </Text>
        </Node>
        <Node
          id="desktop-definition"
          position={[-90, 0]}
          minimumSize={{ width: 165, height: 56 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>scale definition</Text>
          <Text fill="gray" font={{ size: 12 }}>
            registry · resolver
          </Text>
        </Node>
        <Node
          id="desktop-resolved"
          position={[130, 0]}
          minimumSize={{ width: 175, height: 56 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>resolved color scale</Text>
          <Text fill="gray" font={{ size: 12 }}>
            mapping · boundaries · range
          </Text>
        </Node>
        <Node
          id="desktop-consumers"
          position={[330, 0]}
          minimumSize={{ width: 145, height: 56 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>mark + Legend</Text>
          <Text fill="gray" font={{ size: 12 }}>
            shared scale
          </Text>
        </Node>

        <Draw
          way={[
            'desktop-field',
            {
              label: {
                text: 'derive',
                position: 'midway',
                side: 'top',
                sloped: true,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'desktop-definition',
          ]}
          arrow="->"
        />
        <Draw
          way={[
            'desktop-explicit',
            {
              label: {
                text: 'declare',
                position: 'midway',
                side: 'bottom',
                sloped: true,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'desktop-definition',
          ]}
          arrow="->"
        />
        <Draw
          way={[
            'desktop-definition',
            {
              label: {
                text: 'resolve',
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'desktop-resolved',
          ]}
          arrow="->"
        />
        <Draw
          way={[
            'desktop-resolved',
            {
              label: {
                text: 'consume',
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            'desktop-consumers',
          ]}
          arrow="->"
        />
      </Layout>
    </div>

    <div className="sm:hidden">
      <Layout width={420} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
        <Node
          id="mobile-field"
          position={[-100, -38]}
          minimumSize={{ width: 140, height: 30 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={12}
        >
          <Text font={{ size: 13, weight: 'bold' }}>field contract</Text>
          <Text fill="gray" font={{ size: 11 }}>
            auto derive
          </Text>
        </Node>
        <Node
          id="mobile-explicit"
          position={[100, -38]}
          minimumSize={{ width: 140, height: 30 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={12}
        >
          <Text font={{ size: 13, weight: 'bold' }}>IRPlotScale</Text>
          <Text fill="gray" font={{ size: 11 }}>
            explicit definition
          </Text>
        </Node>
        <Node
          id="mobile-definition"
          position={[0, 0]}
          minimumSize={{ width: 150, height: 30 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={12}
        >
          <Text font={{ size: 13, weight: 'bold' }}>scale definition</Text>
          <Text fill="gray" font={{ size: 11 }}>
            registry · resolver
          </Text>
        </Node>
        <Node
          id="mobile-resolved"
          position={[-100, 38]}
          minimumSize={{ width: 150, height: 30 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={12}
        >
          <Text font={{ size: 13, weight: 'bold' }}>resolved scale</Text>
          <Text fill="gray" font={{ size: 11 }}>
            mapping · boundaries
          </Text>
        </Node>
        <Node
          id="mobile-consumers"
          position={[100, 38]}
          minimumSize={{ width: 140, height: 30 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={12}
        >
          <Text font={{ size: 13, weight: 'bold' }}>mark + Legend</Text>
          <Text fill="gray" font={{ size: 11 }}>
            shared scale
          </Text>
        </Node>

        <Draw way={['mobile-field', 'mobile-definition']} arrow="->" />
        <Draw way={['mobile-explicit', 'mobile-definition']} arrow="->" />
        <Draw
          way={[
            'mobile-definition',
            {
              label: {
                text: 'resolve',
                position: 'midway',
                side: 'right',
                sloped: true,
                textColor: 'gray',
                font: { size: 11 },
              },
            },
            'mobile-resolved',
          ]}
          arrow="->"
        />
        <Draw
          way={[
            'mobile-resolved',
            {
              label: {
                text: 'consume',
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 11 },
              },
            },
            'mobile-consumers',
          ]}
          arrow="->"
        />
      </Layout>
    </div>
  </>
);

export default Demo;
