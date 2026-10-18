# @retikz/reconciler 工作指南

全仓规则见根 [AGENTS.md](../../../AGENTS.md)，Kernel 分组规则见 [AGENTS.md](../AGENTS.md)。当前包仅有空入口，以下为已确定的职责边界。

- **解决的问题**：跨次复用 Core 编译结果，支持局部输入变化与依赖失效
- **拥有的契约**：Core 增量接线、编译树、跨次缓存与身份关联、依赖响应、运行时快照及 Scene Patch
- **不拥有的能力**：Core 绘图语义与几何算法、Runtime 通用事务、后端绘制、框架 authoring 与领域算法
- **输入与输出**：接收 Core 输入、编译选项及更新信息，输出与 Runtime revision 一致的编译结果和更新产物；具体 API 待设计
- **依赖与缺口流向**：单向依赖 Core、Runtime、Foundation；绘图能力缺口回 Core，通用事务能力回 Runtime，绘制与作者入口分别由 Render 和 adapter 承担
