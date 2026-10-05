import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-container-width.controls';
import { flowContainerWidthI18n } from './flow-container-width.i18n';

/** 比较自然宽度、外壳等宽和节点填充 */
export const renderFlowContainerWidthPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang,
): ReactElement => {
  const copy = flowContainerWidthI18n[lang];
  const first = (
    <FlowLayout
      id="first-row"
      kind="linear"
      direction="right"
      {...(values.equal && values.fill ? { itemWidth: 'fill' } : {})}
    >
      <FlowEntities
        items={[
          { id: 'a', text: copy.first, role: 'activity' },
          { id: 'b', text: copy.second, role: 'activity' },
        ]}
      />
    </FlowLayout>
  );
  const second = (
    <FlowLayout
      id="second-row"
      kind="linear"
      direction="right"
      {...(values.equal && values.fill ? { itemWidth: 'fill' } : {})}
    >
      <FlowEntities
        items={[
          { id: 'c', text: copy.third, role: 'activity' },
          { id: 'd', text: copy.fourth, role: 'activity' },
        ]}
      />
    </FlowLayout>
  );
  return (
    <PreviewFlowDiagram style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="rows"
        kind="linear"
        direction="down"
        {...(values.equal ? { containerWidth: 'match-largest' } : {})}
      >
        {values.group ? (
          <FlowGroup id="first-group" caption={{ title: { text: copy.upper } }}>
            {first}
          </FlowGroup>
        ) : (
          first
        )}
        {values.group ? (
          <FlowGroup id="second-group" caption={{ title: { text: copy.lower } }}>
            {second}
          </FlowGroup>
        ) : (
          second
        )}
      </FlowLayout>
      <FlowRelations
        items={[
          ['a', 'b'],
          ['c', 'd'],
        ]}
      />
    </PreviewFlowDiagram>
  );
};
