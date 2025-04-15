'use client';
import { Button } from '@/components/ui/button';
import useTheme from '@/hooks/useTheme';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Files } from 'lucide-react';
import { FC, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

export type MarkdownCodeProps = {
  className?: string;
  children: string;
};

const MarkdownCode: FC<MarkdownCodeProps> = props => {
  const { children, className } = props;

  const inline = children?.includes('\\n');
  const match = /language-(\w+)/.exec(className || '');

  const { theme } = useTheme();
  const { t } = useTranslation();

  const handleClick: MouseEventHandler = () => {
    navigator.clipboard.writeText(String(children));
    toast(t('common.copySuccess'));
  };

  return !inline && match ? (
    <code className={cn('w-full relative group', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-50"
        onClick={handleClick}
      >
        <Files className="h-4 w-4" />
      </Button>
      {match[1] ? (
        <span className="absolute right-4 top-4 text-xs text-muted-foreground opacity-50 group-hover:opacity-0">
          {match[1]}
        </span>
      ) : null}
      <SyntaxHighlighter
        {...props}
        style={theme === 'dark' ? oneDark : oneLight}
        customStyle={{
          background: "#2b2c2d",
        }}
        language={match[1]}
        PreTag="div"
        className="rounded-lg text-sm w-full"
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </code>
  ) : (
    <code className="text-sm font-mono px-1 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800">{children}</code>
  );
};

export default MarkdownCode;
