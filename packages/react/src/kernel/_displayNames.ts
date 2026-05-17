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

/** <EdgeLabel> 组件的 displayName（Step 内边标注） */
export const TIKZ_EDGE_LABEL = '@retikz/EdgeLabel';

/** <Coordinate> 组件的 displayName（占位节点） */
export const TIKZ_COORDINATE = '@retikz/Coordinate';

/** <Scope> 组件的 displayName（IR 容器：分组 + 局部 transform） */
export const TIKZ_SCOPE = '@retikz/Scope';
