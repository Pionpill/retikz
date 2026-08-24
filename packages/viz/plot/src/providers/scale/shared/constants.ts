import { PlotColorScheme } from '../../../schemas';

/** 内置配色方案名集合；用于内置 resolver 与自定义 resolver 分流 */
export const BUILTIN_COLOR_SCHEMES: ReadonlySet<string> = new Set<string>(Object.values(PlotColorScheme));
