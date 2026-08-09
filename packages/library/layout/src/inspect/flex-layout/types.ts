import type { z } from 'zod';

import type { FlexLayoutInspectOptionsInputSchema, FlexLayoutInspectOptionsSchema } from './schema';

/** Flex 布局检查器的输入选项 */
export type FlexLayoutInspectOptions = z.input<typeof FlexLayoutInspectOptionsInputSchema>;

/** 完整解析后的 Flex 布局检查器选项 */
export type ResolvedFlexLayoutInspectOptions = z.output<typeof FlexLayoutInspectOptionsSchema>;
