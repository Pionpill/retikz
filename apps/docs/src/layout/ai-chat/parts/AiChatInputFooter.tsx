import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Kbd } from '@/components/ui/kbd';

/**
 * Input 底部 detached footer（在 card 外、无 border、与外层 bg 同色）
 * @description 仅保留左侧 Esc 取消生成提示
 */
export const AiChatInputFooter: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center px-1 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Kbd className="h-3.5 px-1 text-[9px]">Esc</Kbd>
        <span>{t('ai.convEscCancel')}</span>
      </span>
    </div>
  );
};
