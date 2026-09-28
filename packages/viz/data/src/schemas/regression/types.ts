import type { input } from 'zod';

import type { RegressionMethodSchema } from './schema';

export type IRRegressionMethod = input<typeof RegressionMethodSchema>;
