import type { PreviewControlSlot, PreviewOverlayControlField } from '../../types';

import { PreviewControlFieldInput } from '../../controls';
import { PreviewToolbar } from '../PreviewToolbar';

/** 将声明式配置转换成预览控制插槽。 */
export const buildConfiguredControlSlots = (
  configs: ReadonlyArray<PreviewOverlayControlField> | undefined,
): Array<PreviewControlSlot> => {
  if (configs === undefined || configs.length === 0) return [];

  return configs.map(config => ({
    id: config.id,
    placement: config.placement ?? 'top-start',
    visibility: config.visibility ?? 'always',
    render: runtime => (
      <PreviewToolbar>
        <PreviewControlFieldInput
          field={config}
          value={runtime.value(config.id) ?? config.defaultValue}
          compact
          onValueChange={value => runtime.setValue(config.id, value)}
        />
      </PreviewToolbar>
    ),
  }));
};
