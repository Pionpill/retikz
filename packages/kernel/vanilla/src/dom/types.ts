import type { RendererFactory } from '@retikz/render/runtime';

import type { SceneViewOptions } from '../runtime';

/** 场景视图配置与 Vanilla DOM 专属挂载选项 */
export type MountOptions = SceneViewOptions & {
  /** 自定义渲染器工厂，缺省使用内置实现 */
  rendererFactory?: RendererFactory;
  /** 挂载时确定设备像素比，缺省读取宿主的设备像素比 */
  canvas?: { readonly devicePixelRatio?: number };
};
