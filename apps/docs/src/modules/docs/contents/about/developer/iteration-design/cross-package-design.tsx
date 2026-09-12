import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { crossPackageDesignI18n } from './cross-package-design.i18n';

/** 跨包设计关系图的本地化参数 */
export type CrossPackageDesignFigureProps = Readonly<{ lang?: Lang }>;

/** 展示问题如何经由 owner、契约和统一扩展路径形成可验证闭环 */
export const CrossPackageDesignFigure: FC<CrossPackageDesignFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = crossPackageDesignI18n[lang];

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} layout={{ direction: 'right', nodeGap: 16 }}>
      <FlowLayout kind="linear" id="cross-package-design" direction="right" align="center" gap={32}>
        <FlowEntities
          items={[
            { id: 'problem', text: i18n.problem, role: 'activity', kind: LogicFigureEntityKind.Secondary },
            { id: 'owner', text: i18n.owner, role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'contract', text: i18n.contract, role: 'activity', kind: LogicFigureEntityKind.Important },
            {
              id: 'extension',
              text: i18n.extension,
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
            },
            { id: 'loop', text: i18n.loop, role: 'activity', kind: LogicFigureEntityKind.Secondary },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'problem', target: 'owner', label: i18n.assign },
          { source: 'owner', target: 'contract', label: i18n.define },
          { source: 'contract', target: 'extension', label: i18n.extend },
          { source: 'extension', target: 'loop', label: i18n.verify },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default CrossPackageDesignFigure;
