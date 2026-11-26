import type { CompileOptions, ReconcilerUpdateStrategy } from '@retikz/reconciler';
import type { RendererFactory, RenderMode } from '@retikz/render/runtime';

import type { RenderOptions } from '../runtime';

/** 挂载 IR 或作者输入时使用的编译、渲染与会话选项 */
export type MountOptions = RenderOptions & {
  /** 场景编译配置 */
  readonly compile?: CompileOptions;
  /** 本次挂载使用的会话配置 */
  runtime?: Readonly<{
    /** 更新策略，默认由协调器自动选择 */
    updateStrategy?: ReconcilerUpdateStrategy;
    /** 可选第三方渲染器工厂，缺省使用内置实现 */
    rendererFactory?: RendererFactory;
  }>;
  /** 渲染后端，缺省使用 SVG */
  renderer?: RenderMode;
  /** 挂载时确定设备像素比，缺省读取宿主的设备像素比 */
  canvas?: { readonly devicePixelRatio?: number };
};
