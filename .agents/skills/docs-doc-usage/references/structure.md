# 用法页共同结构

1. 开篇：解决的问题、最小输入与可观察结果。
2. “接入方式 / Using this topic”：说明文字 → 无 controls 且 hideCode 的最小 ComponentPreview → 接入代码。双宿主与原生 IR 均支持时固定四栏，具体规则与例外读 [接入方式](../../docs-doc-principle/references/doc-tabs-steps.md)。
3. 使用章节按任务、结构、组合与边界组织；每例前说明观察什么，例后解释结果。仅参数变化合并 controls，不把不同结构和错误行为藏进选项。
4. “补充说明 / Additional notes”收零散限制；需要独立讲解的限制用“错误与限制”，影响当前例子的条件就近解释。
5. 有相关成员时用“相关属性 / Related props”，读 [ComponentProps](../../docs-doc-principle/references/component-props.md)；只收本页讲过的成员。
6. “延伸阅读 / Further reading”用 LinkedSections 指向前置、自定义、原理与权威参考。

小节按语义拆分，不按字段或 demo 数量凑节。公共视觉属性只作必要说明或 controls；完整 API 与 Schema 指向权威参考。总结同组 demo 的映射表可放 demo 后，判别字段的选项说明按总则放在首次 demo 前。
