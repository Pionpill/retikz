import type { PreviewControlConfig, PreviewControlSlot } from '../../types';

import { PreviewToolbar, PreviewToolbarInput, PreviewToolbarSelect } from '../PreviewToolbar';

/** 将声明式配置转换成预览控制插槽。 */
export const buildConfiguredControlSlots = (
  configs: Array<PreviewControlConfig> | undefined,
): Array<PreviewControlSlot> => {
  if (configs === undefined || configs.length === 0) return [];

  return configs.map(config => ({
    id: config.id,
    placement: config.placement ?? 'top-start',
    visibility: config.visibility ?? 'always',
    render: runtime => {
      const value = runtime.value(config.id) ?? config.defaultValue;

      if (config.kind === 'select') {
        return (
          <PreviewToolbar>
            <PreviewToolbarSelect
              label={config.label}
              value={value}
              options={config.options}
              onValueChange={nextValue => runtime.setValue(config.id, nextValue)}
            />
          </PreviewToolbar>
        );
      }

      return (
        <PreviewToolbar>
          <PreviewToolbarInput
            label={config.label}
            value={value}
            placeholder={config.placeholder}
            onValueChange={nextValue => runtime.setValue(config.id, nextValue)}
          />
        </PreviewToolbar>
      );
    },
  }));
};
