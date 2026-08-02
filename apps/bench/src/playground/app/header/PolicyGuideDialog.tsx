import type { FC } from 'react';

import { CircleHelp, GitCompareArrows, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { kernelLabPolicies, LabPolicyId } from '../../modules/kernel';

const policyIds = Object.freeze(kernelLabPolicies.map(policy => policy.id));

const policyComparisons = Object.freeze([
  Object.freeze({
    left: LabPolicyId.StaticFull,
    right: LabPolicyId.RetainedFull,
    description: 'staticVsRetained',
  }),
  Object.freeze({
    left: LabPolicyId.RetainedFull,
    right: LabPolicyId.RetainedAuto,
    description: 'retainedFullVsAuto',
  }),
  Object.freeze({ left: LabPolicyId.StaticFull, right: LabPolicyId.RetainedAuto, description: 'staticVsAuto' }),
] as const);

/** 展示更新策略语义与比较方式的帮助弹窗 */
export const PolicyGuideDialog: FC = () => {
  const { t } = useTranslation();
  const label = t('header.policyGuide');

  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-label={label} title={label}>
        <CircleHelp />
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3"
            aria-label={t('policyGuide.close')}
            title={t('policyGuide.close')}
          >
            <X />
          </Button>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{t('policyGuide.title')}</DialogTitle>
          <DialogDescription>{t('policyGuide.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          {policyIds.map(policyId => (
            <section key={policyId} className="rounded-lg border bg-muted/20 p-4">
              <h3 className="font-semibold text-foreground">{t(`policy.${policyId}`)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`policyGuide.${policyId}.description`)}</p>
            </section>
          ))}
        </div>

        <section className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="size-4 text-muted-foreground" />
            <h3 className="font-semibold">{t('policyGuide.compareTitle')}</h3>
          </div>
          <div className="mt-3 grid gap-3">
            {policyComparisons.map(comparison => (
              <div
                key={`${comparison.left}-${comparison.right}`}
                className="grid gap-1 text-sm sm:grid-cols-[minmax(0,16rem)_1fr] sm:gap-4"
              >
                <div className="font-medium text-foreground">
                  {t(`policy.${comparison.left}`)} ↔ {t(`policy.${comparison.right}`)}
                </div>
                <p className="text-muted-foreground">{t(`policyGuide.compare.${comparison.description}`)}</p>
              </div>
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};
