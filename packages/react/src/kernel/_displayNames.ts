/*
 * Kernel 组件的 displayName 常量。
 * children 扫描机制依赖这些常量来识别节点种类。
 */

/** <Node> 组件的 displayName */
export const TIKZ_NODE = '@retikz/Node';

/** <Path> 组件的 displayName */
export const TIKZ_PATH = '@retikz/Path';

/** <Step> 组件的 displayName */
export const TIKZ_STEP = '@retikz/Step';

/** <Text> 组件的 displayName（Node 内多行文本带样式） */
export const TIKZ_TEXT = '@retikz/Text';
