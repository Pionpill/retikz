# @retikz/reconciler 工作指南

全仓规则见根 [AGENTS.md](../../../AGENTS.md)，Kernel 分组规则见 [AGENTS.md](../AGENTS.md)。以下为包职责边界。

- **解决的问题**：统一完整与增量编译执行，支持局部输入变化、缓存复用与事务发布
- **拥有的契约**：完整编译 API、执行环境、树遍历、Composite probe / replay、资源与来源组装、Weave 编译会话、跨次缓存与身份关联、候选状态与单目标提交、运行时快照及 Scene Patch
- **不拥有的能力**：Core 绘图语义与几何算法、后端绘制、框架 authoring 与领域算法
- **输入与输出**：接收 Core 输入、编译选项及更新信息，输出与会话 revision 一致的编译结果和更新产物
- **依赖与缺口流向**：单向依赖 Core、Foundation、Math；绘图能力缺口回 Core，输出事务由会话协调，绘制与作者入口分别由 Render 和 adapter 承担

- 全量与增量首轮共用执行器；Weave 保存 Core 实际阶段产物及复用依据，不维护简化的平行编译模型。非增量模式不保留 Weave，后续批次仅作用于增量模式的作者基础元素
