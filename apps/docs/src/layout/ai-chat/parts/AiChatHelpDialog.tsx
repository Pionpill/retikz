import { Database, KeyRound, Keyboard, Lock } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type AiChatHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Chat RetikZ 使用说明对话框
 * @description 入口为顶栏 HelpCircle 按钮。四节式 reference：BYOK / 本地存储（IDB cap 20）/ 隐私 / 快捷键。
 *   每节固定渲染 —— 走 i18next 类型化 t 不能用动态 key 喂 loop。
 */
export const AiChatHelpDialog: FC<AiChatHelpDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ai.helpDialogTitle')}</DialogTitle>
          <DialogDescription>{t('ai.helpDialogSubtitle')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <HelpSection icon={<KeyRound className="size-4" />} title={t('ai.helpByokTitle')} desc={t('ai.helpByokDesc')} />
          <HelpSection icon={<Database className="size-4" />} title={t('ai.helpStorageTitle')} desc={t('ai.helpStorageDesc')} />
          <HelpSection icon={<Lock className="size-4" />} title={t('ai.helpPrivacyTitle')} desc={t('ai.helpPrivacyDesc')} />
          <HelpSection icon={<Keyboard className="size-4" />} title={t('ai.helpShortcutsTitle')} desc={t('ai.helpShortcutsDesc')} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const HelpSection: FC<{ icon: ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <section className="flex items-start gap-3">
    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  </section>
);
