import type { FC } from 'react';

import { LoaderCircle, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import type { BenchTestCase } from '../test-catalog';

/** 用例开始状态属性 */
export type CaseStartStateProps = Readonly<{
  /** 当前路由对应的测试用例 */
  testCase: BenchTestCase;
  /** 当前页面的开始操作文案 */
  actionLabel: string;
  /** 是否正在执行 */
  running: boolean;
  /** 复用工作台运行入口 */
  onRun: () => void;
}>;

/** 展示可操作的用例说明与场景标识 */
export const CaseStartState: FC<CaseStartStateProps> = props => {
  const { testCase, actionLabel, running, onRun } = props;
  const { t } = useTranslation();
  const buttonLabel = running ? t('header.running') : actionLabel;
  return (
    <div className="flex max-w-lg flex-col items-center text-center">
      <Button size="lg" aria-label={buttonLabel} disabled={running} onClick={onRun}>
        {running ? <LoaderCircle className="animate-spin" /> : <Play className="fill-current" />}
        {buttonLabel}
      </Button>
      <p className="mt-5 text-sm leading-6 text-foreground/80">{t(testCase.description)}</p>
      <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        {t('caseView.scenario')}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
          {testCase.scenarioId}
        </code>
      </span>
    </div>
  );
};
