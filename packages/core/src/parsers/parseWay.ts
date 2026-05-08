import type { IRFoldStep, IRLineStep, IRMoveStep, IRStep, IRTarget } from '../ir';

/**
 * way 数组里的"折角项"——等价于 `<Step kind="step" via to>`。
 * via 字面与 IR 一致：`-|` 先水平后垂直，`|-` 先垂直后水平。
 */
export type WayFold = { via: '-|' | '|-'; to: IRTarget };

/**
 * Sugar 层的 way 数组 DSL 元素。
 *
 * v0.1.0-alpha.1 接受四种形态：
 * - 节点 id 字符串：`'A'` → line（首项时为 move）
 * - 笛卡尔坐标：`[x, y]` → line
 * - 极坐标：`{ origin?, angle, radius }` → line
 * - 折角对象：`{ via: '-|' | '|-', to }` → step（折角）
 *
 * 后续会加：相对位移（`{ rel: [x, y] }`）、curve / cubic / 'close' 等。
 */
export type WayItem = IRTarget | WayFold;

/** way DSL 数组：sugar `<Draw way={...}>` 接受的输入形态 */
export type WayDSL = Array<WayItem>;

const isWayFold = (item: WayItem): item is WayFold =>
  typeof item === 'object' && !Array.isArray(item) && 'via' in item;

/** 把 WayItem 归约为它的"目标点"——直接 target 就是自身，fold 取 .to */
const targetOf = (item: WayItem): IRTarget =>
  isWayFold(item) ? item.to : item;

/**
 * 把 way 数组翻译为 IRStep 序列。
 * 第一个元素永远是 move（即便用户传了 fold 对象，也只取它的 to 当 move target）；
 * 之后的：fold 对象 → step（折角）；其余 → line。
 *
 * 这是纯函数，住在 core，被各框架 adapter 的 Sugar 组件复用。
 *
 * 类型校验由 TS 编译期完成；本函数不做运行时类型守卫。
 */
export const parseWay = (way: WayDSL): Array<IRStep> => {
  if (way.length < 2) {
    throw new Error('parseWay: way must contain at least 2 items');
  }
  const out: Array<IRStep> = [];
  // way[0] 始终是 move——若用户误传 fold 对象，提取 to 当 move target
  const moveStep: IRMoveStep = { type: 'step', kind: 'move', to: targetOf(way[0]) };
  out.push(moveStep);
  for (let i = 1; i < way.length; i++) {
    const item = way[i];
    if (isWayFold(item)) {
      const fold: IRFoldStep = { type: 'step', kind: 'step', via: item.via, to: item.to };
      out.push(fold);
      continue;
    }
    const lineStep: IRLineStep = { type: 'step', kind: 'line', to: item };
    out.push(lineStep);
  }
  return out;
};
