import { Branch, BranchNode } from '@retikz/diagram-react/branch';
import type { ReactElement } from 'react';

import { PreviewBranchDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './branch-layout.controls';

const directionOf = (value: string): 'right' | 'left' | 'down' | 'up' =>
  value === 'left' || value === 'down' || value === 'up' ? value : 'right';
/** 根据控件值绘制方向与间距 */
export const renderPreview = (values: PreviewControlValuesFor<typeof previewControls>): ReactElement => {
  return (
    <PreviewBranchDiagram
      mainBranch="main"
      layout={{ direction: directionOf(values.direction), nodeGap: values.nodeGap, laneGap: values.laneGap }}
      viewBox={{ x: -20, y: -20, width: 300, height: 330 }}
    >
      {['a', 'b', 'c'].map(id => (
        <BranchNode key={id} id={id} labels={[{ text: id.toUpperCase(), position: 'bottom' }]} />
      ))}
      <Branch id="main" nodes={['a', 'c']} />
      <Branch id="side" nodes={['a', 'b', 'c']} style={{ stroke: values.color }} />
    </PreviewBranchDiagram>
  );
};
