# 文档验证与读者评审

## 最小有效检查

先格式化本次文件，再按 `apps/docs/AGENTS.md` 验证；不重复运行已经通过且输入未变的检查。

| 改动                                               | 检查                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 纯 MDX 正文、表格、链接                            | Oxfmt、git diff --check、docs check:static、关键页面与链接                         |
| frontmatter、章节、MDX 组件                        | 上述检查 + zh/en 标题、TOC、菜单与布局                                             |
| demo、data、helper、MDX import、导航/i18n/registry | 上述检查 + docs tsc --noEmit、对应页面与交互；结构化源码按根规则跑 lint 和必要测试 |
| 仅 skill / 发现入口                                | frontmatter、引用、旧入口残留、场景分流；不要求旧页面迁移                          |
| 移动或修改脚本                                     | 路径解析、node --check、已有相关测试；脚本行为改变时实际运行对应场景               |

机械文档完整性检查：

```bash
node .agents/skills/docs-doc-principle/scripts/check-doc-integrity.mjs --scope <module-or-subtree>
```

检查双语配对、标题层级、站内路由/锚点、SourceLinks 文件与行号、主 demo 文件。不能证明 API 语义正确、源码支撑结论或图形可读。

Docs 提交前必须运行 `pnpm --filter @retikz/docs run check:static`；完成后询问是否运行 check:build / check:runtime，只在用户要求时执行，runtime 包含其所需构建。无关工作区错误如实报告，不顺手扩大修改。

## 页面与图形

- 核对公开导入、默认值应用处和关键分支；zh/en 语义一致，不只比较标题数量。
- 实际打开页面检查 demo、controls、源码栏、caption、表格与导航；叙述图按 [插图契约](figure-contract.md)，尺寸按 [测量规则](preview-sizing.md)。
- 新 demo 必须确认 registry 能发现。出现 `Demo ... not found` 时先重启当前工作区 dev 服务再复查；未经用户要求不以生产构建替代。
- 无浏览器或服务不可用时，明确“视觉复核未执行”；类型检查和静态 SVG 不等同于真实页面检查。

## 读者评审

新增页面或重写阅读主线时，执行计划应列出一个只读读者 reviewer 及复审上限；仅在已授权时调度。局部文案、机械迁移和 skill-only 重构由主 agent 自审，不因多文件自动升级。

已授权的读者评审使用 fresh 上下文，只给正文和页面图示，不给 AGENTS、skills、源码、测试、diff 或作者预期。要求指出首次理解困难的位置、缺失前提、术语堆叠、逻辑跳跃和图文脱节，并给出准确的替代表达。源码一致性由主 agent 检查。

在获批轮数内修正后复用同一 reviewer；未执行时如实说明，不宣称独立评审通过。结果报告实际范围、阻塞问题与剩余未验证项，不要求固定赞扬项或总分。
