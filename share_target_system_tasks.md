# QQClaw 分享目标系统任务清单

Document: share_target_system_tasks.md  
Version: v0.1  
Date: 2026-05-04  
Scope: apps/qq-lobster-v2 + apps/openclaw-api  
Goal: 做一个最小可用的“分享目标系统”，让日记卡片、成就卡片、龙虾空间动态和兴趣卡片可以选择好友或群聊进行分享，并保留 Demo 安全边界。

## 1. 背景

当前 QQClaw 已经具备龙虾空间、动态、点赞、评论、评论回复草稿、日记、成就和兴趣动态能力。空间动态已有 `shareCount`，前端 store 也已有 `shareSpacePost(postId)`，后端 `recordSpaceInteraction(input)` 支持 `type: 'share'`。

但当前分享还只是“空间动态分享计数”：

- 没有分享目标列表。
- 没有好友 / 群聊选择。
- 没有分享预览面板。
- 没有附言。
- 没有分享记录。
- 没有分享后的好友反馈模拟。
- 日记卡片、成就卡片、兴趣卡片还没有统一分享入口。

本任务只做“分享目标系统”，不做完整好友系统。

## 2. 当前实际情况

### 2.1 前端已有基础

相关文件：

- `apps/qq-lobster-v2/src/types/index.ts`
- `apps/qq-lobster-v2/src/data/mockData.ts`
- `apps/qq-lobster-v2/src/store/useLobsterStore.ts`
- `apps/qq-lobster-v2/src/components/LobsterChatView.tsx`
- `apps/qq-lobster-v2/src/api/openclawClient.ts`

已有内容：

- `QQConversation` 已能表示 direct / group。
- `conversations` 已有模拟群聊和会话。
- `LobsterDiaryEntry` 已有日记数据。
- `LobsterSpacePost` 已有 `likeCount/commentCount/shareCount/comments`。
- `LobsterSpaceComment` 已有 `friend`、`friend_lobster` 类型。
- `shareSpacePost(postId)` 已存在。
- `openclawClient.recordSpaceInteraction` 已支持 `type: 'like' | 'share'`。
- `LobsterChatView` 已能展示空间动态分享计数和“分享”操作。

缺口：

- 没有 `ShareTarget`。
- 没有 `ShareRecord`。
- 没有 share drawer / modal。
- 没有选择好友或群聊。
- 没有针对日记、成就、兴趣卡片的统一分享 payload。

### 2.2 OpenClaw API 已有基础

相关文件：

- `apps/openclaw-api/src/db.js`
- `apps/openclaw-api/src/server.js`

已有内容：

- `space_interactions` 表可记录 `like/share`。
- `recordSpaceInteraction(input)` 支持 `share`。
- `detail_json` 可以暂时保存分享 detail。
- `writeWorkLog('space-interaction', ...)` 已记录空间互动。
- review policy 中已有“分享前脱敏”相关规则。

缺口：

- 没有 `share_targets`。
- 没有 `share_records`。
- 没有 `/api/share/targets`。
- 没有 `/api/share/records`。
- 没有分享 payload 的统一审查和记录。

## 3. 产品范围

### 3.1 要做

- Mock 分享目标列表。
- 分享预览面板。
- 支持选择好友或群聊。
- 支持编辑一句附言。
- 支持分享以下内容：
  - 日记卡片。
  - 成就卡片。
  - 龙虾空间动态。
  - 兴趣提醒卡。
  - 兴趣社群推荐卡。
- 分享成功后写入分享记录。
- 分享成功后展示轻反馈。
- 分享动作不真实发送 QQ 消息。

### 3.2 不做

- 不做真实 QQ 好友关系。
- 不做真实 QQ 消息发送。
- 不做好友聊天页。
- 不做多用户登录。
- 不做完整好友资料系统。
- 不做真实群聊转发。
- 不允许小龙虾自动替用户分享。

## 4. 阶段 1：数据模型

### Task 1.1 新增分享目标类型

涉及文件：

- `apps/qq-lobster-v2/src/types/index.ts`

建议新增：

```ts
export interface ShareTarget {
  id: string
  type: 'friend' | 'group'
  name: string
  avatar: string
  subtitle: string
}
```

验收标准：

- 能表示 QQ 好友。
- 能表示 QQ 群聊。
- 不包含真实隐私字段。

### Task 1.2 新增分享 payload 类型

涉及文件：

- `apps/qq-lobster-v2/src/types/index.ts`

建议新增：

```ts
export type SharePayloadType =
  | 'diary'
  | 'achievement'
  | 'space_post'
  | 'interest_reminder'
  | 'interest_community'

export interface SharePayload {
  id: string
  type: SharePayloadType
  title: string
  summary: string
  previewText: string
  sourceId: string
  sourceLabel: string
  thumbnailUrl?: string
  riskNote: string
}
```

验收标准：

- 日记、成就、空间动态、兴趣卡都可以被转换成统一 payload。
- payload 不直接包含过长原文。
- payload 包含来源和风险提示。

### Task 1.3 新增分享记录类型

涉及文件：

- `apps/qq-lobster-v2/src/types/index.ts`

建议新增：

```ts
export interface ShareRecord {
  id: string
  payloadType: SharePayloadType
  payloadId: string
  targetId: string
  targetType: 'friend' | 'group'
  targetName: string
  message: string
  status: 'previewed' | 'sent_mock' | 'cancelled'
  createdAt: string
}
```

验收标准：

- 分享记录能用于工作记录。
- 分享记录能用于成就触发。
- 分享记录能用于 Demo 中展示“已分享给谁”。

## 5. 阶段 2：Mock 数据

### Task 2.1 新增分享目标 seed

涉及文件：

- `apps/qq-lobster-v2/src/data/mockData.ts`

建议新增：

```ts
export const shareTargets: ShareTarget[] = [
  {
    id: 'friend-ahang',
    type: 'friend',
    name: '阿航',
    avatar: '航',
    subtitle: '经常一起做课设',
  },
  {
    id: 'friend-xiaozhou',
    type: 'friend',
    name: '小周',
    avatar: '周',
    subtitle: '音乐同好',
  },
  {
    id: 'group-se-course',
    type: 'group',
    name: '软件工程课设群',
    avatar: '课',
    subtitle: '群聊 · 63 人',
  },
  {
    id: 'group-ai-camp',
    type: 'group',
    name: 'AI 创作营 - 小组 7',
    avatar: 'AI',
    subtitle: '群聊 · 18 人',
  },
]
```

验收标准：

- 至少 2 个好友、2 个群聊。
- 目标看起来像 QQ 生态里的真实分享目标。
- 数据是 mock，不接真实 QQ。

### Task 2.2 新增分享反馈 seed

目标：分享后可以出现一个轻反馈，强化社交传播。

建议反馈：

- `阿航：这只虾还能写日记？我也想试试。`
- `小周：这个音乐动态有点像你会发的，虾挺懂。`
- `软件工程课设群：已生成 Demo 分享预览，未真实发送。`

验收标准：

- 反馈只用于 Demo。
- 不模拟复杂好友聊天。
- 不让用户误以为真实发送。

## 6. 阶段 3：前端状态和动作

### Task 3.1 Store 增加分享状态

涉及文件：

- `apps/qq-lobster-v2/src/store/useLobsterStore.ts`

建议新增 state：

```ts
shareTargets: ShareTarget[]
shareRecords: ShareRecord[]
activeSharePayload: SharePayload | null
sharePanelOpen: boolean
shareFeedback: string | null
```

建议新增 actions：

```ts
openSharePanel(payload: SharePayload): void
closeSharePanel(): void
sendMockShare(targetId: string, message: string): Promise<void>
```

验收标准：

- 点击分享能打开分享面板。
- 关闭分享面板不会改变原内容。
- 分享成功后写入本地 `shareRecords`。

### Task 3.2 复用现有 shareSpacePost

当前 `shareSpacePost(postId)` 会直接增加空间动态的 `shareCount`，并调用 `recordSpaceInteraction({ type: 'share' })`。

改造建议：

- 不再让空间动态“分享”按钮直接调用 `shareSpacePost`。
- 改为打开分享面板。
- 用户选择目标并确认后，再调用 `sendMockShare`。
- 对 `space_post` payload，`sendMockShare` 内部再调用现有 `shareSpacePost(postId)` 或 `recordSpaceInteraction`。

验收标准：

- 空间动态分享计数仍然能增加。
- 分享计数增加发生在用户确认目标之后。
- API 失败时保留本地 optimistic fallback。

### Task 3.3 分享记录写入工作记录

简单版：

- 前端本地加入一条小龙虾聊天提示。
- 后端增强后写入 OpenClaw `work_logs`。

建议工作记录标题：

```text
Share preview sent to mock target
```

detail：

- payloadType。
- payloadId。
- targetId。
- targetType。
- targetName。
- demoOnly: true。

验收标准：

- 用户问“小龙虾今天做了什么”时，可以看到分享行为。
- 明确是 Demo 模拟分享，不是真实发送。

## 7. 阶段 4：分享面板 UI

### Task 4.1 新增 SharePanel 组件

涉及文件：

- `apps/qq-lobster-v2/src/components/LobsterChatView.tsx`
- 或新增 `apps/qq-lobster-v2/src/components/SharePanel.tsx`

结构：

- 顶部：`分享给好友或群聊`
- 预览区：
  - 卡片标题。
  - 摘要。
  - 来源。
  - 风险提示。
- 目标列表：
  - 好友。
  - 群聊。
- 附言输入：
  - 默认文案根据 payload 类型生成。
- 操作：
  - 取消。
  - 发送预览。

固定提示：

```text
Demo 只生成分享预览，不会真实发送 QQ 消息。
```

验收标准：

- 分享面板不会像完整好友系统。
- 用户能快速选择目标。
- 用户能看到分享内容预览。
- 用户明确知道不会真实发送。

### Task 4.2 分享成功反馈

分享成功后展示：

- toast 或聊天轻提示。
- 目标名。
- 模拟反馈。

示例：

```text
已生成给阿航的分享预览。Demo 不会真实发送 QQ 消息。
阿航：这只虾还能写日记？我也想试试。
```

验收标准：

- 反馈能体现社交传播。
- 不跳转到完整好友聊天页。
- 不制造真实发送误解。

## 8. 阶段 5：接入各类卡片

### Task 5.1 日记卡片分享

涉及组件：

- `DiaryCard`

接入方式：

- 在日记卡片上新增 `分享` 按钮。
- 点击后生成 `SharePayload(type: 'diary')`。

payload 建议：

- title: 日记标题。
- summary: 日记 quote。
- previewText: 日记摘要，不放全文。
- sourceLabel: 小龙虾日记。
- riskNote: 分享前已做 Demo 脱敏预览。

验收标准：

- 日记能被分享到好友或群聊。
- 不默认分享全文。
- 如果日记有图片，优先展示图片缩略预览。

### Task 5.2 成就卡片分享

涉及组件：

- 成就墙 / 右侧成就详情。
- Achievement moment overlay 后续按钮。

接入方式：

- 已解锁成就详情增加 `分享`。
- 第一个成就动画结束后可以出现 `分享成就` 建议。

payload 建议：

- title: 成就名。
- summary: 成就描述。
- previewText: `我的小龙虾刚点亮了「初次碰钳」。`
- sourceLabel: QQClaw 成就墙。

验收标准：

- 只能分享已解锁成就。
- 隐藏未解锁成就不能分享。

### Task 5.3 龙虾空间动态分享

涉及组件：

- Space post card。
- Lobster space view。

接入方式：

- 现有“分享”按钮改为打开 SharePanel。
- 分享成功后更新 `shareCount`。

验收标准：

- 空间动态可转发给好友或群聊。
- 分享成功后空间动态分享数增加。
- 保留点赞、评论、评论回复草稿逻辑。

### Task 5.4 兴趣卡片分享

涉及：

- 音乐提醒卡。
- 兴趣社群推荐卡。

规则：

- 音乐提醒卡可分享给好友。
- 兴趣社群推荐卡可分享，但必须保留“公开资料”说明。
- 不分享未授权来源的内部细节。

验收标准：

- 兴趣卡片分享不会泄露来源隐私。
- 社群推荐卡仍然强调只基于公开资料。

## 9. 阶段 6：OpenClaw API 增强

### Task 6.1 新增 share_records 表

涉及文件：

- `apps/openclaw-api/src/db.js`

建议表：

```sql
CREATE TABLE IF NOT EXISTS share_records (
  id TEXT PRIMARY KEY,
  payload_type TEXT NOT NULL,
  payload_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  demo_only INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
```

验收标准：

- 分享记录可持久化。
- 不存真实 QQ 标识。
- 可被 work log 引用。

### Task 6.2 新增分享 API

建议接口：

- `GET /api/share/targets`
- `GET /api/share/records`
- `POST /api/share/records`

`POST /api/share/records` 输入：

```json
{
  "payloadType": "diary",
  "payloadId": "diary-1",
  "targetId": "friend-ahang",
  "targetType": "friend",
  "targetName": "阿航",
  "message": "这篇虾写得还挺像我。"
}
```

返回：

```json
{
  "record": {},
  "feedback": "阿航：这只虾还能写日记？我也想试试。"
}
```

验收标准：

- API 明确 demoOnly。
- 写入 work log。
- 写入 event。
- 高风险 payload 可进入 review。

### Task 6.3 和 space interaction 合并

空间动态分享时：

- 写入 `share_records`。
- 同时调用或内部复用 `recordSpaceInteraction({ type: 'share' })`。
- `spacePosts.shareCount` 正常更新。

验收标准：

- 空间动态分享数和分享记录一致。
- 其他 payload 分享不影响空间动态 shareCount。

## 10. 阶段 7：权限和安全

### Task 7.1 分享前脱敏

规则：

- 日记不默认分享全文。
- 群聊总结不分享完整群消息。
- 兴趣社群推荐只分享公开资料。
- 音乐提醒不分享未授权账号细节。
- 分享面板必须显示 Demo 不真实发送。

验收标准：

- 任何分享 payload 都有 `riskNote`。
- 所有分享必须用户点击确认。
- 小龙虾不能自动分享。

### Task 7.2 分享目标边界

规则：

- 分享目标来自 mock seed。
- 不读取真实 QQ 好友。
- 不真实发送 QQ 消息。
- 不模拟对方真实在线状态。
- 反馈文案必须是 Demo mock。

验收标准：

- UI 文案不让用户误解为真实发送。
- 说明文档能解释这是 Demo 分享目标系统。

## 11. 阶段 8：成就和传播闭环

### Task 8.1 新增分享成就

建议成就：

- `first_diary_share`：第一次分享小龙虾日记。
- `first_space_share`：第一次分享龙虾空间动态。
- `first_interest_share`：第一次分享兴趣提醒。
- `seeded_friend`：好友看完后也想试试。

验收标准：

- 分享行为能点亮成就。
- 成就不要过多，只做 1-2 个 Demo 可见项。

### Task 8.2 分享后的社交反馈

分享后可触发：

- mock 好友反馈。
- 龙虾空间访问提示。
- 小龙虾回复一句传播感文案。

示例：

```text
阿航看到了你的日记分享，回了一句：“这只虾还能写日记？我也想试试。”
```

验收标准：

- 体现“好友看到了觉得不错，自己也想试试”。
- 不把好友评论错误地放到分享卡片下面。好友评论主要仍发生在龙虾空间动态下。

## 12. 最小可交付版本

只做最小版本时，完成：

- 新增 `ShareTarget`、`SharePayload`、`ShareRecord` 类型。
- 新增 2 个好友、2 个群聊 mock 分享目标。
- 新增 SharePanel。
- 日记卡片可分享。
- 龙虾空间动态可分享，并更新 `shareCount`。
- 分享成功后展示 mock 反馈。
- 明确 Demo 不真实发送。

这个版本就足够支撑 Demo 的社交传播表达。

## 13. 测试计划

### 13.1 前端验证

命令：

```powershell
cd apps/qq-lobster-v2
npm run lint
npm run build
```

手动路径：

1. 打开小龙虾聊天。
2. 查看日记卡片。
3. 点击分享。
4. 选择阿航。
5. 编辑附言。
6. 点击发送预览。
7. 看到分享成功提示和 mock 好友反馈。
8. 打开龙虾空间动态。
9. 点击分享。
10. 选择群聊。
11. 确认空间动态 `shareCount` 增加。

### 13.2 API 验证

命令：

```powershell
cd apps/openclaw-api
npm run smoke
```

如果实现 API：

- `GET /api/share/targets` 返回 mock targets。
- `POST /api/share/records` 写入记录。
- 分享空间动态时 `space_interactions` 同步增加。
- `GET /api/work-logs` 能看到分享记录。

### 13.3 文案扫描

必须包含或等价表达：

- `Demo 不会真实发送 QQ 消息`
- `分享预览`
- `用户确认后分享`

必须避免：

- `已真实发送`
- `对方已收到`
- `自动分享`
- `自动转发`
- `读取真实好友`
