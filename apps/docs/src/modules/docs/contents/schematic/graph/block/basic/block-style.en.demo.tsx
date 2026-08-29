import type { FC } from 'react';

import { Block, BlockCell, BlockHeader, BlockRow, BlockSection, Graph } from '@retikz/graph-react';
import { Node } from '@retikz/react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { blockStyleControls, previewControlContract } from './block-style.en.controls';

export const previewControls = blockStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const backgroundOpacity = typeof values.backgroundOpacity === 'number' ? values.backgroundOpacity : 0.04;
  const borderWidth = typeof values.borderWidth === 'number' ? values.borderWidth : 1;
  const cornerRadius = typeof values.cornerRadius === 'number' ? values.cornerRadius : 8;
  const padding = typeof values.padding === 'number' ? values.padding : 8;

  return (
    <Graph width={420} height={230} viewBox={{ x: padding - 155, y: padding - 68, width: 420, height: 230 }}>
      <Block
        padding={padding}
        cornerRadius={cornerRadius}
        background={{ fill: '#64748b', fillOpacity: backgroundOpacity }}
        border={{ stroke: '#64748b', strokeOpacity: 0.5, strokeWidth: borderWidth }}
      >
        <BlockHeader title={{ text: 'UserRepository' }} description={{ text: 'Data access interface' }} />
        <BlockSection title={{ text: 'Methods' }}>
          <BlockRow>
            <BlockCell itemKey="method" grow={1}>
              <Node position={[0, 0]} padding={0} margin={0} fill="none" stroke="none" textColor="currentColor">
                findById(id)
              </Node>
            </BlockCell>
          </BlockRow>
        </BlockSection>
      </Block>
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Block shell style controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
