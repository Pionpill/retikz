import type { InspectorKey } from '@retikz/inspect';
import type { InspectionReactRequest } from '@retikz/inspect/react';

import { createInspectionReactAuthoring } from '@retikz/inspect/react';

/** 创建只作用于当前 Standard 布局实例的检查声明 */
export const createStandardLayoutReactAuthoring = (
  inspector: InspectorKey,
  value: InspectionReactRequest['value'],
): ReturnType<typeof createInspectionReactAuthoring> => createInspectionReactAuthoring({ inspector, value });
