import { useEffect, useMemo, useState } from 'react';

import type { PreviewControlsDefinition, PreviewControlState, PreviewControlValues } from '../types';

import { buildPreviewControlDefaults } from '../controls';

/** 为单张预览卡创建可注入多个视图 controller 的业务控件状态 */
export const usePreviewControlState = (
  definition: PreviewControlsDefinition | undefined,
  canonicalValues?: Readonly<PreviewControlValues>,
): PreviewControlState => {
  const baseline = useMemo(
    () => ({ ...buildPreviewControlDefaults(definition), ...canonicalValues }),
    [canonicalValues, definition],
  );
  const [values, setValues] = useState<PreviewControlValues>(baseline);

  useEffect(() => setValues(baseline), [baseline]);

  return {
    canonicalValues: baseline,
    values,
    setValue: (id, value) => setValues(current => ({ ...current, [id]: value })),
    applyValues: nextValues => setValues({ ...baseline, ...nextValues }),
    reset: () => setValues(baseline),
  };
};
