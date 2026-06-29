import type { ZodType } from 'zod';

import type { IRJsonObject } from '../../schemas/json';

export type RibbonWidthProfileContext<TParams extends IRJsonObject = IRJsonObject> = {
  /** Normalized position along the centerline in [0, 1]. */
  offset: number;
  /** Approximate total centerline length in user units. */
  length: number;
  /** Profile parameters after optional paramsSchema validation. */
  params: TParams;
};

export type RibbonWidthProfileDefinitionInput<TParams extends IRJsonObject = IRJsonObject> = {
  /** Registry key referenced by IR `width: { kind: "profile", name }`. */
  name: string;
  /** Optional JSON-safe params schema; compile parses `width.params` before sampling. */
  paramsSchema?: ZodType<TParams>;
  /** Return the nonnegative ribbon width in user units at a normalized offset. */
  widthAt: (ctx: RibbonWidthProfileContext<TParams>) => number;
};

export type RibbonWidthProfileDefinition = {
  /** Registry key referenced by IR `width: { kind: "profile", name }`. */
  name: string;
  /** Optional JSON-safe params schema; compile parses `width.params` before sampling. */
  paramsSchema?: ZodType<IRJsonObject>;
  /** Return the nonnegative ribbon width in user units at a normalized offset. */
  widthAt: (ctx: RibbonWidthProfileContext<IRJsonObject>) => number;
};
