import type { ClassValue } from 'clsx';

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 合并条件 className 并消解 Tailwind 冲突 */
export const cn = (...inputs: Array<ClassValue>): string => twMerge(clsx(inputs));
