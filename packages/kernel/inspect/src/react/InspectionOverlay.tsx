import type { CompileResult } from '@retikz/core';
import type { FC } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import type { InspectionPresentationOptions } from '../vanilla';
import { mountInspection, prepareInspectionPresentation, renderInspectionToSvgString } from '../vanilla';

/** 浏览器在绘制前更换辅助画布，服务端只执行纯计算 */
const usePresentationEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/** 已提交主图的可选辅助层；尺寸与 viewport 由主图宿主提供 */
export type InspectionOverlayProps = Readonly<{
  /** 主图宿主已完成的普通编译结果 */
  result: CompileResult;
  /** 检查请求及与主图一致的显式呈现配置 */
  options: InspectionPresentationOptions;
  /** 辅助呈现后端
   * @default 'svg'
   */
  renderer?: 'svg' | 'canvas';
  /** 独立错误通知；通知抛错不影响主图 */
  onError?: (error: unknown) => void;
}>;

/** React 仅适配独立辅助呈现生命周期，不持有主图编译驱动 */
export const InspectionOverlay: FC<InspectionOverlayProps> = props => {
  const { result, options, renderer = 'svg', onError } = props;
  const container = useRef<HTMLSpanElement>(null);
  const serverSvg = useMemo(() => {
    if (typeof document !== 'undefined' || renderer !== 'svg') return '';
    try {
      return renderInspectionToSvgString(prepareInspectionPresentation(result, options), options);
    } catch {
      return '';
    }
  }, [result, options, renderer]);

  usePresentationEffect(() => {
    const element = container.current;
    if (element === null) return;
    // 主图 DOM 已提交；撤下旧层或服务端辅助标记后才开始检查
    element.replaceChildren();
    const view = mountInspection(element, renderer);
    const presentation = view.update(result, options);
    if (presentation.error !== undefined) {
      try {
        onError?.(presentation.error);
      } catch {
        /* 通知失败不影响宿主 */
      }
    }
    return () => view.dispose();
  }, [result, options, renderer, onError]);

  return (
    <span
      ref={container}
      aria-hidden="true"
      suppressHydrationWarning
      style={{ pointerEvents: 'none' }}
      dangerouslySetInnerHTML={{ __html: serverSvg }}
    />
  );
};
