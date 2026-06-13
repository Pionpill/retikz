import type { IR } from '@retikz/core';
import { renderToCanvas } from '@retikz/render/canvas';
import type { RenderOptions } from '@retikz/render/canvas';
import { coordinate } from './builder/coordinate';
import { draw } from './builder/draw';
import { FIGURE_BRAND } from './builder/isFigure';
import { node } from './builder/node';
import { scope } from './builder/scope';
import type { ScopeBuilder } from './builder/scope';
import { FIGURE_ROOT_STYLE_FIELDS } from './builder/types';
import type { Child, CoordinateConfig, DrawConfig, FigureConfig, FigureRootStyle, ScopeConfig, Way } from './builder/types';
import { mountCanvas } from './mountCanvas';
import { mountSvg } from './mountSvg';
import { renderToSvgString } from './renderToSvgString';
import { toScene } from './toScene';
import type { CanvasView, MountCanvasOptions, MountOptions, RenderToStringOptions, VanillaView } from './types';

/**
 * 命令式 builder 的装配产物 —— 唯一返回类型
 * @description hyperscript（`figure(config, children)`）与 fluent（`figure(config).node(...)`）都产它、可混用、`.ir` 一致。
 *   `.mount`/`.mountCanvas`（交互式挂载）/`.toSvgString`/`.toCanvas`（一次性产出）把 `this.ir`（IR，非 Figure）交底层
 *   renderer；fluent 方法往内部 children 追加、链式返回 this。
 */
export type Figure = {
  readonly [FIGURE_BRAND]: true;
  readonly ir: IR;
  mount: (container: Element, options?: MountOptions) => VanillaView;
  mountCanvas: (container: Element, options?: MountCanvasOptions) => CanvasView;
  toSvgString: (options?: RenderToStringOptions) => string;
  toCanvas: (canvas: HTMLCanvasElement, options?: RenderOptions) => void;
  node: (...args: Parameters<typeof node>) => Figure;
  draw: (way: Way, config?: DrawConfig) => Figure;
  coordinate: (id: string, config: CoordinateConfig) => Figure;
  scope: (config: ScopeConfig, arg: Array<Child> | ((s: ScopeBuilder) => void)) => Figure;
};

/**
 * 拣出真正携带样式指令的根样式字段
 * @description 在「取 defined」基础上剔除空对象的四通道 default（`nodeDefault: {}` 等）——空 default 无样式指令，
 *   留着只会让 figure 无谓包一层空合成根 `<Scope>`、改变 IR / Scene 拓扑却无视觉差异。标量通道的 falsy-但-defined
 *   值（`strokeWidth: 0` / `opacity: 0`）是有意义样式、保留（镜像 react `pickScopeStyle`）。
 */
const pickRootStyle = (config: FigureConfig): Partial<FigureRootStyle> => {
  const picked: Partial<FigureRootStyle> = {};
  for (const key of FIGURE_ROOT_STYLE_FIELDS) {
    const value = config[key];
    if (value === undefined) continue;
    if (typeof value === 'object' && Object.keys(value).length === 0) continue;
    // key 与 value 同源自 config[key]，但循环里 TS 无法把二者关联——按字段表逐字段赋值，类型安全由字段表保证
    Object.assign(picked, { [key]: value });
  }
  return picked;
};

/** figure() 的内部入口：装配 Figure（持 config + children，方法闭包其上） */
export const createFigure = (config: FigureConfig, children: Array<Child>): Figure => {
  /**
   * call-site options 覆盖 figure 存的 config（call-site wins）：viewBox / animations / 根样式已并进 ir，
   * 这些 IR-only 字段从下发的 render options 剔除；其余（width/height/idPrefix + 全套 CompileOptions）全透传。
   */
  const renderOptions = (callSite?: MountOptions): MountOptions => {
    const merged: FigureConfig = { ...config, ...callSite };
    delete merged.viewBox;
    delete merged.animations;
    for (const key of FIGURE_ROOT_STYLE_FIELDS) delete merged[key];
    return merged;
  };

  const fig: Figure = {
    [FIGURE_BRAND]: true,
    get ir(): IR {
      // 任一根样式字段携带指令 → 把 children 包进一层合成根 <Scope>，等价用户手写一层根 scope（全缺省时不包）
      const rootStyle = pickRootStyle(config);
      const rootChildren: Array<Child> =
        Object.keys(rootStyle).length > 0 ? [{ type: 'scope', ...rootStyle, children }] : children;
      return {
        version: 1,
        type: 'scene',
        children: rootChildren,
        ...(config.viewBox ? { viewBox: config.viewBox } : {}),
        ...(config.animations ? { animations: config.animations } : {}),
      };
    },
    mount(container, options) {
      return mountSvg(container, fig.ir, renderOptions(options));
    },
    mountCanvas(container, options) {
      // 交互式 canvas 挂载（hydrate / update / clientToScene）；与 .mount 对称，把 figure config 并进 call-site 后交底层
      return mountCanvas(container, fig.ir, renderOptions(options));
    },
    toSvgString(options) {
      return renderToSvgString(fig.ir, renderOptions(options));
    },
    toCanvas(canvas, options) {
      // figure 的 compile 选项（shapes/measureText…）走 toScene；canvas RenderOptions 是独立一套，原样透传
      const compile: FigureConfig = { ...config };
      delete compile.viewBox;
      delete compile.idPrefix;
      delete compile.width;
      delete compile.height;
      delete compile.animations;
      for (const key of FIGURE_ROOT_STYLE_FIELDS) delete compile[key];
      const scene = toScene(fig.ir, compile);
      renderToCanvas(canvas, scene, options ?? {});
    },
    node(...args) {
      children.push(node(...args));
      return fig;
    },
    draw(way, drawConfig) {
      children.push(draw(way, drawConfig));
      return fig;
    },
    coordinate(id, coordConfig) {
      children.push(coordinate(id, coordConfig));
      return fig;
    },
    scope(scopeConfig, arg) {
      children.push(scope(scopeConfig, arg));
      return fig;
    },
  };
  return fig;
};
