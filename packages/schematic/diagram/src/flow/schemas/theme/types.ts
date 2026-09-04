import type { infer as ZodInfer } from 'zod';

import type {
  FlowEntityLayoutSchema,
  FlowEntityStyleSchema,
  FlowGroupStyleSchema,
  FlowLayoutIntentSchema,
  FlowRelationLayoutSchema,
  FlowRelationStyleSchema,
  FlowRoutingSchema,
  FlowTextStyleSchema,
  FlowThemeSchema,
  FlowThemeTokenOverridesSchema,
} from './schema';

/** Flow Relation 的 provider-neutral 路由意图 */
export type IRFlowRouting = ZodInfer<typeof FlowRoutingSchema>;

/** 单个 Flow 布局作用域的稀疏布局意图 */
export type IRFlowLayoutIntent = ZodInfer<typeof FlowLayoutIntentSchema>;

/** 单个 Flow Entity 的绘制样式覆盖 */
export type IRFlowEntityStyle = ZodInfer<typeof FlowEntityStyleSchema>;

/** 单个 Flow Entity 的尺寸与碰撞边距覆盖 */
export type IRFlowEntityLayout = ZodInfer<typeof FlowEntityLayoutSchema>;

/** Flow Group 标题文本的样式覆盖 */
export type IRFlowTextStyle = ZodInfer<typeof FlowTextStyleSchema>;

/** 单个 Flow Group 的 Surface 与标题样式覆盖 */
export type IRFlowGroupStyle = ZodInfer<typeof FlowGroupStyleSchema>;

/** 单个 Flow Relation 的路径、标记与标签样式覆盖 */
export type IRFlowRelationStyle = ZodInfer<typeof FlowRelationStyleSchema>;

/** 单个 Flow Relation 的布局覆盖 */
export type IRFlowRelationLayout = ZodInfer<typeof FlowRelationLayoutSchema>;

/** Flow drawing core 的结构化全局配置 */
export type IRFlowTheme = ZodInfer<typeof FlowThemeSchema>;

/** Flow Theme 的扁平 token 覆盖 */
export type IRFlowThemeTokenOverrides = ZodInfer<typeof FlowThemeTokenOverridesSchema>;
