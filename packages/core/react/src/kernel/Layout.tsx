import {
  type CSSProperties,
  type FC,
  type ReactElement,
  type ReactNode,
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';
import {
  type ArrowDefinition,
  type CompositeDefinition,
  type IR,
  type IRViewBox,
  type PathGeneratorDefinition,
  type PatternDefinition,
  type ShapeDefinition,
  type TextMeasurer,
  compileToScene,
} from '@retikz/core';
import type { HydrationHandlers } from '@retikz/render/hydration';
import { createHydrationController, locateSvg } from '@retikz/render/hydration';
import { buildSvgDocument } from '@retikz/render/svg';
import { buildIR, pickScopeStyle, wrapRootScope } from './builder';
import { collectHydrationHandlers } from './collectHydrationHandlers';
import { useRendererMode } from './rendererContext';
import type { ScopeStyleProps } from './_fields';
import { browserMeasurer } from '../render/browser-measurer';
import { CanvasHost } from '../render/canvasHost';
import { svgToReact } from '../render/svgToReact';

const styleFontFamily = (style: CSSProperties | undefined): string | undefined => {
  const fontFamily = style?.fontFamily;
  return typeof fontFamily === 'string' && fontFamily.trim().length > 0 ? fontFamily : undefined;
};

const withDefaultFontFamily = (
  measureText: TextMeasurer,
  defaultFontFamily: string | undefined,
): TextMeasurer => {
  if (defaultFontFamily === undefined) return measureText;
  return (text, font) =>
    measureText(text, {
      ...font,
      family: typeof font.family === 'string' && font.family.trim().length > 0 ? font.family : defaultFontFamily,
    });
};

/**
 * <Layout> 组件的 props
 * @description 含 {@link ScopeStyleProps} 级联样式子集——设任一样式 prop 时把 children 包进合成根 `<Scope>`，
 *   等价于用户手写一层根 `<Scope>`（编译产物同一 IR）。内层 `<Scope>` / 图元显式属性照常级联覆盖。
 *   与直接传 `ir` prop 并用时样式 props 被忽略（dev 警告）。
 */
export type LayoutProps = ScopeStyleProps & {
  /** 直接喂 IR JSON（持久化 / AI / 编辑器场景），与 children 二选一 */
  ir?: IR;
  /** Kernel/Sugar JSX children */
  children?: ReactNode;
  /**
   * `ir` prop 模式下按图元 id 提供的水合 handler 注册表（无 JSX children 可收集时用）
   * @description JSX 模式经组件 `on<Event>` props 收集，无需此 prop；直接传 `ir` 时无组件 props，
   *   改由此 prop 按 `{ [id]: { click, ... } }` 提供。两路结果经 `createHydrationController` 绑到 figure root
   *   （svg root 或 `<canvas>`），svg / canvas 双模共用同一注册表与分发。
   */
  handlers?: HydrationHandlers;
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
  /** 渲染目标；缺省为 SVG，设为 canvas 时用同一份 Scene 绘制到 `<canvas>` */
  renderer?: 'svg' | 'canvas';
  /**
   * SVG `<defs>` 资源 id 前缀，覆盖默认的 `useId()` 派生值
   * @description marker / paint / clip 的 id 与 `url(#...)` 引用共用此前缀确保多实例不撞。缺省回退剥冒号的
   *   `useId()`（纯 React 用户无感）。SSR→客户端水合需 id 逐字一致时：服务端 `renderToSvgString(scene,
   *   { idPrefix })` 与客户端 `<Layout idPrefix>` 传同一前缀即可对齐。
   */
  idPrefix?: string;
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
  /**
   * 运行时注入的 Tier 2 composite 展开逻辑（透传给 `compileToScene` 的 `CompileOptions.composites`）
   * @description IR 里含 namespace 的 tier2 节点经此注册表在 compile 第一步展开成 Tier 1；core 无内置，
   *   未注册 namespace/type → 警告并跳过。展开始终在 core，不在 React 层。
   */
  composites?: Array<CompositeDefinition>;
};

/**
 * 把水合 handler 注册表绑到 svg figure root（renderer 无关控制器 + locateSvg 定位）
 * @description JSX / `ir` 两路收集出的 `HydrationHandlers` 经 `createHydrationController(root, handlers, locateSvg)`
 *   绑到 svg root DOM（由 callback ref 在挂载后写入）；canvas 模式的绑定在 `CanvasHost` 内（hitTest 定位）、
 *   此处不接管。`locateSvg` 走 `event.target.closest('[data-retikz-id]')` 反查图元 id。卸载 / 依赖变化时 dispose、重建。
 */
const useSvgHydration = (
  handlers: HydrationHandlers,
): ((element: SVGSVGElement | null) => void) => {
  const rootRef = useRef<SVGSVGElement | null>(null);
  const setRoot = useCallback((element: SVGSVGElement | null) => {
    rootRef.current = element;
  }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return undefined;
    const controller = createHydrationController(root, handlers, locateSvg);
    return () => controller.dispose();
  }, [handlers]);
  return setRoot;
};

/**
 * <Layout> 顶层容器
 * @description 流水线：从 children 构造 IR（或直接接受外部 IR）→ `compileToScene` 得 Scene →
 *   `@retikz/render/svg` 的 `buildSvgDocument` 产中性 `SvgNode` 描述树（含 `<defs>` 与按需 dedup 的 `<marker>` /
 *   paint / clip 资源，id 用 `idPrefix` 派生）→ `svgToReact` 映射成 React 元素。Scene→SVG 逻辑单一数据源在
 *   `@retikz/render/svg`，react 只做 `SvgNode→ReactElement` 薄映射 + `useId` 绑定。
 */
export const Layout: FC<LayoutProps> = props => {
  const { ir: irFromProp, children, width, height, viewBox, className, style, renderer: rendererProp, idPrefix, nodeDistance, shapes, arrows, patterns, pathGenerators, composites, handlers } = props;
  const { color, stroke, fill, strokeWidth, opacity, fillOpacity, drawOpacity, nodeDefault, pathDefault, labelDefault, arrowDefault } = props;
  // 渲染目标：显式 prop > 祖先 RendererModeProvider 注入的 context > 默认 svg（hook 必须无条件调用）
  const contextRenderer = useRendererMode();
  const renderer = rendererProp ?? contextRenderer ?? 'svg';
  const scopeStyle: ScopeStyleProps = { color, stroke, fill, strokeWidth, opacity, fillOpacity, drawOpacity, nodeDefault, pathDefault, labelDefault, arrowDefault };
  const hasScopeStyle = Object.keys(pickScopeStyle(scopeStyle)).length > 0;

  // ir prop 已是完整 IR，再叠根样式语义不清——dev 警告 + 忽略样式（prod 静默兼容）
  // 在 render 体内直接 warn（React 官方诊断惯例）：dev-only、生产被 process.env 剥除，不影响产物
  if (process.env.NODE_ENV !== 'production' && irFromProp !== undefined && hasScopeStyle) {
    console.warn(
      '[retikz] <Layout>：同时提供 `ir` 与级联样式 props（color / nodeDefault / pathDefault 等）时，样式 props 被忽略——`ir` 已是完整 IR。请把根样式写进 IR 根的 `<Scope>` 节点，或改用 children。',
    );
  }

  const ir = useMemo(() => {
    const base = irFromProp ?? buildIR(wrapRootScope(children, { color, stroke, fill, strokeWidth, opacity, fillOpacity, drawOpacity, nodeDefault, pathDefault, labelDefault, arrowDefault }));
    // viewBox prop 注入 IR 根（显式 > IR 内置）；prop 缺省时保留 base 自带的 viewBox
    return viewBox !== undefined ? { ...base, viewBox } : base;
  }, [irFromProp, children, viewBox, color, stroke, fill, strokeWidth, opacity, fillOpacity, drawOpacity, nodeDefault, pathDefault, labelDefault, arrowDefault]);
  const defaultFontFamily = styleFontFamily(style);
  const measureText = useMemo(
    () => withDefaultFontFamily(browserMeasurer, defaultFontFamily),
    [defaultFontFamily],
  );
  const scene = useMemo(
    () => compileToScene(ir, { measureText, nodeDistance, shapes, arrows, patterns, pathGenerators, composites }),
    [ir, measureText, nodeDistance, shapes, arrows, patterns, pathGenerators, composites],
  );

  // useId 返回 ":r0:" 含冒号；SVG `url(#id)` 对冒号兼容性差，剥成纯字母数字。caller 显式 idPrefix 优先（SSR 水合对齐）
  const rawId = useId();
  const resolvedIdPrefix = idPrefix ?? rawId.replace(/[^a-zA-Z0-9]/g, '');
  const doc = useMemo(
    () => (renderer === 'canvas' ? null : buildSvgDocument(scene, { idPrefix: resolvedIdPrefix })),
    [renderer, scene, resolvedIdPrefix],
  );

  // 水合 handler 注册表：JSX 模式从 children 同源收集，`ir` prop 模式用 `handlers` prop（无 children 可收集）
  const resolvedHandlers = useMemo(
    () => (irFromProp !== undefined ? (handlers ?? {}) : collectHydrationHandlers(children)),
    [irFromProp, handlers, children],
  );

  // svg root 的 callback ref——水合控制器（createHydrationController + locateSvg）绑定的 figure root
  const setSvgRoot = useSvgHydration(resolvedHandlers);

  if (renderer === 'canvas') {
    return (
      <CanvasHost
        scene={scene}
        handlers={resolvedHandlers}
        width={width}
        height={height}
        className={className}
        style={style}
      />
    );
  }

  // Scene → 中性 SvgNode 描述树（buildSvgDocument 内部完成 arrow dedup / defs 组装 / id 前缀派生）→ React 元素
  const svgEl = svgToReact(doc as NonNullable<typeof doc>) as ReactElement;

  // svg 元素级附加（width / height / className / 框架 style）由 react 层补：非 svg 包职责
  return cloneElement(svgEl, { width, height, className, style, ref: setSvgRoot });
};
