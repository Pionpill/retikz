import type { InspectorKey } from '@retikz/inspect';
import type { InspectionVanillaRequest } from '@retikz/inspect/vanilla';

import { createInspectionVanillaAuthoring } from '@retikz/inspect/vanilla';

/** 创建只作用于当前 Layout 布局实例的检查声明 */
export const createLayoutReactAuthoring = (
  inspector: InspectorKey,
  options: InspectionVanillaRequest['options'],
): ReturnType<typeof createInspectionVanillaAuthoring> => createInspectionVanillaAuthoring({ inspector, options });
