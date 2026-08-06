import { describe, expectTypeOf, it } from 'vitest';

// @ts-expect-error 旧专用辅助图元类型已从公开入口删除
import type { InspectionPrimitive } from '../../../src';
// @ts-expect-error 旧语义色类型已从公开入口删除
import type { InspectionTone } from '../../../src';
// @ts-expect-error 旧 Composite 专用 Inspector context 已由通用 InspectorContext 取代
import type { CompositeInspectorContext } from '../../../src';
import type {
  CompileWarning,
  InspectionAuthoringPolicy,
  InspectionPlaneEntry,
  InspectorDefinition,
  InspectorOutput,
  Scene,
} from '../../../src';

const assertLegacyFieldsAreAbsent = (entry: InspectionPlaneEntry, policy: InspectionAuthoringPolicy): void => {
  // @ts-expect-error 辅助平面 entry 已使用普通 scene
  void entry.primitives;
  // @ts-expect-error occurrence-local 选择字段已改为 self
  void policy.component;
};

// @ts-expect-error 公开 warning 必须明确携带结构化 origin
const legacyWarning: CompileWarning = { code: 'LEGACY_WARNING', message: 'legacy', path: 'children[0]' };

void assertLegacyFieldsAreAbsent;
void legacyWarning;

describe('Inspector public type surface', () => {
  it('exports the generic Inspector and ordinary Scene entry contracts', () => {
    expectTypeOf<InspectionPrimitive>();
    expectTypeOf<InspectionTone>();
    expectTypeOf<CompositeInspectorContext>();
    expectTypeOf<InspectionPlaneEntry['scene']>().toEqualTypeOf<Scene>();
    expectTypeOf<InspectorDefinition<string, never, never, never>>().toBeObject();
    expectTypeOf<InspectorOutput>().toBeObject();
  });
});
