import { BotMessageSquare, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Lang } from '@/i18n';
import { cn } from '@/lib';

import { HighlightCode } from '../highlight-code';
import { ToolbarIconButton } from './components';
import { DOT_PATTERN_STYLE } from './constants';
import { PreviewContextBar, PreviewThemeBoundary } from './context-bar';
import { PreviewControlBar, PreviewTableControl } from './control-panel';
import { resolveVisiblePreviewControlSections } from './controls';
import { PreviewPanel } from './preview-panel';
import type { PreviewPanelState } from './preview-panel';
import { filenameFromKey } from './registry';
import { CopyButton } from './source-panel';
import type { SourcePanelState } from './source-panel';
import { usePreviewTheme } from './theme';
import type {
  ComponentPreviewDemoComponent,
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewControlSlot,
  PreviewThemeMode,
  PreviewThemeStyleSelection,
} from './types';

/** Showcase 共用卡片与全屏的状态，尺寸由实际容器提供 */
export type ComponentPreviewShowcaseProps = {
  /** 向 demo 提供绘图区实际宽高，默认关闭 */
  responsive?: boolean;
  /** 实时演示组件 */
  Component: ComponentPreviewDemoComponent;
  /** 界面语言 */
  lang: Lang;
  /** 预览交互状态 */
  previewState: PreviewPanelState;
  /** 源码视图状态 */
  sourceState: SourcePanelState;
  /** 打开源码时才请求完整源码视图 */
  onSourceRequested?: () => void;
  /** 底部控件定义 */
  definition?: PreviewControlsDefinition;
  /** 控件基线与预设 */
  controlContract?: PreviewControlContract;
  /** 顶部工具插槽 */
  tools: Array<PreviewControlSlot>;
  /** 当前明暗模式 */
  themeMode: PreviewThemeMode;
  /** 更新明暗模式 */
  onThemeModeChange: (mode: PreviewThemeMode) => void;
  /** 显示主题风格选择 */
  enableThemeSwitch: boolean;
  /** 当前主题风格 */
  themeStyleSelection: PreviewThemeStyleSelection;
  /** 更新主题风格 */
  onThemeStyleChange?: (selection: PreviewThemeStyleSelection) => void;
  /** 打开 AI 面板并填入当前演示上下文 */
  onAskAi?: () => void;
  /** 预览区域尺寸样式 */
  className?: string;
  /** 预览宽度上限；0 表示占满容器 */
  width?: number;
};

/** 图形优先的无边框预览，顶部工具常显，底部控件不挤占图形宽度 */
export const ComponentPreviewShowcase: FC<ComponentPreviewShowcaseProps> = props => {
  const {
    responsive = false,
    Component,
    lang,
    previewState,
    sourceState,
    onSourceRequested,
    definition,
    controlContract,
    tools,
    themeMode,
    onThemeModeChange,
    enableThemeSwitch,
    themeStyleSelection,
    onThemeStyleChange,
    className,
    onAskAi,
    width: previewWidth = 0,
  } = props;

  const [codeExpanded, setCodeExpanded] = useState(false);
  const [tab, setTab] = useState<'preview' | 'data' | 'code'>('preview');
  const theme = usePreviewTheme(themeStyleSelection, themeMode);
  const display = sourceState.display(true);
  const views = sourceState.views;

  const tableFields = definition
    ? resolveVisiblePreviewControlSections(
        definition.presentation === 'panel' ? definition.sections : [{ controls: definition.controls }],
        previewState.controlState.values,
      )
        .flatMap(section => section.controls)
        .filter(field => field.kind === 'table')
    : [];
  const activeTab = tab === 'data' && tableFields.length === 0 ? 'preview' : tab;

  return (
    <Tabs
      value={activeTab}
      onValueChange={value => {
        if (value === 'code') onSourceRequested?.();
        if (value === 'preview' || value === 'data' || value === 'code') setTab(value);
      }}
      className="min-w-0 w-full gap-0"
      data-slot="preview-showcase"
    >
      <div data-slot="showcase-toolbar" className="flex flex-wrap items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-2">
          <TabsList aria-label={lang === 'zh' ? '展示视图' : 'Display view'}>
            <TabsTrigger value="preview">{lang === 'zh' ? '预览' : 'Preview'}</TabsTrigger>
            {tableFields.length > 0 ? <TabsTrigger value="data">{lang === 'zh' ? '数据' : 'Data'}</TabsTrigger> : null}
            {views.length > 0 ? <TabsTrigger value="code">{lang === 'zh' ? '代码' : 'Code'}</TabsTrigger> : null}
          </TabsList>
          <div className={cn('flex items-center', activeTab === 'preview' && 'showcase-hover-tools')}>
            {activeTab === 'code' ? (
              <Tabs
                value={sourceState.view}
                onValueChange={value => {
                  const view = views.find(item => item === value);
                  if (view) sourceState.setView(view);
                }}
              >
                <TabsList aria-label={lang === 'zh' ? '代码模式' : 'Code mode'}>
                  {views.map(view => (
                    <TabsTrigger key={view} value={view}>
                      {view === 'react' ? 'React' : view === 'vanilla' ? 'Vanilla' : view === 'ir' ? 'IR' : 'Config'}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : activeTab === 'preview' ? (
              <PreviewContextBar
                inline
                iconOnly
                themeMode={themeMode}
                onThemeModeChange={onThemeModeChange}
                lang={lang}
                enableThemeSwitch={enableThemeSwitch}
                themeStyle={theme.style}
                themeStyleSelection={themeStyleSelection}
                onThemeStyleChange={onThemeStyleChange}
              />
            ) : null}
          </div>
        </div>
        {activeTab === 'preview' ? (
          <div className="flex flex-wrap items-center gap-1">
            {tools.map(tool => (
              <div key={tool.id}>{tool.render(previewState.runtime)}</div>
            ))}
          </div>
        ) : activeTab === 'code' ? (
          <div className="flex min-w-0 items-center gap-2">
            {sourceState.files.length > 1 ? (
              <Select
                value={String(sourceState.activeFileIndex)}
                onValueChange={value => sourceState.setActiveFileIndex(Number(value))}
              >
                <SelectTrigger className="max-w-64" aria-label={lang === 'zh' ? '源码文件' : 'Source file'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceState.files.map((file, index) => (
                    <SelectItem key={file.filename} value={String(index)}>
                      {filenameFromKey(file.filename)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <CopyButton
              copied={sourceState.copied}
              onCopy={sourceState.copyActiveFile}
              title={lang === 'zh' ? '复制代码' : 'Copy code'}
            />
            {onAskAi ? (
              <ToolbarIconButton label="Ask AI" title="Ask AI" onClick={onAskAi}>
                <BotMessageSquare className="size-4" />
              </ToolbarIconButton>
            ) : null}
            {display.lineCount > 10 ? (
              <ToolbarIconButton
                label={codeExpanded ? 'Collapse' : 'Expand'}
                title={codeExpanded ? 'Collapse' : 'Expand'}
                onClick={() => setCodeExpanded(!codeExpanded)}
              >
                {codeExpanded ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
              </ToolbarIconButton>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="grid min-w-0 grid-cols-1">
        <div
          className={cn(
            'col-start-1 row-start-1 min-w-0',
            activeTab !== 'preview' && 'invisible pointer-events-none opacity-0',
          )}
          aria-hidden={activeTab !== 'preview' ? true : undefined}
        >
          <div className="w-full overflow-hidden rounded-xl" style={previewWidth ? DOT_PATTERN_STYLE : undefined}>
            <div
              style={{ maxWidth: previewWidth || undefined }}
              className={cn('relative mx-auto w-full min-w-0 overflow-hidden rounded-xl', className)}
            >
              <TabsContent value="preview" forceMount className="h-full w-full">
                <PreviewThemeBoundary themeMode={themeMode} className="h-full">
                  <PreviewPanel
                    state={previewState}
                    Component={Component}
                    responsive={responsive}
                    lang={lang}
                    theme={theme}
                    className="h-full w-full overflow-hidden"
                    pinControlsOnClick={false}
                  />
                </PreviewThemeBoundary>
              </TabsContent>
            </div>
          </div>
          <PreviewControlBar
            definition={definition}
            controlContract={controlContract}
            controlState={previewState.controlState}
          />
        </div>
        {tableFields.length > 0 ? (
          <TabsContent value="data" className="col-start-1 row-start-1 h-0 min-h-full min-w-0 overflow-auto rounded-xl">
            <div data-slot="showcase-data" className={cn('min-h-full min-w-0', tableFields.length === 1 && 'h-full')}>
              {tableFields.map(field => (
                <PreviewTableControl
                  key={field.id}
                  field={field}
                  values={previewState.controlState.values}
                  fillAvailableHeight={tableFields.length === 1}
                />
              ))}
            </div>
          </TabsContent>
        ) : null}
        <TabsContent
          value="code"
          className={cn(
            'col-start-1 row-start-1 min-w-0 overflow-auto rounded-xl bg-muted/50',
            codeExpanded ? 'h-auto' : 'h-0 min-h-full',
          )}
        >
          <HighlightCode code={display.code} lang={display.lang} lineKinds={display.lineKinds} showLineNumbers />
        </TabsContent>
      </div>
    </Tabs>
  );
};
