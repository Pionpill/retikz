import { CircleHelp } from 'lucide-react';
import type { FC } from 'react';

import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Lang } from '@/i18n';
import { cn } from '@/lib';

import type { PreviewFigureType } from '../types';
import { figureGuideI18n } from './figure-guide.i18n';

export type FigureGuideButtonProps = {
  /** 说明内容对应的图示类型。 */
  type: PreviewFigureType;
  /** 当前文档语言。 */
  lang: Lang;
  /** 弹窗打开状态变化。 */
  onOpenChange?: (open: boolean) => void;
  /** 按钮附加样式。 */
  className?: string;
};

/** 打开当前叙述性图示的阅读说明。 */
export const FigureGuideButton: FC<FigureGuideButtonProps> = props => {
  const { type, lang, onOpenChange, className } = props;
  const content = figureGuideI18n[lang][type];

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger
        aria-label={content.title}
        title={content.title}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'size-7 cursor-pointer rounded-sm text-muted-foreground',
          className,
        )}
      >
        <CircleHelp aria-hidden className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.introduction}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {content.sections.map(section => (
            <section key={section.title}>
              <h3 className="text-sm font-medium">{section.title}</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {section.items.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
