import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn 标配的 className 合并函数：clsx 处理条件 + tailwind-merge 解决 utility 冲突 */
export const cn = (...inputs: Array<ClassValue>) => twMerge(clsx(inputs));
