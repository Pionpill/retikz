import {
  type CSSProperties,
  type FC,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type Ref,
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
  type IRAnimationTrack,
  type IRViewBox,
  type PathGeneratorDefinition,
  type PatternDefinition,
  type ShapeDefinition,
  type TextMeasurer,
  compileToScene,
} from '@retikz/core';
import type { HydrationHandlers } from '@retikz/render/hydration';
import {
  createContextBuilder,
  createHydrationController,
  createSvgAnimationControls,
  locateSvg,
  resolvePointViaLayout,
  resolveSvgElement,
} from '@retikz/render/hydration';
import { buildSvgDocument } from '@retikz/render/svg';
import { bindWaapiDescriptors, sceneHasAnimations } from '@retikz/render/animation';
import type { AnimationControls, AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/animation';
import { buildIRWithContributions, pickScopeStyle, wrapRootScope } from './builder';
import { collectHydrationHandlers } from './collect-hydration-handlers';
import type { EmbeddableContributionRecord, EmbeddableTier2Adapter } from './embeddable';
import { useRendererMode } from './renderer-context';
import type { ScopeStyleProps } from './_fields';
import { browserMeasurer } from '../render/browser-measurer';
import { CanvasHost } from '../render/canvas-host';
import { svgToReact } from '../render/svg-to-react';

const styleFontFamily = (style: CSSProperties | undefined): string | undefined => {
  const fontFamily = style?.fontFamily;
  return typeof fontFamily === 'string' && fontFamily.trim().length > 0 ? fontFamily : undefined;
};

/** 同一条诊断消息进程内只 `console.warn` 一次，避免组件重复 render 时刷屏 */
const warnedMessages = new Set<string>();
const warnOnce = (message: string): void => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
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

/** 写入 ref（兼容 callback ref 与 RefObject）；value 为 null 表示清空 */
const assignRef = <T,>(ref: Ref<T> | undefined, value: T): void => {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as MutableRefObject<T>).current = value;
};

/**
 * 按 namespace 分组合并可嵌入贡献，产出 composite 定义列表
 * @description 同 namespace 的 datasets 合并成一份（同一 reference 出现多次必须是同一对象引用，否则 fail-loud），
 *   每组调一次 makeComposites(mergedDatasets)，组间 concat。不同 namespace 的 reference 天然不互相干扰。
 */
const aggregateEmbeddableComposites = (
  contributions: ReadonlyArray<EmbeddableContributionRecord>,
): Array<CompositeDefinition> => {
  // 按 namespace 分组（保持首次出现顺序）：merged 合并 datasets，maker 取该组任一 makeComposites（同 namespace 等价）
  const order: Array<string> = [];
  const groups = new Map<
    string,
    { merged: Record<string, unknown>; maker: (merged: Record<string, unknown>) => Array<CompositeDefinition> }
  >();
  for (const contribution of contributions) {
    const { namespace, datasets, makeComposites } = contribution;
    let group = groups.get(namespace);
    if (group === undefined) {
      group = { merged: {}, maker: makeComposites };
      groups.set(namespace, group);
      order.push(namespace);
    }
    for (const ref of Object.keys(datasets)) {
      // 同 namespace 内同一 reference 复用必须指向同一对象引用，否则共享语义崩坏——fail-loud
      if (ref in group.merged && group.merged[ref] !== datasets[ref]) {
        throw new Error(
          `[retikz] <Layout>: 数据集 reference "${ref}" 在同一 namespace "${namespace}" 的多个可嵌入贡献中指向不同对象引用——共享同源数据请复用同一 data 对象。`,
        );
      }
      group.merged[ref] = datasets[ref];
    }
  }
  const out: Array<CompositeDefinition> = [];
  for (const namespace of order) {
    const group = groups.get(namespace);
    if (group === undefined) continue;
    out.push(...group.maker(group.merged));
  }
  return out;
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
   * 是否播放动画（缺省 true）；`false` → 渲染 base 静态图（不 emit CSS/WAAPI）
   * @description SVG 模式：`load` track 经内联 `<style>` CSS 自播、交互 track 经 WAAPI 桥按 trigger 驱动；
   *   `animate={false}` 走 settled 静态。
   */
  animate?: boolean;
  /**
   * 静态截帧时刻（毫秒）；给定时渲染「定格在该时刻」的静态图（不播放、不 emit 动画）
   * @description SVG：各 track 在该时刻的值烘焙成静态属性 / transform；Canvas：按该时刻画一帧、不起 rAF。覆盖 `animate`。
   */
  snapshotAt?: number;
  /**
   * 命令式动画句柄出口：传一个 ref，挂载后写入 `AnimationControls`（`play` / `pause` / `seek`）
   * @description 与 vanilla `view.animation` 对等——SVG 控制交互（`manual` / `visible` / `{onEvent}`）track 的 WAAPI
   *   句柄；Canvas 控制 rAF 时钟。无动画 / 降级时为 `null`。供组件外命令式控制（按钮播放 / 暂停 / 跳帧）。
   */
  animationRef?: Ref<AnimationControls | null>;
  /**
   * scene 根（镜头）时间轴动画 tracks（`viewBox` property）；注入构造出的 IR 根 `animations`
   * @description 配 `cameraTo()` preset：`<Layout animations={[cameraTo({ from, to })]}>`。元素级动画走各元素
   *   的 `animations` prop（非此 prop）。与直接传 `ir` prop 并用时，本 prop 追加到该 IR 根。
   */
  animations?: Array<IRAnimationTrack>;
  /**
   * 自定义缓动注册表（兑现动画扩展口）：名 → cubic-bezier 四元组 / 缓动函数
   * @description preset / track 的 `easing` 写注册名（如 `fadeIn({ easing: 'spring' })`）即生效。cubic-bezier
   *   形式 SVG（CSS）+ Canvas 都支持；函数形式仅 Canvas（SVG 退 linear 并告警）。
   */
  easings?: EasingRegistry;
  /**
   * 自定义动画属性通道插值器（兑现动画扩展口）：通道名 → { interpolate, applyCanvas }
   * @description 让 `property` 用内置之外的名字（如 `blur`）。**当前仅 Canvas 生效**（`renderer="canvas"`）；
   *   SVG 无内置映射 → 告警并跳过该 track（渲染 base）。
   */
  animationProperties?: AnimationPropertyRegistry;
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
   * @description IR 里 `fill={{ kind: 'pattern', shape: '...' }}` 仍只写字符串名；motif 定义在此注入。
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
  /**
   * 可选：显式注入的可嵌入 Tier2 适配器列表（逃生舱）
   * @description 主路径是子组件静态属性（Component.isTier2Embeddable + embeddableAdapter）自动识别；
   *   本 prop 用于测试注入 / 显式控制 / 未挂静态属性的 domain。按 adapter.displayName 匹配子组件，覆盖静态属性。
   */
  embeddables?: Array<EmbeddableTier2Adapter>;
};

/**
 * 把水合 handler 注册表绑到 svg figure root（renderer 无关控制器 + locateSvg 定位）
 * @description JSX / `ir` 两路收集出的 `HydrationHandlers` 经 `createHydrationController(root, handlers, locateSvg)`
 *   绑到 svg root DOM（由 callback ref 在挂载后写入）；canvas 模式的绑定在 `CanvasHost` 内（hitTest 定位）、
 *   此处不接管。`locateSvg` 走 `event.target.closest('[data-retikz-id]')` 反查图元 id。卸载 / 依赖变化时 dispose、重建。
 */
const useSvgRootBinding = (
  handlers: HydrationHandlers,
  scene: ReturnType<typeof compileToScene>,
  hasAnimations: boolean,
  publishAnimation: (controls: AnimationControls | null) => void,
): ((element: SVGSVGElement | null) => void) => {
  const rootRef = useRef<SVGSVGElement | null>(null);
  const setRoot = useCallback((element: SVGSVGElement | null) => {
    rootRef.current = element;
  }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return undefined;
    // svg 富 context：meta / geometry 经 Scene 按 id 聚合；element 经 closest；point 逆 meet-fit；
    // 动画控制经 data-retikz-id / data-retikz-animation-owner 双查 getAnimations per-id。scene 变 → effect 重跑、重建。
    const buildContext = createContextBuilder({
      renderer: 'svg',
      root,
      scene,
      resolveElement: resolveSvgElement,
      resolvePoint: resolvePointViaLayout(root, scene.layout),
      makeAnimation: id => createSvgAnimationControls(root, id),
    });
    const controller = createHydrationController(root, handlers, locateSvg, buildContext);
    return () => controller.dispose();
  }, [handlers, scene]);
  // 交互 track（visible / manual / onEvent）经 WAAPI 桥按 trigger 驱动；load track 已由内联 CSS 自播
  useEffect(() => {
    const root = rootRef.current;
    if (root === null || !hasAnimations) return undefined;
    const controls = bindWaapiDescriptors(root);
    publishAnimation(controls); // 命令式句柄出口（manual/visible/onEvent 的 WAAPI 控制）
    return () => {
      controls.dispose();
      publishAnimation(null);
    };
  }, [hasAnimations, scene, publishAnimation]);
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
  const { ir: irFromProp, children, width, height, viewBox, className, style, renderer: rendererProp, animate: animateProp, snapshotAt, animationRef, animations: rootAnimations, easings, animationProperties, idPrefix, nodeDistance, shapes, arrows, patterns, pathGenerators, composites, embeddables, handlers } = props;
  const animate = animateProp !== false;
  const { color, stroke, fill, strokeWidth, opacity, fillOpacity, drawOpacity, nodeDefault, pathDefault, labelDefault, arrowDefault } = props;
  // 渲染目标：显式 prop > 祖先 RendererModeProvider 注入的 context > 默认 svg（hook 必须无条件调用）
  const contextRenderer = useRendererMode();
  const renderer = rendererProp ?? contextRenderer ?? 'svg';
  const scopeStyle: ScopeStyleProps = useMemo(
    () => ({ color, stroke, fill, strokeWidth, opacity, fillOpacity, drawOpacity, nodeDefault, pathDefault, labelDefault, arrowDefault }),
    [color, stroke, fill, strokeWidth, opacity, fillOpacity, drawOpacity, nodeDefault, pathDefault, labelDefault, arrowDefault],
  );
  const hasScopeStyle = Object.keys(pickScopeStyle(scopeStyle)).length > 0;

  // ir prop 已是完整 IR，再叠根样式语义不清——dev 警告 + 忽略样式（prod 静默兼容）
  // 在 render 体内直接 warn（React 官方诊断惯例，且 SSR / 静态渲染也能命中——effect 在那里不跑）；
  // warnOnce 进程级去重，避免重复 render 刷屏；dev-only、生产被 process.env 剥除，不影响产物
  if (process.env.NODE_ENV !== 'production' && irFromProp !== undefined && hasScopeStyle) {
    warnOnce(
      '[retikz] <Layout>：同时提供 `ir` 与级联样式 props（color / nodeDefault / pathDefault 等）时，样式 props 被忽略——`ir` 已是完整 IR。请把根样式写进 IR 根的 `<Scope>` 节点，或改用 children。',
    );
  }

  // 性能边界：children 模式下 `children` 每次 render 都是新引用，本 memo 几乎不命中 → 每 render 重跑 buildIR + compileToScene。
  // 频繁重渲染且图较大时，建议改用持久化的 `ir` prop（irFromProp 引用稳定，memo 才有效）。
  // ir prop 模式无 children 遍历（贡献为空）；children 模式经 buildIRWithContributions 同源收集 IR + 可嵌入贡献
  const built = useMemo(
    () =>
      irFromProp !== undefined
        ? { ir: irFromProp, contributions: [] as Array<EmbeddableContributionRecord> }
        : buildIRWithContributions(wrapRootScope(children, scopeStyle), embeddables),
    [irFromProp, children, scopeStyle, embeddables],
  );
  const ir = useMemo(() => {
    const base = built.ir;
    // viewBox prop 注入 IR 根（显式 > IR 内置）；prop 缺省时保留 base 自带的 viewBox
    const withViewBox = viewBox !== undefined ? { ...base, viewBox } : base;
    // animations prop 注入 IR 根（镜头，cameraTo）；缺省保留 base 自带
    return rootAnimations !== undefined ? { ...withViewBox, animations: rootAnimations } : withViewBox;
  }, [built, viewBox, rootAnimations]);
  // 可嵌入贡献按 namespace 聚合成 composite 定义，再拼接用户显式 composites（用户优先级后置、可覆盖语义由 compile 决定）
  const aggregatedComposites = useMemo(() => {
    const fromEmbeddables = aggregateEmbeddableComposites(built.contributions);
    return composites !== undefined ? [...fromEmbeddables, ...composites] : fromEmbeddables;
  }, [built.contributions, composites]);
  const defaultFontFamily = styleFontFamily(style);
  const measureText = useMemo(
    () => withDefaultFontFamily(browserMeasurer, defaultFontFamily),
    [defaultFontFamily],
  );
  const scene = useMemo(
    () => compileToScene(ir, { measureText, nodeDistance, shapes, arrows, patterns, pathGenerators, composites: aggregatedComposites }),
    [ir, measureText, nodeDistance, shapes, arrows, patterns, pathGenerators, aggregatedComposites],
  );

  // useId 返回 ":r0:" 含冒号；SVG `url(#id)` 对冒号兼容性差，剥成纯字母数字。caller 显式 idPrefix 优先（SSR 水合对齐）
  const rawId = useId();
  const resolvedIdPrefix = idPrefix ?? rawId.replace(/[^a-zA-Z0-9]/g, '');
  const doc = useMemo(
    () => (renderer === 'canvas' ? null : buildSvgDocument(scene, { idPrefix: resolvedIdPrefix, animate, snapshotAt, easings })),
    [renderer, scene, resolvedIdPrefix, animate, snapshotAt, easings],
  );

  // 水合 handler 注册表：JSX 模式从 children 同源收集，`ir` prop 模式用 `handlers` prop（无 children 可收集）
  const resolvedHandlers = useMemo(
    () => (irFromProp !== undefined ? (handlers ?? {}) : collectHydrationHandlers(children, embeddables)),
    [irFromProp, handlers, children, embeddables],
  );

  // svg root 的 callback ref——水合控制器（createHydrationController + locateSvg）+ 交互动画 WAAPI 桥绑定的 figure root
  const hasAnimations = renderer !== 'canvas' && animate && sceneHasAnimations(scene);
  // 命令式动画句柄出口（与 vanilla view.animation 对等）；svg 走 WAAPI 句柄、canvas 走 CanvasHost 的 rAF 时钟
  const publishAnimation = useCallback((controls: AnimationControls | null) => assignRef(animationRef, controls), [animationRef]);
  const setRoot = useSvgRootBinding(resolvedHandlers, scene, hasAnimations, publishAnimation);

  if (renderer === 'canvas') {
    return (
      <CanvasHost
        scene={scene}
        handlers={resolvedHandlers}
        width={width}
        height={height}
        className={className}
        style={style}
        animate={animate}
        snapshotAt={snapshotAt}
        animationRef={animationRef}
        easings={easings}
        animationProperties={animationProperties}
      />
    );
  }

  // Scene → 中性 SvgNode 描述树（buildSvgDocument 内部完成 arrow dedup / defs 组装 / id 前缀派生）→ React 元素
  const svgEl = svgToReact(doc as NonNullable<typeof doc>) as ReactElement;

  // svg 元素级附加（width / height / className / 框架 style）由 react 层补：非 svg 包职责
  return cloneElement(svgEl, { width, height, className, style, ref: setRoot });
};
