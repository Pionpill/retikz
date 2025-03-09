import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react';
import { FC } from 'react';

export type MarkdownAlertProps = {
  title?: string;
  children: string;
  type: 'info' | 'success' | 'warning' | 'error';
};

const MarkdownAlert: FC<MarkdownAlertProps> = props => {
  const { title, children, type } = props;
  const iconCommonCls = cn('size-5', !title && '-translate-y-1');
  const Icon =
    type === 'info' ? (
      <Info className={`stroke-slate-500 ${iconCommonCls}`} />
    ) : type === 'success' ? (
      <CircleCheck className={`stroke-green-500 ${iconCommonCls}`} />
    ) : type === 'warning' ? (
      <CircleAlert className={`stroke-orange-500 ${iconCommonCls}`} />
    ) : (
      <CircleX className={`stroke-red-500 ${iconCommonCls}`} />
    );

  return (
    <Alert data-type={type} className="whitespace-normal mt-6 border-none data-[type=info]:bg-zinc-100 data-[type=success]:bg-green-100 data-[type=warning]:bg-orange-100 data-[type=error]:bg-red-100 dark:data-[type=info]:bg-[#2b2c2e] dark:data-[type=success]:bg-[#1E2A23] dark:data-[type=warning]:bg-[#2A231E] dark:data-[type=error]:bg-[#2A1E1E]">
      {Icon}
      {title ? <AlertTitle className="font-bold text-base">{title}</AlertTitle> : null}
      <AlertDescription className="whitespace-normal break-words">{children}</AlertDescription>
    </Alert>
  );
};

export default MarkdownAlert;
