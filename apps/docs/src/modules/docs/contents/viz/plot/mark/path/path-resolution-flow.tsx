import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pathResolutionFlowI18n } from './path-resolution-flow.i18n';

/** 路径图元解析流程图语言 */
export type PathResolutionFlowProps = { lang?: Lang };

/** 路径图元从输入到 Path 与 Scene 的解析主线 */
const PathResolutionFlow: FC<PathResolutionFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathResolutionFlowI18n[lang];
  const label = (value: string) =>
    value.split('\n').map((line, index) => ({
      text: line,
      font: { size: index === 0 ? 14 : 12 },
      ...(index === 0 ? {} : { fill: 'gray' }),
    }));

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="path-resolution" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="prepare" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'group', role: 'activity', text: label(text.group) },
              { id: 'segment', role: 'activity', text: label(text.segment) },
              { id: 'project', role: 'activity', text: label(text.project) },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="draw" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              { id: 'connect', role: 'activity', kind: LogicFigureEntityKind.Important, text: label(text.connect) },
              { id: 'lower', role: 'activity', text: label(text.lower) },
              { id: 'render', role: 'activity', text: label(text.render) },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'group', target: 'segment' },
          { source: 'segment', target: 'project' },
          { source: 'project', target: 'connect', routing: { kind: 'orthogonal' } },
          { source: 'connect', target: 'lower' },
          { source: 'lower', target: 'render' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default PathResolutionFlow;
