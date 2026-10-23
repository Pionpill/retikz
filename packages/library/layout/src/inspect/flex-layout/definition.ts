import { defineInspector } from '@retikz/inspect';

import { LAYOUT_NAMESPACE } from '../../shared';
import { resolveFlexLayoutInspectOptions } from '../resolve/flex-layout';
import { mergeLayoutInspectOptionsInput } from '../resolve/shared';
import { LAYOUT_INSPECTOR_NAMESPACE } from '../shared';
import { inspectFlexLayoutArtifact } from './output';
import { FlexLayoutInspectOptionsSchema } from './schema';

/** Flex 布局检查器的稳定注册键 */
export const FLEX_LAYOUT_INSPECTOR_KEY = Object.freeze({
  namespace: LAYOUT_INSPECTOR_NAMESPACE,
  type: 'flex-layout',
});

/** 从最终 Flex 布局产物生成辅助内容的检查器定义 */
export const FLEX_LAYOUT_INSPECTOR = defineInspector({
  ...FLEX_LAYOUT_INSPECTOR_KEY,
  owner: { kind: 'composite', namespace: LAYOUT_NAMESPACE, type: 'flexLayout' },
  optionsSchema: FlexLayoutInspectOptionsSchema,
  resolveOptions: resolveFlexLayoutInspectOptions,
  mergeOptionsInput: mergeLayoutInspectOptionsInput,
  inspect: inspectFlexLayoutArtifact,
});
