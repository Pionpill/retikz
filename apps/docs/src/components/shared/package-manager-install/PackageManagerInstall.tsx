import type { FC } from 'react';
import { CodeBlockCommand } from '../code-block-command';

export type PackageManagerInstallProps = {
  /** 要安装的包名串，空格分隔，会被拼到对应包管理器的 install 命令后面 */
  packages: string;
};

/** `<CodeBlockCommand>` 的便捷壳：固定 install 语义，4 个命令由 packages 派生 */
export const PackageManagerInstall: FC<PackageManagerInstallProps> = ({ packages }) => (
  <CodeBlockCommand
    pnpm={`pnpm add ${packages}`}
    npm={`npm install ${packages}`}
    yarn={`yarn add ${packages}`}
    bun={`bun add ${packages}`}
  />
);
