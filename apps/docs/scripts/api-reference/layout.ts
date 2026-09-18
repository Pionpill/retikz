import path from 'node:path';

import { translateLayoutApiReference } from './layout.en';
import type { ApiReferenceLanguage, ApiReferencePackageConfig } from './tex';
import { createApiReferenceMdx, writeApiReferenceMdx } from './tex';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');

/** Layout 组件参考只收录公开入口中的组件与直接执行配置 */
const layoutConfig: ApiReferencePackageConfig = {
  packageName: '@retikz/react',
  packageDirectory: 'packages/kernel/react',
  tsconfigPath: path.resolve(repositoryRoot, 'packages/kernel/react/tsconfig.json'),
  entries: [
    {
      source: path.resolve(repositoryRoot, 'packages/kernel/react/src/index.ts'),
      title: { zh: '`@retikz/react`', en: '`@retikz/react`' },
      memberGroups: {
        LayoutProps: [
          {
            title: { zh: '图形输入与默认值', en: 'Drawing input and defaults' },
            members: ['children', 'ir', 'theme', 'rootScope', 'nodeDistance', 'fontSize'],
          },
          {
            title: { zh: '宿主与渲染', en: 'Host and rendering' },
            members: ['width', 'height', 'viewBox', 'className', 'style', 'renderer', 'idPrefix', 'handlers'],
          },
          { title: { zh: '扩展注册', en: 'Extension registration' }, members: ['extensions', 'lowerTex'] },
          {
            title: { zh: '动画', en: 'Animation' },
            members: ['animations', 'animate', 'snapshotAt', 'animationRef', 'easings', 'animationProperties'],
          },
          {
            title: { zh: '执行与结果', en: 'Execution and results' },
            members: ['runtime', 'authoring', 'compileDriver', 'artifacts', 'onArtifacts', 'onCompileResult'],
          },
        ],
      },
      symbols: [
        'Layout',
        'LayoutProps',
        'LayoutExtensions',
        'LayoutRuntimeMode',
        'LayoutRuntimeModeValue',
        'LayoutRuntimeOptions',
        'LayoutRetainedRuntimeOptions',
        'LayoutStaticRuntimeOptions',
      ],
    },
  ],
  translate: translateLayoutApiReference,
};

/** 从公开入口生成 Layout 的双语 API include */
export const writeLayoutApiReferenceMdx = (outputDirectory: string): Promise<void> =>
  writeApiReferenceMdx(layoutConfig, outputDirectory);

/** 生成单个语言的 Layout API，用于验证公开范围与文档契约 */
export const createLayoutApiReferenceMdx = (lang: ApiReferenceLanguage): Promise<string> =>
  createApiReferenceMdx(layoutConfig, lang);
