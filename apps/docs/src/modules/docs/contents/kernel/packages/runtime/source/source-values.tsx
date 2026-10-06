import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { sourceValuesI18n } from './source-values.i18n';

/** 输入隔离图的语言配置 */
export type SourceValuesProps = Readonly<{ lang?: Lang }>;

/** 表单文本经数值存储转换为只读坐标元组 */
const SourceValues: FC<SourceValuesProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = sourceValuesI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="values" kind="linear" direction="right">
        <FlowEntities
          items={[
            { id: 'input', text: i18n.input, role: 'state' },
            { id: 'value', text: i18n.value, role: 'state' },
            { id: 'read', text: i18n.read, role: 'state' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'value', label: i18n.capture },
          { source: 'value', target: 'read', label: i18n.expose },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default SourceValues;
