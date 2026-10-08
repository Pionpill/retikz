import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { fieldResolutionI18n } from './field-resolution.i18n';

/** 字段声明解析流程图的语言参数 */
export type FieldResolutionProps = Readonly<{ lang?: Lang }>;

/** 展示字段属性组合如何决定类型、解析规则与类别顺序校验 */
const FieldResolution: FC<FieldResolutionProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = fieldResolutionI18n[lang];
  const entities = (ids: Array<keyof typeof i18n>) =>
    ids.map(id => ({
      id,
      role: id === 'input' || id === 'output' ? ('resource' as const) : ('activity' as const),
      text: [
        { text: i18n[id].title, font: { size: 14 } },
        { text: i18n[id].detail, fill: 'gray', font: { size: 12 } },
      ],
    }));

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="field-resolution" kind="linear" direction="down" align="center">
        <FlowEntities items={entities(['input'])} />
        <FlowLayout id="field-options" kind="linear" direction="right" align="center">
          <FlowEntities items={entities(['format', 'declared', 'infer'])} />
        </FlowLayout>
        <FlowEntities items={entities(['parse'])} />
        <FlowLayout id="field-result" kind="linear" direction="right" align="center">
          <FlowEntities items={entities(['order', 'output'])} />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          ...(['infer', 'declared', 'format'] as const).flatMap(id => [
            { source: 'input', target: id },
            { source: id, target: 'parse' },
          ]),
          { source: 'parse', target: 'order' },
          { source: 'order', target: 'output' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default FieldResolution;
