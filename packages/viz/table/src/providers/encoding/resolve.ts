import type { IRDataScalarValue } from '@retikz/data';

import type {
  AnyCellVisualScaleDefinition,
  CellVisualScaleResolution,
  CellVisualScaleResolveContext,
} from '../../contract';
import { RetikzTableError } from '../../error';
import type { IRTableVisualScaleRef } from '../../schemas';
import { deepFreeze } from '../../shared';
import { cellVisualScaleDefinitionOf } from './registry';

/** package-private visual scale 消费输入 */
type InputCellVisualScaleResolution = Readonly<{
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
  const domain = [...resolution.domain];
  const range = [...resolution.range];
  if (range.length === 0) throw new RetikzTableError(`table: visual scale "${name}" range must be non-empty`);

  const edges = resolution.edges === undefined ? undefined : [...resolution.edges];
  if (edges?.some((edge, index) => !Number.isFinite(edge) || (index > 0 && edge <= edges[index - 1]))) {
    throw new RetikzTableError(`table: visual scale "${name}" edges must be finite and strictly increasing`);
  }
  const legendForm = resolution.legendForm;

  if (legendForm === 'ramp') {
    if (domain.length !== 2 || range.length !== 2 || edges !== undefined) {
      throw new RetikzTableError(
        `table: visual scale "${name}" ramp requires two domain and range endpoints without edges`,
      );
    }
  } else if (edges === undefined) {
    if (domain.length !== range.length) {
      throw new RetikzTableError(`table: visual scale "${name}" swatch domain and range must have equal lengths`);
    }
  } else if (
    range.length !== edges.length + 1 ||
    domain.length !== edges.length ||
    domain.some((value, index) => typeof value !== 'number' || value !== edges[index])
  ) {
    throw new RetikzTableError(`table: visual scale "${name}" threshold swatch domain, range, and edges differ`);
  }

  const evaluator = resolution.of;
  const observed = new Map<IRDataScalarValue, string | undefined>();

  const guardedOf = (value: IRDataScalarValue): string | undefined => {
    const color = evaluator(value);
    if (observed.has(value) && observed.get(value) !== color) {
      throw new RetikzTableError(
        `table: visual scale "${name}" evaluator must be deterministic for repeated scalar values`,
      );
    }

    observed.set(value, color);

    return color;
  };

  return deepFreeze({
    of: guardedOf,
    legendForm,
    domain,
    range,
    ...(edges === undefined ? {} : { edges }),
  });
};

/** 解析一次 visual scale definition 并守卫 options、resolution 与 evaluator */
export const resolveCellVisualScale = (
  input: InputCellVisualScaleResolution,
): CellVisualScaleResolution | undefined => {
  const definition = cellVisualScaleDefinitionOf(input.ref.name, input.registry);
  const parsedOptions = definition.optionsSchema.parse(input.ref.options ?? {});
  const options = deepFreeze(parsedOptions);
  const resolution = definition.resolve(
    options as never,
    deepFreeze([...input.values]),
    deepFreeze(structuredClone(input.context)),
  );

  return resolution === undefined ? undefined : guardResolution(definition.name, resolution);
};
