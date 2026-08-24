import { defineInspector } from '@retikz/inspect';

import { FlexLayoutArtifactSchema } from '../../composites/flex-layout';
import { LAYOUT_NAMESPACE } from '../../shared';
import { LAYOUT_INSPECTOR_NAMESPACE, mergeLayoutInspectOptionsInput } from '../shared';
import { inspectFlexLayoutArtifact } from './output';
import { FlexLayoutInspectOptionsInputSchema, FlexLayoutInspectOptionsSchema } from './schema';

/** Flex 布局检查器的稳定注册键 */
export const FLEX_LAYOUT_INSPECTOR_KEY = Object.freeze({
  namespace: LAYOUT_INSPECTOR_NAMESPACE,
  type: 'flex-layout',
});

/** 从最终 Flex 布局产物生成辅助内容的检查器定义 */
export const FLEX_LAYOUT_INSPECTOR = defineInspector({
  ...FLEX_LAYOUT_INSPECTOR_KEY,
  owner: { kind: 'composite', namespace: LAYOUT_NAMESPACE, type: 'flexLayout' },
  subjectSchema: FlexLayoutArtifactSchema,
  optionsInputSchema: FlexLayoutInspectOptionsInputSchema,
  optionsSchema: FlexLayoutInspectOptionsSchema,
  mergeOptionsInput: mergeLayoutInspectOptionsInput,
  inspect: inspectFlexLayoutArtifact,
});
