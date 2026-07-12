import { Brush, LineDotRightHorizontal } from 'lucide-react';
import { type FC } from 'react';

import type { RendererMode } from '../types';

import { ToolbarIconButton } from '../components';

/** 渲染模式切换按钮。 */
export type RendererModeButtonProps = {
  /** 当前渲染模式。 */
  rendererMode: RendererMode;
  /** 切换渲染模式。 */
  onToggle: () => void;
  /** 是否因当前内容固定渲染目标而禁用切换。 */
  disabled?: boolean;
  /** 按钮附加样式。 */
  className?: string;
};

/** 在 SVG 与 Canvas 渲染模式之间切换。 */
export const RendererModeButton: FC<RendererModeButtonProps> = props => {
  const { rendererMode, onToggle, disabled, className } = props;
  const isCanvas = rendererMode === 'canvas';
  const label = isCanvas ? 'Canvas renderer' : 'SVG renderer';
  return (
    <ToolbarIconButton
      label={label}
      title={label}
      pressed={isCanvas}
      disabled={disabled}
      onClick={onToggle}
      className={className}
    >
      {isCanvas ? <Brush className="size-3.5" /> : <LineDotRightHorizontal className="size-3.5" />}
    </ToolbarIconButton>
  );
};
