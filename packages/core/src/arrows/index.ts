/**
 * Arrow Registry 扩展面
 * @description 内置 7 arrow 的注册项 + 第三方 arrow 作者所需的类型。
 *   `BUILTIN_ARROWS` 的 Record key 用 `BuiltinArrowName`（7 名穷尽），不用开放的 `ArrowShapeName`。
 *
 *   注意：本文件当前是 stub——`emit` 为占位（TODO throw），几何字段（baseSize / lineContactX /
 *   tipX / defaultLength / defaultWidth / hollow）按 ADR-01 几何契约声明。实现 Agent 负责落 `emit`
 *   产 `MarkerPrimitive` 几何 + 接 compile/path 查表 + react renderInner 重写。
 */
import type { BuiltinArrowName } from '../ir/path/arrow';
import type { ArrowDefinition } from './types';

/** 占位 emit：实现 Agent 落具体 MarkerPrimitive 几何前抛错（让 render 路径测试明确 fail，不静默产空 marker） */
const todoEmit = (name: string): ArrowDefinition['emit'] => () => {
  throw new Error(`ArrowDefinition.emit not implemented for built-in arrow '${name}'`);
};

/**
 * 内置 7 arrow 注册项；与 `CompileOptions.arrows` 合并时被同名注入覆盖
 * @description 几何字段（lineContactX 静态 base / tipX / hollow）来自 ADR-01 几何契约——
 *   实心 normal/diamond/circle lineContactX=0；stealth=3；open/openDiamond base=1 + tipX=9 + hollow；
 *   openCircle base=0.75 + hollow。baseSize / defaultLength / defaultWidth 走类型缺省（10 / 6 / 6）。
 *   framework 对 hollow def 统一把 lineContactX 减 lineWidth/2 得实际 refX / shrink 接触点。
 */
export const BUILTIN_ARROWS: Record<BuiltinArrowName, ArrowDefinition> = {
  normal: { lineContactX: 0, emit: todoEmit('normal') },
  open: { hollow: true, lineContactX: 1, tipX: 9, emit: todoEmit('open') },
  stealth: { lineContactX: 3, emit: todoEmit('stealth') },
  diamond: { lineContactX: 0, emit: todoEmit('diamond') },
  openDiamond: { hollow: true, lineContactX: 1, tipX: 9, emit: todoEmit('openDiamond') },
  circle: { lineContactX: 0, emit: todoEmit('circle') },
  openCircle: { hollow: true, lineContactX: 0.75, emit: todoEmit('openCircle') },
};

export type { ArrowDefinition, ArrowEmitContext } from './types';
