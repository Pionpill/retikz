import type {
  IRCycleStep,
  IRFoldStep,
  IRLineStep,
  IRMoveStep,
  IRStep,
  IRTarget,
} from '../ir';

/**
 * Sugar 层 way 数组的"关键字常量"。
 *
 * - `DrawWay.cycle`：闭合到 way 起点（way 元素位置）。**底层字符串故意取得很丑**
 *   （`'retikz-keyword_cycle'`），保证不会与任何合理的节点 id 冲突；用户应当
 *   只通过 `DrawWay.cycle` 引用，不要直接写裸字面量。
 * - `DrawWay.hv`：折角算子，先水平后垂直（裸字面量 `'-|'`）。
 * - `DrawWay.vh`：折角算子，先垂直后水平（裸字面量 `'|-'`）。
 *
 * 折角值（`-|` / `|-`）含特殊字符，与节点 id 不会冲突，因此**保留字面量与
 * 常量两种写法都合法**。way 数组里直接放 `'-|'` 或 `'|-'`（infix 算子）
 * 即把"上一项 → 下一项"那一段改成折角。
 *
 * 这里**故意不用 TS enum**——enum 在数值场景下生成 reverse-mapping 表、
 * 在 string 场景下与字面量类型不互通，而 const + `as const` 的字面量联合
 * 既可枚举也可与字面量字符串无缝混用。
 */
export const DrawWay = {
  /**
   * 闭合 way 到起点，等价于 `<Step kind="cycle" />`（TikZ 同名保留字 / SVG `Z`）。
   * 底层字符串值刻意写丑以避开节点 id 冲突；不要硬编码这个字符串。
   */
  cycle: 'retikz-keyword_cycle',
  /** 折角：先水平后垂直（TikZ `-|`） */
  hv: '-|',
  /** 折角：先垂直后水平（TikZ `|-`） */
  vh: '|-',
} as const;

/**
 * way 折角算子的字面量类型。`DrawWay.hv` / `DrawWay.vh` 与裸字面量等价。
 */
export type WayVia = typeof DrawWay.hv | typeof DrawWay.vh;

/**
 * way 闭合关键字的字面量类型，由 `DrawWay.cycle` 派生。
 */
export type WayCycle = typeof DrawWay.cycle;

/**
 * Sugar 层的 way 数组 DSL 元素。
 *
 * v0.1.0-alpha.1 接受五种形态：
 * - 节点 id 字符串：`'A'` → line（首项时为 move）
 * - 笛卡尔坐标：`[x, y]` → line
 * - 极坐标：`{ origin?, angle, radius }` → line
 * - 折角算子：`'-|'` / `'|-'`（或 `DrawWay.hv` / `DrawWay.vh`）→ 当前项 +
 *   **下一项**合并成一个折角 step（与 TikZ 的 `(A) -| (B)` infix 写法对齐）
 * - 闭合关键字：`DrawWay.cycle` → cycle（闭合到起点）
 *
 * 后续会加：相对位移（`{ rel: [x, y] }`）、curve / cubic 等。
 *
 * 注意：闭合刻意只走 `DrawWay.cycle`（底层字符串是 `'retikz-keyword_cycle'`），
 * 这样裸字符串 `'cycle'` 仍可作为正常节点 id 使用。
 */
export type WayItem = IRTarget | WayVia | WayCycle;

/** way DSL 数组：sugar `<Draw way={...}>` 接受的输入形态 */
export type WayDSL = Array<WayItem>;

const isWayCycle = (item: WayItem): item is WayCycle => item === DrawWay.cycle;

const isWayVia = (item: WayItem): item is WayVia =>
  item === DrawWay.hv || item === DrawWay.vh;

/** 把 WayItem 归约为它的"目标点"——target 直接返回；算子/关键字返回 null */
const targetOf = (item: WayItem): IRTarget | null => {
  if (isWayCycle(item) || isWayVia(item)) return null;
  return item;
};

/**
 * 把 way 数组翻译为 IRStep 序列。
 *
 * - 第一个元素始终是 move：取 way[0] 的目标点；若 way[0] 是 cycle / via 算子等
 *   非 target 项，则降级到原点 `[0, 0]`（容错）。
 * - 后续元素：
 *   - 普通 target → line
 *   - `DrawWay.cycle` → cycle 步
 *   - `'-|'` / `'|-'` → 与**下一项**合并成 fold 步；操作符在 way 末尾或后
 *     接非 target 项时抛错
 *
 * 这是纯函数，住在 core，被各框架 adapter 的 Sugar 组件复用。
 */
export const parseWay = (way: WayDSL): Array<IRStep> => {
  if (way.length < 2) {
    throw new Error('parseWay: way must contain at least 2 items');
  }
  const out: Array<IRStep> = [];
  const moveTarget = targetOf(way[0]) ?? [0, 0];
  const moveStep: IRMoveStep = { type: 'step', kind: 'move', to: moveTarget };
  out.push(moveStep);
  for (let i = 1; i < way.length; i++) {
    const item = way[i];
    if (isWayCycle(item)) {
      const cycle: IRCycleStep = { type: 'step', kind: 'cycle' };
      out.push(cycle);
      continue;
    }
    if (isWayVia(item)) {
      const next = way[i + 1];
      if (next === undefined) {
        throw new Error(
          `parseWay: via operator '${item}' at end of way must be followed by a target`,
        );
      }
      if (isWayCycle(next) || isWayVia(next)) {
        throw new Error(
          `parseWay: via operator '${item}' must be followed by a target, got '${String(next)}'`,
        );
      }
      const fold: IRFoldStep = { type: 'step', kind: 'step', via: item, to: next };
      out.push(fold);
      i++; // 消费 next
      continue;
    }
    const lineStep: IRLineStep = { type: 'step', kind: 'line', to: item };
    out.push(lineStep);
  }
  return out;
};
