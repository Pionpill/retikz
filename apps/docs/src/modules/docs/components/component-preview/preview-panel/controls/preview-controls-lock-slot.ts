import { createElement } from 'react';
import type { ReactNode } from 'react';

import type { PreviewControlSlot } from '../../types';
import { PreviewControlsLockButton } from './preview-controls-lock';

/** 锁定状态下唯一保留的预览悬浮插槽。 */
export const PREVIEW_CONTROLS_LOCK_SLOT_ID = 'preview-controls-lock';

export type BuildPreviewControlsLockSlotOptions = {
  /** 与锁定按钮共用同一组的左侧控制项。 */
  leading?: ReactNode;
};

/** 构建卡片与全屏预览共用的悬浮控制锁插槽。 */
export const buildPreviewControlsLockSlot = (options?: BuildPreviewControlsLockSlotOptions): PreviewControlSlot => ({
  id: PREVIEW_CONTROLS_LOCK_SLOT_ID,
  placement: 'bottom-start',
  visibility: 'hover',
  render: () => createElement(PreviewControlsLockButton, { leading: options?.leading }),
});
