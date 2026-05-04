import { ChartLine, Sparkles, Workflow } from "lucide-react";
import type { ComponentType } from "react";
import type { I18nKey } from "./interface";

export type ModuleEntry = {
  id: string;
  /** 模块名 i18n key */
  label: I18nKey;
  /** 图标 */
  Icon: ComponentType<{ className?: string }>;
};

/** 文档站当前可切换的子包列表（后续按模块新增条目） */
export const modules: Array<ModuleEntry> = [
  { id: 'core', label: 'core.label', Icon: Sparkles }, 
  { id: 'flow', label: 'flow.label', Icon: Workflow }, 
  { id: 'plot', label: 'plot.label', Icon: ChartLine }
];