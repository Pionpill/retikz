import { type CSSProperties, type FC, type ReactNode, useId, useMemo } from 'react';
import {
  type ArrowEndSpec,
  type AssertEqual,
  type IR,
  type ScenePrimitive,
  compileToScene,
} from '@retikz/core';
import { buildIR } from './builder';
import { ArrowMarker } from '../render/arrowMarkers';
import { browserMeasurer } from '../render/browser-measurer';
import { renderPrim } from '../render/renderPrim';
import { formatViewBox } from '../render/viewBox';

/** <TikZ> 组件的 props */
export type TikZProps = {
  /** 直接喂 IR JSON（持久化 / AI / 编辑器场景），与 children 二选一 */
  ir?: IR;
  /** Kernel/Sugar JSX children */
  children?: ReactNode;
  /** SVG 元素宽度（CSS 长度或数字） */
  width?: number | string;
  /** SVG 元素高度（CSS 长度或数字） */
  height?: number | string;
  /** 透传到 svg 元素的 className */
  className?: string;
  /** 透传到 svg 元素的内联样式 */
  style?: CSSProperties;
  /**
   * 节点相对定位（`Node.position = { direction, of }`）的默认距离，单位 user units
   * @description 对应 TikZ `node distance=...`；节点 position 自带 `distance` 时优先用自带值，都缺省时回退到 1
   */
  nodeDistance?: number;
};

/** 递归收集 scene 里所有 PathPrim 用到的 arrow 端点 spec —— 按需注入 marker defs */
const collectArrowSpecs = (prims: Array<ScenePrimitive>): Array<ArrowEndSpec> => {
  const out: Array<ArrowEndSpec> = [];
  const visit = (p: ScenePrimitive | undefined | null): void => {
    // 防御：上游（如 AI 生成的非法 IR、有空槽位的 group.children）可能塞 undefined，命中后直接 noop，别让属性访问抛
    if (!p) return;
    if (p.type === 'path') {
      if (p.arrowStart) out.push(p.arrowStart);
      if (p.arrowEnd) out.push(p.arrowEnd);
    } else if (p.type === 'group') {
      for (const c of p.children) visit(c);
    }
  };
  for (const p of prims) visit(p);
  return out;
};

/**
 * `ArrowEndSpec` 全部可选字段（不含必填 `shape`）的字段表——`stableSpecKey` 遍历此表拼 key
 * @description `as const satisfies` 拒不存在的 key；下方 `_OptionalCheck` 静态校验完备性——未来 `ArrowEndSpec` 加新可选字段时此表漏写 TS 编译期报错，防"字段表漂移"
 */
const ARROW_END_SPEC_OPTIONAL_FIELDS = [
  'scale',
  'length',
  'width',
  'color',
  'fill',
  'opacity',
  'lineWidth',
] as const satisfies ReadonlyArray<keyof ArrowEndSpec>;

// 类型层完备性互锁：字段表必须覆盖 ArrowEndSpec 除 `shape` 外的所有 key（漏 / 多 字段 TS 报错）
type _OptionalCheck = AssertEqual<
  (typeof ARROW_END_SPEC_OPTIONAL_FIELDS)[number],
  Exclude<keyof ArrowEndSpec, 'shape'>
>;
const _assertOptionalCheck: _OptionalCheck = true;
void _assertOptionalCheck;

/**
 * spec → 稳定字符串 key
 * @description 必填 `shape` 头部输出，其余 optional 字段按 `ARROW_END_SPEC_OPTIONAL_FIELDS` 顺序遍历——不依赖对象字面量字段顺序、不漏字段；输出仅含 [A-Za-z0-9_-=|]，可安全嵌入 SVG id；不同 spec → 不同 key、相同 spec → 同 key（dedup）
 */
const stableSpecKey = (spec: ArrowEndSpec): string => {
  const parts: Array<string> = [`shape=${spec.shape}`];
  for (const field of ARROW_END_SPEC_OPTIONAL_FIELDS) {
    const value = spec[field];
    if (value !== undefined) parts.push(`${field}=${value}`);
  }
  return parts.join('|');
};

/**
 * key → 短 hash（SVG id 中可安全嵌入的 ascii；non-cryptographic）
 * @description djb2 变体；只用十六进制末 8 位避免 id 过长。同 spec → 同 hash、不同 spec → 不同 hash（碰撞概率极低，且我们已在 useId() 前缀里加了组件实例隔离，不会跨 svg 串话）
 */
const hashKey = (key: string): string => {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

/**
 * <TikZ> 顶层容器
 * @description 流水线：从 children 构造 IR（或直接接受外部 IR）→ compileToScene 得 Scene → 渲染 SVG 元素并按需注入 `<defs>` 与每种 arrow 端点 spec 的 `<marker>`；marker id 用 `useId()` 派生稳定前缀避免多实例冲突，每种 detail 一个定义（`${prefix}-${specHash}`），marker 内借 spec 字段（`color` / `fill` / `opacity` 等）替换硬编码，缺省字段回退到 `context-stroke` 让颜色继续跟随 path 同步
 */
export const TikZ: FC<TikZProps> = props => {
  const { ir: irFromProp, children, width, height, className, style, nodeDistance } = props;
  const ir = useMemo(() => irFromProp ?? buildIR(children), [irFromProp, children]);
  const scene = useMemo(
    () => compileToScene(ir, { measureText: browserMeasurer, nodeDistance }),
    [ir, nodeDistance],
  );

  // useId 返回 ":r0:" 含冒号；SVG `url(#id)` 对冒号兼容性差，剥成纯字母数字
  const rawId = useId();
  const arrowMarkerPrefix = `retikz-arrow-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // 收集 + 按 key dedup
  const specs = collectArrowSpecs(scene.primitives);
  const uniqueByKey = new Map<string, ArrowEndSpec>();
  for (const s of specs) {
    const k = stableSpecKey(s);
    if (!uniqueByKey.has(k)) uniqueByKey.set(k, s);
  }

  const arrowMarkerIdFor = (spec: ArrowEndSpec) =>
    `${arrowMarkerPrefix}-${hashKey(stableSpecKey(spec))}`;

  return (
    <svg viewBox={formatViewBox(scene.layout)} width={width} height={height} className={className} style={style}>
      {uniqueByKey.size > 0 && (
        <defs>
          {Array.from(uniqueByKey.entries()).map(([k, spec]) => (
            <ArrowMarker key={k} id={`${arrowMarkerPrefix}-${hashKey(k)}`} spec={spec} />
          ))}
        </defs>
      )}
      {scene.primitives.map((p, i) => renderPrim(p, i, { arrowMarkerIdFor }))}
    </svg>
  );
};
