import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { docPathSegments, useDocLocation } from '@/modules/docs/layout';

import type { AlignKey, ComponentRenderSource, PreviewAction, RendererMode, SizeKey } from './types';
import type { PreviewIR } from './utils';

import { ComponentRender } from './ComponentRender';
import { RawSvgFrame } from './components';
import { useDemoLocationContext } from './context';
import { buildConfiguredControlSlots } from './control-slots';
import {
  actionModules,
  buildActionsKey,
  buildIrJsonKey,
  buildVanillaKey,
  demoModules,
  demoSources,
  irJsonOverrides,
  resolveDemoKey,
  resolvePreviewActions,
  resolvePreviewControls,
  vanillaModules,
  vanillaOverrides,
} from './registry';
import {
  buildPreviewIR,
  buildReactSourceFiles,
  formatIR,
  irHasAnimations,
  irHasComposite,
  irToVanillaCode,
} from './utils';

export type ComponentPreviewProps = {
  /** demo 文件名（不含 `.demo.tsx` 后缀），相对当前 mdx 同级目录解析 */
  name: string;
  /** 渲染区垂直对齐，默认 center */
  align?: AlignKey;
  /** 渲染区高度档位，默认 `md`。 */
  size?: SizeKey;
  /** 透传到 demo 渲染区父级 div 的 className，可覆盖默认高度 / p-10 / 居中等 */
  componentClassName?: string;
  /** 隐藏底部「View Code / 源码 / IR」面板与 Dialog 右栏，只保留 demo 渲染区——用于叙述性插图 */
  hideCode?: boolean;
  /** 与 demo 一起展示的附加源码文件，路径相对当前页面目录。 */
  sourceFiles?: Array<string | { file: string; diffFrom: string }>;
  /** 作为 React 源码 diff baseline 的 demo id。 */
  diffFrom?: string;
  /** 交互式 demo，跳过静态 IR / Vanilla 派生。 */
  interactive?: boolean;
  /** 强制显 / 隐内置动画工具；省略时自动判定。 */
  replayable?: boolean;
  /** 自定义动作按钮（渲染在渲染区左上角动作栏，追加在内置工具后） */
  actions?: Array<PreviewAction>;
  /** 自定义预览控制插槽，优先于兼容用的 actions。 */
  controlSlots?: Array<PreviewAction>;
  /** 自定义动作栏是否常驻显示；默认 true */
  actionsAlwaysVisible?: boolean;
  /** 渲染区内常驻浮层（如未来的 FPS 监视器面板） */
};

/** MDX 内的演示卡入口。 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const {
    name,
    align = 'center',
    size = 'md',
    componentClassName,
    hideCode = false,
    sourceFiles,
    diffFrom,
    interactive = false,
    replayable,
    actions,
    controlSlots,
    actionsAlwaysVisible = true,
  } = props;
  const loc = useDocLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  const ctxSegments = useDemoLocationContext();
  const segments = ctxSegments ?? (loc ? docPathSegments(loc) : null);
  const key = segments ? resolveDemoKey(segments, name, lang) : null;
  const mod = key ? demoModules[key] : undefined;
  const rawSource = key ? demoSources[key] : undefined;
  const Component = mod?.default;
  const actionModule = segments ? actionModules[buildActionsKey(segments, name)] : undefined;
  const moduleActions = mod?.previewActions ?? resolvePreviewActions(actionModule);
  const moduleControls = mod?.previewControls ?? resolvePreviewControls(actionModule);
  const baselineKey = segments && diffFrom ? resolveDemoKey(segments, diffFrom, lang) : null;
  const baselineRawSource = baselineKey ? demoSources[baselineKey] : undefined;

  const irJsonOverrideKey = segments ? buildIrJsonKey(segments, name) : null;
  const irJsonOverride = irJsonOverrideKey ? irJsonOverrides[irJsonOverrideKey] : undefined;
  const exportedPreviewIR = mod?.previewIR;
  const irState = useMemo<{ previewIr: PreviewIR | null; irJson: string }>(() => {
    if (!Component || hideCode) return { previewIr: null, irJson: '' };
    if (irJsonOverride !== undefined) {
      const irJson = irJsonOverride.replace(/\n$/, '');
      try {
        const ir = JSON.parse(irJson) as PreviewIR['ir'];
        return { previewIr: { ir, width: undefined, height: undefined }, irJson };
      } catch (err) {
        return {
          previewIr: null,
          irJson: `// Failed to parse IR override: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
    if (interactive)
      return { previewIr: null, irJson: exportedPreviewIR !== undefined ? formatIR(exportedPreviewIR) : '' };
    try {
      const previewIr = buildPreviewIR(Component);
      return { previewIr, irJson: formatIR(previewIr.ir) };
    } catch (err) {
      return {
        previewIr: null,
        irJson: `// Failed to compute IR: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }, [Component, hideCode, interactive, irJsonOverride, exportedPreviewIR]);

  const vanillaKey = segments ? buildVanillaKey(segments, name) : null;
  const vanillaOverride = vanillaKey ? vanillaOverrides[vanillaKey] : undefined;
  const vanillaModule = vanillaKey ? vanillaModules[vanillaKey] : undefined;
  const vanillaSvg = typeof vanillaModule?.svg === 'string' ? vanillaModule.svg : undefined;
  const vanillaCode = useMemo(() => {
    if (!Component || hideCode) return '';
    if (vanillaOverride !== undefined) return vanillaOverride.replace(/\n$/, '');
    if (interactive || !irState.previewIr) return '';
    try {
      return irToVanillaCode(irState.previewIr.ir);
    } catch (err) {
      return `// Failed to generate vanilla code: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [Component, hideCode, vanillaOverride, interactive, irState]);

  if (!loc) return null;
  if (!segments) return null;

  if (!mod || rawSource == null || !key || !Component) {
    return (
      <div className="my-6 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Demo <code className="rounded bg-muted px-1">{name}</code> not found at{' '}
        <code className="rounded bg-muted px-1">{key ?? '(unknown)'}</code>
      </div>
    );
  }

  const reactFiles = buildReactSourceFiles({
    key,
    name,
    segments,
    rawSource,
    sourceFiles,
    diffFrom,
    baselineRawSource,
    hideCode,
  });
  const extraSourceFiles = reactFiles.filter(file => !file.isMain);

  const previewIr = irState.previewIr;
  const source: ComponentRenderSource | undefined = hideCode
    ? undefined
    : {
        react: { files: reactFiles },
        ...(irState.irJson.length > 0
          ? {
              ir: {
                files: [{ filename: `${name}.ir.json`, code: irState.irJson, lang: 'json' as const }],
                render:
                  previewIr !== null && !irHasComposite(previewIr.ir)
                    ? (mode: RendererMode) => (
                        <Layout
                          ir={previewIr.ir}
                          renderer={mode}
                          width={previewIr.width}
                          height={previewIr.height}
                          pathKinds={previewIr.pathKinds}
                        />
                      )
                    : undefined,
              },
            }
          : {}),
        ...(vanillaCode.length > 0
          ? {
              vanilla: {
                files: [
                  { filename: `${name}.vanilla.ts`, code: vanillaCode, lang: 'ts' as const },
                  ...extraSourceFiles,
                ],
                render: vanillaSvg !== undefined ? () => <RawSvgFrame svg={vanillaSvg} /> : undefined,
              },
            }
          : {}),
      };

  const animated = replayable ?? (previewIr !== null && irHasAnimations(previewIr.ir));
  const configuredControlSlots = buildConfiguredControlSlots(moduleControls);
  const resolvedControlSlots = controlSlots ?? actions ?? [...configuredControlSlots, ...(moduleActions ?? [])];

  return (
    <ComponentRender
      name={name}
      Component={Component}
      source={source}
      align={align}
      size={size}
      componentClassName={componentClassName}
      interactive={interactive}
      animated={animated}
      controlSlots={resolvedControlSlots}
      actionsAlwaysVisible={actionsAlwaysVisible}
    />
  );
};
