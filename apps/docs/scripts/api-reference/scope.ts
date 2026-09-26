import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { translateScopeApiReference } from './scope.en';
import type { ApiReferenceLanguage, ApiReferencePackageConfig } from './tex';
import { createApiReferenceMdx } from './tex';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');

/** 复用对应 Schema 参考的中文字段说明 */
const scopeSchemaLocalizations = {
  ScopeSchema: {
    descriptions: {
      frame: '位于子图下方的固有包络装饰，不参与布局或命中',
      style: '当前实例的视觉覆盖，按字段继承与覆盖',
      defaults: '后代默认值通道及继承屏障',
      type: '判别字段，标记此子节点为 scope',
      theme: '当前子树的稀疏 Theme 覆盖；style 与 mode 分别继承，只传给后代 Composite；Core 图元不会自动着色',
      'style.color': '作用域级主色；可向 node、path、label 与 arrow 的对应颜色字段级联',
      'style.fill': '作用域级默认填充；CSS color 字符串或 IRPaint',
      'style.fillOpacity': '作用域级默认填充不透明度 0..1',
      'style.stroke': '作用域级默认描边；CSS color 字符串或 IRPaint',
      'style.strokeWidth': '作用域级默认描边宽度（用户单位）',
      'style.strokeOpacity': '作用域级默认描边不透明度 0..1',
      'style.opacity': '作用域级默认整体不透明度 0..1',
      id: '可选引用 id；始终注册到父级命名空间',
      localNamespace: '为 true 时，子节点及嵌套 scope 的 id 只在本作用域内可见；scope 自身 id 仍属于父级',
      transforms: '依次作用于所有 children 的局部变换；数组最后一项先作用于局部点，相对位移在编译期解析',
      placement: '在固有包络与 transforms 完成后，把 Scope 自身点对齐父坐标系 target',
      'defaults.node': '只作用于 node 的默认样式；不包含 id、position、text 等结构字段',
      'defaults.path': '只作用于 path-like drawable 的默认样式；箭头使用独立 defaults.arrow 通道',
      'defaults.label': 'node label 与 step / geometry label 共用的默认文字样式',
      'defaults.arrow': '箭头默认外观，字段与 ArrowDetailSchema 相同',
      'defaults.reset': '样式继承屏障：true 重置全部通道，或列出 node / path / label / arrow 中需要重置的通道',
      zIndex: 'scope 作为一个整体在同级 children 中的栈序；不改变 scope 内部子项的相对顺序',
      clip: '以 scope 局部坐标描述的裁剪区域',
      boundingShape: '给 scope id 生成的合成引用边界：rectangle 或 circle',
      meta: 'JSON provenance 元数据；透传到 Scene，编译器与 renderer 不解释',
      animations: '作用于 scope 组整体的声明式动画 track；不参与布局，也不向 children 继承',
      children: '可递归包含 node、path、coordinate、scope 或 Tier 2 composite',
    },
  },
  ScopeFrameSchema: {
    descriptions: { padding: '均匀装饰间距，默认 0；不参与布局', style: '独立外框样式，仅共享有效颜色上下文' },
  },
  ScopePlacementSchema: {
    descriptions: { target: '父坐标系中的定位目标', selfAnchor: '变换后 Scope 包络上的对齐点；省略时使用 center' },
  },
  ScopeDefaultsSchema: {
    descriptions: {
      node: '节点默认样式，与其他通道独立',
      path: '路径类图元默认样式；箭头使用独立 arrow 通道',
      label: '节点标签与步骤标签的默认文字样式',
      arrow: '箭头默认样式',
      reset: '继承屏障：true 重置全部通道，或列出 node、path、label、arrow 中需要重置的通道',
    },
  },
};

/** Scope 组件参考只收录公开入口中的组件与直接执行配置 */
const scopeConfig: ApiReferencePackageConfig = {
  packageName: '@retikz/react',
  packageDirectory: 'packages/kernel/react',
  tsconfigPath: path.resolve(repositoryRoot, 'packages/kernel/react/tsconfig.json'),
  entries: [
    {
      source: path.resolve(repositoryRoot, 'packages/kernel/react/src/index.ts'),
      title: { zh: '`@retikz/react`', en: '`@retikz/react`' },
      symbols: ['Scope', 'ScopeProps', 'ScopeStyleProps'],
      symbolPairs: [['Scope', 'ScopeProps']],
      memberValueSets: {
        ScopeProps: { boundingShape: { name: 'ScopeBoundingShape' } },
      },
      memberTypeLabels: {
        ScopeProps: { animations: 'Array<IRAnimationTrack>', zIndex: 'number' },
      },
    },
  ],
  translate: translateScopeApiReference,
};

/** 按组件职责补齐作者输入和持久化数据契约 */
export const scopeApiReferenceConfigs: ReadonlyArray<ApiReferencePackageConfig> = [
  scopeConfig,
  {
    packageName: '@retikz/vanilla',
    packageDirectory: 'packages/kernel/vanilla',
    tsconfigPath: path.resolve(repositoryRoot, 'packages/kernel/vanilla/tsconfig.json'),
    entries: [
      {
        source: path.resolve(repositoryRoot, 'packages/kernel/vanilla/src/index.ts'),
        title: { zh: '`@retikz/vanilla`', en: '`@retikz/vanilla`' },
        symbols: ['scope', 'InputScope'],
        symbolPairs: [['scope', 'InputScope']],
      },
    ],
    translate: translateScopeApiReference,
    schemaPackageName: '@retikz/core',
    schemaLocalizations: {
      ...scopeSchemaLocalizations,
      ScopePropsSchema: {
        descriptions: Object.fromEntries(
          Object.entries(scopeSchemaLocalizations.ScopeSchema.descriptions).filter(
            ([key]) => key !== 'type' && key !== 'children',
          ),
        ),
      },
    },
  },
  {
    packageName: '@retikz/core',
    packageDirectory: 'packages/kernel/core',
    tsconfigPath: path.resolve(repositoryRoot, 'packages/kernel/core/tsconfig.json'),
    entries: [
      {
        source: path.resolve(repositoryRoot, 'packages/kernel/core/src/index.ts'),
        title: { zh: '`@retikz/core`', en: '`@retikz/core`' },
        symbols: ['IRScope', 'IRScopeProps', 'IRScopeFrame', 'IRScopePlacement', 'IRScopeDefaults'],
      },
    ],
    translate: translateScopeApiReference,
    schemaPackageName: '@retikz/core',
    schemaLocalizations: {
      ...scopeSchemaLocalizations,
      ScopePropsSchema: {
        descriptions: Object.fromEntries(
          Object.entries(scopeSchemaLocalizations.ScopeSchema.descriptions).filter(
            ([key]) => key !== 'type' && key !== 'children',
          ),
        ),
      },
    },
  },
];

/** 生成单个语言的组件 API 参考 */
export const createScopeApiReferenceMdx = async (lang: ApiReferenceLanguage): Promise<string> => {
  const sections: Array<string> = [];
  for (const config of scopeApiReferenceConfigs) sections.push(await createApiReferenceMdx(config, lang));
  return sections.join('\n\n');
};

/** 写入组件的中英文 API include */
export const writeScopeApiReferenceMdx = async (outputDirectory: string): Promise<void> => {
  mkdirSync(outputDirectory, { recursive: true });
  for (const lang of ['zh', 'en'] as const)
    writeFileSync(
      path.join(outputDirectory, `generated.${lang}.mdx`),
      `{/* Generated by pnpm generate:api-reference. Do not edit manually. */}\n\n${await createScopeApiReferenceMdx(lang)}\n`,
      'utf8',
    );
};
