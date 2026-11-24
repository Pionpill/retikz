import type { IRScene } from '@retikz/core';
import type { CompileOptions, CompileResult, ReconcilerDiagnostic, ReconcilerUpdateStrategy } from '@retikz/reconciler';
import type { AnimationControls } from '@retikz/render/animation';
import type { HitPoint } from '@retikz/render/canvas';
import type { HydrationController, HydrationHandlers } from '@retikz/render/hydration';
import type { RendererFactory, RendererHost } from '@retikz/render/runtime';

import type { InputScene } from '../normalize';
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
};

/** 挂载 IR 或作者输入到 Canvas 的选项 */
export type MountCanvasOptions = MountOptions & {
  /** 挂载时确定设备像素比，缺省读取宿主的设备像素比 */
  canvas?: { readonly devicePixelRatio?: number };
};

/** 与下一帧场景一起提交的动画配置；Canvas 宿主选项在挂载时确定 */
export type ViewUpdateOptions = Readonly<{ animation?: RenderOptions['animation'] }>;

/** DOM 视图的宿主操作、编译结果与更新接口 */
type View<TRoot extends RendererHost> = Readonly<{
  /** 挂载期间复用的根元素 */
  root: TRoot;
  /** 解绑事件并移除根元素 */
  dispose: () => void;
  /** 注册事件处理函数，事件上下文始终读取视图当前的场景 */
  hydrate: (options: { handlers: HydrationHandlers }) => HydrationController;
  /** 场景启用动画时提供的播放控制 */
  animation?: AnimationControls;
  /** 最近成功提交的完整编译结果，包含场景与产物 */
  compileResult: CompileResult;
  /** 原子提交下一份 IR 和动画配置 */
  update: (ir: IRScene, options?: ViewUpdateOptions) => void;
  /** 归一化作者输入并提交更新 */
  updateInput: (input: InputScene, options?: ViewUpdateOptions) => void;
  /** 返回并清空本次会话的诊断 */
  diagnostics: () => ReadonlyArray<ReconcilerDiagnostic>;
}>;

/** 持有编译会话的 SVG 视图 */
export type SvgView = View<SVGSVGElement>;

/** 持有编译会话的 Canvas 视图 */
export type CanvasView = View<HTMLCanvasElement> & {
  /** 将客户区像素逆映射为场景坐标，留白处可得到布局区域外的坐标 */
  readonly clientToScene: (clientX: number, clientY: number) => HitPoint;
};
