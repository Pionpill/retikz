import type { FC } from 'react';

import { AnimationModeProvider } from '@retikz/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib';
import { docPathSegments, useDocLocation } from '@/modules/docs/layout';
import { useComponentPreviewStore } from '@/modules/docs/store';

import type { ComponentPreviewFiles } from './types';

import { useDemoLocationContext } from './context';
import { DemoRenderer } from './preview-panel';
import { demoModules, resolveDemoKey } from './registry';
import { normalizeComponentPreviewFiles } from './utils';

export type ComponentPreviewThumbnailProps = {
  /** 主 demo 与附加源码文件配置 */
  files: ComponentPreviewFiles;
  /** 缩略图容器附加样式 */
  className?: string;
};

/** 只渲染 canonical demo 的静态缩略图，不创建 controls、源码或工具栏宿主 */
export const ComponentPreviewThumbnail: FC<ComponentPreviewThumbnailProps> = props => {
  const { files, className } = props;
  const { name } = useMemo(() => normalizeComponentPreviewFiles(files), [files]);
  const location = useDocLocation();
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';
  const contextSegments = useDemoLocationContext();
  const segments = useMemo(
    () => contextSegments ?? (location ? docPathSegments(location) : null),
    [contextSegments, location],
  );
  const key = segments ? resolveDemoKey(segments, name, language) : null;
  const module = key ? demoModules[key] : undefined;
  const rendererMode = useComponentPreviewStore(state => state.rendererMode);
  const animationMode = useComponentPreviewStore(state => state.animationMode);
  const Component = useMemo<FC | undefined>(() => {
    const canonicalRender = module?.previewSource?.canonicalRender;
    if (canonicalRender) return () => canonicalRender();
    return module?.default;
  }, [module]);

  if (!location || !segments) return null;

  return (
    <div
      data-slot="component-preview-thumbnail"
      className={cn(
        'flex aspect-2/1 w-full items-center justify-center overflow-hidden bg-muted/20 p-4 pointer-events-none select-none',
        '[&_canvas]:max-h-full [&_canvas]:max-w-full [&_svg]:max-h-full [&_svg]:max-w-full',
        className,
      )}
    >
      {Component ? (
        <AnimationModeProvider mode={animationMode}>
          <DemoRenderer Component={Component} rendererMode={rendererMode} />
        </AnimationModeProvider>
      ) : (
        <span className="text-xs text-muted-foreground">
          Demo <code>{name}</code> not found
        </span>
      )}
    </div>
  );
};
