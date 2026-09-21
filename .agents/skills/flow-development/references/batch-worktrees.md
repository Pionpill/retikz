# 批量 worktree

只在用户明确要求并批准布局、base、文件所有权、并发与 Git 操作后执行。Alpha 每条 ADR 先完成设计和 Plan Gate，Beta 先取得 milestone 入口审计与 TODO 授权。

1. 按全部任务的文件/产物依赖决定平行、堆叠或混合布局；共享写入不并发。
2. 确认布局后创建 worktree/分支，复制各自 ignored plan，并校验内容 hash。
3. Alpha 单 worktree 执行实现、自测、文档，Beta 执行 TODO 实现、评估和收尾；记录 TASK_STATE/REVIEW 后停在约定集成点。
4. 单 worktree 不擅自 push、merge、切回 base、删除 worktree 或报告。commit 仍按计划授权和范围。
5. 全部分支经人工 review/合并后，统一做 Alpha 契约收尾或 Beta milestone 出口审计；合并本身仍需授权。

并发和模型由已授权计划与 codex-develop-flow 决定；失败 worktree 更新事实和恢复步骤，不伪装完成。
