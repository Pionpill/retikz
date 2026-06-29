import type { z } from 'zod';

import type { Position } from '../../geometry/point';
import type { Rect } from '../../geometry/rect';
import type { IRJsonObject } from '../../schemas/json';

export type BoundaryDefinitionInput<TParams extends IRJsonObject> = {
  /** Registry key referenced by IR `boundary`. */
  name: string;
  /** Params schema for this runtime connection surface. */
  paramsSchema: z.ZodType<TParams>;
  /** Center-to-toward ray hit on the connection surface. */
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  /** Optional named anchor support for web-style connection points. */
  anchor?: (rect: Rect, name: string, params: TParams) => Position | undefined;
};

/** Boundary 定义的擦除形态：registry 存这个。 */
export type BoundaryDefinition = BoundaryDefinitionInput<IRJsonObject>;
