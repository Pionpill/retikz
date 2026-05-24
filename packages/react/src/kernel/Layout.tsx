import { type CSSProperties, type FC, type ReactNode, useId, useMemo } from 'react';
import {
  type ArrowDefinition,
  type ArrowEndSpec,
  type AssertEqual,
  type IR,
  type IRViewBox,
  type PathGeneratorDefinition,
  type PatternDefinition,
  type ScenePrimitive,
  type ShapeDefinition,
  compileToScene,
} from '@retikz/core';
import { buildIR } from './builder';
import { ArrowMarker } from '../render/arrowMarkers';
import { browserMeasurer } from '../render/browser-measurer';
import { PaintDefs } from '../render/paintDefs';
import { ClipDefs } from '../render/clipDefs';
import { renderPrim } from '../render/renderPrim';
import { formatViewBox } from '../render/viewBox';

/** <Layout> 组件的 props */
export type LayoutProps = {
  /** 直接喂 IR JSON（持久化 / AI / 编辑器场景），与 children 二选一 */
  ir?: IR;
  /** Kernel/Sugar JSX children */
  children?: ReactNode;
  /** SVG 元素宽度（CSS 长度或数字） */
  width?: number | string;
  /** SVG 元素高度（CSS 长度或数字） */
  height?: number | string;
  /**
   * 显式视框 `{ x, y, width, height }`，覆盖自动算的范围（固定尺寸 / 裁剪 / 多图对齐）
   * @description 注入构造出的 IR 根（`ir.viewBox`）；设值时 `<svg viewBox>` 用它、忽略 padding。
   *   与直接传 `ir` prop 自带的 viewBox 冲突时，本 prop 优先；都缺省时回退自动 AABB。
   */
  viewBox?: IRViewBox;
  /** 透传到 svg 元素的 className */
  className?: string;
  /** 透传到 svg 元素的内联样式 */
  style?: CSSProperties;
  /**
   * 节点相对定位（`Node.position = { direction, of }`）的默认距离，单位 user units
   * @description 对应 TikZ `node distance=...`；节点 position 自带 `distance` 时优先用自带值，都缺省时回退到 1
   */
  nodeDistance?: number;
  /**
   * 运行时注入的第三方 / 自定义 shape（透传给 `compileToScene` 的 `CompileOptions.shapes`）
   * @description IR 里 `<Node shape="...">` 仍只写字符串名；定义在此注入。同名覆盖内置时编译期发 `SHAPE_OVERRIDES_BUILTIN`；未注册名编译期 throw
   */
  shapes?: Record<string, ShapeDefinition>;
  /**
   * 运行时注入的第三方 / 自定义 arrow（透传给 `compileToScene` 的 `CompileOptions.arrows`）
   * @description IR 里 `<Path arrowDetail={{ shape: '...' }}>` 仍只写字符串名；定义在此注入。emit-in-compile：
   *   compile 调 `def.emit` 产 marker 几何进 `ArrowEndSpec`，react adapter 只物化、不需 arrows 表。同名覆盖
   *   内置时编译期发 `ARROW_OVERRIDES_BUILTIN`；未注册名编译期 throw
   */
  arrows?: Record<string, ArrowDefinition>;
  /**
   * 运行时注入的第三方 / 自定义 pattern motif（透传给 `compileToScene` 的 `CompileOptions.patterns`）
   * @description IR 里 `fill={{ type: 'pattern', shape: '...' }}` 仍只写字符串名；motif 定义在此注入。
   *   emit-in-compile：compile 调 `def.emit` 产 motif 几何进 `SceneResource.tile`，react adapter 只物化、
   *   不需 patterns 表。同名覆盖内置时编译期发 `PATTERN_OVERRIDES_BUILTIN`；未注册名编译期 throw
   */
  patterns?: Record<string, PatternDefinition>;
  /**
   * 运行时注入的第三方 / 自定义 path generator（透传给 `compileToScene` 的 `CompileOptions.pathGenerators`）
   * @description IR 里 generator step 仍只写字符串 `name`；曲线生成器定义在此注入。core 不内置任何曲线；
   *   未注册名编译期 throw（错误列出可用名）。`params` 经 generator 的 paramsSchema + JsonObjectSchema 双 parse 守 JSON 可序列化
   */
  pathGenerators?: Record<string, PathGeneratorDefinition>;
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
 * `ArrowEndSpec`（已解析 marker 描述）除必填 `shape` 外的全部字段表——`stableSpecKey` 遍历此表拼 key
 * @description `as const satisfies` 拒不存在的 key；下方 `_OptionalCheck` 静态校验完备性——未来 `ArrowEndSpec`
 *   加新字段时此表漏写 TS 编译期报错，防"字段表漂移"。emit-in-compile 后 spec 字段集为 wrapper 参数
 *   （baseSize / refX / markerWidth / markerHeight / opacity）+ 已解析几何（marker）。
 */
const ARROW_END_SPEC_KEY_FIELDS = [
  'baseSize',
  'refX',
  'markerWidth',
  'markerHeight',
  'opacity',
  'marker',
] as const satisfies ReadonlyArray<keyof ArrowEndSpec>;

// 类型层完备性互锁：字段表必须覆盖 ArrowEndSpec 除 `shape` 外的所有 key（漏 / 多 字段 TS 报错）
type _KeyFieldsCheck = AssertEqual<
  (typeof ARROW_END_SPEC_KEY_FIELDS)[number],
  Exclude<keyof ArrowEndSpec, 'shape'>
>;
const _assertKeyFieldsCheck: _KeyFieldsCheck = true;
void _assertKeyFieldsCheck;

/**
 * spec → 稳定字符串 key
 * @description 必填 `shape` 头部输出，其余字段按 `ARROW_END_SPEC_KEY_FIELDS` 顺序遍历——不依赖对象字面量
 *   字段顺序、不漏字段；标量直接拼，`marker`（结构化几何数组）走 JSON.stringify。不同 spec → 不同 key、
 *   相同 spec → 同 key（dedup）。
 */
const stableSpecKey = (spec: ArrowEndSpec): string => {
  const parts: Array<string> = [`shape=${spec.shape}`];
  for (const field of ARROW_END_SPEC_KEY_FIELDS) {
    const value = spec[field];
    if (value === undefined) continue;
    parts.push(`${field}=${typeof value === 'object' ? JSON.stringify(value) : value}`);
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
 * <Layout> 顶层容器
 * @description 流水线：从 children 构造 IR（或直接接受外部 IR）→ compileToScene 得 Scene → 渲染 SVG 元素并按需注入 `<defs>` 与每种 arrow 端点 spec 的 `<marker>`；marker id 用 `useId()` 派生稳定前缀避免多实例冲突，每种 detail 一个定义（`${prefix}-${specHash}`），marker 内借 spec 字段（`color` / `fill` / `opacity` 等）替换硬编码，缺省字段回退到 `context-stroke` 让颜色继续跟随 path 同步
 */
export const Layout: FC<LayoutProps> = props => {
  const { ir: irFromProp, children, width, height, viewBox, className, style, nodeDistance, shapes, arrows, patterns, pathGenerators } = props;
  const ir = useMemo(() => {
    const base = irFromProp ?? buildIR(children);
    // viewBox prop 注入 IR 根（显式 > IR 内置）；prop 缺省时保留 base 自带的 viewBox
    return viewBox !== undefined ? { ...base, viewBox } : base;
  }, [irFromProp, children, viewBox]);
  const scene = useMemo(
    () => compileToScene(ir, { measureText: browserMeasurer, nodeDistance, shapes, arrows, patterns, pathGenerators }),
    [ir, nodeDistance, shapes, arrows, patterns, pathGenerators],
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

  // 资源表按 kind 分流：paint（gradient / pattern / image）与 clip 各自物化；id 加同源实例前缀避免跨 SVG 撞
  const allResources = scene.resources ?? [];
  const paintResources = allResources.filter(r => r.kind === 'paint');
  const clipResources = allResources.filter(r => r.kind === 'clip');
  const idPrefix = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const paintIdFor = (id: string) => `retikz-paint-${idPrefix}-${id}`;
  const paintRefUrl = (id: string) => `url(#${paintIdFor(id)})`;
  const clipIdFor = (id: string) => `retikz-clip-${idPrefix}-${id}`;
  const clipRefUrl = (id: string) => `url(#${clipIdFor(id)})`;
  const hasDefs = uniqueByKey.size > 0 || paintResources.length > 0 || clipResources.length > 0;

  return (
    <svg viewBox={formatViewBox(scene.layout)} width={width} height={height} className={className} style={style}>
      {hasDefs && (
        <defs>
          {Array.from(uniqueByKey.entries()).map(([k, spec]) => (
            <ArrowMarker key={k} id={`${arrowMarkerPrefix}-${hashKey(k)}`} spec={spec} />
          ))}
          <PaintDefs resources={paintResources} idFor={paintIdFor} />
          <ClipDefs resources={clipResources} idFor={clipIdFor} />
        </defs>
      )}
      {scene.primitives.map((p, i) => renderPrim(p, i, { arrowMarkerIdFor, paintRefUrl, clipRefUrl }))}
    </svg>
  );
};
