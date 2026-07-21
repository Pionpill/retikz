import type { FC, ReactNode } from 'react';

import type {
  PreviewControlsDefinition,
  PreviewControlValues,
  PreviewControlValuesFor,
  PreviewSourceConfig,
} from '../types';

import { usePreviewControls } from '../context';
import { buildPreviewControlDefaults } from '../controls/define-preview-controls';

/** 定义由 controls 驱动的可交互 demo 与稳定源码状态 */
export const defineControlledPreview = <const TDefinition extends PreviewControlsDefinition>(
  contract: {
    controls: TDefinition;
    canonicalValues: Readonly<PreviewControlValues>;
  },
  render: (values: PreviewControlValuesFor<TDefinition>) => ReactNode,
): { Component: FC; source: PreviewSourceConfig } => {
  type ControlValues = PreviewControlValuesFor<TDefinition>;

  const canonicalValues = {
    ...buildPreviewControlDefaults(contract.controls),
    ...contract.canonicalValues,
  } as ControlValues;

  const Component: FC = () => render(usePreviewControls(contract.controls));
  const source: PreviewSourceConfig = {
    deriveIR: false,
    canonicalRender: () => render(canonicalValues),
  };

  return { Component, source };
};
