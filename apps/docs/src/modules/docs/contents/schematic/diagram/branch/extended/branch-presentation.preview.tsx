import { Branch, BranchNode } from '@retikz/diagram-react/branch';
import { LegendSchema } from '@retikz/standard/presentation';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewBranchDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './branch-presentation.controls';
import { branchPresentationI18n } from './branch-presentation.i18n';

/** 根据控件值独立显示各展示区域 */
export const renderPreview = (values: PreviewControlValuesFor<typeof previewControls>, lang: Lang): ReactElement => {
  const t = branchPresentationI18n[lang];
  return (
    <PreviewBranchDiagram
      mainBranch="main"
      {...(values.legend ? { frame: { legendPosition: 'bottom' } } : {})}
      presentation={{
        ...(values.title ? { title: { text: t.title } } : {}),
        ...(values.description ? { description: { text: t.description } } : {}),
        ...(values.legend
          ? {
              legend: LegendSchema.parse({
                namespace: 'standard',
                type: 'legend',
                content: {
                  kind: 'items',
                  items: [
                    {
                      key: 'side',
                      sample: {
                        type: 'node',
                        shape: 'circle',
                        layout: { minimumSize: 10 },
                        style: { stroke: '#4f7cac' },
                      },
                      label: { type: 'node', text: t.legend, style: { stroke: 'none', fill: 'none' } },
                    },
                  ],
                },
              }),
            }
          : {}),
      }}
      viewBox={{ x: -20, y: -20, width: 340, height: 300 }}
    >
      {['a', 'b', 'c'].map(id => (
        <BranchNode
          key={id}
          id={id}
          style={id === 'b' ? { stroke: '#4f7cac' } : {}}
          labels={[{ text: id.toUpperCase(), position: 'bottom' }]}
        />
      ))}
      <Branch id="main" nodes={['a', 'c']} />
      <Branch id="side" nodes={['a', 'b', 'c']} style={{ stroke: '#4f7cac' }} />
    </PreviewBranchDiagram>
  );
};
