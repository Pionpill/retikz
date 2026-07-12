import type { FC } from 'react';

import { Check, Copy } from 'lucide-react';

import { ToolbarIconButton } from '../components';

/** 源码复制按钮属性。 */
export type CopyButtonProps = {
  /** 是否处于已复制反馈态。 */
  copied: boolean;
  /** 复制当前源码。 */
  onCopy: () => void;
  /** 附加样式。 */
  className?: string;
  /** 原生提示文本。 */
  title?: string;
};

/** 源码复制按钮。 */
export const CopyButton: FC<CopyButtonProps> = props => {
  const { copied, onCopy, className, title } = props;

  return (
    <ToolbarIconButton label={copied ? 'Copied' : 'Copy'} title={title} onClick={onCopy} className={className}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </ToolbarIconButton>
  );
};
