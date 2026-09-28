import { compileToScene } from '@retikz/core';
import type { InspectionSelection } from '@retikz/inspect';
import { FlexLayoutArtifactSchema, FlexLayoutDefinition } from '@retikz/layout';
import type { LayoutProps } from '@retikz/react';
import { cloneElement } from 'react';
import type { ReactElement } from 'react';

import type {
  PreviewControlsDefinition,
  PreviewControlValues,
  PreviewControlValuesFor,
} from '@/modules/docs/components/component-preview';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';
import { defineControlledLayoutInspectPreview } from '@/modules/docs/preview';

/** 将完整容器和可见内容一同纳入取景，避免自动图元 bounds 裁掉 inspect 的空槽位 */
export const defineFlexPreview = <const TDefinition extends PreviewControlsDefinition>(
  contract: { controls: TDefinition; canonicalValues: Readonly<PreviewControlValues> },
  render: (values: PreviewControlValuesFor<TDefinition>) => ReactElement<LayoutProps>,
  selection: (values: PreviewControlValuesFor<TDefinition>) => InspectionSelection,
) =>
  defineControlledLayoutInspectPreview(
    contract,
    values => {
      const element = render(values);
      const { ir } = buildPreviewIR(() => element);
      const output = compileToScene(ir, { composites: [FlexLayoutDefinition], measureText: browserMeasurer });
      const rectangles = [output.scene.layout];
      for (const artifact of output.artifacts) {
        if (artifact.kind !== 'composite') continue;
        const { container } = FlexLayoutArtifactSchema.parse(artifact.value);
        rectangles.push(container.allocationBounds);
      }
      const left = Math.min(...rectangles.map(rect => rect.x));
      const top = Math.min(...rectangles.map(rect => rect.y));
      const right = Math.max(...rectangles.map(rect => rect.x + rect.width));
      const bottom = Math.max(...rectangles.map(rect => rect.y + rect.height));
      return cloneElement(element, {
        viewBox: { x: left - 16, y: top - 16, width: right - left + 32, height: bottom - top + 32 },
      });
    },
    selection,
  );
