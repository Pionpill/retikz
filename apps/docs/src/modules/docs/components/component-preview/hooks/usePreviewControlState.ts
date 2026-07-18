import { useEffect, useMemo, useState } from 'react';

import type { PreviewControlsDefinition, PreviewControlState, PreviewControlValues } from '../types';

import { buildPreviewControlDefaults } from '../controls';

/** 为单张预览卡创建可注入多个视图 controller 的业务控件状态 */
export const usePreviewControlState = (definition: PreviewControlsDefinition | undefined): PreviewControlState => {
  const defaults = useMemo(() => buildPreviewControlDefaults(definition), [definition]);
  const [values, setValues] = useState<PreviewControlValues>(defaults);

  useEffect(() => setValues(defaults), [defaults]);

  return {
    values,
    setValue: (id, value) => setValues(current => ({ ...current, [id]: value })),
    reset: () => setValues(defaults),
  };
};
