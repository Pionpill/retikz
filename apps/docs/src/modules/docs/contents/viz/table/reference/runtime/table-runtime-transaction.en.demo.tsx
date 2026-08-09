import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

type MobileFlowNode = {
  id: string;
  position: [number, number];
  title: string;
  detail: string;
  width: number;
  color: 'darkorange' | 'dodgerblue' | 'dimgray' | 'gray';
};

/** 以窄屏可读的双行样式渲染 transaction 节点 */
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

/** 一次 Table layout transaction 从 canonical model 到 Scene 与 manifest 的处理主链 */
const Demo: FC = () => (
  <>
    <div className="hidden sm:block">
      <Layout width={800} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
        <LogicFigureFrame id="transaction">
          <LogicFigureFrameTitle>One Table layout transaction</LogicFigureFrameTitle>
          <Node
            id="canonical"
            position={[-278, 0]}
            minimumSize={{ width: 126, height: 54 }}
            stroke="darkorange"
            fill="darkorange"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>Canonical model</Text>
            <Text fill="gray" font={{ size: 11 }}>
              parse · Theme · normalize · present
            </Text>
          </Node>
          <Node
            id="intrinsic"
            position={[-140, 0]}
            minimumSize={{ width: 120, height: 54 }}
            stroke="dodgerblue"
            fill="dodgerblue"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>Natural probes</Text>
            <Text fill="gray" font={{ size: 11 }}>
              NaturalLayoutProposal
            </Text>
          </Node>
          <Node
            id="columns"
            position={[0, 0]}
            minimumSize={{ width: 128, height: 54 }}
            stroke="dodgerblue"
            fill="dodgerblue"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>Columns + wrap</Text>
            <Text fill="gray" font={{ size: 11 }}>
              x range proposal
            </Text>
          </Node>
          <Node
            id="rows"
            position={[145, 0]}
            minimumSize={{ width: 138, height: 54 }}
            stroke="dodgerblue"
            fill="dodgerblue"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>Rows + placement</Text>
            <Text fill="gray" font={{ size: 11 }}>
              Cell boxes · borders
            </Text>
          </Node>
          <Node
            id="publish"
            position={[295, 0]}
            minimumSize={{ width: 132, height: 54 }}
            stroke="dodgerblue"
            fill="dodgerblue"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>Replay + publish</Text>
            <Text fill="gray" font={{ size: 11 }}>
              replay final probe only
            </Text>
          </Node>
        </LogicFigureFrame>

        <Node
          id="runtime-inputs"
          position={[-278, 98]}
          minimumSize={{ width: 138, height: 46 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.06}
          cornerRadius={4}
          align="middle"
          lineHeight={15}
        >
          <Text font={{ size: 13, weight: 'bold' }}>Runtime inputs</Text>
          <Text fill="gray" font={{ size: 11 }}>
            Theme · datasets · Definitions
          </Text>
        </Node>
        <Node
          id="parent-constraint"
          position={[0, 98]}
          minimumSize={{ width: 138, height: 46 }}
          stroke="gray"
          fill="gray"
          fillOpacity={0.06}
          cornerRadius={4}
          align="middle"
          lineHeight={15}
        >
          <Text font={{ size: 13, weight: 'bold' }}>Parent x proposal</Text>
          <Text fill="gray" font={{ size: 11 }}>
            exact / range.max
          </Text>
        </Node>
        <Node
          id="scene-output"
          position={[230, 98]}
          minimumSize={{ width: 104, height: 46 }}
          stroke="dimgray"
          fill="dimgray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={15}
        >
          <Text font={{ size: 13, weight: 'bold' }}>Scene</Text>
          <Text fill="gray" font={{ size: 11 }}>
            children
          </Text>
        </Node>
        <Node
          id="manifest-output"
          position={[355, 98]}
          minimumSize={{ width: 128, height: 46 }}
          stroke="dimgray"
          fill="dimgray"
          fillOpacity={0.08}
          cornerRadius={4}
          align="middle"
          lineHeight={15}
        >
          <Text font={{ size: 13, weight: 'bold' }}>TableLayoutManifest</Text>
          <Text fill="gray" font={{ size: 11 }}>
            immutable artifact
          </Text>
        </Node>

        <Draw way={['canonical', 'intrinsic']} arrow="->" />
        <Draw way={['intrinsic', 'columns']} arrow="->" />
        <Draw way={['columns', 'rows']} arrow="->" />
        <Draw way={['rows', 'publish']} arrow="->" />
        <Draw way={['runtime-inputs', 'canonical']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
        <Draw way={['parent-constraint', 'columns']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
        <Draw way={['publish', 'scene-output']} arrow="->" />
        <Draw way={['publish', 'manifest-output']} arrow="->" />
      </Layout>
    </div>

    <div className="sm:hidden">
      <Layout width={360} height={520} style={{ maxWidth: '100%', height: 'auto' }}>
        <LogicFigureFrame id="mobile-transaction">
          <LogicFigureFrameTitle>One Table layout transaction</LogicFigureFrameTitle>
          {renderMobileNode({
            id: 'mobile-canonical',
            position: [-40, -150],
            title: 'Canonical model',
            detail: 'parse · Theme · normalize · present',
            width: 200,
            color: 'darkorange',
          })}
          {renderMobileNode({
            id: 'mobile-intrinsic',
            position: [-40, -85],
            title: 'Natural probes',
            detail: 'NaturalLayoutProposal',
            width: 200,
            color: 'dodgerblue',
          })}
          {renderMobileNode({
            id: 'mobile-columns',
            position: [-40, -20],
            title: 'Columns + wrap',
            detail: 'x range proposal',
            width: 200,
            color: 'dodgerblue',
          })}
          {renderMobileNode({
            id: 'mobile-rows',
            position: [-40, 45],
            title: 'Rows + placement',
            detail: 'Cell boxes · borders',
            width: 200,
            color: 'dodgerblue',
          })}
          {renderMobileNode({
            id: 'mobile-publish',
            position: [-40, 110],
            title: 'Replay + publish',
            detail: 'replay final probe only',
            width: 200,
            color: 'dodgerblue',
          })}
        </LogicFigureFrame>

        {renderMobileNode({
          id: 'mobile-runtime-inputs',
          position: [0, -220],
          title: 'Runtime inputs',
          detail: 'Theme · datasets · Definitions',
          width: 180,
          color: 'gray',
        })}
        {renderMobileNode({
          id: 'mobile-parent-constraint',
          position: [130, -20],
          title: 'Parent x proposal',
          detail: 'exact / range.max',
          width: 100,
          color: 'gray',
        })}
        {renderMobileNode({
          id: 'mobile-scene-output',
          position: [-95, 190],
          title: 'Scene',
          detail: 'children',
          width: 130,
          color: 'dimgray',
        })}
        {renderMobileNode({
          id: 'mobile-manifest-output',
          position: [78, 190],
          title: 'TableLayoutManifest',
          detail: 'immutable artifact',
          width: 176,
          color: 'dimgray',
        })}

        <Draw way={['mobile-canonical', 'mobile-intrinsic']} arrow="->" />
        <Draw way={['mobile-intrinsic', 'mobile-columns']} arrow="->" />
        <Draw way={['mobile-columns', 'mobile-rows']} arrow="->" />
        <Draw way={['mobile-rows', 'mobile-publish']} arrow="->" />
        <Draw way={['mobile-runtime-inputs', 'mobile-canonical']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
        <Draw way={['mobile-parent-constraint', 'mobile-columns']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
        <Draw way={['mobile-publish', 'mobile-scene-output']} arrow="->" />
        <Draw way={['mobile-publish', 'mobile-manifest-output']} arrow="->" />
      </Layout>
    </div>
  </>
);

export default Demo;
