import type { LayoutCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { compileMatrix } from './pipeline';
import { MatrixSchema } from './schema';
import type { IRMatrix } from './schema';

/** Standard Matrix 的布局感知 Definition */
export const MatrixDefinition: LayoutCompositeDefinition<IRMatrix, 'standard', 'matrix'> = defineComposite({
  namespace: 'standard',
  type: 'matrix',
  schema: MatrixSchema,
  compile: compileMatrix,
});
