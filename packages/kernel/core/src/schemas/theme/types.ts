import type { z } from 'zod';

import type { IRJsonObject } from '../json';
import type { ThemeSchema } from './schema';

/** Scene / Scope 使用的 namespaced sparse Theme token bag */
export type ThemeTokenNamespaceBag = Readonly<Record<string, IRJsonObject>>;

export type IRTheme = z.infer<typeof ThemeSchema>;
