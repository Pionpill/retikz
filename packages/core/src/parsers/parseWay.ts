import type { IRLineStep, IRMoveStep, IRStep, IRTarget } from '../ir';

/**
 * Sugar 层的 way 数组 DSL 元素。
 *
 * v0.1.0-alpha 接受三种形态（与 `IRTarget` 等价）：
 * - 节点 id 字符串：`'A'`
 * - 直接笛卡尔坐标：`[x, y]`
 * - 极坐标：`{ origin?, angle, radius }`
 *
 * 后续会加：折角对象（`{ via: '-|' }`）、相对位移（`{ rel: [x, y] }`）、
 * curve / cubic / 'close' 等——届时 WayItem 与 IRTarget 才会出现真正分歧。
 */
export type WayItem = IRTarget;

/** way DSL 数组：sugar `<Draw way={...}>` 接受的输入形态 */
export type WayDSL = Array<WayItem>;

/**
 * 把 way 数组翻译为 IRStep 序列。
 * 第一个元素永远是 move；之后的默认是 line。
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
  const moveStep: IRMoveStep = { type: 'step', kind: 'move', to: way[0] };
  out.push(moveStep);
  for (let i = 1; i < way.length; i++) {
    const lineStep: IRLineStep = { type: 'step', kind: 'line', to: way[i] };
    out.push(lineStep);
  }
  return out;
}
