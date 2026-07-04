import type { FC } from 'react';

import { Check, Copy, Terminal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PkgManager } from '@/modules/docs/store';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePkgManagerStore } from '@/modules/docs/store';

type InstallCommands = Record<PkgManager, string>;

export type PackageManagerInstallProps = {
  /** 要安装的包名串，空格分隔，会被拼到对应包管理器的 install 命令后面 */
  packages: string;
};

const MANAGERS: ReadonlyArray<PkgManager> = ['pnpm', 'npm', 'yarn', 'bun'];

const buildInstallCommands = (packages: string): InstallCommands => ({
  pnpm: `pnpm add ${packages}`,
  npm: `npm install ${packages}`,
  yarn: `yarn add ${packages}`,
  bun: `bun add ${packages}`,
});

/** 包管理器 install 命令块。 */
export const PackageManagerInstall: FC<PackageManagerInstallProps> = props => {
  const { packages } = props;
  const { pkgManager, setPkgManager } = usePkgManagerStore();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const commands = useMemo(() => buildInstallCommands(packages), [packages]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(commands[pkgManager]);
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, [commands, pkgManager]);

  return (
    <div className="relative my-6 overflow-hidden rounded-lg bg-muted/50">
      <Tabs className="gap-0" value={pkgManager} onValueChange={v => setPkgManager(v as PkgManager)}>
        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1">
          <div className="flex size-4 items-center justify-center rounded-[1px] bg-foreground opacity-70">
            <Terminal className="size-3 text-background" />
          </div>
          <TabsList className="rounded-none bg-transparent p-0">
            {MANAGERS.map(pm => (
              <TabsTrigger
                key={pm}
                value={pm}
                className="h-7 border border-transparent pt-0.5 shadow-none! data-[state=active]:border-input data-[state=active]:bg-background!"
              >
                {pm}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="no-scrollbar overflow-x-auto">
          {MANAGERS.map(pm => (
            <TabsContent key={pm} value={pm} className="mt-0 px-4 py-3.5">
              <pre className="m-0 bg-transparent p-0">
                <code className="relative font-mono text-sm leading-none">{commands[pm]}</code>
              </pre>
            </TabsContent>
          ))}
        </div>
      </Tabs>
      <Button
        size="icon"
        variant="ghost"
        aria-label={copied ? 'Copied' : 'Copy'}
        className="absolute top-2 right-2 z-10 size-7 cursor-pointer text-muted-foreground opacity-70 hover:opacity-100"
        onClick={handleCopy}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
};
