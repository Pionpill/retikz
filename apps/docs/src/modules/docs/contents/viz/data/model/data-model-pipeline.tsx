import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { dataModelPipelineI18n } from './data-model-pipeline.i18n';

/** 数据模型流程图的语言参数 */
export type DataModelPipelineProps = Readonly<{ lang?: Lang }>;

/** 展示从外部数据到消费模块的主流程与字段约束 */
const Demo: FC<DataModelPipelineProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = dataModelPipelineI18n[lang];

  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'down', nodeGap: 20 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="data-model-pipeline" kind="linear" direction="down" align="center" gap={36}>
        <FlowEntities
          items={[
            {
              id: 'contract',
              text: [
                { text: i18n.contract.title, font: { size: 14, weight: 'bold' } },
                { text: i18n.contract.detail, fill: 'gray', font: { size: 12 } },
              ],
              role: 'state',
              kind: LogicFigureEntityKind.ImportantData,
            },
          ]}
        />
        <FlowLayout id="data-path" kind="linear" direction="right" align="center">
          <FlowEntities
            items={[
              {
                id: 'rows',
                text: [
                  { text: i18n.rows.title, font: { size: 14, weight: 'bold' } },
                  { text: i18n.rows.detail, fill: 'gray', font: { size: 12 } },
                ],
                role: 'resource',
              },
              {
                id: 'canonical',
                text: [
                  { text: i18n.canonical.title, font: { size: 14, weight: 'bold' } },
                  { text: i18n.canonical.detail, fill: 'gray', font: { size: 12 } },
                ],
                role: 'state',
              },
              {
                id: 'consumers',
                text: [
                  { text: i18n.consumers.title, font: { size: 14, weight: 'bold' } },
                  { text: i18n.consumers.detail, fill: 'gray', font: { size: 12 } },
                ],
                role: 'activity',
                kind: LogicFigureEntityKind.Important,
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'rows', target: 'canonical', label: i18n.parse },
          { source: 'canonical', target: 'consumers', label: i18n.handoff },
          {
            source: 'contract',
            target: 'canonical',
            label: i18n.constrain,
            routing: { kind: 'orthogonal' },
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default Demo;
