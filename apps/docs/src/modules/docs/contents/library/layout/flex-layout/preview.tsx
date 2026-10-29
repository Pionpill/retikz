import type { LayoutProps } from '@retikz/react';
import type { ReactElement } from 'react';

import type {
  PreviewControlsDefinition,
  PreviewControlValues,
  PreviewControlValuesFor,
} from '@/modules/docs/components/component-preview';
import { defineControlledLayoutPreview } from '@/modules/docs/preview';

/** 普通布局预览直接使用主图绘制结果 */
export const defineFlexPreview = <const TDefinition extends PreviewControlsDefinition>(
  contract: { controls: TDefinition; canonicalValues: Readonly<PreviewControlValues> },
  render: (values: PreviewControlValuesFor<TDefinition>) => ReactElement<LayoutProps>,
) => defineControlledLayoutPreview(contract, render);
