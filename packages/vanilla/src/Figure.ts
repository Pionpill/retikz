import type { IR } from '@retikz/core';
import { coordinate } from './builder/coordinate';
import { draw } from './builder/draw';
import { FIGURE_BRAND } from './builder/isFigure';
import { node } from './builder/node';
import { scope } from './builder/scope';
import type { ScopeBuilder } from './builder/scope';
import type { Child, CoordinateConfig, DrawConfig, FigureConfig, ScopeConfig, Way } from './builder/types';
import { mountSvg } from './mountSvg';
import { renderToSvgString } from './renderToSvgString';
import type { MountOptions, RenderToStringOptions, VanillaView } from './types';

/**
 * 命令式 builder 的装配产物 —— 唯一返回类型
 * @description hyperscript（`figure(config, children)`）与 fluent（`figure(config).node(...)`）都产它、可混用、`.ir` 一致。
 *   `.mount`/`.toSvgString`/`.toCanvas` 把 `this.ir`（IR，非 Figure）交底层 renderer；fluent 方法往内部 children 追加、链式返回 this。
 */
export type Figure = {
  readonly [FIGURE_BRAND]: true;
  readonly ir: IR;
  mount: (container: Element, options?: MountOptions) => VanillaView;
  toSvgString: (options?: RenderToStringOptions) => string;
  // toCanvas 在 Task 7 接上
  node: (...args: Parameters<typeof node>) => Figure;
  draw: (way: Way, config?: DrawConfig) => Figure;
  coordinate: (id: string, config: CoordinateConfig) => Figure;
  scope: (config: ScopeConfig, build: (s: ScopeBuilder) => void) => Figure;
};

/** figure() 的内部入口：装配 Figure（持 config + children，方法闭包其上） */
export const createFigure = (config: FigureConfig, children: Child[]): Figure => {
  /** call-site options 覆盖 figure 存的 config（call-site wins）：viewBox 已并进 ir，其余（width/height/idPrefix + 全套 CompileOptions）全透传 */
  const renderOptions = (callSite?: MountOptions): MountOptions => {
    const { viewBox: _viewBox, ...stored } = config;
    return { ...stored, ...callSite };
  };

  const fig: Figure = {
    [FIGURE_BRAND]: true,
    get ir(): IR {
      return {
        version: 1,
        type: 'scene',
        children,
        ...(config.viewBox ? { viewBox: config.viewBox } : {}),
      };
    },
    mount(container, options) {
      return mountSvg(container, fig.ir, renderOptions(options));
    },
    toSvgString(options) {
      return renderToSvgString(fig.ir, renderOptions(options));
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
    scope(scopeConfig, build) {
      children.push(scope(scopeConfig, build));
      return fig;
    },
  };
  return fig;
};
