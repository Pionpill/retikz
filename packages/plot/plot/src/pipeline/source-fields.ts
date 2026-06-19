import { createFieldCollector } from '../features';
import { type PlotSpec } from '../schemas';
import { type AnyMarkDefinition, type AnyTransformDefinition } from '../contract';
import { collectMarkFields, collectTransformFields, resolveMarkRegistry, resolveTransformRegistry } from '../providers';

/** 收集 plot spec 引用的外部源字段；派生字段会被排除，不参与 data.model strict 校验。 */
export const collectSourceFields = (
  spec: PlotSpec,
  transformRegistry: ReadonlyMap<string, AnyTransformDefinition> = resolveTransformRegistry(),
  markRegistry: ReadonlyMap<string, AnyMarkDefinition> = resolveMarkRegistry(),
): Set<string> => {
  const fields = new Set<string>();
  const collector = createFieldCollector(fields);
  const derivedOutputs = new Set<string>();

  for (const mark of spec.marks) collectMarkFields(mark, collector, markRegistry);
  for (const transform of spec.transform ?? []) collectTransformFields(transform, collector, derivedOutputs, transformRegistry);
  for (const derived of derivedOutputs) fields.delete(derived);

  return fields;
};
