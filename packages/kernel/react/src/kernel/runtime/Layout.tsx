import type {
  AnyCompositeDefinition,
  AnyPathKindDefinition,
  ArrowDefinition,
  BoundaryDefinition,
  ClipDefinition,
  CompileArtifact,
  CompileArtifactOptions,
  CompileResult,
  CoreProviderContribution,
  CoreProviderDefinitions,
  CoreProgramOptions,
  IRAnimationTrack,
  IRScene,
  IRViewBox,
  LowerTex,
  PathGeneratorDefinition,
  PatternDefinition,
  RibbonWidthProfileDefinition,
  ShapeDefinition,
  TextMeasurer,
  ThemeStyleDefinition,
} from '@retikz/core';
import type { AnimationControls, AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type { CSSProperties, FC, ReactNode, Ref } from 'react';

import {
  DEFAULT_RESOLVED_THEME,
  resolveCoreProviderDependencies,
  resolveTheme,
  resolveThemeStyleRegistry,
  ThemeSchema,
} from '@retikz/core';
import { resolveAnimationEnabled } from '@retikz/render/animation';
import { useCallback, useId, useMemo } from 'react';

import type { EmbeddableAuthoringContext, EmbeddableTier2Adapter, ScopeStyleProps } from '../protocol';
import type { LayoutCompileDriver, LayoutCompileDriverInput } from '../protocol';
import type { LayoutRuntimeOptions } from './runtime-options';

import { usePrefersReducedMotion } from '../../render/animation';
import { RetainedHost, StaticHost } from '../../render/runtime';
import { browserMeasurer } from '../../render/text';
import { buildIRWithContributions, pickScopeStyle, wrapRootScope } from '../adapter';
import { compileLayoutWithDriver, createLayoutCompileDriverSession, defaultLayoutCompileDriver } from '../protocol';
import { useAnimationMode } from './animation-context';
import { collectHydrationHandlers } from './collect-hydration-handlers';
import { useRendererMode } from './renderer-context';
import { captureLayoutRuntimeOptions, LayoutRuntimeMode } from './runtime-options';
import { mergeThemeOverlays, useTheme } from './theme-context';
import { mergeThemeStyleDefinitions, useThemeStyles } from './theme-styles-context';

const styleFontFamily = (style: CSSProperties | undefined): string | undefined => {
  const fontFamily = style?.fontFamily;
  return typeof fontFamily === 'string' && fontFamily.trim().length > 0 ? fontFamily : undefined;
};

/** 校验直接传入的持久化 Theme，避免 JSX overlay 在编译前吞掉非法 IR */
const validatePersistedTheme = (theme: IRScene['theme'] | undefined): IRScene['theme'] | undefined => {
  if (theme === undefined) return undefined;
  const parsed = ThemeSchema.safeParse(theme);
  if (parsed.success) return parsed.data;
  throw new Error(`Invalid Theme at scene.theme: ${parsed.error.issues[0]?.message ?? 'Theme is invalid.'}`, {
    cause: parsed.error,
  });
};

/** 同一条诊断消息进程内只 `console.warn` 一次，避免组件重复 render 时刷屏 */
const warnedMessages = new Set<string>();

type DefinitionArrayNode = {
  children: WeakMap<object, DefinitionArrayNode>;
  value?: ReadonlyArray<object>;
};

const definitionArrayRoot: DefinitionArrayNode = { children: new WeakMap() };

/** 按有序元素 identity 规范化 Definition 容器，避免等价 inline 数组重建 Runtime session */
const canonicalizeDefinitionArray = <TDefinition extends object>(
  definitions: ReadonlyArray<TDefinition> | undefined,
): ReadonlyArray<TDefinition> | undefined => {
  if (definitions === undefined || definitions.length === 0) return undefined;
  let current = definitionArrayRoot;
  for (const definition of definitions) {
    let child = current.children.get(definition);
    if (child === undefined) {
      child = { children: new WeakMap() };
      current.children.set(definition, child);
    }
    current = child;
  }
  current.value ??= Object.freeze([...definitions]);
  return current.value as ReadonlyArray<TDefinition>;
};

/** 按 capability 复用相同有序 identity 的 provider definition 容器 */
const canonicalizeProviderDefinitions = (definitions: CoreProviderDefinitions): CoreProviderDefinitions =>
  Object.freeze({
    ...(definitions.shapes === undefined ? {} : { shapes: canonicalizeDefinitionArray(definitions.shapes) }),
    ...(definitions.boundaries === undefined ? {} : { boundaries: canonicalizeDefinitionArray(definitions.boundaries) }),
    ...(definitions.clips === undefined ? {} : { clips: canonicalizeDefinitionArray(definitions.clips) }),
    ...(definitions.arrows === undefined ? {} : { arrows: canonicalizeDefinitionArray(definitions.arrows) }),
    ...(definitions.patterns === undefined ? {} : { patterns: canonicalizeDefinitionArray(definitions.patterns) }),
    ...(definitions.pathGenerators === undefined
      ? {}
      : { pathGenerators: canonicalizeDefinitionArray(definitions.pathGenerators) }),
    ...(definitions.pathKinds === undefined ? {} : { pathKinds: canonicalizeDefinitionArray(definitions.pathKinds) }),
    ...(definitions.composites === undefined ? {} : { composites: canonicalizeDefinitionArray(definitions.composites) }),
  });
const warnOnce = (message: string): void => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
};

const withDefaultFontFamily = (measureText: TextMeasurer, defaultFontFamily: string | undefined): TextMeasurer => {
  if (defaultFontFamily === undefined) return measureText;
  return (text, font) =>
    measureText(text, {
      ...font,
      family: typeof font.family === 'string' && font.family.trim().length > 0 ? font.family : defaultFontFamily,
    });
};

/**
 * @description 含 {@link ScopeStyleProps} 级联样式子集——设任一样式 prop 时把 children 包进合成根 `<Scope>`，
 *   等价于用户手写一层根 `<Scope>`（编译产物同一 IR）。内层 `<Scope>` / 图元显式属性照常级联覆盖。
 *   与直接传 `ir` prop 并用时样式 props 被忽略（dev 警告）
 */
export type LayoutProps = ScopeStyleProps & {
  /** 直接喂 IR JSON（持久化 / AI / 编辑器场景），与 children 二选一 */
  ir?: IRScene;
  /**
   * 写入 Scene 根并由后代 Composite 继承的 Theme
   * @description 与 `ir` 同时使用时按字段覆盖 `ir.theme`，未声明字段保留持久化值
   */
  theme?: IRScene['theme'];
  /** Kernel/Sugar JSX children */
  children?: ReactNode;
  /** 可选 compile driver 自行解释的 runtime-only scene authoring 载荷，不进入 Core IR */
  authoring?: unknown;
  /**
   * 领域中立 compile driver
   * @default defaultLayoutCompileDriver
   */
  compileDriver?: LayoutCompileDriver;
  /**
   * `ir` prop 模式下按图元 id 提供的水合 handler 注册表（无 JSX children 可收集时用）
   * @description JSX 模式经组件 `on<Event>` props 收集，无需此 prop；直接传 `ir` 时无组件 props，
   *   改由此 prop 按 `{ [id]: { click, ... } }` 提供。两路结果经 `createHydrationController` 绑到 figure root
   *   （svg root 或 `<canvas>`），svg / canvas 双模共用同一注册表与分发
   */
  handlers?: HydrationHandlers;
  /** 宿主执行模式与 retained Runtime session 配置 */
  runtime?: LayoutRuntimeOptions;
  /** SVG 元素宽度（CSS 长度或数字） */
  width?: number | string;
  /** SVG 元素高度（CSS 长度或数字） */
  height?: number | string;
  /**
   * 显式视框 `{ x, y, width, height }`，覆盖自动算的范围（固定尺寸 / 裁剪 / 多图对齐）
   * @description 注入构造出的 IR 根（`ir.viewBox`）；设值时 `<svg viewBox>` 用它、忽略 padding。
   *   与直接传 `ir` prop 自带的 viewBox 冲突时，本 prop 优先；都缺省时回退自动 AABB
   */
  viewBox?: IRViewBox;
  /** 透传到 svg 元素的 className */
  className?: string;
  /** 透传到 svg 元素的内联样式 */
  style?: CSSProperties;
  /** 渲染目标；缺省为 SVG，设为 canvas 时用同一份图形数据绘制到 `<canvas>` */
  renderer?: 'svg' | 'canvas';
  /**
   * 是否播放动画；未传时跟随系统减少动态效果偏好，显式 `true` / `false` 强制开关
   * @description SVG 模式：`load` track 经内联 `<style>` CSS 自播、交互 track 经 WAAPI 桥按 trigger 驱动；
   *   `animate={false}` 走 settled 静态。显式 `true` 会覆盖 `prefers-reduced-motion`；祖先
   *   `AnimationModeProvider` 存在时由最近的 Provider 统一覆盖本属性
   */
  animate?: boolean;
  /**
   * 静态截帧时刻（毫秒）；给定时渲染「定格在该时刻」的静态图
   * @description SVG：各 track 在该时刻的值烘焙成静态属性 / transform；Canvas：按该时刻画一帧、不起 rAF。覆盖 `animate`
   */
  snapshotAt?: number;
  /**
   * 命令式动画句柄出口：传一个 ref，挂载后写入 `AnimationControls`（`play` / `pause` / `seek`）
   * @description 与 vanilla `view.animation` 对等——SVG 控制交互（`manual` / `visible` / `{onEvent}`）track 的 WAAPI
   *   句柄；Canvas 控制 rAF 时钟。无动画 / 降级时为 `null`。供组件外命令式控制（按钮播放 / 暂停 / 跳帧）
   */
  animationRef?: Ref<AnimationControls | null>;
  /**
   * 全图时间轴动画 tracks（如 `viewBox` 镜头动画）
   * @description 配 `cameraTo()` preset：`<Layout animations={[cameraTo({ from, to })]}>`。元素级动画写在各元素
   *   的 `animations` prop 上；与直接传 `ir` prop 并用时，本 prop 追加到整张图
   */
  animations?: Array<IRAnimationTrack>;
  /**
   * 自定义缓动注册表（兑现动画扩展口）：名 → cubic-bezier 四元组 / 缓动函数
   * @description preset / track 的 `easing` 写注册名（如 `fadeIn({ easing: 'spring' })`）即生效。cubic-bezier
   *   形式 SVG（CSS）+ Canvas 都支持；函数形式仅 Canvas（SVG 退 linear 并告警）
   */
  easings?: EasingRegistry;
  /**
   * 自定义动画属性通道插值器：通道名 → { interpolate, applyCanvas }
   * @description 让 `property` 用内置之外的名字（如 `blur`）。**当前仅 Canvas 生效**（`renderer="canvas"`）；
   *   SVG 无内置映射 → 告警并跳过该 track（渲染 base）
   */
  animationProperties?: AnimationPropertyRegistry;
  /**
   * SVG `<defs>` 资源 id 前缀，覆盖默认的 `useId()` 派生值
   * @description marker / paint / clip 的 id 与 `url(#...)` 引用共用此前缀确保多实例不撞。缺省使用 React 生成的稳定 id。
   *   SSR 到客户端水合需要 id 逐字一致时，服务端渲染和客户端 `<Layout idPrefix>` 传同一前缀即可对齐
   */
  idPrefix?: string;
  /**
   * 节点相对定位（`Node.position = { direction, of }`）的默认距离，单位 user units
   * @description 节点 position 自带 `distance` 时优先用自带值，都缺省时回退到 24
   */
  nodeDistance?: number;
  /**
   * 默认字号
   * @description 透传给 `CompileOptions.fontSize`；`font.size` 缺省时使用此值，同时作为 preset 与 rem 的根字号
   * @default DEFAULT_FONT_SIZE (16)
   */
  fontSize?: number;
  /**
   * 运行时注入的第三方 / 自定义节点形状
   * @description `<Node shape="...">` 写 shape 名字或 `{ type, params }`，具体形状定义通过本 prop 注册。
   *   与内置或自定义同名会报错；引用未注册形状也会报错
   */
  shapes?: ReadonlyArray<ShapeDefinition>;
  /**
   * 运行时注入的第三方 / 自定义连接面
   * @description `<Node boundary="...">` 写 boundary 名字或 `{ type, params }`，具体连接面定义通过本 prop 注册。
   *   未注册时会回退到同名 shape 边界
   */
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  /** 运行时注入的第三方 / 自定义裁剪区；`<Scope clip={{ kind: '...' }}>` 可引用这些定义 */
  clips?: ReadonlyArray<ClipDefinition>;
  /**
   * 运行时注入的第三方 / 自定义箭头
   * @description `<Path arrowDetail={{ shape: '...' }}>` 写箭头名，具体箭头定义通过本 prop 注册。
   *   与内置或自定义同名会报错；引用未注册箭头也会报错
   */
  arrows?: ReadonlyArray<ArrowDefinition>;
  /**
   * 运行时注入的第三方 / 自定义填充图案
   * @description `fill={{ kind: 'pattern', shape: '...' }}` 写 pattern 名，具体图案定义通过本 prop 注册。
   *   与内置或自定义同名会报错；引用未注册 pattern 也会报错
   */
  patterns?: ReadonlyArray<PatternDefinition>;
  /**
   * 运行时注入的第三方 / 自定义路径生成器
   * @description `<Step kind="generator" name="...">` 写生成器名，具体生成逻辑通过本 prop 注册。
   *   未注册名会报错；`params` 必须是 JSON 可序列化对象
   */
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>;
  /**
   * 运行时注入的第三方 / 自定义 Path kind
   * @description `<Path kind="...">` 写路径类型名，具体整条路径的生成逻辑通过本 prop 注册
   */
  pathKinds?: ReadonlyArray<AnyPathKindDefinition>;
  /** 运行时注入的 ribbon 宽度 profile；ribbon path 可按名称引用这些宽度曲线 */
  ribbonWidthProfiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
  /**
   * 运行时注入的 Tier 2 composite 展开逻辑
   * @description 带 `namespace` / `type` 的高层节点通过本 prop 注册并展开；未注册时会发出 warning 并跳过
   */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
  /** Runtime injected Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
  /** 运行时注入的 Tier 2 Theme token owner definition singleton */
  /**
   * 运行时注入的公式渲染能力
   * @description `<Node>` 文本中的 `$...$`、`$$...$$` 或显式 tex run 会通过它转成可渲染字形。
   *   通常由 `@retikz/tex` 提供；缺省时公式内容会按降级规则处理并发出 warning
   */
  lowerTex?: LowerTex;
  /**
   * 本次 compile 请求的 opt-in artifacts
   */
  artifacts?: CompileArtifactOptions;
  /**
   * compile artifacts 的 commit 后通知
   * @description 接收 Core 同次 compile 返回的 immutable artifact 数组，不在 render 阶段触发用户副作用
   */
  onArtifacts?: (artifacts: ReadonlyArray<CompileArtifact>) => void;
  /** 完整 Core compile result 的 commit 后通知，含同 revision spatial handle index */
  onCompileResult?: (result: CompileResult) => void;
  /**
   * 可选：显式注入的可嵌入 Tier2 适配器列表（逃生舱）
   * @description 主路径是子组件静态属性（Component.isTier2Embeddable + embeddableAdapter）自动识别；
   *   本 prop 用于测试注入 / 显式控制 / 未挂静态属性的 domain。按 adapter.displayName 匹配子组件，覆盖静态属性
   */
  embeddables?: Array<EmbeddableTier2Adapter>;
};

/**
 * <Layout> 顶层容器
 * @description children 模式写 Kernel / Sugar JSX；`ir` 模式直接传入 JSON IR。组件负责计算图形尺寸、
 *   选择 SVG 或 Canvas 输出、绑定事件水合和动画控制
 */
export const Layout: FC<LayoutProps> = props => {
  const {
    ir: irFromProp,
    theme,
    children,
    authoring,
    compileDriver,
    width,
    height,
    viewBox,
    className,
    style,
    renderer: rendererProp,
    animate: animateProp,
    snapshotAt,
    animationRef,
    animations: rootAnimations,
    easings,
    animationProperties,
    idPrefix,
    nodeDistance,
    fontSize,
    shapes,
    boundaries,
    clips,
    arrows,
    patterns,
    pathGenerators,
    pathKinds,
    ribbonWidthProfiles,
    composites,
    themeStyles,
    lowerTex,
    artifacts,
    onArtifacts,
    onCompileResult,
    embeddables,
    handlers,
    runtime,
  } = props;
  const resolvedRuntime = captureLayoutRuntimeOptions(runtime);
  const stableShapes = canonicalizeDefinitionArray(shapes);
  const stableBoundaries = canonicalizeDefinitionArray(boundaries);
  const stableClips = canonicalizeDefinitionArray(clips);
  const stableArrows = canonicalizeDefinitionArray(arrows);
  const stablePatterns = canonicalizeDefinitionArray(patterns);
  const stablePathGenerators = canonicalizeDefinitionArray(pathGenerators);
  const stablePathKinds = canonicalizeDefinitionArray(pathKinds);
  const stableRibbonWidthProfiles = canonicalizeDefinitionArray(ribbonWidthProfiles);
  const stableComposites = canonicalizeDefinitionArray(composites);
  const ambientThemeStyles = useThemeStyles();
  const mergedThemeStyles = useMemo(
    () => mergeThemeStyleDefinitions(ambientThemeStyles, themeStyles),
    [ambientThemeStyles, themeStyles],
  );
  const stableThemeStyles = canonicalizeDefinitionArray(mergedThemeStyles);
  const stableEmbeddables = canonicalizeDefinitionArray(embeddables);
  const reducedMotion = usePrefersReducedMotion();
  const animationMode = useAnimationMode();
  const ambientTheme = useTheme();
  const resolvedAnimateProp =
    animationMode === undefined ? animateProp : animationMode === 'system' ? undefined : animationMode === 'enabled';
  const animate = resolveAnimationEnabled(resolvedAnimateProp, reducedMotion);
  const {
    color,
    stroke,
    fill,
    strokeWidth,
    opacity,
    fillOpacity,
    strokeOpacity,
    nodeDefault,
    pathDefault,
    labelDefault,
    arrowDefault,
  } = props;
  // 渲染目标：显式 prop > 祖先 RendererModeProvider 注入的 context > 默认 svg（hook 必须无条件调用）
  const contextRenderer = useRendererMode();
  const renderer = rendererProp ?? contextRenderer ?? 'svg';
  const scopeStyle: ScopeStyleProps = useMemo(
    () => ({
      color,
      stroke,
      fill,
      strokeWidth,
      opacity,
      fillOpacity,
      strokeOpacity,
      nodeDefault,
      pathDefault,
      labelDefault,
      arrowDefault,
    }),
    [
      color,
      stroke,
      fill,
      strokeWidth,
      opacity,
      fillOpacity,
      strokeOpacity,
      nodeDefault,
      pathDefault,
      labelDefault,
      arrowDefault,
    ],
  );
  const hasScopeStyle = Object.keys(pickScopeStyle(scopeStyle)).length > 0;
  const embeddableContext = useMemo<EmbeddableAuthoringContext>(() => {
    const embeddedTheme = mergeThemeOverlays(ambientTheme, undefined, theme);
    return {
      theme: resolveTheme(
        DEFAULT_RESOLVED_THEME,
        embeddedTheme,
        'React Layout embedded authoring Theme',
        resolveThemeStyleRegistry(stableThemeStyles),
      ),
      ...(stableThemeStyles === undefined ? {} : { themeStyles: stableThemeStyles }),
    };
  }, [ambientTheme, theme, stableThemeStyles]);

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
        ? {
            ir: irFromProp,
            contributions: [] as Array<CoreProviderContribution>,
            authoringSites: Object.freeze([
              Object.freeze({
                kind: 'scene' as const,
                sourcePath: '',
                elementType: Layout,
                props: Object.freeze(authoring === undefined ? {} : { authoring }),
              }),
            ]),
          }
        : buildIRWithContributions(
            wrapRootScope(children, scopeStyle),
            stableEmbeddables,
            {
              elementType: Layout,
              props: Object.freeze(authoring === undefined ? {} : { authoring }),
            },
            embeddableContext,
          ),
    [irFromProp, children, scopeStyle, stableEmbeddables, authoring, embeddableContext],
  );
  const ir = useMemo(() => {
    const base = built.ir;
    const persistedTheme = irFromProp === undefined ? base.theme : validatePersistedTheme(base.theme);
    const mergedTheme = mergeThemeOverlays(ambientTheme, persistedTheme, theme);
    const withTheme = mergedTheme === undefined ? base : { ...base, theme: mergedTheme };
    // viewBox prop 注入 IR 根（显式 > IR 内置）；prop 缺省时保留 base 自带的 viewBox
    const withViewBox = viewBox !== undefined ? { ...withTheme, viewBox } : withTheme;
    // animations prop 注入 IR 根（镜头，cameraTo）；缺省保留 base 自带，并用追加语义兼容 `ir` prop
    if (rootAnimations === undefined) return withViewBox;
    const animations =
      withViewBox.animations !== undefined ? [...withViewBox.animations, ...rootAnimations] : rootAnimations;
    return { ...withViewBox, animations };
  }, [ambientTheme, built, irFromProp, theme, viewBox, rootAnimations]);
  // Core 统一解析可嵌入 provider graph，并把用户显式 definitions 作为最终 definitions 追加
  const aggregatedProviders = useMemo(
    () =>
      canonicalizeProviderDefinitions(
        resolveCoreProviderDependencies({
          contributions: built.contributions,
          definitions: {
            shapes: stableShapes,
            boundaries: stableBoundaries,
            clips: stableClips,
            arrows: stableArrows,
            patterns: stablePatterns,
            pathGenerators: stablePathGenerators,
            pathKinds: stablePathKinds,
            composites: stableComposites,
          },
        }),
      ),
    [
      built.contributions,
      stableShapes,
      stableBoundaries,
      stableClips,
      stableArrows,
      stablePatterns,
      stablePathGenerators,
      stablePathKinds,
      stableComposites,
    ],
  );
  const defaultFontFamily = styleFontFamily(style);
  const measureText = useMemo(() => withDefaultFontFamily(browserMeasurer, defaultFontFamily), [defaultFontFamily]);
  const compileArtifacts = useMemo<CompileArtifactOptions | undefined>(
    () => (artifacts?.nodeLayouts === true ? { nodeLayouts: true } : undefined),
    [artifacts?.nodeLayouts],
  );
  const coreOptions = useMemo<CoreProgramOptions>(
    () => ({
      measureText,
      nodeDistance,
      fontSize,
      shapes: aggregatedProviders.shapes,
      boundaries: aggregatedProviders.boundaries,
      clips: aggregatedProviders.clips,
      arrows: aggregatedProviders.arrows,
      patterns: aggregatedProviders.patterns,
      pathGenerators: aggregatedProviders.pathGenerators,
      pathKinds: aggregatedProviders.pathKinds,
      ribbonWidthProfiles: stableRibbonWidthProfiles,
      composites: aggregatedProviders.composites,
      themeStyles: stableThemeStyles,
      lowerTex,
      artifacts: compileArtifacts,
    }),
    [
      measureText,
      nodeDistance,
      fontSize,
      aggregatedProviders.shapes,
      aggregatedProviders.boundaries,
      aggregatedProviders.clips,
      aggregatedProviders.arrows,
      aggregatedProviders.patterns,
      aggregatedProviders.pathGenerators,
      aggregatedProviders.pathKinds,
      aggregatedProviders.composites,
      stableRibbonWidthProfiles,
      stableThemeStyles,
      lowerTex,
      compileArtifacts,
    ],
  );
  const driverInstance = useMemo(() => Object.freeze({}), []);
  const driverInput = useMemo<LayoutCompileDriverInput>(
    () => Object.freeze({ instance: driverInstance, source: ir, authoringSites: built.authoringSites, coreOptions }),
    [driverInstance, ir, built.authoringSites, coreOptions],
  );
  const resolvedCompileDriver = compileDriver ?? defaultLayoutCompileDriver;
  const driverSession = useMemo(
    () => createLayoutCompileDriverSession(resolvedCompileDriver, driverInput),
    [resolvedCompileDriver, driverInput],
  );
  const compiledLayout = useMemo(
    () => compileLayoutWithDriver(driverInput, driverSession),
    [driverInput, driverSession],
  );
  const scene = compiledLayout.primary.scene;
  const frame = useMemo(
    () => Object.freeze({ primary: scene, layers: compiledLayout.layers }),
    [scene, compiledLayout.layers],
  );
  const publishCompileOutput = useCallback(
    () => driverSession.commit?.(compiledLayout),
    [driverSession, compiledLayout],
  );

  // useId 返回 ":r0:" 含冒号；SVG `url(#id)` 对冒号兼容性差，剥成纯字母数字。caller 显式 idPrefix 优先（SSR 水合对齐）
  const rawId = useId();
  const resolvedIdPrefix = idPrefix ?? rawId.replace(/[^a-zA-Z0-9]/g, '');

  // 水合 handler 注册表：JSX 模式从 children 同源收集，`ir` prop 模式用 `handlers` prop（无 children 可收集）
  const resolvedHandlers = useMemo(
    () => (irFromProp !== undefined ? (handlers ?? {}) : collectHydrationHandlers(children, stableEmbeddables)),
    [irFromProp, handlers, children, stableEmbeddables],
  );

  if (resolvedRuntime.mode === LayoutRuntimeMode.Static) {
    return (
      <StaticHost
        key={`${resolvedRuntime.mode}:${renderer}:${resolvedIdPrefix}`}
        backend={renderer}
        frame={frame}
        artifacts={compiledLayout.primary.artifacts}
        compileResult={compiledLayout.primary}
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
        idPrefix={resolvedIdPrefix}
        onArtifacts={onArtifacts}
        onCompileResult={onCompileResult}
        onCompileCommit={publishCompileOutput}
      />
    );
  }

  return (
    <RetainedHost
      key={`${resolvedRuntime.mode}:${renderer}:${resolvedIdPrefix}`}
      backend={renderer}
      source={ir}
      initialFrame={frame}
      coreOptions={coreOptions}
      compileSession={driverSession}
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
      idPrefix={resolvedIdPrefix}
      rendererFactory={resolvedRuntime.rendererFactory}
      updateStrategy={resolvedRuntime.updateStrategy}
      onDiagnostic={resolvedRuntime.onDiagnostic}
      onArtifacts={onArtifacts}
      onCompileResult={onCompileResult}
    />
  );
};
