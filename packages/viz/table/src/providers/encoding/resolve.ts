import type { IRDataScalarValue } from '@retikz/data';

import { CssColorSchema, JsonObjectSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import type {
  AnyCellVisualScaleDefinition,
  CellVisualScaleResolution,
  CellVisualScaleResolveContext,
} from '../../contract';
import type { IRTableVisualScaleRef } from '../../schemas';

import { deepFreeze } from '../../shared';
import { cellVisualScaleDefinitionOf } from './registry';

const ColorSchema = CssColorSchema.refine(value => NonBlankStringSchema.safeParse(value).success, {
  message: 'visual scale color must not be empty or whitespace',
});
const EdgesSchema = z.array(z.number()).superRefine((edges, context) => {
  edges.forEach((edge, index) => {
    if (index > 0 && edge <= edges[index - 1]) {
      context.addIssue({ code: 'custom', path: [index], message: 'edges must be strictly increasing' });
    }
  });
});
const LegendFormSchema = z.enum(['ramp', 'swatch']);

/** package-private visual scale 消费输入 */
export type ResolveCellVisualScaleInput = Readonly<{
  /** 已解析的 encoding scale ref */
  ref: IRTableVisualScaleRef;
  /** canonical selector 命中的 non-null raw scalars */
  values: ReadonlyArray<IRDataScalarValue>;
  /** 同次 resolved style palette */
  context: CellVisualScaleResolveContext;
  /** built-in/custom 统一 registry */
  registry: ReadonlyMap<string, AnyCellVisualScaleDefinition>;
}>;

/** 收窄自定义 definition 返回的 resolution，并包装自然调用的 evaluator 输出 */
const guardResolution = (name: string, resolution: CellVisualScaleResolution): CellVisualScaleResolution => {
  const domain = resolution.domain.map((value, index) => {
    const result = ScalarValueSchema.safeParse(structuredClone(value));
    if (!result.success) throw new Error(`table: visual scale "${name}" domain ${index} must be a JSON scalar`);
    return result.data;
  });
  const range = resolution.range.map((color, index) => {
    const result = ColorSchema.safeParse(color);
    if (!result.success) throw new Error(`table: visual scale "${name}" range ${index} must be a valid color string`);
    return result.data;
  });
  if (range.length === 0) throw new Error(`table: visual scale "${name}" range must be non-empty`);
  const edges = resolution.edges === undefined ? undefined : EdgesSchema.parse([...resolution.edges]);
  const legendForm = LegendFormSchema.safeParse(resolution.legendForm);
  if (!legendForm.success) {
    throw new Error(`table: visual scale "${name}" legendForm must be ramp or swatch`);
  }
  if (legendForm.data === 'ramp') {
    if (domain.length !== 2 || range.length !== 2 || edges !== undefined) {
      throw new Error(`table: visual scale "${name}" ramp requires two domain and range endpoints without edges`);
    }
  } else if (edges === undefined) {
    if (domain.length !== range.length) {
      throw new Error(`table: visual scale "${name}" swatch domain and range must have equal lengths`);
    }
  } else if (
    range.length !== edges.length + 1 ||
    domain.length !== edges.length ||
    domain.some((value, index) => typeof value !== 'number' || value !== edges[index])
  ) {
    throw new Error(`table: visual scale "${name}" threshold swatch domain, range, and edges differ`);
  }

  const evaluator = resolution.of;
  if (typeof evaluator !== 'function') {
    throw new Error(`table: visual scale "${name}" evaluator must be a function`);
  }
  const observed = new Map<IRDataScalarValue, string | undefined>();
  const guardedOf = (value: IRDataScalarValue): string | undefined => {
    const output = evaluator(value);
    const guarded = output === undefined ? undefined : ColorSchema.safeParse(output);
    if (guarded !== undefined && !guarded.success) {
      throw new Error(`table: visual scale "${name}" evaluator output must be a valid color string or undefined`);
    }
    const color = guarded === undefined ? undefined : guarded.data;
    if (observed.has(value) && observed.get(value) !== color) {
      throw new Error(`table: visual scale "${name}" evaluator must be deterministic for repeated scalar values`);
    }
    observed.set(value, color);
    return color;
  };
  return deepFreeze({
    of: guardedOf,
    legendForm: legendForm.data,
    domain,
    range,
    ...(edges === undefined ? {} : { edges }),
  });
};

/** 解析一次 visual scale definition 并守卫 options、resolution 与 evaluator */
export const resolveCellVisualScale = (input: ResolveCellVisualScaleInput): CellVisualScaleResolution | undefined => {
  const definition = cellVisualScaleDefinitionOf(input.ref.name, input.registry);
  const parsedOptions = definition.optionsSchema.parse(structuredClone(input.ref.options ?? {}));
  const jsonOptions = JsonObjectSchema.safeParse(parsedOptions);
  if (!jsonOptions.success) throw new Error(`table: visual scale "${definition.name}" options must remain JSON-safe`);
  const options = deepFreeze(structuredClone(jsonOptions.data));
  const resolution = definition.resolve(
    options as never,
    deepFreeze([...input.values]),
    deepFreeze(structuredClone(input.context)),
  );
  return resolution === undefined ? undefined : guardResolution(definition.name, resolution);
};
