import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import type { FC } from 'react';

/** 文档提示块类型。 */
export type ComponentAlertType = 'tip' | 'warn' | 'error';

/** 文档提示块 props。 */
export type ComponentAlertProps = {
  /** 提示类型。 */
  type?: ComponentAlertType;
  /** 提示标题。 */
  title: string;
  /** 提示正文。 */
  description: string;
};

const alertTypeClass: Record<ComponentAlertType, string> = {
  tip: 'border-border bg-muted/40',
  warn: 'border-border bg-muted/60',
  error: 'border-destructive/40 bg-destructive/5 text-destructive',
};

const descriptionTypeClass: Record<ComponentAlertType, string> = {
  tip: 'text-muted-foreground',
  warn: 'text-muted-foreground',
  error: 'text-destructive/85',
};

const alertTypeIcon: Record<ComponentAlertType, FC<{ className?: string }>> = {
  tip: Info,
  warn: TriangleAlert,
  error: CircleAlert,
};

/** ComponentAlert：MDX 文档中的简短提示块。 */
export const ComponentAlert: FC<ComponentAlertProps> = props => {
  const { type = 'tip', title, description } = props;
  const Icon = alertTypeIcon[type];

  return (
    <Alert variant={type === 'error' ? 'destructive' : 'default'} className={cn('my-6', alertTypeClass[type])}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className={descriptionTypeClass[type]}>{description}</AlertDescription>
    </Alert>
  );
};
