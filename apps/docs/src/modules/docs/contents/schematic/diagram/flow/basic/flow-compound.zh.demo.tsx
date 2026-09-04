import type { FlowDirectionValue, FlowLayoutAlignmentValue } from '@retikz/diagram/flow';
import type { ReactElement } from 'react';

import { FlowEntity, FlowGroup, FlowLayout, FlowRelation } from '@retikz/diagram-react/flow';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { flowCompoundControls, previewControlContract } from './flow-compound.controls';

/** 注册 controls 自动发现的回退导出 */
export const previewControls = flowCompoundControls;

const flowDirections: ReadonlyArray<FlowDirectionValue> = ['up', 'right', 'down', 'left'];
const flowLayoutAlignments: ReadonlyArray<FlowLayoutAlignmentValue> = ['start', 'center', 'end'];

/** 将 controls 值收窄为公开 Flow direction */
const flowDirectionOf = (value: string): FlowDirectionValue => {
  const direction = flowDirections.find(candidate => candidate === value);
  if (direction === undefined) throw new Error(`Unsupported Flow direction: ${value}`);
  return direction;
};

/** 将 controls 值收窄为公开 Flow Layout alignment */
const flowLayoutAlignmentOf = (value: string): FlowLayoutAlignmentValue => {
  const alignment = flowLayoutAlignments.find(candidate => candidate === value);
  if (alignment === undefined) throw new Error(`Unsupported Flow Layout alignment: ${value}`);
  return alignment;
};

/** 用指定 controls 值渲染中文 Flow 分组排布 */
export const renderFlowCompoundPreview = (
  values: PreviewControlValuesFor<typeof flowCompoundControls>,
): ReactElement => (
  <FlowDiagram width={400} height={460} viewBox={{ x: -100, y: -86, width: 400, height: 460 }}>
    <FlowLayout id="sections" direction="down" gap={28} align="center">
      <FlowGroup
        id="service"
        label="服务入口"
        layout={{
          direction: flowDirectionOf(values.groupDirection),
          nodeGap: values.groupNodeGap,
          rankGap: values.groupRankGap,
        }}
      >
        <FlowEntity id="request" text="请求" role="gateway" />
        <FlowEntity id="validate" text="校验" role="activity" />
        <FlowEntity id="authorize" text="授权" role="activity" />
      </FlowGroup>
      <FlowLayout
        id="storage"
        direction={flowDirectionOf(values.layoutDirection)}
        gap={values.layoutGap}
        align={flowLayoutAlignmentOf(values.layoutAlign)}
      >
        <FlowEntity id="queue" text="队列" role="state" />
        <FlowEntity id="database" text="数据库" role="resource" />
      </FlowLayout>
    </FlowLayout>
    <FlowRelation source="request" target="validate" />
    <FlowRelation source="request" target="authorize" />
    <FlowRelation source="service" target="queue" />
    <FlowRelation source="queue" target="database" />
  </FlowDiagram>
);

const controlledPreview = defineControlledPreview(previewControlContract, renderFlowCompoundPreview);

export const previewSource = controlledPreview.source;
export default controlledPreview.Component;
