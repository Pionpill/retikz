import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

export type InspectCompileFlowLabels = Readonly<{
  observedCompile: Readonly<{ title: string; detail: string }>;
  ownerOutput: Readonly<{ title: string; detail: string }>;
  primaryScene: Readonly<{ title: string; detail: string; shortDetail: string }>;
  inspectorCallback: Readonly<{ title: string; detail: string }>;
  sealedFragment: Readonly<{ title: string; detail: string }>;
  inspectionInputs: Readonly<{ title: string; detail: string; shortDetail: string }>;
  atomicFrame: Readonly<{ title: string; detail: string }>;
}>;

type FlowNodeProps = Readonly<{
  id: string;
  position: [number, number];
  title: string;
  detail: string;
  color: 'darkorange' | 'dodgerblue' | 'dimgray';
  width?: number;
}>;

/** 绘制统一的双行流程角色节点 */
const renderFlowNode = ({ id, position, title, detail, color, width = 132 }: FlowNodeProps) => (
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

/** 展示主图与 Inspector 辅助分支如何汇入同一原子提交 */
const DesktopFigure: FC<{ labels: InspectCompileFlowLabels }> = props => {
  const { labels } = props;
  return (
    <Layout width={680} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <LogicFigureFrame id="inspect-core-group">
        <LogicFigureFrameTitle>@retikz/core</LogicFigureFrameTitle>
        {renderFlowNode({
          id: 'observed-compile',
          position: [-245, -42],
          ...labels.observedCompile,
          color: 'dimgray',
        })}
        {renderFlowNode({
          id: 'owner-output',
          position: [-82, -42],
          ...labels.ownerOutput,
          color: 'darkorange',
        })}
        {renderFlowNode({
          id: 'primary-scene',
          position: [-245, 50],
          title: labels.primaryScene.title,
          detail: labels.primaryScene.detail,
          color: 'darkorange',
        })}
      </LogicFigureFrame>

      <LogicFigureFrame id="inspect-package-group">
        <LogicFigureFrameTitle>@retikz/inspect</LogicFigureFrameTitle>
        {renderFlowNode({
          id: 'inspector-callback',
          position: [82, -42],
          ...labels.inspectorCallback,
          color: 'dodgerblue',
        })}
        {renderFlowNode({
          id: 'sealed-fragment',
          position: [82, 50],
          ...labels.sealedFragment,
          color: 'dodgerblue',
        })}
      </LogicFigureFrame>

      {renderFlowNode({
        id: 'inspection-inputs',
        position: [82, -116],
        title: labels.inspectionInputs.title,
        detail: labels.inspectionInputs.detail,
        color: 'dimgray',
      })}
      {renderFlowNode({
        id: 'atomic-frame',
        position: [258, 50],
        ...labels.atomicFrame,
        color: 'darkorange',
        width: 148,
      })}

      <Draw way={['observed-compile', 'owner-output']} arrow="->" stroke="gray" />
      <Draw way={['observed-compile', 'primary-scene']} arrow="->" stroke="gray" />
      <Draw way={['owner-output', 'inspector-callback']} arrow="->" stroke="gray" />
      <Draw way={['inspection-inputs', 'inspector-callback']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
      <Draw way={['inspector-callback', 'sealed-fragment']} arrow="->" stroke="gray" />
      <Draw way={['primary-scene', 'atomic-frame']} arrow="->" stroke="gray" />
      <Draw way={['sealed-fragment', 'atomic-frame']} arrow="->" stroke="gray" />
    </Layout>
  );
};

/** 在窄屏上保留主分支纵向顺序，并把主图与选择输入放到两侧 */
const MobileFigure: FC<{ labels: InspectCompileFlowLabels }> = props => {
  const { labels } = props;
  return (
    <Layout width={360} height={390} style={{ maxWidth: '100%', height: 'auto' }}>
      {renderFlowNode({
        id: 'mobile-observed-compile',
        position: [0, -155],
        ...labels.observedCompile,
        color: 'dimgray',
        width: 128,
      })}
      {renderFlowNode({
        id: 'mobile-owner-output',
        position: [0, -78],
        ...labels.ownerOutput,
        color: 'darkorange',
        width: 128,
      })}
      {renderFlowNode({
        id: 'mobile-inspector-callback',
        position: [0, 0],
        ...labels.inspectorCallback,
        color: 'dodgerblue',
        width: 128,
      })}
      {renderFlowNode({
        id: 'mobile-sealed-fragment',
        position: [0, 78],
        ...labels.sealedFragment,
        color: 'dodgerblue',
        width: 128,
      })}
      {renderFlowNode({
        id: 'mobile-atomic-frame',
        position: [0, 155],
        ...labels.atomicFrame,
        color: 'darkorange',
        width: 142,
      })}
      {renderFlowNode({
        id: 'mobile-primary-scene',
        position: [-112, 78],
        title: labels.primaryScene.title,
        detail: labels.primaryScene.shortDetail,
        color: 'darkorange',
        width: 104,
      })}
      {renderFlowNode({
        id: 'mobile-inspection-inputs',
        position: [112, 0],
        title: labels.inspectionInputs.title,
        detail: labels.inspectionInputs.shortDetail,
        color: 'dimgray',
        width: 104,
      })}

      <Draw way={['mobile-observed-compile', 'mobile-owner-output']} arrow="->" stroke="gray" />
      <Draw way={['mobile-owner-output', 'mobile-inspector-callback']} arrow="->" stroke="gray" />
      <Draw
        way={['mobile-inspection-inputs', 'mobile-inspector-callback']}
        arrow="->"
        stroke="gray"
        dashPattern={[4, 3]}
      />
      <Draw way={['mobile-inspector-callback', 'mobile-sealed-fragment']} arrow="->" stroke="gray" />
      <Draw way={['mobile-sealed-fragment', 'mobile-atomic-frame']} arrow="->" stroke="gray" />
      <Draw way={['mobile-primary-scene', 'mobile-atomic-frame']} arrow="->" stroke="gray" />
    </Layout>
  );
};

/** 按当前语言标签渲染桌面与窄屏流程图 */
export const InspectCompileFlowFigure: FC<{ labels: InspectCompileFlowLabels }> = props => {
  const { labels } = props;
  return (
    <>
      <div className="hidden sm:block">
        <DesktopFigure labels={labels} />
      </div>
      <div className="sm:hidden">
        <MobileFigure labels={labels} />
      </div>
    </>
  );
};
