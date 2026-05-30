import { type CSSProperties, type FC, type ReactElement, type ReactNode, cloneElement, useId, useMemo } from 'react';
import {
  type ArrowDefinition,
  type IR,
  type IRViewBox,
  type PathGeneratorDefinition,
  type PatternDefinition,
  type ShapeDefinition,
  type TextMeasurer,
  compileToScene,
} from '@retikz/core';
import { buildSvgDocument } from '@retikz/svg';
import { buildIR } from './builder';
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
};

/**
 * <Layout> 顶层容器
 * @description 流水线：从 children 构造 IR（或直接接受外部 IR）→ `compileToScene` 得 Scene →
 *   `@retikz/svg` 的 `buildSvgDocument` 产中性 `SvgNode` 描述树（含 `<defs>` 与按需 dedup 的 `<marker>` /
 *   paint / clip 资源，id 用 `idPrefix` 派生）→ `svgToReact` 映射成 React 元素。Scene→SVG 逻辑单一数据源在
 *   `@retikz/svg`，react 只做 `SvgNode→ReactElement` 薄映射 + `useId` 绑定。
 */
export const Layout: FC<LayoutProps> = props => {
  const { ir: irFromProp, children, width, height, viewBox, className, style, renderer = 'svg', idPrefix, nodeDistance, shapes, arrows, patterns, pathGenerators } = props;
  const ir = useMemo(() => {
    const base = irFromProp ?? buildIR(children);
    // viewBox prop 注入 IR 根（显式 > IR 内置）；prop 缺省时保留 base 自带的 viewBox
    return viewBox !== undefined ? { ...base, viewBox } : base;
  }, [irFromProp, children, viewBox]);
  const defaultFontFamily = styleFontFamily(style);
  const measureText = useMemo(
    () => withDefaultFontFamily(browserMeasurer, defaultFontFamily),
    [defaultFontFamily],
  );
  const scene = useMemo(
    () => compileToScene(ir, { measureText, nodeDistance, shapes, arrows, patterns, pathGenerators }),
    [ir, measureText, nodeDistance, shapes, arrows, patterns, pathGenerators],
  );

  // useId 返回 ":r0:" 含冒号；SVG `url(#id)` 对冒号兼容性差，剥成纯字母数字。caller 显式 idPrefix 优先（SSR 水合对齐）
  const rawId = useId();
  const resolvedIdPrefix = idPrefix ?? rawId.replace(/[^a-zA-Z0-9]/g, '');
  const doc = useMemo(
    () => (renderer === 'canvas' ? null : buildSvgDocument(scene, { idPrefix: resolvedIdPrefix })),
    [renderer, scene, resolvedIdPrefix],
  );

  if (renderer === 'canvas') {
    return <CanvasHost scene={scene} width={width} height={height} className={className} style={style} />;
  }

  // Scene → 中性 SvgNode 描述树（buildSvgDocument 内部完成 arrow dedup / defs 组装 / id 前缀派生）→ React 元素
  const svgEl = svgToReact(doc as NonNullable<typeof doc>) as ReactElement;

  // svg 元素级附加（width / height / className / 框架 style）由 react 层补：非 svg 包职责
  return cloneElement(svgEl, { width, height, className, style });
};
