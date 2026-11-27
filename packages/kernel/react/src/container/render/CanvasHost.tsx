import type { Scene } from '@retikz/core';
import { computeDisplaySize } from '@retikz/render/runtime';
import type { FC, Ref } from 'react';
import { useState } from 'react';

import type { LayoutProps } from '../Layout';

/** React 持有宿主元素与 CSS 尺寸，提交后的位图由 Canvas renderer 管理 */
export type CanvasHostProps = Required<Pick<LayoutProps, 'width' | 'height'>> &
  Pick<LayoutProps, 'className' | 'style'> & {
    scene: Scene;
    canvasRef: Ref<HTMLCanvasElement>;
  };

/** 服务端输出首帧画布；挂载后 React 不再修改位图尺寸 */
export const CanvasHost: FC<CanvasHostProps> = props => {
  const { scene, canvasRef, width, height, className, style } = props;
  // 位图初始尺寸只接受数值；CSS 长度不参与像素计算
  const [seed] = useState(() => {
    const size = computeDisplaySize(
      scene.layout,
      typeof width === 'number' ? width : undefined,
      typeof height === 'number' ? height : undefined,
    );
    return { width: Math.max(1, Math.round(size.width)), height: Math.max(1, Math.round(size.height)) };
  });
  return (
    <canvas ref={canvasRef} {...seed} className={className} style={{ objectFit: 'contain', width, height, ...style }} />
  );
};
