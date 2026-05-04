# QQClaw 兴趣爱好系统改造任务列表

Document: interest_system_refactor_tasks.md  
Version: v0.1  
Date: 2026-05-04  
Scope: apps/qq-lobster-v2 + apps/openclaw-api  
Goal: 把“兴趣爱好”从领养时的静态标签，升级成 QQClaw 的长期记忆、主动感知、同好陪伴、社交机会发现和宠物成长来源。

## 1. 改造背景

当前 QQClaw 已经具备 QQ 主界面入口、认养、私聊、群聊感知、工作记录、日记惊喜、龙虾空间、成就奖励和 OpenClaw API 基础。兴趣爱好目前仍然偏静态：用户在认养时选择兴趣，小龙虾资料里保存这些标签，但兴趣没有真正进入主动服务、聊天共鸣、技能配置、空间动态和成就成长。

本次改造的核心判断：

> 兴趣爱好不是资料标签，而是 QQClaw 持续理解用户、主动提醒用户、陪用户表达、帮用户发现同好的生活线索。

产品目标不是做一个资讯推荐器，而是做一只“被用户养出兴趣人格”的 QQ AI 宠物。它既有助手属性，也有宠物属性：

- 助手属性：主动关注用户关心的内容、活动、赛事、歌手、社群机会，并说明来源。
- 宠物属性：用同好语气陪用户聊兴趣，把兴趣转化成日记、空间动态、成就和挂饰。

## 2. 当前实际情况

### 2.1 前端现状

代码位置：

- `apps/qq-lobster-v2/src/types/index.ts`
- `apps/qq-lobster-v2/src/data/mockData.ts`
- `apps/qq-lobster-v2/src/store/useLobsterStore.ts`
- `apps/qq-lobster-v2/src/components/LobsterChatView.tsx`

当前 `Interest` 类型：

- `ai_tools`
- `course_project`
- `game_group`
- `campus_event`
- `memes`

当前 `interestOptions`：

- AI 工具
- 课程项目
- 游戏社群
- 校园活动
- 表情包

当前 `LobsterProfile` 已有：

- `interests: Interest[]`

当前认养流程已有：

- `AdoptionDraft.interests`
- `toggleInterest`
- `completeAdoption`
- 认养完成后把兴趣写入 `lobsterProfile.interests`
- 调用 `openclawClient.saveAdoption(adoptionPayload)`

当前缺口：

- 兴趣只是标签，没有兴趣画像细节。
- 没有兴趣来源授权。
- 没有兴趣 skill。
- 没有兴趣提醒卡。
- 没有兴趣社群推荐。
- 没有兴趣相关成就、挂饰、空间动态。
- 聊天回复没有稳定引用兴趣记忆。

### 2.2 OpenClaw API 现状

代码位置：

- `apps/openclaw-api/src/db.js`
- `apps/openclaw-api/src/server.js`
- `apps/openclaw-api/src/aiAdapter.js`

当前基础：

- `lobsters` 表里已有 `interests_json`。
- `saveAdoption(input)` 会保存 `input.interests`。
- 已有 `memories` 机制。
- 已有 `capabilities` 机制。
- 已有 `tools`、`tool_runs`、`review_results`、`work_logs`。
- 已有 `resolveCapability(input)` 基于 triggers 匹配能力。
- 当前已有能力包括：
  - `private_chat`
  - `summarize_group`
  - `generate_reply_draft`
  - `generate_work_log`
  - `generate_diary`
  - `generate_space_post_preview`

当前缺口：

- 没有 `interest_profile` 表或结构化 memory。
- 没有兴趣相关 capability。
- 没有兴趣相关 tool。
- 没有兴趣数据源、关注规则、提醒频率。
- 没有兴趣内容审查策略。
- 没有“未加入群只看公开资料”的约束实现。

## 3. 产品原则

### 3.1 兴趣不是标签，而是长期记忆

用户选择“音乐”后，系统不应只保存 `music`。它还应逐步沉淀：

- 喜欢的歌手。
- 喜欢的曲风。
- 所在城市。
- 是否关注演唱会。
- 是否愿意接收新歌提醒。
- 用户不想看的内容。
- 小龙虾表达时应该像什么类型的同好。

### 3.2 主动感知，但不过度打扰

QQClaw 的价值是“授权后的主动感知”。它不是等用户手动问，而是在用户设定范围内主动关注兴趣相关内容。

但它不能变成广告流：

- 只提醒重要内容。
- 可设置频率。
- 可解释为什么提醒。
- 可关闭某类提醒。
- 可查看来源。

### 3.3 未授权不窥探

兴趣社群推荐必须严格区分公开信息和授权信息。

规则：

- 未加入群：只能使用公开群资料、群名、标签、简介、入群要求、公开公告。
- 已加入且授权群：才能总结群内消息。
- 不自动加群。
- 不自动发入群申请。
- 不替用户判断“靠不靠谱”。
- 不暗示小龙虾看到了未授权群里的聊天。

推荐卡简洁文案采用：

```text
我发现一个可能适合你的羽毛球群：深圳南山周末羽毛球搭子群。
公开资料显示：周末约球、固定场地、新手友好。
和你之前说的“想找固定搭子”比较接近。
```

### 3.4 兴趣要进入宠物成长

兴趣系统的结果不只是一张提醒卡，还要影响：

- 小龙虾说话方式。
- 小龙虾日记素材。
- 龙虾空间动态。
- 成就墙。
- 挂饰和装扮。
- 用户分享和好友被种草。

## 4. 总体数据流

建议目标链路：

```text
用户兴趣选择 / 聊天补充 / 腾讯生态授权
  -> 兴趣画像 memory
  -> OpenClaw interest capability
  -> interest tools 主动感知
  -> review policy 权限和风险审查
  -> 兴趣提醒卡 / 社群推荐卡 / 聊天回复
  -> 工作记录
  -> 日记素材 / 龙虾空间动态
  -> 成就和挂饰
```

## 5. 阶段 0：范围收敛

### Task 0.1 确定首个 Demo 兴趣纵深

建议第一版不要同时做太多兴趣。优先选一个纵深样例，再预留通用框架。

推荐首个纵深样例：音乐。

原因：

- 能自然连接腾讯生态：QQ 音乐。
- 用户数据更细：歌手、歌曲、歌单、曲风、演唱会。
- 适合陪伴聊天。
- 适合龙虾空间动态。
- 适合成就和挂饰。

同时保留“兴趣社群推荐”能力，社群推荐可以用羽毛球 mock 卡做演示样例，因为它能清楚体现 QQ 的社交生态。

验收标准：

- 文档和代码中明确：第一版主打音乐兴趣纵深，社群推荐作为兴趣系统通用能力。
- 不在第一版塞满所有兴趣类型。

### Task 0.2 明确不做范围

第一版不做：

- 不接真实 QQ 音乐 API。
- 不真实搜索 QQ 群。
- 不自动加群。
- 不自动发动态。
- 不自动替用户评论或申请加入。
- 不做复杂多兴趣调度。
- 不做完整推荐算法。

验收标准：

- Demo 数据均为 mock。
- 所有高风险动作都是预览或用户确认。

### Task 0.5 明确兴趣画像来源规则

目标：先把“兴趣画像从哪里来”定死，避免后续实现让人感觉 QQClaw 凭空生成用户信息。

正式产品中，兴趣画像只能来自以下来源：

- 用户在认养时主动选择的兴趣。
- 用户在聊天中主动补充的偏好。
- 用户明确授权的腾讯生态数据，例如 QQ 音乐。
- 用户主动设置的城市、频率、关键词、屏蔽项。
- 用户使用过程中的明确反馈，例如收藏、忽略、关闭提醒。

允许小龙虾做轻量推断，但推断结果必须：

- 可解释。
- 可查看。
- 可修改。
- 可删除。
- 不作为事实强行写入。

Demo 中可以预置初始兴趣画像，但语义必须是：

> 这是一组“用户已经选择、已经表达、已经授权或已经设置过”的模拟状态，不是系统凭空生成的用户画像。

验收标准：

- 所有 Demo seed 兴趣画像都带来源字段。
- 兴趣提醒卡能说明“为什么知道”和“来自哪里”。
- 文案不暗示小龙虾天然知道用户隐私。

## 6. 阶段 1：兴趣类型和画像结构

### Task 1.1 扩展 Interest 类型

涉及文件：

- `apps/qq-lobster-v2/src/types/index.ts`
- `apps/qq-lobster-v2/src/data/mockData.ts`

建议新增兴趣：

```ts
export type Interest =
  | 'ai_tools'
  | 'course_project'
  | 'game_group'
  | 'campus_event'
  | 'memes'
  | 'music'
  | 'badminton'
  | 'anime'
```

对应 `interestOptions`：

- 音乐
- 羽毛球
- 二次元

验收标准：

- 认养页可以选择新增兴趣。
- 旧兴趣不受影响。
- 默认兴趣仍可 fallback 到 `ai_tools`。

### Task 1.2 新增兴趣画像类型

涉及文件：

- `apps/qq-lobster-v2/src/types/index.ts`

建议新增：

```ts
export interface InterestProfile {
  id: string
  interest: Interest
  enabled: boolean
  topics: string[]
  city?: string
  sources: InterestSource[]
  reminderFrequency: 'important_only' | 'daily_digest' | 'weekly_digest' | 'off'
  tone: 'same_interest_friend' | 'brief_assistant'
  mutedTopics: string[]
  updatedAt: string
}

export interface InterestSource {
  id: string
  type: 'mock' | 'qq_music' | 'public_group_profile' | 'website' | 'event_platform'
  title: string
  authorized: boolean
  permissionNote: string
  evidenceText?: string
}
```

验收标准：

- 前端能表达“兴趣标签”和“兴趣画像”的区别。
- 兴趣画像支持来源、频率、城市、关键词。
- 兴趣画像支持记录来源证据，避免像凭空生成。

### Task 1.3 设计 Demo 用初始兴趣画像种子数据

涉及文件：

- `apps/qq-lobster-v2/src/data/mockData.ts`

目标：为 Demo 提供一组可演示的兴趣画像上下文。它代表“用户已经选择、表达、授权或设置过”的模拟状态，不代表正式产品会直接生成用户信息。

种子数据要求：

- 每条画像必须带 `sourceType` 或 `sources.type`。
- 每条画像必须带 `sourceLabel` 或 `sources.title`。
- 每条画像必须带 `evidenceText`，说明它来自哪次选择、聊天、授权或设置。
- 授权类数据必须带 `authorized: true`。
- 公开资料类数据必须带 `authorized: false`，并明确只能读取公开资料。

建议 seed：

音乐画像：

- interest: `music`
- topics: `林俊杰`、`周杰伦`、`日摇`
- city: `深圳`
- sourceType: `qq_music`
- sourceLabel: `模拟 QQ 音乐授权数据`
- authorized: `true`
- evidenceText: `用户在 Demo 初始状态中已授权模拟 QQ 音乐，并表达过关注林俊杰、周杰伦和日摇。`
- reminderFrequency: `important_only`

羽毛球画像：

- interest: `badminton`
- topics: `固定搭子`、`周末约球`、`新手友好`
- city: `深圳南山`
- sourceType: `public_group_profile`
- sourceLabel: `公开群资料`
- authorized: `false`
- evidenceText: `用户曾在聊天中说过想找固定搭子；候选群信息只来自公开群名、标签和简介。`
- reminderFrequency: `important_only`

验收标准：

- Demo 不依赖真实外部数据。
- mock 数据能支撑音乐提醒和羽毛球社群推荐。
- mock 数据不会让人误解为系统凭空生成用户画像。
- 正式产品路径仍然是通过用户选择、聊天补充、授权数据和使用反馈逐步沉淀兴趣画像。

## 7. 阶段 2：兴趣记忆

### Task 2.1 认养时写入兴趣 memory

涉及文件：

- `apps/openclaw-api/src/db.js`

当前 `saveAdoption(input)` 已保存 `interests_json`，但没有把兴趣作为长期 memory 单独写入。

建议在 `saveAdoption` 中增加：

- `writeMemory('interest', 'selected_interests', interests, 'adoption', 'lobster-xiaoqian')`
- 如果包含 `music`，写入初始 music profile。
- 如果包含 `badminton`，写入初始 badminton profile。

验收标准：

- `GET /api/memories` 能看到兴趣相关 memory。
- 工作记录仍记录 adoption。

### Task 2.2 支持聊天补充兴趣

目标：用户可以通过聊天告诉小龙虾更具体的兴趣。

示例输入：

```text
我喜欢林俊杰和周杰伦，最近也听一点日摇。
```

简单版实现：

- 前端先用规则识别 `喜欢`、`关注`、`最近听` 等文本。
- 或后端通过 AI adapter 生成结构化 interest update。
- 写入 memory。

验收标准：

- 用户补充兴趣后，小龙虾后续回复可以引用这些内容。
- 工作记录有 `interest_profile_updated`。

### Task 2.3 用户可查看兴趣记忆

目标：用户知道小龙虾记住了什么。

涉及 UI：

- 小龙虾右侧资料区。
- 或小龙虾聊天中的“它记住的兴趣”卡。

展示字段：

- 兴趣名。
- 关注对象。
- 来源。
- 提醒频率。
- 最近更新时间。

验收标准：

- 用户可以清楚看到小龙虾记住的兴趣。
- 后续可扩展删除、关闭、编辑。

## 8. 阶段 3：OpenClaw 兴趣能力和工具

### Task 3.1 新增兴趣 capability

涉及文件：

- `apps/openclaw-api/src/db.js`

建议新增 capabilities：

```text
interest_brief
interest_reminder
interest_space_post_preview
interest_community_recommendation
```

能力说明：

- `interest_brief`：生成兴趣简报。
- `interest_reminder`：生成重要兴趣提醒。
- `interest_space_post_preview`：生成龙虾空间兴趣动态预览。
- `interest_community_recommendation`：基于公开资料生成兴趣社群推荐卡。

验收标准：

- `GET /api/capabilities` 返回兴趣能力。
- `resolveCapability` 能根据“音乐”“歌手”“演唱会”“羽毛球群”“同好群”等触发词匹配。

### Task 3.2 新增兴趣工具

涉及文件：

- `apps/openclaw-api/src/db.js`
- 现有工具执行逻辑所在文件。

建议新增 tools：

```text
read_mock_interest_profile
read_mock_qq_music_signals
read_public_group_profiles
rank_interest_signals
generate_interest_reminder_card
generate_interest_space_post_preview
generate_interest_community_card
```

工具边界：

- `read_mock_qq_music_signals` 只读 mock。
- `read_public_group_profiles` 只读公开资料。
- `generate_interest_space_post_preview` 只能生成预览。
- `generate_interest_community_card` 不读取未授权群聊消息。

验收标准：

- tool run 能写入 `tool_runs`。
- 高风险输出进入 review。
- 工作记录能解释小龙虾做了什么。

### Task 3.3 新增 review policy

涉及文件：

- `apps/openclaw-api/src/db.js`

建议规则：

- 兴趣提醒卡：低到中风险，可直接展示，但必须显示来源。
- QQ 音乐 mock 授权：必须显示授权状态。
- 兴趣空间动态：高风险，必须预览确认。
- 社群推荐：中风险，只能展示公开资料，不替用户判断。
- 加群/申请/私聊群主：禁止自动执行。

验收标准：

- review 结果能说明 `previewRequired` 或 `blocked`。
- 社群推荐中不会出现“我看到群里正在聊...”这种越权表达。

## 9. 阶段 4：兴趣提醒卡

### Task 4.1 新增兴趣提醒卡类型

涉及文件：

- `apps/qq-lobster-v2/src/types/index.ts`

建议扩展 `CardType`：

```ts
| 'interest_reminder'
| 'interest_community'
```

建议新增：

```ts
export interface InterestReminderCard {
  id: string
  interest: Interest
  title: string
  summary: string
  reason: string
  sourceLabel: string
  sourceType: 'mock' | 'qq_music' | 'public_group_profile'
  riskNote: string
  actions: InterestCardAction[]
}
```

验收标准：

- 聊天区可以渲染兴趣提醒卡。
- 卡片包含来源和推荐原因。
- 卡片不是纯资讯流，有小龙虾表达。

### Task 4.2 音乐提醒卡 Demo

建议卡片内容：

```text
标题：你关注的歌手有新动态
摘要：林俊杰深圳演出信息有更新。
原因：你在兴趣记忆里关注了林俊杰，并把城市设为深圳。
来源：模拟 QQ 音乐授权数据。
风险提示：Demo 使用模拟数据，不代表真实票务信息。
```

操作：

- 查看来源
- 生成龙虾空间动态
- 不再提醒这个歌手

验收标准：

- 能体现腾讯生态：QQ 音乐授权。
- 能体现主动感知：不是用户手动搜索。
- 能解释为什么提醒。

### Task 4.3 羽毛球社群推荐卡 Demo

采用简洁文案：

```text
我发现一个可能适合你的羽毛球群：深圳南山周末羽毛球搭子群。
公开资料显示：周末约球、固定场地、新手友好。
和你之前说的“想找固定搭子”比较接近。
```

推荐卡字段：

- 群名。
- 公开标签。
- 公开简介。
- 地区。
- 来源：公开群资料。
- 推荐原因。
- 边界说明：未加入群，仅基于公开资料。

操作只保留：

- 查看公开资料
- 收藏
- 屏蔽类似推荐
- 申请加入

不出现：

- 帮你整理入群问题。
- 帮你判断靠不靠谱。
- 帮你看看群里聊什么。
- 代你申请加入。

验收标准：

- 文案不暗示读取未授权群消息。
- 用户自己判断是否进一步查看或申请加入。
- QQ 社交生态价值清楚。

## 10. 阶段 5：聊天和提示融合

### Task 5.1 小龙虾聊天能引用兴趣

目标：让兴趣进入日常对话，而不是只在卡片里出现。

示例：

用户：

```text
今天有点累。
```

小龙虾：

```text
那我今天不塞太多消息给你。我记得你最近在听林俊杰，晚点可以给你夹一首适合放空的歌。
```

验收标准：

- 小龙虾能自然引用兴趣。
- 不每句话都硬提兴趣。
- 不把兴趣表达成广告。

### Task 5.2 消息下方增加兴趣建议

与成就系统改造保持一致：不用强引导任务，改用消息下方轻提示。

兴趣场景建议：

- 看看音乐提醒
- 生成空间动态
- 关闭这类提醒
- 查看兴趣记忆
- 看看同好群

验收标准：

- 每次最多 3 个建议。
- 建议短，不强迫用户。
- 不出现“下一步必须”。

## 11. 阶段 6：兴趣进入龙虾空间

### Task 6.1 生成兴趣空间动态预览

涉及能力：

- `interest_space_post_preview`

音乐动态示例：

```text
今天替主人盯歌手动态的时候，我的小钳子差点敲出节拍。
林俊杰深圳演出信息有更新，我已经把这条消息夹进提醒篮里了。
主人要不要去看，交给主人自己决定；我负责记住这份期待。
```

注意：

- 空间动态必须是预览。
- 发布必须用户确认。
- 分享前要脱敏。

验收标准：

- 用户能从兴趣提醒卡生成空间动态预览。
- 小龙虾空间能展示兴趣动态。
- 好友评论后，可以生成回复草稿，但不自动发送。

### Task 6.2 兴趣动态和日记联动

目标：兴趣事件成为日记素材。

示例日记素材：

- 今天记住了主人喜欢的歌手。
- 今天发现一条音乐提醒。
- 今天主人收藏了一个羽毛球同好群。

验收标准：

- 日记不是重复任务流水账。
- 兴趣事件让小龙虾更像同好宠物。

## 12. 阶段 7：兴趣成就和挂饰

### Task 7.1 新增兴趣成就

建议成就：

| Key | 名称 | 触发 |
| --- | --- | --- |
| first_interest_memory | 第一次同频 | 第一次补充兴趣画像 |
| first_music_signal | 小小听歌虾 | 第一次生成音乐提醒 |
| first_interest_space_post | 同好动态 | 第一次发布兴趣空间动态 |
| first_community_card | 发现同好 | 第一次看到兴趣社群推荐 |
| community_saved | 先收藏一下 | 第一次收藏推荐社群 |

隐藏成就：

| Key | 名称 | 触发 |
| --- | --- | --- |
| safe_distance | 安全距离 | 用户多次收藏但不申请加入 |

隐藏成就文案方向：

```text
不急着加入也很好，先蹲一蹲、看一看，也是很聪明的社交方式。
```

验收标准：

- 兴趣行为能点亮成就墙。
- 至少一个兴趣成就带来挂饰或空间装饰。

### Task 7.2 兴趣挂饰

建议：

- 音乐：音符挂饰、小唱片、耳机。
- 羽毛球：小球拍、小羽毛球。
- 二次元：星星贴纸、场刊小夹子。

验收标准：

- 兴趣不只停留在卡片里，而是改变小龙虾形象。
- 用户能感知“我的兴趣养出了不一样的小龙虾”。

## 13. 阶段 8：前端页面改造落点

### Task 8.1 认养页轻量改造

目标：保留简洁，不变成配置后台。

建议：

- 兴趣选择仍保持轻量。
- 选择音乐后，增加一行说明：`之后可以让小龙虾关注歌手、新歌和演出提醒。`
- 选择羽毛球后，增加一行说明：`之后可以让小龙虾留意公开同好群和活动信息。`

验收标准：

- 认养流程不变长。
- 用户知道兴趣会产生后续能力。

### Task 8.2 小龙虾右侧资料区

目标：让兴趣成为宠物状态的一部分。

展示：

- 兴趣人格：音乐同好 / 羽毛球搭子雷达。
- 已启用来源：模拟 QQ 音乐 / 公开群资料。
- 最近兴趣动作。
- 兴趣挂饰。

验收标准：

- 用户能看到这只小龙虾“被我养成了什么兴趣”。

### Task 8.3 聊天区卡片

目标：兴趣提醒和社群推荐都在小龙虾聊天层自然出现。

卡片类型：

- 音乐提醒卡。
- 社群推荐卡。
- 兴趣空间动态预览卡。
- 兴趣记忆卡。

验收标准：

- 不新增复杂独立页面。
- 用户像和小龙虾聊天一样使用兴趣能力。

## 14. 阶段 9：OpenClaw 数据结构增强

### Task 9.1 新增 interest_profiles 存储

简单版可以先用 `memories`，稳定后再加表。

推荐稳定表：

```sql
CREATE TABLE interest_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  interest TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  topics_json TEXT NOT NULL,
  city TEXT,
  sources_json TEXT NOT NULL,
  reminder_frequency TEXT NOT NULL,
  tone TEXT NOT NULL,
  muted_topics_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

验收标准：

- 兴趣画像能独立于 `lobsters.interests_json` 更新。
- 用户可查看和修改。

### Task 9.2 新增 interest_events

目标：记录主动感知到的兴趣事件。

建议字段：

- id
- interest
- type
- title
- summary
- source_type
- source_label
- reason
- risk_note
- status
- created_at

验收标准：

- 兴趣提醒、社群推荐、空间动态都有来源事件。
- 工作记录可以追问。

### Task 9.3 新增 API

建议接口：

- `GET /api/interests/profiles`
- `POST /api/interests/profiles`
- `POST /api/interests/reminders/generate`
- `POST /api/interests/communities/recommend`
- `POST /api/interests/space-post-preview`

简单版也可以只做 mock endpoint：

- `GET /api/interests/demo`

验收标准：

- 前端不直接写死所有兴趣结果。
- API 不可用时仍有 mock fallback。

## 15. 阶段 10：权限和安全

### Task 10.1 来源权限标识

每张兴趣卡必须显示来源类型：

- 模拟 QQ 音乐授权数据。
- 公开群资料。
- 用户聊天补充。
- 已授权 QQ 群。

验收标准：

- 用户知道小龙虾为什么知道这件事。
- 不制造“偷看”的感觉。

### Task 10.2 社群推荐边界

必须遵守：

- 未加入群只使用公开资料。
- 不生成群内消息总结。
- 不写“他们最近在约...”这种未授权群内动态。
- 不写“我帮你判断这个群靠谱”。
- 不自动申请加入。

验收标准：

- 文案扫描不出现越权表述。
- 推荐卡有 `公开资料` 或同义来源说明。

### Task 10.3 空间动态发布审查

规则：

- 小龙虾只能生成预览。
- 用户确认后才发布到龙虾空间。
- 分享前脱敏。
- 评论回复只生成草稿。

验收标准：

- 高风险行为必须有确认。
- OpenClaw review 有记录。

## 16. 阶段 11：Demo 展示建议

3 分钟 Demo 不要铺满所有兴趣。建议只展示一条主线加一个社群推荐闪现。

推荐展示：

1. 用户已认养小龙虾，兴趣里有音乐。
2. 小龙虾主动弹出音乐提醒：来自模拟 QQ 音乐授权。
3. 用户问：`为什么提醒我？`
4. 小龙虾解释：因为兴趣记忆里关注了歌手，城市是深圳，提醒频率是重要提醒。
5. 用户点击生成龙虾空间动态预览。
6. 用户确认发布，小龙虾空间出现兴趣动态。
7. 解锁兴趣成就和音符挂饰。
8. 快速展示一张羽毛球社群推荐卡，强调：只基于公开群资料。

验收标准：

- 评委能看到腾讯生态结合。
- 能看到主动感知，而不是手动搜索。
- 能看到兴趣进入空间和成就。
- 能看到社群推荐边界清晰。

## 17. 测试计划

### 17.1 前端

命令：

```powershell
cd apps/qq-lobster-v2
npm run lint
npm run build
```

手动验证：

- 认养页可选择音乐/羽毛球。
- 小龙虾资料区显示兴趣状态。
- 聊天区能展示音乐提醒卡。
- 聊天区能展示羽毛球社群推荐卡。
- 社群推荐卡使用简洁文案。
- 兴趣空间动态必须预览。
- 兴趣成就能点亮。

### 17.2 OpenClaw API

命令：

```powershell
cd apps/openclaw-api
npm run smoke
```

验证：

- adoption 保存 interests。
- memories 写入兴趣画像。
- capability 返回兴趣能力。
- tool_runs 记录兴趣工具。
- review_results 记录空间动态和社群推荐审查。
- work_logs 可追问兴趣相关动作。

### 17.3 文案和权限扫描

必须搜索并避免：

- `他们最近在约`
- `我看到群里`
- `帮你判断靠不靠谱`
- `代你申请`
- `帮你整理入群问题`
- `自动加入`

必须包含或等价表达：

- `公开资料`
- `模拟 QQ 音乐授权`
- `用户确认后发布`
- `未加入群，仅基于公开资料`

## 18. 最小可交付版本

如果只做一个最小版，完成以下内容即可：

- 新增 `music` 和 `badminton` 兴趣类型。
- 认养后把兴趣写入 memory。
- 小龙虾聊天能展示一张音乐提醒卡。
- 小龙虾聊天能展示一张羽毛球社群推荐卡。
- 社群推荐卡只基于公开资料，使用简洁文案。
- 音乐提醒可生成龙虾空间动态预览。
- 至少解锁一个兴趣成就和一个兴趣挂饰。

这个版本已经能表达核心变化：QQClaw 不只是处理群消息的小助手，而是一只会围绕用户兴趣主动感知、陪伴表达、发现同好机会并持续成长的 QQ AI 宠物。
