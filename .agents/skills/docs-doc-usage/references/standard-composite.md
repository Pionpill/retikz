# Standard Composite 补充规则

按当前阅读任务选择 usage、extension、mechanism 或 reference 主 skill；本文件只补 Standard 事实核对，不规定第二套页型、难度或章节。

先读 packages/library/AGENTS.md、packages/library/standard/AGENTS.md 与当前能力在 Standard / React / Vanilla 的公开入口和测试。

## 三条路径

- React：props 如何形成 Standard IR，Definition 如何向 Layout 局部贡献
- Vanilla：helper、adapter、挂载入口是否与 React 复用 schema 和 lowering
- 持久化：完整 IR 的 discriminator、schema、factory 与 Definition 注入；函数不能进入 JSON，不把 authoring input 当独立实体

只在主任务需要时展开相应路径；完整安装链接当前方案快速开始。不得沿用旧 skill 中固定的 /standard 路径，先核对实际导航。

## 用法与预览

说明高层意图和必要字段；最小示例先于 controls。参数空间由 docs-doc-control 管理，保持取景、默认值、visibleWhen、重置与双语一致。公开属性的教学覆盖不能靠字段数量取代语义覆盖。

复用 ComponentPreview 的 IR / Vanilla 源码派生与真实 render；controls 的基线是稳定 canonicalValues，不是实时交互值。未注册转换器时不宣称完整预览通过，也不在仅文档规范任务中顺带开发转换器；需要代码补齐时确认该范围授权。

## 原理与参考

实现原理独立页只追踪当前能力的 Standard JSON IR → Definition → lowering → Core IR 责任链，不重复全局 renderer 管线。用 retikz 叙述图与就近源码链接解释，并说明未注入 Definition 的真实结果。

API 默认值核对 schema default、factory parse 与 lowering 的实际消费；完整表由参考页拥有，不在用法页复制。共享默认与继承语义以源码为准。

## 验证

按当前导航同步页面、data、双语、入口和关联链接；按 docs 门禁验证。实际检查 React / IR / Vanilla tabs、controls 默认与极值、窄屏及中英文，无未注册转换器、Unknown schema、裁切或翻译缺失。不能仅凭 React demo 显示就认定 Vanilla 接入闭环。
