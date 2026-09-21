import { Lock, LockOpen } from 'lucide-react';
import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useComponentPreviewStore } from '@/modules/docs/store';

import { PreviewToolbar, PreviewToolbarButton } from '../PreviewToolbar';

export type PreviewControlsLockButtonProps = {
  /** 与锁定按钮共用同一组的左侧控制项。 */
  leading?: ReactNode;
};

/** 切换全站预览悬浮控制的锁定状态。 */
export const PreviewControlsLockButton: FC<PreviewControlsLockButtonProps> = props => {
  const { leading } = props;
  const { t } = useTranslation();
  const controlsLocked = useComponentPreviewStore(state => state.controlsLocked);
  const toggleControlsLocked = useComponentPreviewStore(state => state.toggleControlsLocked);
  const label = t(controlsLocked ? 'preview.unlockControls' : 'preview.lockControls');

  return (
    <PreviewToolbar>
      {!controlsLocked && leading}
      <PreviewToolbarButton label={label} pressed={controlsLocked} onClick={toggleControlsLocked}>
        {controlsLocked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
      </PreviewToolbarButton>
    </PreviewToolbar>
  );
};
