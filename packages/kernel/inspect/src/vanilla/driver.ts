import type { CompileResult } from '@retikz/core';
import type { BoundsRect } from '@retikz/math';
import { renderFrameToCanvas } from '@retikz/render/canvas';
import type { StaticRenderFrame } from '@retikz/render/runtime';
import { renderFrameToSvgString } from '@retikz/render/svg';

import type { InspectionCompileOptions, InspectionCompileResult } from '../compile';
import { compileInspectionToScene } from '../compile';
import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import { inspectionPlaneToReadonlyLayers } from './readonly-layers';

/** 显式主图视口；辅助图不自行 fit */
export type InspectionPresentationOptions = InspectionCompileOptions &
  Readonly<{
    /** 主图当前视口；省略时使用输入 Scene.layout */
    viewport?: BoundsRect;
    /** 主图显示宽度，使用相同用户单位到 CSS 像素的映射 */
    width?: number;
    /** 主图显示高度，使用相同用户单位到 CSS 像素的映射 */
    height?: number;
    /** 辅助 SVG 资源的独立 id 前缀 */
    idPrefix: string;
  }>;

/** 独立辅助呈现准备结果，不含主图提交 */
export type InspectionPresentation = InspectionCompileResult &
  Readonly<{
    /** 空主图加普通只读层；失败或无内容时为 null */
    frame: StaticRenderFrame | null;
    /** 独立检查失败，保留原始 cause */
    error?: RetikzInspectError;
  }>;

/** 捕获辅助失败；输入主图已经成功，检查不能推翻它 */
export const prepareInspectionPresentation = (
  input: CompileResult,
  options: InspectionPresentationOptions,
): InspectionPresentation => {
  try {
    const output = compileInspectionToScene(input, options);
    return {
      ...output,
      frame:
        output.inspection === null
          ? null
          : {
              primary: { primitives: [], layout: { ...(options.viewport ?? input.scene.layout) } },
              layers: inspectionPlaneToReadonlyLayers(output.inspection),
            },
    };
  } catch (cause) {
    return {
      inspection: null,
      diagnostics: [],
      frame: null,
      error:
        cause instanceof RetikzInspectError
          ? cause
          : new RetikzInspectError({
              code: RetikzInspectErrorCode.CompileFailed,
              message: 'Inspection preparation failed',
              cause,
            }),
    };
  }
};

/** SSR 与 DOM 共用的独立 SVG 输出，不包含主图内容 */
export const renderInspectionToSvgString = (
  presentation: InspectionPresentation,
  options: InspectionPresentationOptions,
): string => {
  if (presentation.frame === null) return '';
  try {
    return renderFrameToSvgString(presentation.frame, {
      idPrefix: options.idPrefix,
      width: options.width,
      height: options.height,
      animate: false,
    });
  } catch (cause) {
    throw new RetikzInspectError({
      code: RetikzInspectErrorCode.CompileFailed,
      message: 'Inspection SVG presentation failed',
      cause,
    });
  }
};

/** 在单独 Canvas 上执行普通只读图层，失败时清空旧图 */
export const renderInspectionToCanvas = (
  canvas: HTMLCanvasElement,
  presentation: InspectionPresentation,
  options: InspectionPresentationOptions,
): void => {
  canvas.width = 0;
  if (presentation.frame === null) return;
  try {
    if (options.width !== undefined) canvas.style.width = options.width + 'px';
    if (options.height !== undefined) canvas.style.height = options.height + 'px';
    renderFrameToCanvas(canvas, presentation.frame);
  } catch (cause) {
    canvas.width = 0;
    throw new RetikzInspectError({
      code: RetikzInspectErrorCode.CompileFailed,
      message: 'Inspection Canvas presentation failed',
      cause,
    });
  }
};

/** 独立 DOM 辅助视图；调用方在主图提交后传入结果 */
export type InspectionView = Readonly<{
  update: (input: CompileResult, options: InspectionPresentationOptions) => InspectionPresentation;
  dispose: () => void;
}>;

/** 创建无交互的辅助容器；更新先移除旧层，不调用主图更新 */
export const mountInspection = (container: HTMLElement, renderer: 'svg' | 'canvas' = 'svg'): InspectionView => {
  const surface = container.ownerDocument.createElement('div');
  surface.style.pointerEvents = 'none';
  surface.setAttribute('aria-hidden', 'true');
  container.appendChild(surface);
  let disposed = false;
  let generation = 0;
  return {
    update: (input, options) => {
      const currentGeneration = ++generation;
      surface.replaceChildren();
      if (disposed) return { inspection: null, diagnostics: [], frame: null };
      const presentation = prepareInspectionPresentation(input, options);
      if (currentGeneration !== generation) return presentation;
      try {
        if (renderer === 'svg') {
          const svg = renderInspectionToSvgString(presentation, options);
          if (currentGeneration === generation) surface.innerHTML = svg;
        } else {
          const canvas = container.ownerDocument.createElement('canvas');
          renderInspectionToCanvas(canvas, presentation, options);
          if (currentGeneration === generation) surface.appendChild(canvas);
        }
        return presentation;
      } catch (cause) {
        if (currentGeneration === generation) surface.replaceChildren();
        return {
          inspection: null,
          diagnostics: presentation.diagnostics,
          frame: null,
          error: new RetikzInspectError({
            code: RetikzInspectErrorCode.CompileFailed,
            message: 'Inspection presentation failed',
            cause,
          }),
        };
      }
    },
    dispose: () => {
      disposed = true;
      generation++;
      surface.remove();
    },
  };
};
