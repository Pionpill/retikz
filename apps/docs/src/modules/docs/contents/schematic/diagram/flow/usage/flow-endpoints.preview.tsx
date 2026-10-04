import { FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-endpoints.controls';
import { flowEndpointsI18n } from './flow-endpoints.i18n';

/** 按可见节点声明关系，使目标侧边位置随连线数量重新分配 */
export const renderFlowEndpointsPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang,
): ReactElement => {
  const copy = flowEndpointsI18n[lang];
  return (
    <PreviewFlowDiagram style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowEntities
        items={[
          ...(values.first ? [{ id: 'a', text: copy.first, role: 'activity' }] : []),
          ...(values.second ? [{ id: 'b', text: copy.second, role: 'activity' }] : []),
          ...(values.third ? [{ id: 'c', text: copy.third, role: 'activity' }] : []),
          { id: 'result', text: copy.result, role: 'activity', layout: { minimumSize: { height: 100 } } },
        ]}
      />
      <FlowRelations
        items={[...(values.first ? ['a'] : []), ...(values.second ? ['b'] : []), ...(values.third ? ['c'] : [])].map(
          id => ({
            source: id,
            target: { id: 'result', side: 'left', overlap: 'separate' },
          }),
        )}
      />
    </PreviewFlowDiagram>
  );
};
