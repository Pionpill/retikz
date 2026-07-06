import type { AnyTransformDefinition, TransformContext } from '@retikz/data';
import type { TransformOperation } from '@retikz/data';

import { collectTransformFields } from '@retikz/data';
import { resolveTransformRegistry } from '@retikz/data';

import { type AnyMarkDefinition } from '../contract';
import { collectMarkFields, resolveMarkRegistry } from '../providers';
import { createFieldCollector } from '../providers/channel/shared';
import { type MarkOperation, type PlotSpec } from '../schemas';

const markTransformOf = (mark: MarkOperation): Array<TransformOperation> | undefined =>
  (mark as { transform?: Array<TransformOperation> }).transform;

/** 收集 plot spec 引用的外部源字段；派生字段会被排除，不参与 data.model strict 校验。 */
export const collectSourceFields = (
  spec: PlotSpec,
  transformRegistry: ReadonlyMap<string, AnyTransformDefinition> = resolveTransformRegistry(),
  markRegistry: ReadonlyMap<string, AnyMarkDefinition> = resolveMarkRegistry(),
  transformContext?: TransformContext,
): Set<string> => {
  const fields = new Set<string>();
  const collector = createFieldCollector(fields);
  const derivedOutputs = new Set<string>();

  for (const mark of spec.marks) collectMarkFields(mark, collector, markRegistry);
  for (const transform of spec.transform ?? [])
    collectTransformFields(transform, collector, derivedOutputs, transformRegistry, transformContext);
  for (const mark of spec.marks) {
    for (const transform of markTransformOf(mark) ?? [])
      collectTransformFields(transform, collector, derivedOutputs, transformRegistry, transformContext);
  }
  for (const derived of derivedOutputs) fields.delete(derived);

  return fields;
};
