import { Branch, BranchNode } from '@retikz/diagram-react/branch';
import type { ReactElement } from 'react';

import { PreviewBranchDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './branch-nodes.controls';

/** 根据控件值绘制节点与主线 */
export const renderPreview = (values: PreviewControlValuesFor<typeof previewControls>): ReactElement => {
  return (
    <PreviewBranchDiagram mainBranch={values.main} viewBox={{ x: -20, y: -20, width: 260, height: 200 }}>
      {['a', 'b', 'c'].map(id => (
        <BranchNode
          key={id}
          id={id}
          layout={{ minimumSize: values.size }}
          labels={values.labels ? [{ text: id.toUpperCase(), position: 'bottom' }] : []}
        />
      ))}
      <Branch id="main" nodes={['a', 'c']} />
      <Branch id="side" nodes={['a', 'b', 'c']} style={{ stroke: '#4f7cac' }} />
    </PreviewBranchDiagram>
  );
};
