import { createContext, useContext } from 'react';

import type { PreviewControlsDefinition, PreviewControlState, PreviewControlValuesFor } from '../types';

import { buildPreviewControlDefaults } from '../controls';

/** 自定义预览控件的共享状态上下文。 */
export const PreviewControlStateContext = createContext<PreviewControlState>({
  values: {},
  setValue: () => undefined,
  reset: () => undefined,
});

/** 读取自定义预览控件的共享状态上下文。 */
export const usePreviewControlContext = (): PreviewControlState => useContext(PreviewControlStateContext);

/** 按 definition 读取类型化预览控件值，并为缺省状态补齐默认值 */
export const usePreviewControls = <TDefinition extends PreviewControlsDefinition>(
  definition: TDefinition,
): PreviewControlValuesFor<TDefinition> => {
  const { values } = usePreviewControlContext();
  return { ...buildPreviewControlDefaults(definition), ...values } as PreviewControlValuesFor<TDefinition>;
};
