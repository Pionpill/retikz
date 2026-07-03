import type { RibbonWidthProfileDefinition } from '../../contract';

/** core 暂不内置 ribbon width profile；外部包通过 `CompileOptions.ribbonWidthProfiles` 注入。 */
export const BUILTIN_RIBBON_WIDTH_PROFILES: ReadonlyArray<RibbonWidthProfileDefinition> = [];
