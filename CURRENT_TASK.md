# QQClaw 当前实现入口

更新时间：2026-05-05

## 当前唯一主线

当前实现以根目录文档：

- `demo_showcase_flow_refactor_tasks.md`

作为唯一主线任务。

如果其他文档、旧 PRD、旧阶段计划、历史讨论与该文档冲突，全部以 `demo_showcase_flow_refactor_tasks.md` 为准。

## 当前目标

把 Demo 从“功能集合演示”改造成：

```text
认领关系建立
-> 自然聊天
-> QQ 音乐授权和技能安装
-> 成就墙探索
-> 群聊总结和空间社交
-> 日记和推送
```

核心原则：

- Demo 展示流程优先。
- 如果现有实现阻挡展示流程，可以重排、删减或优化旧逻辑。
- 不继续按旧打卡流程推进。
- 不以旧 PRD 或旧阶段计划覆盖当前展示流程。

## 支持参考

子系统任务文档已归档到 `docs/current/supporting/`，只在实现对应模块时参考：

- `achievement_system_refactor_tasks.md`
- `interest_system_refactor_tasks.md`
- `share_target_system_tasks.md`

项目状态和历史阶段文档已归档到 `docs/archive/project-state/`，只用于了解历史：

- `implementation_state.md`
- `stage_plan.md`
- `handoff_notes.md`
- `stage_1_5_execution_notes.md`

讨论总结已归档到 `docs/archive/discussions/`，只作为产品思考背景：

- `interest_system_discussion.md`

## 执行提醒

实现前先阅读：

1. `AGENTS.md`
2. `CURRENT_TASK.md`
3. `demo_showcase_flow_refactor_tasks.md`

除非用户明确要求，否则不要从旧 PRD 或历史阶段计划重新推导实现顺序。
