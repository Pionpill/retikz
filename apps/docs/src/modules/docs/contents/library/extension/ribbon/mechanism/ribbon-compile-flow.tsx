import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { ribbonCompileFlowI18n } from './ribbon-compile-flow.i18n';

/** Ribbon 编译流程图的语言参数 */
export type RibbonCompileFlowProps = { lang?: Lang };

/** 展示 Ribbon 两种模式与共享 Path host 服务的编译关系 */
const RibbonCompileFlow: FC<RibbonCompileFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = ribbonCompileFlowI18n[lang];
  const text = (key: keyof typeof i18n) =>
    i18n[key].map((line, row) => ({ text: line, ...(row === 0 ? {} : { fill: 'gray', font: { size: 12 } }) }));

  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      flowDefaults={{ entity: { style: { font: { size: 14 } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="ribbon-compile" kind="linear" direction="right">
        <FlowLayout id="ribbon-input" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'parse', text: text('parse'), role: 'activity' },
              { id: 'options', text: text('options'), role: 'activity', kind: 'docs.logic.important' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="ribbon-modes" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'centerline', text: text('centerline'), role: 'activity', kind: 'docs.logic.important' },
              { id: 'boundary', text: text('boundary'), role: 'activity', kind: 'docs.logic.important' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="ribbon-output" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'wrap', text: text('wrap'), role: 'activity' },
              { id: 'render', text: text('render'), role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'parse', target: 'options' },
          { source: 'options', target: 'centerline' },
          { source: 'options', target: 'boundary' },
          { source: 'centerline', target: 'wrap' },
          { source: 'boundary', target: 'wrap' },
          { source: 'wrap', target: 'render' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default RibbonCompileFlow;
