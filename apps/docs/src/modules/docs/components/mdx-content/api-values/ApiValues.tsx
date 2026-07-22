import type { FC } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { ApiValueRegistryEntry } from './constants';

import { API_VALUE_REGISTRY } from './constants';

/** API 值集合提示组件属性 */
export type ApiValuesProps = {
  /** `API_VALUE_REGISTRY` 中注册的公开常量名 */
  name: string;
};

/** 以内联代码展示公开常量名，并在悬浮或聚焦时列出具体值 */
export const ApiValues: FC<ApiValuesProps> = props => {
  const { name } = props;
  const entry = (API_VALUE_REGISTRY as Readonly<Record<string, ApiValueRegistryEntry | undefined>>)[name];

  if (entry == null) {
    console.warn(`[ApiValues] value set "${name}" not in API_VALUE_REGISTRY`);
    return (
      <span className="text-destructive">
        Unknown API values: <code className="font-mono">{name}</code>
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <code
            tabIndex={0}
            aria-label={`${name}: ${entry.values.join(', ')}`}
            className="relative cursor-help rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[0.8rem] break-words underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {name}
          </code>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="max-w-72">
          <div className="flex flex-wrap gap-1.5">
            {entry.values.map(value => (
              <code
                key={value}
                className="rounded bg-background/15 px-1.5 py-0.5 font-mono text-[0.75rem] text-background"
              >
                {value}
              </code>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
