import type { Lang } from '@/i18n';

/** 源码阅读主链 */
export const pathImplementationI18n: Record<Lang, Array<string>> = {
  zh: [
    'resolvePath\n配置与目标绑定',
    'emitPathPrimitive\n消费确定化路径',
    'lowerSegmentStep / lowerShapeStep\n边界求交与几何命令',
    'applyRoundedCorners\n处理直线接缝',
    'createStrokePathGeometry\n标签采样与留白区间',
    'applyArrowShrinks\n拆分后的端点缩短',
    'wrapPathPrimitiveOutput\n组合图元与变换',
    'flushPendingPathEmissions\n替换 Scene 占位',
  ],
  en: [
    'resolvePath\nConfiguration and target binding',
    'emitPathPrimitive\nConsume the canonical path',
    'lowerSegmentStep / lowerShapeStep\nBoundary queries and geometry commands',
    'applyRoundedCorners\nRound eligible line joins',
    'createStrokePathGeometry\nLabel sampling and gap intervals',
    'applyArrowShrinks\nShorten terminal fragments',
    'wrapPathPrimitiveOutput\nGroup primitives and transforms',
    'flushPendingPathEmissions\nReplace the Scene placeholder',
  ],
};
