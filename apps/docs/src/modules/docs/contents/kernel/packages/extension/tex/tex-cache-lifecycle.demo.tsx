import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

type LifecycleColor = 'darkorange' | 'dodgerblue' | 'dimgray' | 'gray';

type LifecycleNodeProps = {
  id: string;
  position: [number, number];
  title: string;
  detail: string;
  width?: number;
  color: LifecycleColor;
};

const renderLifecycleNode = ({ id, position, title, detail, width = 116, color }: LifecycleNodeProps) => (
  <Node
    id={id}
    position={position}
    text={[
      { text: title, font: { weight: 'bold' } },
      { text: detail, fill: 'gray', font: { size: 10 } },
    ]}
    minimumSize={{ width, height: 44 }}
    stroke={color}
    fill={color}
    fillOpacity={0.08}
    align="middle"
    font={{ size: 12 }}
    lineHeight={14}
    cornerRadius={4}
  />
);

const DesktopFigure: FC = () => (
  <Layout width={760} height={430} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFigureFrame id="cache-group">
      <LogicFigureFrameTitle>Lowerer cache</LogicFigureFrameTitle>
      {renderLifecycleNode({
        id: 'tex-request',
        position: [-255, -145],
        title: 'TeX request',
        detail: 'source + style',
        color: 'darkorange',
      })}
      {renderLifecycleNode({
        id: 'cache-key',
        position: [-85, -145],
        title: 'Normalized key',
        detail: 'mode · size · color',
        color: 'dimgray',
      })}
      {renderLifecycleNode({
        id: 'cache-lookup',
        position: [85, -145],
        title: 'Cache lookup',
        detail: 'hit or miss',
        color: 'dimgray',
      })}
      {renderLifecycleNode({
        id: 'cached-glyphs',
        position: [255, -145],
        title: 'Cached glyphs',
        detail: 'return result',
        color: 'darkorange',
      })}
      {renderLifecycleNode({
        id: 'engine-parse',
        position: [85, -71],
        title: 'MathJax + SVG',
        detail: 'glyphs + metrics',
        color: 'dodgerblue',
      })}
      {renderLifecycleNode({
        id: 'write-cache',
        position: [255, -71],
        title: 'Write cache',
        detail: 'reuse next time',
        color: 'dimgray',
      })}
    </LogicFigureFrame>

    <LogicFigureFrame id="react-group">
      <LogicFigureFrameTitle>React lifecycle</LogicFigureFrameTitle>
      {renderLifecycleNode({
        id: 'profile-options',
        position: [-230, 20],
        title: 'Profile + extensions',
        detail: 'user configuration',
        width: 130,
        color: 'dodgerblue',
      })}
      {renderLifecycleNode({
        id: 'shared-key',
        position: [0, 20],
        title: 'Shared engine key',
        detail: 'normalized options',
        width: 130,
        color: 'dimgray',
      })}
      {renderLifecycleNode({
        id: 'shared-engine',
        position: [230, 20],
        title: 'Shared engine',
        detail: 'reuse by key',
        width: 130,
        color: 'dimgray',
      })}
      {renderLifecycleNode({
        id: 'configuration-change',
        position: [-230, 90],
        title: 'Configuration change',
        detail: 'new request token',
        width: 130,
        color: 'dodgerblue',
      })}
      {renderLifecycleNode({
        id: 'clear-lowerer',
        position: [0, 90],
        title: 'Reset lowerer',
        detail: 'set undefined',
        width: 130,
        color: 'dimgray',
      })}
      {renderLifecycleNode({
        id: 'stale-result',
        position: [230, 90],
        title: 'Stale result',
        detail: 'discarded',
        width: 130,
        color: 'dimgray',
      })}
      {renderLifecycleNode({
        id: 'initialization-failure',
        position: [-230, 160],
        title: 'Initialization failure',
        detail: 'transient error',
        width: 130,
        color: 'gray',
      })}
      {renderLifecycleNode({
        id: 'remove-failed-entry',
        position: [0, 160],
        title: 'Remove failed entry',
        detail: 'allow retry',
        width: 130,
        color: 'gray',
      })}
      {renderLifecycleNode({
        id: 'retry-mount',
        position: [230, 160],
        title: 'Later mount',
        detail: 'retry initialization',
        width: 130,
        color: 'gray',
      })}
    </LogicFigureFrame>

    <Draw way={['tex-request', 'cache-key']} arrow="->" stroke="gray" />
    <Draw way={['cache-key', 'cache-lookup']} arrow="->" stroke="gray" />
    <Draw way={['cache-lookup', 'cached-glyphs']} arrow="->" stroke="gray" />
    <Draw way={['cache-lookup', 'engine-parse']} arrow="->" stroke="gray" />
    <Draw way={['engine-parse', 'write-cache']} arrow="->" stroke="gray" />
    <Draw way={['write-cache', 'cached-glyphs']} arrow="->" stroke="gray" dashPattern={[4, 3]} />

    <Draw way={['profile-options', 'shared-key']} arrow="->" stroke="gray" />
    <Draw way={['shared-key', 'shared-engine']} arrow="->" stroke="gray" />
    <Draw way={['configuration-change', 'clear-lowerer']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['clear-lowerer', 'stale-result']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['initialization-failure', 'remove-failed-entry']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['remove-failed-entry', 'retry-mount']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

/** 在窄屏上合并同一规则的连续状态，避免固定高度预览裁掉首尾节点 */
const MobileFigure: FC = () => (
  <Layout width={360} height={380} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFigureFrame id="mobile-cache-group">
      <LogicFigureFrameTitle>Lowerer cache</LogicFigureFrameTitle>
      {renderLifecycleNode({
        id: 'mobile-tex-request-key',
        position: [-85, -120],
        title: 'TeX request key',
        detail: 'source · mode · style',
        width: 130,
        color: 'darkorange',
      })}
      {renderLifecycleNode({
        id: 'mobile-cache-lookup',
        position: [85, -120],
        title: 'Cache lookup',
        detail: 'hit → return',
        width: 130,
        color: 'dimgray',
      })}
      {renderLifecycleNode({
        id: 'mobile-engine-parse',
        position: [85, -56],
        title: 'MathJax + SVG',
        detail: 'miss → generate + cache',
        width: 130,
        color: 'dodgerblue',
      })}
      {renderLifecycleNode({
        id: 'mobile-cached-glyphs',
        position: [-85, -56],
        title: 'Cached glyphs',
        detail: 'paths + metrics',
        width: 130,
        color: 'darkorange',
      })}
    </LogicFigureFrame>

    <LogicFigureFrame id="mobile-react-group">
      <LogicFigureFrameTitle>React lifecycle</LogicFigureFrameTitle>
      {renderLifecycleNode({
        id: 'mobile-profile-options',
        position: [-85, 28],
        title: 'Profile + extensions',
        detail: 'normalized engine key',
        width: 130,
        color: 'dodgerblue',
      })}
      {renderLifecycleNode({
        id: 'mobile-shared-engine',
        position: [85, 28],
        title: 'Shared engine',
        detail: 'reuse by key',
        width: 130,
        color: 'dimgray',
      })}
      {renderLifecycleNode({
        id: 'mobile-configuration-change',
        position: [-85, 92],
        title: 'Configuration change',
        detail: 'new request token',
        width: 130,
        color: 'dodgerblue',
      })}
      {renderLifecycleNode({
        id: 'mobile-reset-lowerer',
        position: [85, 92],
        title: 'Reset lowerer',
        detail: 'discard stale result',
        width: 130,
        color: 'dimgray',
      })}
      {renderLifecycleNode({
        id: 'mobile-initialization-failure',
        position: [-85, 156],
        title: 'Initialization failure',
        detail: 'remove failed entry',
        width: 130,
        color: 'gray',
      })}
      {renderLifecycleNode({
        id: 'mobile-retry-mount',
        position: [85, 156],
        title: 'Later mount',
        detail: 'retry initialization',
        width: 130,
        color: 'gray',
      })}
    </LogicFigureFrame>

    <Draw way={['mobile-tex-request-key', 'mobile-cache-lookup']} arrow="->" stroke="gray" />
    <Draw way={['mobile-cache-lookup', 'mobile-cached-glyphs']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['mobile-cache-lookup', 'mobile-engine-parse']} arrow="->" stroke="gray" />
    <Draw way={['mobile-engine-parse', 'mobile-cached-glyphs']} arrow="->" stroke="gray" />

    <Draw way={['mobile-profile-options', 'mobile-shared-engine']} arrow="->" stroke="gray" />
    <Draw way={['mobile-configuration-change', 'mobile-reset-lowerer']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['mobile-initialization-failure', 'mobile-retry-mount']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

/** 展示 lowering 缓存以及 React 共享 engine 生命周期的两条机制 */
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
