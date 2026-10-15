import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-container-height.controls';
import { flowContainerHeightI18n } from './flow-container-height.i18n';

/** 分组等高时增大短流程间距，保持节点自然尺寸 */
export const renderFlowContainerHeightPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang,
): ReactElement => {
  const copy = flowContainerHeightI18n[lang];
  return (
    <PreviewFlowDiagram style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="groups"
        kind="linear"
        direction="right"
        align="start"
        {...(values.equal ? { containerHeight: 'match-largest' } : {})}
      >
        <FlowGroup id="short" caption={{ title: { text: copy.first } }} background={{ fill: 'none' }}>
          <FlowLayout id="short-column" kind="linear" direction="down" itemWidth="match-largest">
            <FlowEntities
              items={[
                { id: 'a', role: 'activity', text: copy.start },
                { id: 'b', role: 'activity', text: copy.finish },
              ]}
            />
          </FlowLayout>
        </FlowGroup>
        <FlowGroup id="long" caption={{ title: { text: copy.second } }} background={{ fill: 'none' }}>
          <FlowLayout id="long-column" kind="linear" direction="down" itemWidth="match-largest">
            <FlowEntities
              items={[
                { id: 'c', role: 'activity', text: copy.start },
                { id: 'd', role: 'activity', text: copy.check },
                { id: 'e', role: 'activity', text: copy.finish },
              ]}
            />
          </FlowLayout>
        </FlowGroup>
      </FlowLayout>
      <FlowRelations
        items={[
          ['a', 'b'],
          ['c', 'd'],
          ['d', 'e'],
        ]}
      />
    </PreviewFlowDiagram>
  );
};
