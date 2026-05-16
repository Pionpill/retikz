import { Loader2, Wand2 } from 'lucide-react';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useAiChatStore } from '@/store/useAiChatStore';

/**
 * Textarea 右上角的润色按钮
 * @description 用当前 provider + model 把 draft 改写得更清晰、信息更完整；
 *   仅当 draft 非空、未生成中、未润色中时可点；进行中切 spinner 并 disabled
 */
export const AiChatInputPolishButton: FC = () => {
  const { t } = useTranslation();
  const draft = useAiChatStore(s => s.draft);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const polishingDraft = useAiChatStore(s => s.polishingDraft);
  const polishDraft = useAiChatStore(s => s.polishDraft);

  const disabled = isGenerating || polishingDraft || draft.trim().length === 0;
  const label = polishingDraft ? t('ai.convPolishing') : t('ai.convPolishLabel');

  return (
    <button
      type="button"
      disabled={disabled}
      className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      aria-label={label}
      title={label}
      onClick={() => void polishDraft()}
    >
      {polishingDraft ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
    </button>
  );
};
