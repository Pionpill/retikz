import type { FC } from 'react';

import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { ShowcaseFamilyValue, ShowcaseUsageValue } from './frontmatter';

import { SHOWCASE_FAMILY_LABELS, SHOWCASE_USAGE_LABELS } from './frontmatter';

export type ShowcaseMetadataBadgesProps = {
  /** 图表家族稳定值 */
  family?: ShowcaseFamilyValue;
  /** 使用场景稳定值 */
  usage?: ShowcaseUsageValue;
};

/** 把 Showcase frontmatter 分类翻译成轻量 Badge */
export const ShowcaseMetadataBadges: FC<ShowcaseMetadataBadgesProps> = props => {
  const { family, usage } = props;
  const { t } = useTranslation();

  if (family === undefined && usage === undefined) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div data-slot="showcase-metadata-badges" className="flex flex-wrap items-center gap-2">
        {family !== undefined && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex" tabIndex={0}>
                <Badge>{t(SHOWCASE_FAMILY_LABELS[family])}</Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>{t('common.showcaseFamilyTooltip')}</TooltipContent>
          </Tooltip>
        )}
        {usage !== undefined && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex" tabIndex={0}>
                <Badge variant="secondary">{t(SHOWCASE_USAGE_LABELS[usage])}</Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>{t('common.showcaseUsageTooltip')}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
