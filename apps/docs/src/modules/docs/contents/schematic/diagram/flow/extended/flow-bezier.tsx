import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { flowBezierI18n } from './flow-bezier.i18n';
/** 自动贝塞尔示例语言 */
export type FlowBezierProps = Readonly<{ lang?: Lang }>;
/** 固定三个节点，由三次贝塞尔自动生成绕行控制点 */
const Demo: FC<FlowBezierProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowBezierI18n[lang];
  return (
    <PreviewFlowDiagram style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="row" kind="linear" direction="right">
        <FlowEntities
          items={[
            { id: 'a', text: copy.source },
            { id: 'obstacle', text: copy.obstacle },
            { id: 'b', text: copy.target },
          ]}
        />
      </FlowLayout>
      <FlowRelations items={[{ source: 'a', target: 'b', routing: { kind: 'cubic' }, label: copy.label }]} />
    </PreviewFlowDiagram>
  );
};
export default Demo;
