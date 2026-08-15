import type { AnyTransformDefinition, TransformContext } from '@retikz/data';

import { collectTransformFields } from '@retikz/data';

import { type AnyMarkDefinition } from '../contract';
import { createFieldCollector, resolveMarkRegistry, resolvePlotTransformRegistry } from '../providers';
import { collectMarkFields } from '../resolve/mark';
import { type IRPlotMarkOperation, type IRPlotSpec, type IRPlotTransform } from '../schemas';

const markTransformOf = (mark: IRPlotMarkOperation): Array<IRPlotTransform> | undefined =>
  (mark as { transform?: Array<IRPlotTransform> }).transform;

/**
 * 按执行顺序收集 transform 管线依赖的外部字段，并返回管线结束后的派生字段集合
 * @description 同一步先读取输入再登记输出，因此 `field === as` 的原位覆盖仍保留源字段；后续步骤读取既有派生字段则不会误入 data.model
 */
const collectTransformPipelineFields = (
  transforms: ReadonlyArray<IRPlotTransform>,
  initialDerived: ReadonlySet<string>,
  sourceFields: Set<string>,
  transformRegistry: ReadonlyMap<string, AnyTransformDefinition>,
  transformContext?: TransformContext,
): Set<string> => {
  const derived = new Set(initialDerived);
  for (const transform of transforms) {
    const inputs = new Set<string>();
    const outputs = new Set<string>();
    collectTransformFields(transform, createFieldCollector(inputs), outputs, transformRegistry, transformContext);
    for (const input of inputs) {
      if (!derived.has(input)) sourceFields.add(input);
    }
    for (const output of outputs) derived.add(output);
  }
  return derived;
};

/** 收集 plot spec 引用的外部源字段；派生字段会被排除，不参与 data.model strict 校验 */
export const collectSourceFields = (
  spec: IRPlotSpec,
  transformRegistry: ReadonlyMap<string, AnyTransformDefinition> = resolvePlotTransformRegistry(),
  markRegistry: ReadonlyMap<string, AnyMarkDefinition> = resolveMarkRegistry(),
  transformContext?: TransformContext,
): Set<string> => {
  const fields = new Set<string>();
  const plotDerived = collectTransformPipelineFields(
    spec.transform ?? [],
    new Set(),
    fields,
    transformRegistry,
    transformContext,
  );
  for (const mark of spec.marks) {
    const markDerived = collectTransformPipelineFields(
      markTransformOf(mark) ?? [],
      plotDerived,
      fields,
      transformRegistry,
      transformContext,
    );
    const markFields = new Set<string>();
    collectMarkFields(mark, createFieldCollector(markFields), { registry: markRegistry });
    for (const field of markFields) {
      if (!markDerived.has(field)) fields.add(field);
    }
  }

  return fields;
};
