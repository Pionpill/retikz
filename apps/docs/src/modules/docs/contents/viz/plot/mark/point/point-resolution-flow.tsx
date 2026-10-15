import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pointResolutionFlowI18n } from './point-resolution-flow.i18n';

/** 点图元解析流程图语言 */
export type PointResolutionFlowProps = { lang?: Lang };

/** 点图元从输入到 Node 与 Scene 的解析主线 */
const PointResolutionFlow: FC<PointResolutionFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = pointResolutionFlowI18n[lang];
  const label = (value: string) =>
    value.split('\n').map((line, index) => ({
      text: line,
      font: { size: index === 0 ? 14 : 12 },
      ...(index === 0 ? {} : { fill: 'gray' }),
    }));

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="point-resolution" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="prepare" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'input', role: 'activity', text: label(text.input) },
              { id: 'channels', role: 'activity', text: label(text.channels) },
              { id: 'position', role: 'activity', text: label(text.position) },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="draw" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'node', role: 'activity', kind: LogicFigureEntityKind.Important, text: label(text.node) },
              { id: 'scene', role: 'activity', text: label(text.scene) },
              { id: 'render', role: 'activity', text: label(text.render) },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'channels' },
          { source: 'channels', target: 'position' },
          { source: 'position', target: 'node', routing: { kind: 'orthogonal' } },
          { source: 'node', target: 'scene' },
          { source: 'scene', target: 'render' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default PointResolutionFlow;
