import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

type FlowNodeProps = {
  id: string;
  position: [number, number];
  title: string;
  detail: string;
  color: 'darkorange' | 'dodgerblue' | 'dimgray';
  width?: number;
};

const renderFlowNode = ({ id, position, title, detail, color, width = 136 }: FlowNodeProps) => (
  <Node
    id={id}
    position={position}
    text={[
      { text: title, font: { weight: 'bold' } },
      { text: detail, fill: 'gray', font: { size: 10 } },
    ]}
    minimumSize={{ width, height: 48 }}
    stroke={color}
    fill={color}
    fillOpacity={0.08}
    align="middle"
    font={{ size: 12 }}
    lineHeight={14}
    cornerRadius={4}
  />
);

/** 展示公式在 Core 与 Tex 之间往返一次的完整 lowering 链路 */
const DesktopFigure: FC = () => (
  <Layout width={640} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFigureFrame id="core-boundary-group">
      <LogicFigureFrameTitle>@retikz/core</LogicFigureFrameTitle>
      {renderFlowNode({
        id: 'core-text-pipeline',
        position: [-210, -42],
        title: 'Core text pipeline',
        detail: 'formula → math run',
        color: 'dimgray',
      })}
      {renderFlowNode({
        id: 'core-scene-output',
        position: [-210, 42],
        title: 'Core Scene output',
        detail: 'GroupPrim + PathPrim',
        color: 'darkorange',
      })}
    </LogicFigureFrame>

    <LogicFigureFrame id="tex-lowering-group">
      <LogicFigureFrameTitle>@retikz/tex · SVG lowering</LogicFigureFrameTitle>
      {renderFlowNode({
        id: 'lower-tex-adapter',
        position: [-20, -42],
        title: 'LowerTex adapter',
        detail: 'source + display + style',
        color: 'dodgerblue',
      })}
      {renderFlowNode({
        id: 'mathjax-svg-engine',
        position: [170, -42],
        title: 'MathJax SVG engine',
        detail: 'TeX → SVG string',
        color: 'dodgerblue',
      })}
      {renderFlowNode({
        id: 'svg-lowerer',
        position: [170, 42],
        title: 'SVG lowerer',
        detail: 'path + transform → commands',
        color: 'dodgerblue',
      })}
      {renderFlowNode({
        id: 'lowered-tex',
        position: [-20, 42],
        title: 'LoweredTex',
        detail: 'paths + metrics',
        color: 'darkorange',
      })}
    </LogicFigureFrame>

    <Draw way={['core-text-pipeline', 'lower-tex-adapter']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['lower-tex-adapter', 'mathjax-svg-engine']} arrow="->" stroke="gray" />
    <Draw way={['mathjax-svg-engine', 'svg-lowerer']} arrow="->" stroke="gray" />
    <Draw way={['svg-lowerer', 'lowered-tex']} arrow="->" stroke="gray" />
    <Draw way={['lowered-tex', 'core-scene-output']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

/** 在窄屏上用两列蛇形布局保留可读字号与短连接线 */
const MobileFigure: FC = () => (
  <Layout width={360} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
    {renderFlowNode({
      id: 'mobile-core-text-pipeline',
      position: [-86, -82],
      title: 'Core text pipeline',
      detail: 'formula → math run',
      color: 'dimgray',
      width: 128,
    })}

    {renderFlowNode({
      id: 'mobile-lower-tex-adapter',
      position: [86, -82],
      title: 'LowerTex adapter',
      detail: 'source + display + style',
      color: 'dodgerblue',
      width: 128,
    })}
    {renderFlowNode({
      id: 'mobile-mathjax-svg-engine',
      position: [86, 0],
      title: 'MathJax SVG engine',
      detail: 'TeX → SVG string',
      color: 'dodgerblue',
      width: 128,
    })}
    {renderFlowNode({
      id: 'mobile-svg-lowerer',
      position: [-86, 0],
      title: 'SVG lowerer',
      detail: 'path + transform',
      color: 'dodgerblue',
      width: 128,
    })}
    {renderFlowNode({
      id: 'mobile-lowered-tex',
      position: [-86, 82],
      title: 'LoweredTex',
      detail: 'paths + metrics',
      color: 'darkorange',
      width: 128,
    })}

    {renderFlowNode({
      id: 'mobile-core-scene-output',
      position: [86, 82],
      title: 'Core Scene output',
      detail: 'GroupPrim + PathPrim',
      color: 'darkorange',
      width: 128,
    })}

    <Draw
      way={['mobile-core-text-pipeline', 'mobile-lower-tex-adapter']}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw way={['mobile-lower-tex-adapter', 'mobile-mathjax-svg-engine']} arrow="->" stroke="gray" />
    <Draw way={['mobile-mathjax-svg-engine', 'mobile-svg-lowerer']} arrow="->" stroke="gray" />
    <Draw way={['mobile-svg-lowerer', 'mobile-lowered-tex']} arrow="->" stroke="gray" />
    <Draw way={['mobile-lowered-tex', 'mobile-core-scene-output']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

const Demo: FC = () => (
  <>
    <div className="hidden sm:block">
      <DesktopFigure />
    </div>
    <div className="sm:hidden">
      <MobileFigure />
    </div>
  </>
);

export default Demo;
