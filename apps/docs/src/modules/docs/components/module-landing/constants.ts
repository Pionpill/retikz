import type { ComponentPreviewProps } from '../component-preview';

/** 模块落地页中 ComponentPreview 的统一展示约束。 */
export const MODULE_LANDING_PREVIEW: Pick<
  ComponentPreviewProps,
  'hideCode' | 'showTools' | 'controls' | 'previewClassName'
> = {
  hideCode: true,
  showTools: false,
  controls: { name: false },
  previewClassName:
    'min-h-0 min-w-0 overflow-hidden [&_canvas]:!h-auto [&_canvas]:!max-h-full [&_canvas]:!max-w-full [&_canvas]:!w-auto [&_canvas]:object-contain [&_svg]:!h-auto [&_svg]:!max-h-full [&_svg]:!max-w-full [&_svg]:!w-auto [&_svg]:object-contain',
};
