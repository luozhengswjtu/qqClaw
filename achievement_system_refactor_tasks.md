# QQClaw 成就系统改造任务列表

Document: achievement_system_refactor_tasks.md  
Version: v0.1  
Date: 2026-05-03  
Scope: apps/qq-lobster-v2 + apps/openclaw-api  
Goal: 先做简单稳定版，把显式新手引导改造成“对话提示 + 成就探索 + 宠物成长反馈”。

## 1. 改造背景

当前 Demo 已经完成 QQClaw 的基础闭环：QQ 主界面入口、领养小龙虾、私聊交互、群聊感知、工作记录、日记惊喜、龙虾空间等能力。现在的问题是，右侧面板仍然偏“新手任务清单 / 打卡系统”，用户会感觉是在按流程完成产品教程，而不是在自然地和一只 QQ 宠物一起成长。

本次改造先做简单版，不追求一次性完成复杂成就体系。核心是把“显式引导系统”降级为内部进度，把用户可见体验转为：

- 小龙虾每次回复后，消息下方出现 1-3 个轻量提示文本或快捷操作。
- 右侧面板从“今天先学会一件事”改为“小龙虾状态 + 成就墙 + 最近成长”。
- 第一次和小龙虾对话后，立即解锁第一个成就，并用明显动画让用户理解：和小龙虾互动会让它成长。
- 后续复杂能力继续通过成就、挂饰、隐藏项、兴趣技能来驱动探索。

## 2. 当前实际情况

### 2.1 前端已有结构

代码位置：

- `apps/qq-lobster-v2/src/data/mockData.ts`
- `apps/qq-lobster-v2/src/types/index.ts`
- `apps/qq-lobster-v2/src/store/useLobsterStore.ts`
- `apps/qq-lobster-v2/src/components/LobsterChatView.tsx`
- `apps/qq-lobster-v2/src/api/openclawClient.ts`

现状：

- `lobsterCheckIns` 已有 5 个新手打卡：
  - `first_lobster_chat`
  - `first_group_permission`
  - `first_view_work_log`
  - `first_space_post`
  - `first_space_comment`
- `lobsterRewards` 已有 5 个奖励：
  - `tiny-flag`
  - `shell-badge`
  - `logbook`
  - `space-banner`
  - `star-ornament`
- `mockAchievements` 当前为空数组。
- `Achievement` 类型目前只有 `id/title/description/unlockedAt`。
- `LobsterReward` 目前通过 `requiredCheckIns` 判断解锁。
- `useLobsterStore` 维护：
  - `currentCheckInId`
  - `completedCheckInIds`
  - `completeCheckIn`
  - `createGuideLine`
  - `getCheckInFeedback`
- 第一次聊天完成后，`sendLobsterChat` 会自动完成 `first_lobster_chat`，并追加一条引导消息。
- `LobsterChatView` 右侧面板已有“今天先学会一件事”“打卡进度”“奖励”等 UI。

### 2.2 OpenClaw API 已有结构

代码位置：

- `apps/openclaw-api/src/db.js`
- `apps/openclaw-api/src/server.js`

现状：

- 数据库已有 `checkins` 表。
- 数据库已有 `rewards` 表。
- 数据库已有 `achievements` 表。
- `completeCheckin(key)` 会：
  - 完成当前 checkin。
  - 激活下一个 checkin。
  - 调用 `unlockEligibleRewards`。
  - 奖励解锁时插入 `achievements`。
  - 写入 `work_logs`。
- API 已有：
  - `GET /api/bootstrap`
  - `POST /api/checkins/:key/complete`
  - adoption 返回 `checkins/rewards/achievements`
- 前端 `openclawClient.completeCheckIn` 已能调用该接口。

### 2.3 关键判断

不要第一步就删除 `checkins`。当前 `checkins` 同时承担了演示流程进度、奖励解锁、工作记录写入和 API 返回结构。如果直接删除，改动会过大。

简单版应采用“内部仍用 checkin，用户侧改成 achievement”的策略：

- 内部 trigger 暂时沿用 `checkins`。
- 用户界面不再展示“打卡”“当前任务”“新手流程”。
- `first_lobster_chat` 在 UI 上呈现为成就 `初次碰钳`。
- 后续再逐步把数据模型从 `checkin -> reward -> achievement` 调整成 `event -> achievement -> reward/accessory`。

## 3. 改造目标

### 3.1 用户体验目标

- 用户不再被一个固定新手任务面板推着走。
- 用户通过聊天和探索自然发现小龙虾能力。
- 第一次聊天后，用户明确看到“成就墙被点亮，小龙虾获得成长反馈”。
- 每次小龙虾输出后，底部提示让用户知道还能做什么，但不强迫用户按顺序完成。
- 成就系统成为用户探索 QQClaw 的主驱动力。

### 3.2 工程目标

- 简单版优先改前端体验，尽量复用已有 checkin/reward/API。
- 新增状态要能和 OpenClaw API 对接，API 不可用时有前端 fallback。
- 动画与成就解锁状态要可控，避免刷新后重复弹出。
- 任务拆分要方便逐步执行，每一步都有可验证结果。

## 4. 简单版范围

### 4.1 本轮要做

- 移除用户可见的新手打卡面板语义。
- 新增消息下方建议提示。
- 新增第一个成就 `初次碰钳`。
- 第一次聊天后展示显眼成就动画。
- 右侧面板展示小龙虾状态、成就墙预览、最近解锁奖励。
- 保留已有 OpenClaw checkin/reward 数据作为内部驱动。

### 4.2 本轮不做

- 不重构完整数据库模型。
- 不删除 `checkins` 表和 `/api/checkins/:key/complete`。
- 不做完整成就商城。
- 不做复杂 QQ 秀装扮系统。
- 不接入兴趣爱好技能体系。
- 不把所有能力都塞进 3 分钟 Demo。
- 不把 OpenClaw 的工具调用、审查日志直接暴露给普通用户。

## 5. 阶段 0：术语和数据映射

### Task 0.1 梳理命名映射

目标：让后续代码改造不混乱。

建议映射：

| 内部旧概念 | 用户侧新概念 | 说明 |
| --- | --- | --- |
| checkin | achievement trigger | 暂时作为触发器和进度来源 |
| first_lobster_chat | first_claw_touch | 用户侧成就名为“初次碰钳” |
| reward | accessory / badge / space deco | 用户侧称为挂饰、徽章、空间装饰 |
| currentCheckInId | nextSuggestedAction | 用户侧不显示“当前打卡” |
| createGuideLine | suggestion chips / soft hint | 不再追加强引导聊天消息 |

验收标准：

- 文档或代码注释中明确：`checkin` 是历史内部实现，不再作为用户可见产品术语。
- 后续 UI 文案中不出现“打卡”“新手打卡”“当前可打卡”。

### Task 0.2 设计简单成就目录

目标：先建立一个小而稳定的成就目录，覆盖当前已有能力。

建议首批成就：

| Achievement Key | 成就名 | 触发来源 | 奖励 |
| --- | --- | --- | --- |
| first_claw_touch | 初次碰钳 | first_lobster_chat | 小红旗挂饰 |
| first_group_signal | 捞到重点 | first_group_permission | 亮晶晶虾壳 |
| first_work_log | 透明小本本 | first_view_work_log | 透明工作簿 |
| first_space_post | 第一条虾动态 | first_space_post | 龙虾空间头图 |
| first_space_reply | 评论也会回 | first_space_comment | 星星挂饰 |

验收标准：

- 前端能拿到一份成就目录。
- 每个成就包含：key、title、description、status、reward、hidden、hint。
- 简单版允许目录先写在 `mockData.ts`，后续再由 OpenClaw API 返回。

## 6. 阶段 1：移除显式引导面板

### Task 1.1 改造右侧面板信息架构

目标：把右侧从任务面板改成宠物成长面板。

涉及文件：

- `apps/qq-lobster-v2/src/components/LobsterChatView.tsx`

当前需要替换的区域：

- “今天先学会一件事”
- 当前 `activeCheckIn` 卡片
- “打卡进度”
- 点状 checkin 进度条

新结构建议：

- 小龙虾状态区：
  - 头像 / 形象
  - 心情状态，例如“刚刚记住你说的话”
  - 当前佩戴挂饰
- 成就墙预览：
  - 3-5 个格子
  - 已解锁显示亮态
  - 未解锁显示灰态或“可探索”
  - 隐藏成就显示 `???`
- 最近成长：
  - 最近解锁：初次碰钳 / 小红旗挂饰
  - 最近做过：整理群聊、写工作记录、发空间动态
- 快捷入口：
  - 看成就墙
  - 看龙虾空间
  - 看工作记录

验收标准：

- 右侧面板不再像任务清单。
- 用户一眼能看到“我的小龙虾在成长”。
- 仍然保留进入群聊总结、工作记录、空间等核心能力的入口。

### Task 1.2 保留内部进度但隐藏顺序感

目标：当前 `currentCheckInId` 可以继续存在，但不要把它直接展示给用户。

涉及文件：

- `apps/qq-lobster-v2/src/store/useLobsterStore.ts`
- `apps/qq-lobster-v2/src/components/LobsterChatView.tsx`

实现建议：

- 保留 `completedCheckInIds`。
- 保留 `completeCheckIn(checkInId)`。
- UI 不直接渲染 `activeCheckIn.title/description`。
- `progressPercent` 如果还存在，只用于成就墙内部亮灯，不显示为“打卡进度”。

验收标准：

- 用户不会感到必须按 1/5、2/5 的流程推进。
- 已完成能力仍能解锁奖励和写入 OpenClaw。

## 7. 阶段 2：消息下方建议提示

### Task 2.1 新增消息建议类型

目标：每次小龙虾输出后，出现轻量提示，替代原来的引导消息。

涉及文件：

- `apps/qq-lobster-v2/src/types/index.ts`
- `apps/qq-lobster-v2/src/store/useLobsterStore.ts`
- `apps/qq-lobster-v2/src/components/LobsterChatView.tsx`

建议新增类型：

```ts
export interface LobsterSuggestion {
  id: string
  label: string
  action: 'send_message' | 'open_view' | 'run_capability'
  payload?: Record<string, unknown>
}
```

建议在 `LobsterChatLine` 上增加：

```ts
suggestions?: LobsterSuggestion[]
```

验收标准：

- 小龙虾消息可以携带 suggestions。
- 每条消息最多展示 3 个建议。
- 建议按钮点击后可以发送预设问题、打开工作记录、打开龙虾空间或触发已有能力。

### Task 2.2 设计建议生成规则

目标：建议要像“顺手提醒”，不是任务清单。

简单规则：

- 第一次聊天后：
  - 看看成就墙
  - 让小龙虾帮我捞群消息
  - 问问小龙虾今天能做什么
- 群聊总结后：
  - 跳回原群
  - 帮我写回复草稿
  - 记录这次工作
- 工作记录后：
  - 追问你刚刚做了什么
  - 生成一条龙虾空间动态
  - 看看权限范围
- 空间动态后：
  - 预览评论回复
  - 进入龙虾空间
  - 分享给好友
- 日记惊喜后：
  - 收进龙虾空间
  - 生成卡片
  - 看今天解锁了什么

验收标准：

- 建议文案短，不超过 12 个汉字为宜。
- 建议不使用“下一步”“必须”“完成任务”等强流程文案。
- 建议跟当前上下文有关，不固定刷同一组三个按钮。

### Task 2.3 停止自动追加强引导消息

目标：替换 `createGuideLine` 的用户可见效果。

当前现象：

- 完成 checkin 后，store 会追加一条小龙虾引导消息。

改造建议：

- 简单版先保留 `getCheckInFeedback` 函数，但不再直接 append 成聊天气泡。
- 将反馈内容压缩成 message suggestions 或轻 toast。
- 如果需要保留提示，放到刚刚完成动作的消息下方，而不是新发一条“教程式”聊天消息。

验收标准：

- 第一次聊天后不会再追加“下一步是...”的强引导气泡。
- 用户看到的是成就动画和轻量建议。

## 8. 阶段 3：第一个成就动画

### Task 3.1 定义首个成就

目标：第一个成就足够简单，用户只要和小龙虾对话就能解锁。

建议：

- 成就 Key：`first_claw_touch`
- 成就名：`初次碰钳`
- 触发：首次完成 `first_lobster_chat`
- 文案：`你和小龙虾完成了第一次对话，它开始记住你了。`
- 奖励：`小红旗挂饰`

验收标准：

- 第一次聊天完成后必定解锁。
- API 不可用时，前端 fallback 也能解锁并展示。

### Task 3.2 新增 AchievementMomentOverlay

目标：做一个显眼但不拖沓的成就达成动画。

涉及文件建议：

- `apps/qq-lobster-v2/src/components/AchievementMomentOverlay.tsx`
- 或先写在 `LobsterChatView.tsx` 内，稳定后再拆组件。

动画流程建议：

1. 小龙虾回复流式输出完成。
2. 页面中央浮出半透明成就卡。
3. 文案显示：`达成成就「初次碰钳」`。
4. 小红旗徽章从灰态点亮。
5. 光点飞向右侧成就墙第一个格子。
6. 右侧成就墙第一格亮起。
7. 小龙虾形象短暂弹跳或发光。
8. 消息下方出现建议：`看看成就墙`、`继续聊天`、`捞群消息`。

时长建议：

- 总时长 1.2-1.8 秒。
- 可点击关闭。
- 动画结束后自动收起，不阻塞用户继续操作。

验收标准：

- 成就动画明显到用户不会错过。
- 动画不会挡住页面超过 2 秒。
- 不影响聊天输入框继续使用。

### Task 3.3 防止动画重复播放

目标：刷新页面、重新进入 Demo 时不反复弹同一个成就动画。

简单版策略：

- 前端 store 增加 `seenAchievementMomentIds`。
- 第一次解锁 `first_claw_touch` 时加入待播放队列。
- 播放完成后标记 seen。
- 如果 API 已返回该 achievement 且本地 seen 也存在，则不再播放。

后续增强：

- OpenClaw 增加 `achievement_moments` 或在 `achievements` 上增加 `seen_at`。
- 由服务端返回 `newlyUnlockedAchievements`。

验收标准：

- 首次聊天播放一次。
- 同一浏览器会话中不会重复播放。
- 重新加载后是否重播要有明确策略；简单 Demo 可用 localStorage 记录。

## 9. 阶段 4：成就墙和奖励挂饰

### Task 4.1 新增成就墙预览

目标：让用户在右侧看到成就被点亮。

组件建议：

- `AchievementWallPreview`

展示规则：

- 已解锁：彩色图标、成就名、解锁时间。
- 未解锁：灰色图标、短提示。
- 隐藏成就：`???`，不显示触发条件。

简单版成就墙格子：

- 初次碰钳
- 捞到重点
- 透明小本本
- 第一条虾动态
- 评论也会回

验收标准：

- 第一次聊天后，第一个格子从灰态变亮。
- 点击成就墙可以打开详情弹层或右侧详情。
- 未解锁成就能刺激探索，但不压迫用户。

### Task 4.2 奖励挂饰和小龙虾形象联动

目标：成就不是纯文字，要影响小龙虾形象。

简单版：

- `tiny-flag` 解锁后，在小龙虾形象旁显示小红旗。
- `shell-badge` 解锁后，资料卡出现徽章。
- `logbook` 解锁后，右侧状态区出现小本本。
- `space-banner` 解锁后，龙虾空间头图变化。
- `star-ornament` 解锁后，小龙虾旁显示星星挂饰。

验收标准：

- 至少第一个奖励能在小龙虾形象区可视化。
- 奖励不是只出现在列表里。

## 10. 阶段 5：OpenClaw 对接增强

### Task 5.1 让 API 返回“本次新解锁”

目标：前端不靠猜测判断是否播放动画。

涉及文件：

- `apps/openclaw-api/src/db.js`
- `apps/openclaw-api/src/server.js`
- `apps/qq-lobster-v2/src/api/openclawClient.ts`

当前接口：

- `POST /api/checkins/:key/complete` 返回 `checkins/rewards/achievements`。

建议增强：

```json
{
  "checkins": [],
  "rewards": [],
  "achievements": [],
  "newlyUnlockedAchievements": [],
  "newlyUnlockedRewards": []
}
```

验收标准：

- 首次完成 `first_lobster_chat` 时，返回 `newlyUnlockedAchievements`。
- 重复完成同一 checkin 时，不返回新的 unlock。

### Task 5.2 建立事件到成就的中间层

目标：为后续兴趣爱好、工具调用、审查通过等成就做准备。

建议模型：

```ts
type AchievementEvent =
  | 'chat.first_message'
  | 'group.first_signal'
  | 'worklog.first_view'
  | 'space.first_post'
  | 'space.first_comment_reply'
  | 'interest.first_skill_enabled'
```

简单版做法：

- 先写一个映射函数，不必立刻改数据库。
- `first_lobster_chat -> chat.first_message -> first_claw_touch`
- 后续再扩展到兴趣系统。

验收标准：

- 新增成就不需要继续堆 `nextByKey` 顺序链。
- 后续兴趣成就可以按事件触发，而不是被新手流程绑定。

### Task 5.3 持久化成就已展示状态

目标：避免不同页面、刷新、重新进入时重复播放大动画。

方案：

- 简单版：前端 localStorage。
- 稳定版：OpenClaw `achievements` 表增加 `seen_at` 或新增 `achievement_moments` 表。

验收标准：

- 同一成就的大动画只展示一次。
- 后续仍可在成就墙查看成就详情。

## 11. 阶段 6：质量校验和演示验证

### Task 6.1 文案扫描

目标：确认用户侧不再出现旧引导系统语言。

需要搜索：

- `打卡`
- `新手打卡`
- `当前可打卡`
- `今天先学会一件事`
- `下一步是`

验收标准：

- 用户可见 UI 不出现上述旧文案。
- 内部变量和历史接口可以暂时保留。

### Task 6.2 前端验证

命令：

```powershell
cd apps/qq-lobster-v2
npm run lint
npm run build
```

手动验证路径：

1. 打开 QQ 主界面。
2. 触发小龙虾入口。
3. 完成领养。
4. 给小龙虾发送第一句话。
5. 等待流式输出结束。
6. 看到 `初次碰钳` 成就动画。
7. 右侧成就墙第一格点亮。
8. 小龙虾形象出现小红旗或发光反馈。
9. 消息下方出现建议提示。
10. 刷新后确认动画不重复播放，或符合当前约定。

### Task 6.3 API 验证

命令：

```powershell
cd apps/openclaw-api
npm run smoke
```

如改了 API，需要额外验证：

- `POST /api/checkins/first_lobster_chat/complete`
- 首次调用返回新解锁。
- 重复调用不重复插入 achievement。
- work log 正常写入。
- API 不可用时前端 fallback 仍能完成首个成就展示。

## 12. 风险和降级策略

### 12.1 风险：直接删 checkin 造成连锁问题

处理：

- 第一版不删。
- 先做 UI 语义转换。
- 后续等成就事件层稳定后再迁移。

### 12.2 风险：动画过强影响聊天效率

处理：

- 只有第一个成就使用完整大动画。
- 后续成就使用 toast、小光点、右侧墙点亮即可。
- 所有动画可跳过或自动结束。

### 12.3 风险：建议提示又变成任务清单

处理：

- 每次最多 3 个。
- 文案使用“可以试试”“要不要看看”这类轻提示。
- 不显示 `1/5`、`下一步`、`必须完成`。

### 12.4 风险：API 和前端状态不一致

处理：

- 前端保留 fallback。
- API 返回完整 `achievements/rewards`。
- 前端以服务端为准合并状态，但动画播放由 `newlyUnlocked` 或本地首次判断控制。

## 13. 推荐执行顺序

1. 先新增成就目录和首个成就映射，不改 UI。
2. 改右侧面板，隐藏打卡任务语义。
3. 给小龙虾消息增加 suggestions。
4. 停止 `createGuideLine` 自动追加强引导气泡。
5. 实现 `初次碰钳` 成就动画。
6. 实现成就墙第一格点亮和小红旗挂饰。
7. 验证前端 lint/build。
8. 再考虑 API 返回 `newlyUnlockedAchievements`。
9. 最后整理说明文档和录屏脚本中的成就系统表达。

## 14. 最小可交付版本

如果只做一个最小版本，完成下面 5 件事即可：

- 右侧面板不再展示打卡任务。
- 第一次聊天后解锁 `初次碰钳`。
- 播放一个明显成就达成动画。
- 成就墙第一格点亮。
- 小龙虾消息下方出现 2-3 个建议提示。

这个版本已经能表达核心变化：QQClaw 不再是流程教程，而是一只会因为用户互动而成长、会用成就鼓励探索的 QQ AI 宠物。

## 15. 后续和兴趣系统的关系

本次改造是兴趣系统之前的底座调整。兴趣爱好后续不应该只是资料字段，而应通过 OpenClaw skill 触发新的成就和成长反馈。

后续可扩展的兴趣成就示例：

- 第一次开启兴趣技能。
- 第一次收到音乐会提醒。
- 第一次让小龙虾追踪 QQ 音乐歌手动态。
- 第一次让小龙虾发布兴趣相关龙虾空间动态。
- 第一次通过兴趣推荐发现新 QQ 群或社区。

因此，当前阶段不要把成就系统写死成“新手流程完成度”。它应该逐渐成为 QQClaw 的探索、陪伴、兴趣成长和社交传播的统一反馈层。
