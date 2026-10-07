import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { connectionCompileFigureI18n } from './connection-compile-figure.i18n';

/** 连接编译图属性 */
export type ConnectionCompileFigureProps = { lang?: Lang };

/** 仅展示 Chain 连接关系到 Core 路径的转换 */
const ConnectionCompileFigure: FC<ConnectionCompileFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = connectionCompileFigureI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="compilation" kind="linear" direction="right">
        <FlowEntities
          items={t.map((text, step) => ({
            id: `c${step}`,
            role: step >= 2 ? 'activity' : 'state',
            ...(step === 1
              ? { kind: LogicFigureEntityKind.ImportantData }
              : step === 2
                ? { kind: LogicFigureEntityKind.Important }
                : {}),
            text: text.split('\n').map((line, index) => ({
              text: line,
              font: { size: index === 0 ? 14 : 12 },
              ...(index === 0 ? {} : { fill: 'gray' }),
            })),
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'c0', target: 'c1' },
          { source: 'c1', target: 'c2' },
          { source: 'c2', target: 'c3' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default ConnectionCompileFigure;
