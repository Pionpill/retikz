import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

type MobileFlowNode = {
  id: string;
  position: [number, number];
  title: string;
  detail: string;
  width: number;
  color: 'darkorange' | 'dodgerblue' | 'dimgray';
};

/** 以窄屏可读的双行样式渲染入口汇合节点 */
const renderMobileNode = (node: MobileFlowNode) => (
  <Node
    key={node.id}
    id={node.id}
    position={node.position}
    minimumSize={{ width: node.width, height: 48 }}
    stroke={node.color}
    fill={node.color}
    fillOpacity={0.08}
    cornerRadius={4}
    align="middle"
    lineHeight={15}
  >
    <Text font={{ size: 13, weight: 'bold' }}>{node.title}</Text>
    <Text fill="gray" font={{ size: 11 }}>
      {node.detail}
    </Text>
  </Node>
);

/** Table 的 standalone、direct 与 embedded 入口汇入同一 composite runtime */
const Demo: FC = () => (
  <>
    <div className="hidden sm:block">
      <Layout width={800} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
        <Node
          id="react"
          position={[-300, -76]}
          minimumSize={{ width: 150, height: 52 }}
          stroke="dimgray"
          fill="dimgray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>React standalone</Text>
          <Text fill="gray" font={{ size: 12 }}>
            Table · DetailTable · ManualTable
          </Text>
        </Node>
        <Node
          id="vanilla"
          position={[-300, 0]}
          minimumSize={{ width: 150, height: 52 }}
          stroke="dimgray"
          fill="dimgray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>Vanilla / direct</Text>
          <Text fill="gray" font={{ size: 12 }}>
            renderTable · compileTable
          </Text>
        </Node>
        <Node
          id="embedded"
          position={[-300, 76]}
          minimumSize={{ width: 150, height: 52 }}
          stroke="dimgray"
          fill="dimgray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>Embedded host</Text>
          <Text fill="gray" font={{ size: 12 }}>
            外层 Layout · adapter
          </Text>
        </Node>

        <LogicFrame id="table-runtime">
          <LogicFrameTitle>@retikz/table</LogicFrameTitle>
          <Node
            id="runtime-input"
            position={[-105, 0]}
            minimumSize={{ width: 142, height: 52 }}
            stroke="darkorange"
            fill="darkorange"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>Table runtime</Text>
            <Text fill="gray" font={{ size: 12 }}>
              spec · theme · data · Definitions
            </Text>
          </Node>
          <Node
            id="table-composite"
            position={[62, 0]}
            minimumSize={{ width: 142, height: 52 }}
            stroke="darkorange"
            fill="darkorange"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>table.table</Text>
            <Text fill="gray" font={{ size: 12 }}>
              layout-aware composite
            </Text>
          </Node>
        </LogicFrame>

        <Node
          id="core-compile"
          position={[218, 0]}
          minimumSize={{ width: 118, height: 52 }}
          stroke="dodgerblue"
          fill="dodgerblue"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>Core compile</Text>
          <Text fill="gray" font={{ size: 12 }}>
            compileToScene × 1
          </Text>
        </Node>

        <Node
          id="standalone-output"
          position={[352, -46]}
          minimumSize={{ width: 142, height: 52 }}
          stroke="dodgerblue"
          fill="dodgerblue"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>Standalone 输出</Text>
          <Text fill="gray" font={{ size: 12 }}>
            Scene · SVG · root manifest
          </Text>
        </Node>
        <Node
          id="embedded-output"
          position={[352, 46]}
          minimumSize={{ width: 142, height: 52 }}
          stroke="dodgerblue"
          fill="dodgerblue"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={16}
        >
          <Text font={{ size: 14, weight: 'bold' }}>宿主输出</Text>
          <Text fill="gray" font={{ size: 12 }}>
            outer Scene · artifacts
          </Text>
        </Node>

        <Draw way={['react', 'runtime-input']} arrow="->" />
        <Draw way={['vanilla', 'runtime-input']} arrow="->" />
        <Draw way={['embedded', 'runtime-input']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
        <Draw way={['runtime-input', 'table-composite']} arrow="->" />
        <Draw way={['table-composite', 'core-compile']} arrow="->" />
        <Draw way={['core-compile', 'standalone-output']} arrow="->" />
        <Draw way={['core-compile', 'embedded-output']} arrow="->" />
      </Layout>
    </div>

    <div className="sm:hidden">
      <Layout width={360} height={440} style={{ maxWidth: '100%', height: 'auto' }}>
        {renderMobileNode({
          id: 'mobile-react',
          position: [-88, -176],
          title: 'React standalone',
          detail: 'Table · DetailTable · ManualTable',
          width: 164,
          color: 'dimgray',
        })}
        {renderMobileNode({
          id: 'mobile-vanilla',
          position: [88, -176],
          title: 'Vanilla / direct',
          detail: 'renderTable · compileTable',
          width: 164,
          color: 'dimgray',
        })}
        {renderMobileNode({
          id: 'mobile-embedded',
          position: [0, -110],
          title: 'Embedded host',
          detail: '外层 Layout · adapter',
          width: 200,
          color: 'dimgray',
        })}

        <LogicFrame id="mobile-table-runtime">
          <LogicFrameTitle>@retikz/table</LogicFrameTitle>
          {renderMobileNode({
            id: 'mobile-runtime-input',
            position: [0, -40],
            title: 'Table runtime',
            detail: 'spec · theme · data · Definitions',
            width: 220,
            color: 'darkorange',
          })}
          {renderMobileNode({
            id: 'mobile-table-composite',
            position: [0, 30],
            title: 'table.table',
            detail: 'layout-aware composite',
            width: 220,
            color: 'darkorange',
          })}
        </LogicFrame>

        {renderMobileNode({
          id: 'mobile-core-compile',
          position: [0, 100],
          title: 'Core compile',
          detail: 'compileToScene × 1',
          width: 180,
          color: 'dodgerblue',
        })}
        {renderMobileNode({
          id: 'mobile-standalone-output',
          position: [-88, 176],
          title: 'Standalone 输出',
          detail: 'Scene · SVG · root manifest',
          width: 164,
          color: 'dodgerblue',
        })}
        {renderMobileNode({
          id: 'mobile-embedded-output',
          position: [88, 176],
          title: '宿主输出',
          detail: 'outer Scene · artifacts',
          width: 164,
          color: 'dodgerblue',
        })}

        <Draw way={['mobile-react', 'mobile-runtime-input']} arrow="->" />
        <Draw way={['mobile-vanilla', 'mobile-runtime-input']} arrow="->" />
        <Draw way={['mobile-embedded', 'mobile-runtime-input']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
        <Draw way={['mobile-runtime-input', 'mobile-table-composite']} arrow="->" />
        <Draw way={['mobile-table-composite', 'mobile-core-compile']} arrow="->" />
        <Draw way={['mobile-core-compile', 'mobile-standalone-output']} arrow="->" />
        <Draw way={['mobile-core-compile', 'mobile-embedded-output']} arrow="->" />
      </Layout>
    </div>
  </>
);

export default Demo;
