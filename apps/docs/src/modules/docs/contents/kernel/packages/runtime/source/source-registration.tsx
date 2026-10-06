import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { sourceRegistrationI18n } from './source-registration.i18n';

/** 来源注册图的语言配置 */
export type SourceRegistrationProps = Readonly<{ lang?: Lang }>;

/** 来源定义与初始输入共同接入 Runtime */
const SourceRegistration: FC<SourceRegistrationProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = sourceRegistrationI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="registration" kind="linear" direction="right" align="center">
        <FlowEntities items={[{ id: 'definition', text: i18n.definition, role: 'state' }]} />
        <FlowLayout id="inputs" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'sources', text: i18n.sources, role: 'resource' },
              { id: 'input', text: i18n.input, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="setup" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'computations', text: i18n.computations, role: 'resource' },
              { id: 'runtime', text: i18n.runtime, role: 'activity', kind: LogicFigureEntityKind.Important },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'definition', target: 'sources', label: i18n.register },
          { source: 'definition', target: 'input', label: i18n.bind },
          { source: 'sources', target: 'computations' },
          { source: 'sources', target: 'runtime', label: 'sources' },
          { source: 'computations', target: 'runtime', label: 'computations' },
          { source: 'input', target: 'runtime', label: 'initialSnapshots' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default SourceRegistration;
