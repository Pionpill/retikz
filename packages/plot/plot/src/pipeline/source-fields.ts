import { createFieldCollector } from '../data';
import { type PlotSpec } from '../ir';
import { collectMarkFields } from '../mark';
import { collectTransformFields } from '../transform';

/** 收集 plot spec 引用的外部源字段；派生字段会被排除，不参与 data.model strict 校验。 */
export const collectSourceFields = (spec: PlotSpec): Set<string> => {
  const fields = new Set<string>();
  const collector = createFieldCollector(fields);
  const derivedOutputs = new Set<string>();

  for (const mark of spec.marks) collectMarkFields(mark, collector);
  for (const transform of spec.transform ?? []) collectTransformFields(transform, collector, derivedOutputs);
  for (const derived of derivedOutputs) fields.delete(derived);

  return fields;
};
