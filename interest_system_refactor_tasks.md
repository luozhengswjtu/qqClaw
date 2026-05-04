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
- 没有兴趣同好讲述和轻量证据卡。
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
  -> 兴趣同好讲述 / 轻量证据卡 / 聊天回复
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
- 用户主动设置的城市、频率、关键词。
- 用户使用过程中的明确反馈，例如收藏、忽略、删除记忆。

允许小龙虾从聊天中做兴趣推断并长期保存，但必须区分风险：

- 低风险兴趣偏好可以自动保存，例如喜欢的歌手、曲风、运动、同好需求。
- 高影响或敏感信息必须确认后保存，例如精确住址、学校班级、健康、财务、身份隐私、外部授权、对外发布。

所有自动保存的兴趣记忆必须：

- 可解释。
- 可查看。
- 可修改。
- 可删除。
- 可追溯来源。
- 在聊天中给出轻量回执，不做无提示的后台画像。

Demo 中可以预置初始兴趣画像，但语义必须是：

> 这是一组“用户已经选择、已经表达、已经授权或已经设置过”的模拟状态，不是系统凭空生成的用户画像。

验收标准：

- 所有 Demo seed 兴趣画像都带来源字段。
- 兴趣同好讲述和轻量证据卡能说明“为什么知道”和“来自哪里”。
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

### Task 2.0 音乐兴趣授权提示与模拟授权卡

目标：用户选择“音乐”兴趣后，不直接生成 QQ 音乐画像，而是在首次进入小龙虾聊天时提示用户进行模拟 QQ 音乐授权。用户确认授权后，才生成音乐兴趣画像和后续音乐提醒。

触发时机：

- 用户在认养页选择 `music`。
- 完成认养后进入小龙虾聊天界面。
- 小龙虾第一次识别到“音乐兴趣已选择但 QQ 音乐未授权”。
- 在聊天区展示一条轻量提示和授权卡。

提示文案建议：

```text
我看到你选了音乐兴趣。
如果你愿意授权 QQ 音乐，我可以更准确地记住你喜欢的歌手、新歌和演出提醒。
```

授权卡内容：

- 将读取：关注歌手、最近常听、收藏歌单、城市演出提醒偏好。
- 不会读取：私密评论、聊天记录、支付信息。
- 用途：生成音乐提醒、兴趣日记素材、龙虾空间动态草稿、兴趣成就。
- 数据说明：Demo 使用模拟 QQ 音乐授权数据，不接入真实 QQ 音乐。

按钮：

- 授权模拟 QQ 音乐
- 暂时不用

确认授权后：

- 写入 `sourceType: qq_music`。
- 写入 `sourceLabel: 模拟 QQ 音乐授权数据`。
- 写入 `authorized: true`。
- 生成音乐兴趣画像 seed。
- 生成一张“音乐兴趣记忆卡”，告诉用户小龙虾记住了什么。
- 后续才允许出现音乐同好讲述和轻量证据卡。

拒绝或暂时不用后：

- 只保留用户选择了 `music` 这个兴趣标签。
- 不生成具体歌手画像。
- 不出现基于 QQ 音乐数据的提醒。
- 后续可以在兴趣记忆卡或设置中再次授权。

验收标准：

- Demo 不默认假设用户已授权 QQ 音乐。
- 用户能先看到授权范围，再确认授权。
- 未授权时，小龙虾不能说出具体歌手、新歌或演唱会提醒。
- 授权后，兴趣画像和音乐提醒都能解释来源。

### Task 2.1 认养时写入兴趣 memory

涉及文件：

- `apps/openclaw-api/src/db.js`

当前 `saveAdoption(input)` 已保存 `interests_json`，但没有把兴趣作为长期 memory 单独写入。

建议在 `saveAdoption` 中增加：

- `writeMemory('interest', 'selected_interests', interests, 'adoption', 'lobster-xiaoqian')`
- 如果包含 `music`，只写入“用户选择了音乐兴趣”，不直接写入具体歌手画像。
- 如果包含 `badminton`，写入初始 badminton profile。
- 具体音乐画像必须等 Task 2.0 的模拟 QQ 音乐授权确认后再写入。

验收标准：

- `GET /api/memories` 能看到兴趣相关 memory。
- 工作记录仍记录 adoption。
- 认养阶段不会凭空生成 QQ 音乐画像。

### Task 2.2 从聊天中自动沉淀兴趣记忆

目标：让 QQClaw 具备无感智能。用户在自然聊天中提到低风险兴趣偏好时，小龙虾可以自动抽取并长期保存；高风险或高影响信息仍然需要确认。

示例输入：

```text
我喜欢林俊杰和周杰伦，最近也听一点日摇。
```

处理策略：

| 类型 | 示例 | 处理方式 |
| --- | --- | --- |
| 明确低风险兴趣 | 我喜欢林俊杰 | 自动写入兴趣记忆，给轻量回执 |
| 隐含兴趣线索 | 最近一直在听日摇 | 先写入低置信候选，后续通过行为强化 |
| 使用反馈 | 收藏音乐提醒、屏蔽某类推荐 | 自动更新权重或屏蔽项 |
| 高影响信息 | 精确住址、学校班级、健康、财务、身份隐私 | 必须确认后才保存 |
| 外部授权和发布 | QQ 音乐授权、空间动态发布 | 必须走授权卡或预览确认 |

简单版实现建议：

- 前端或后端识别 `喜欢`、`关注`、`最近听`、`想找`、`别再提醒` 等表达。
- 后端通过 AI adapter 或规则生成结构化 `interest_update`。
- 对低风险兴趣直接写入 memory / interest profile。
- 对自动保存的内容，在小龙虾消息下方显示轻量记忆回执。
- 对高风险内容生成确认卡，不自动写入。
- 写入 work log，类型建议为 `interest_profile_updated`。

轻量回执示例：

```text
已记住一点音乐偏好：林俊杰、周杰伦、日摇。
```

展开后的兴趣记忆卡示例：

```text
兴趣记忆
音乐

我刚刚记住了：
- 关注歌手：林俊杰、周杰伦
- 曲风偏好：日摇

来源：
你刚刚在聊天里提到

之后会用于：
音乐提醒 / 聊天共鸣 / 日记素材 / 龙虾空间动态

[修改] [删除]
```

验收标准：

- 用户自然聊天后，小龙虾能自动沉淀低风险兴趣记忆。
- 自动记忆有轻量回执，用户不会完全无感地被画像。
- 用户可以查看、修改、删除自动保存的兴趣记忆。
- 高风险信息、外部授权和对外发布不会被自动保存或执行。
- 用户后续可以问“你为什么推荐这个”，小龙虾能解释来源。
- 小龙虾后续回复可以引用这些兴趣内容。
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
- `interest_reminder`：生成重要兴趣同好讲述和轻量证据卡。
- `interest_space_post_preview`：生成龙虾空间兴趣动态预览。
- `interest_community_recommendation`：基于公开资料生成兴趣社群同好讲述和轻量证据卡。

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

- 兴趣同好讲述：低到中风险，可直接展示，但轻量证据卡必须显示来源。
- QQ 音乐 mock 授权：必须显示授权状态。
- 兴趣空间动态：高风险，必须预览确认。
- 社群同好讲述：中风险，只能展示公开资料，不替用户判断。
- 加群/申请/私聊群主：禁止自动执行。

验收标准：

- review 结果能说明 `previewRequired` 或 `blocked`。
- 社群推荐中不会出现“我看到群里正在聊...”这种越权表达。

## 9. 阶段 4：兴趣同好讲述

### Task 4.1 新增兴趣讲述与轻量证据卡类型

涉及文件：

- `apps/qq-lobster-v2/src/types/index.ts`

建议扩展 `CardType`：

```ts
| 'interest_reminder'
| 'interest_community'
```

建议新增：

```ts
export interface InterestNarrativeCard {
  id: string
  interest: Interest
  narrative: string
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

- 聊天区先展示 QQClaw 以同爱好者口吻讲述的内容。
- 轻量证据卡只承载来源、推荐原因、风险提示和操作。
- 整体不是纯资讯流，QQClaw 的陪伴表达是主体。

### Task 4.2 音乐同好讲述 Demo

建议讲述内容：

```text
我刚看到一条和林俊杰有关的深圳演出更新，感觉你可能会在意。
因为你授权了模拟 QQ 音乐数据，兴趣记忆里也有林俊杰和深圳，所以我把它夹出来给你看。
Demo 数据是模拟的，不代表真实票务信息。
```

轻量证据卡内容：

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

验收标准：

- 能体现腾讯生态：QQ 音乐授权。
- 能体现主动感知：不是用户手动搜索。
- 能用 QQClaw 的同好口吻解释为什么提醒。

### Task 4.3 羽毛球社群同好讲述 Demo

采用简洁文案：

```text
我发现一个可能适合你的羽毛球群：深圳南山周末羽毛球搭子群。
它看起来像是会有人周末固定约球，新手也比较容易开口。
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

## 9.5 阶段 4.5：聊天与记忆持久化

目标：让 QQClaw 刷新后不会断片。参考 Kimi Claw 的长期记忆思路，QQClaw 也需要把“聊天时间线”和“长期记忆”分层持久化，但第一版不需要显性展示一个完整记忆空间页面。

设计理解：

- 聊天时间线负责恢复用户看到过的对话和卡片。
- 长期记忆负责沉淀可复用的结构化信息，例如认养信息、兴趣画像、授权来源、公开资料证据和用户修改。
- 记忆管理先通过现有兴趣记忆卡和聊天中的查看、修改、删除完成，不额外做独立“记忆空间”入口。
- 刷新后，小龙虾应该能继续之前的语境，而不是只恢复一张总结卡。

### Task 4.5.1 持久化小龙虾私聊时间线

涉及文件：

- `apps/openclaw-api/src/db.js`
- `apps/openclaw-api/src/server.js`
- `apps/qq-lobster-v2/src/api/openclawClient.ts`
- `apps/qq-lobster-v2/src/store/useLobsterStore.ts`

建议新增后端表：

```sql
CREATE TABLE lobster_chat_lines (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT,
  source TEXT,
  output_id TEXT,
  card_json TEXT,
  suggestions_json TEXT,
  created_at TEXT NOT NULL
);
```

建议接口：

- `GET /api/lobster-chat-lines`
- `POST /api/lobster-chat-lines`
- `POST /api/lobster-chat-lines/batch`

验收标准：

- 用户和小龙虾的私聊消息刷新后仍保留。
- 音乐同好讲述、羽毛球社群讲述、授权卡、兴趣记忆卡和空间动态预览卡刷新后仍保留。
- 刷新后不重复插入阶段 4 的 Demo 卡。
- 失败时可以降级为前端内存，不影响当前会话。

### Task 4.5.2 长期记忆继续结构化持久化

当前已有 `memories` 和 `interest_profiles` 雏形，下一步要明确它们不是聊天记录的替代品。

长期记忆应保存：

- 认养信息：名字、称呼、性格、兴趣。
- 兴趣画像：音乐、羽毛球、自定义兴趣。
- 来源：认养、聊天提到、模拟 QQ 音乐授权、公开群资料、用户手动修改。
- 证据文本：为什么知道这件事。
- 状态：可用、已删除、需要确认、低置信度。

验收标准：

- 聊天时间线可以被删除或压缩，但长期记忆仍能解释来源。
- 删除兴趣记忆后，小龙虾后续不能继续引用该记忆。
- 高风险信息仍必须确认后才进入长期记忆。

### Task 4.5.3 记忆空间暂不显性展示

第一版不做独立“记忆空间”页面。

用户可见入口只保留：

- 聊天里的兴趣记忆卡。
- 右侧兴趣面板。
- 用户问“你记住了什么”时，小龙虾用聊天方式说明。

验收标准：

- 用户能管理关键记忆，但不会被一个复杂的记忆后台打断。
- 每条可见记忆都能说明来源、用途和删除方式。
- 文案避免“偷偷记住”“后台画像”的感觉。

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

执行状态：

- 已完成。
- 前端私聊会把最多 3 条启用的兴趣画像整理成 `private_chat` 上下文传给 OpenClaw。
- 仅在低能量、兴趣相关等语境中优先引用兴趣；普通中性聊天不强塞兴趣。
- 后端 mock fallback 和真实 AI prompt 都加入“同好口吻、非广告、不每句都提”的约束。

### Task 5.2 消息下方增加兴趣建议

与成就系统改造保持一致：不用强引导任务，改用消息下方轻提示。

兴趣场景建议：

- 看看音乐提醒
- 生成空间动态
- 查看兴趣记忆
- 看看同好群

验收标准：

- 每次最多 3 个建议。
- 建议短，不强迫用户。
- 不出现“下一步必须”。

执行状态：

- 已完成。
- 普通聊天回复下方最多展示 3 个轻建议。
- 兴趣建议复用既有能力：`看看音乐提醒`、`生成空间动态`、`查看兴趣记忆`、`看看同好群`。
- 建议只在兴趣相关语境出现，避免把日常私聊变成任务流。

## 10.5 阶段 5.5：聊天触发能力入口

目标：解决“用户在聊天里明确提出功能请求，但只能收到口头回复，不能真正触发功能”的断点。

当前问题：

```text
聊天输入 -> 只生成小龙虾回复
按钮点击 -> 才能执行具体 capability
```

这会导致用户说“帮我总结群消息”“打开成就墙”“看看兴趣记忆”时，小龙虾可能会文字上答应，但不会真正调用对应功能。用户不会理解为什么聊天框不能触发能力，因为从产品体验上看，聊天框天然应该是统一入口。

目标链路：

```text
用户聊天输入
  -> 识别明确功能意图
  -> 小龙虾用自然语言说明可以做什么
  -> 消息下方展示确认按钮
  -> 用户点击按钮
  -> 前端复用现有 capability handler 执行功能
  -> 执行结果回到聊天区
```

核心原则：

- 用户聊天可以触发功能入口，但第一版不自动执行功能。
- AI 可以参与判断“用户可能想做什么”，但不能裸执行工具。
- 真正执行哪个 capability，仍由前端白名单和规则校验决定。
- 按钮和聊天触发的功能必须复用同一套 capability handler，避免两套行为分叉。
- 只识别高置信表达，模糊表达继续当普通聊天处理。
- 高风险能力必须确认；低风险能力第一版也先走确认按钮，后续再考虑直达。

推荐初版方案：

```text
用户：帮我总结一下群消息

小龙虾：我可以帮你捞一下群里的重点，点一下我就开始。
[总结群消息]
```

点击 `[总结群消息]` 后，才调用现有群消息总结能力，并把总结结果展示到聊天区。

### Task 5.5.1 建立前端 capability registry

目标：把“哪些功能允许被聊天触发”集中登记，而不是散落在组件判断里。

建议字段：

```ts
interface ChatCapabilityDefinition {
  capability: string
  label: string
  allowedFromChat: boolean
  requiresConfirmation: boolean
  riskLevel: 'low' | 'medium' | 'high'
  matchers: string[]
}
```

首批开放能力：

| Capability | 聊天触发表达 | 按钮文案 | 风险 | 执行方式 |
| --- | --- | --- | --- | --- |
| `summarize_group_messages` | 总结群消息、捞一下群消息、看看群里聊了啥 | 总结群消息 | low | 确认后执行 |
| `open_achievement_wall` | 打开成就墙、看成就、看看我的成就 | 看看成就墙 | low | 确认后执行 |
| `interest_memory` | 看看兴趣记忆、你记住了什么、我的音乐记忆 | 查看兴趣记忆 | low | 确认后执行 |
| `interest_space_preview` | 生成空间动态、写个空间动态、帮小龙虾发动态预览 | 生成空间动态 | medium | 确认后生成预览 |
| `interest_music_reminder` | 看看音乐提醒、歌手有什么新动态 | 看看音乐提醒 | low | 确认后展示 |
| `interest_community` | 看看同好群、找羽毛球搭子、有没有同好群 | 看看同好群 | medium | 确认后展示公开资料讲述 |

验收标准：

- capability 是否允许聊天触发有统一定义。
- 不存在或未开放的 capability 不会出现在聊天建议里。
- 原有按钮点击和聊天触发按钮走同一套执行逻辑。

### Task 5.5.2 聊天输入增加高置信意图识别

第一版建议先使用规则识别，不直接上完整 AI tool calling。

原因：

- 改动更小，不需要立刻改后端协议。
- 功能触发更可控，不会被 AI 幻觉 capability。
- 可以先验证用户体验：聊天能不能自然引出功能按钮。

识别策略：

- 在发送聊天前或生成回复后，根据用户输入匹配 capability registry。
- 只匹配明确动作词，例如“总结”“打开”“查看”“生成”“看看”“找”。
- 模糊表达不触发，例如“群消息好多”“音乐挺好听”不直接弹功能按钮。
- 每次最多提出 1 个主要功能按钮，避免聊天变成菜单。

验收标准：

- 输入“总结一下群消息”会出现“总结群消息”按钮。
- 输入“打开成就墙”会出现“看看成就墙”按钮。
- 输入普通闲聊不会乱弹功能按钮。
- 模糊表达不会强行触发能力。

### Task 5.5.3 小龙虾回复支持 proposed action

目标：聊天回复不仅是文本，也可以带一个“可确认的功能提案”。

建议数据结构：

```ts
interface ChatProposedAction {
  id: string
  capability: string
  label: string
  reason: string
  requiresConfirmation: true
}
```

展示方式：

- 小龙虾先用一句自然语言承接用户意图。
- 消息下方展示功能按钮。
- 按钮文案短，不写成命令式压力文案。

示例：

```text
我可以帮你捞一下群里的重点，点一下我就开始。
[总结群消息]
```

验收标准：

- proposed action 能复用现有 `suggestions` 展示样式。
- 按钮不会写“下一步必须”“立即执行”等强迫感文案。
- 每条聊天回复下方最多 3 个建议；明确功能意图场景优先展示该确认按钮。

### Task 5.5.4 前端 guard 负责最终执行判断

“执行权留在前端规则层”的含义：

- AI 或规则只提出“用户可能想触发哪个功能”。
- 前端检查 capability 是否存在、是否允许聊天触发、当前数据是否可用、是否需要确认。
- 通过校验后，用户点击按钮才执行现有 handler。

执行前检查：

- capability 是否在 registry 中。
- `allowedFromChat` 是否为 true。
- 当前页面或 store 是否具备执行所需数据。
- 是否需要授权、预览或二次确认。
- 是否属于禁止自动执行的行为。

禁止行为：

- AI 直接调用工具。
- AI 编造不存在的 capability。
- 未确认就发布空间动态。
- 未加入群时总结群内消息。
- 自动申请加群、自动私聊群主、自动对外发送内容。

验收标准：

- AI 或 mock 返回未知 capability 时，前端忽略，不展示按钮。
- 数据不足时，小龙虾说明当前还不能做，而不是展示失效按钮。
- 高风险动作必须保持预览或确认。

### Task 5.5.5 后续升级为 AI tool proposal

第一版先做规则识别。稳定后再把识别层升级为 AI tool proposal。

升级后的目标协议：

```ts
{
  reply: '我可以帮你捞一下群里的重点。',
  proposedActions: [
    {
      capability: 'summarize_group_messages',
      label: '总结群消息',
      requiresConfirmation: true
    }
  ]
}
```

注意：

- AI tool proposal 只负责“提出工具请求”。
- 前端仍然负责白名单、风险等级、数据可用性和用户确认。
- 后端需要对结构化输出做 schema 校验，失败时降级为普通聊天。

验收标准：

- AI 能比规则更自然地理解“帮我捞一下群里重点”这类表达。
- AI 不能绕过前端 guard 直接执行功能。
- schema 校验失败时不影响普通聊天。

### Task 5.5.6 测试计划

前端手动验证：

- 输入“帮我总结一下群消息”，出现“总结群消息”按钮，点击后展示群总结。
- 输入“打开成就墙”，出现“看看成就墙”按钮，点击后打开成就墙。
- 输入“看看兴趣记忆”，出现“查看兴趣记忆”按钮，点击后展示兴趣记忆。
- 输入“生成空间动态”，出现“生成空间动态”按钮，点击后只生成预览，不自动发布。
- 输入“群消息好多啊”，不强行触发总结按钮。
- 输入普通闲聊，不出现功能按钮。

后端或 mock 验证：

- 真实 AI 不可用时，规则识别仍能触发确认按钮。
- 未知 capability 不会被执行。
- 工作记录能说明用户通过聊天触发了哪个能力。

验收标准：

- 用户可以通过聊天自然触发已有能力入口。
- 所有能力仍需经过前端确认按钮或 guard。
- 不新增复杂页面，不打断阶段 6 之后的兴趣空间、成就和挂饰主线。

执行状态：

- 已完成。
- 前端新增聊天 capability registry，首批开放：`summarize_group_messages`、`open_achievement_wall`、`interest_memory`、`interest_space_preview`、`interest_music_reminder`、`interest_community`。
- 聊天回复建议会先检查高置信功能意图；命中后只展示一个确认按钮，不自动执行。
- 规则识别只匹配明确动作表达，例如“总结一下群消息”“打开成就墙”“看看兴趣记忆”“生成空间动态”。
- 组件侧 guard 已把聊天触发按钮复用到现有 handler；未知 capability 不会执行。
- 阶段 5.5 暂未接完整 AI tool calling，后续仍按 Task 5.5.5 升级为结构化 tool proposal。

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

- 用户能从音乐同好讲述后的轻量证据卡生成空间动态预览。
- 小龙虾空间能展示兴趣动态。
- 好友评论后，可以生成回复草稿，但不自动发送。

执行状态：

- 已完成。
- 音乐同好讲述卡的“生成龙虾空间动态”不再只在卡片内展开静态文本，而是生成一条 `space_post_card` 预览消息。
- 预览消息明确提示“点确认后才会进入龙虾空间”，并提供“确认放进空间”按钮；未确认前不写入 `spacePosts`。
- 用户确认后才把动态写入龙虾空间，动态类型标记为 `interest`，空间卡片显示为“兴趣动态”。
- 打开龙虾空间时会合并后端动态和本地已确认的兴趣动态，避免 mock 预览确认后被后端空列表覆盖。
- 预览评论仍沿用现有 `space_comment` 能力，只生成小龙虾回复草稿/演示评论，不自动替用户对外发送。

### Task 6.2 兴趣动态和日记联动

目标：兴趣事件成为日记素材。

示例日记素材：

- 今天记住了主人喜欢的歌手。
- 今天发现一条音乐提醒。
- 今天主人收藏了一个羽毛球同好群。

验收标准：

- 日记不是重复任务流水账。
- 兴趣事件让小龙虾更像同好宠物。

执行状态：

- 已完成。
- 本地隐藏日记触发条件新增兴趣素材判断：音乐提醒卡或已确认的兴趣空间动态都可以成为日记素材。
- 本地兴趣日记文案改成同好宠物口吻，强调“先做成预览、等主人确认是否放进空间”，不写成任务流水账。
- 发布兴趣动态后会尝试触发隐藏日记生成；OpenClaw 不可用时使用本地兴趣日记 fallback。

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

执行状态：

- 已完成。
- 成就墙新增 6 个兴趣成就：第一次同频、小小听歌虾、同好动态、发现同好、先收藏一下、安全距离。
- `safe_distance` 保持隐藏成就：多次收藏推荐社群但不申请加入时点亮，并使用“先蹲一蹲、看一看”的文案方向。
- 音乐授权/聊天保存兴趣会触发 `first_interest_memory`；生成音乐提醒触发 `first_music_signal`；确认发布兴趣空间动态触发 `first_interest_space_post`。
- 查看同好群推荐触发 `first_community_card`；收藏推荐社群触发 `community_saved`；第二次收藏触发隐藏成就 `safe_distance`。
- 后端 OpenClaw 打卡种子、奖励种子和 smoke 已同步阶段 7 键，刷新后仍能识别这些成就进度。

### Task 7.2 兴趣挂饰

建议：

- 音乐：音符挂饰、小唱片、耳机。
- 羽毛球：小球拍、小羽毛球。
- 二次元：星星贴纸、场刊小夹子。

验收标准：

- 兴趣不只停留在卡片里，而是改变小龙虾形象。
- 用户能感知“我的兴趣养出了不一样的小龙虾”。

执行状态：

- 已完成。
- 新增 `music-note` 小音符挂饰：由第一次音乐提醒解锁，可佩戴到小龙虾头像上。
- 新增 `badminton-racket` 小球拍挂饰：由第一次同好群推荐解锁，可佩戴到小龙虾头像上。
- 新增 `lookout-shell` 安全距离贴纸：由隐藏成就 `safe_distance` 解锁。
- 挂饰解锁逻辑支持绑定具体打卡源，不再只依赖完成数量；旧的新手挂饰仍保留数量解锁。

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

执行状态：

- 已完成。
- 认养页兴趣选择仍保持一组轻量按钮，不新增步骤。
- 选择音乐后展示“之后可以让小龙虾关注歌手、新歌和演出提醒。”
- 选择羽毛球后展示“之后可以让小龙虾留意公开同好群和活动信息。”
- 自定义兴趣补充一行聊天补充偏好的说明，避免变成配置后台。

### Task 8.2 小龙虾右侧资料区

目标：让兴趣成为宠物状态的一部分。

展示：

- 兴趣人格：音乐同好 / 羽毛球搭子雷达。
- 已启用来源：模拟 QQ 音乐 / 公开群资料。
- 最近兴趣动作。
- 兴趣挂饰。

验收标准：

- 用户能看到这只小龙虾“被我养成了什么兴趣”。

执行状态：

- 已完成。
- 右侧“兴趣”页改为兴趣状态优先：展示兴趣人格、已启用来源、最近兴趣动作和兴趣挂饰。
- 兴趣人格由认养兴趣和已保存兴趣画像合并生成，例如音乐同好、羽毛球搭子雷达。
- 来源从兴趣画像来源中归一显示为模拟 QQ 音乐、公开群资料等。
- 已解锁兴趣挂饰可在兴趣状态区直接佩戴，记忆管理保留在下方。

### Task 8.3 聊天区卡片

目标：兴趣提醒和社群推荐都以同好讲述为主体，在小龙虾聊天层自然出现。

聊天承载：

- 音乐同好讲述 + 轻量证据卡。
- 社群同好讲述 + 轻量证据卡。
- 兴趣空间动态预览卡。
- 兴趣记忆卡。

验收标准：

- 不新增复杂独立页面。
- 用户像和小龙虾聊天一样使用兴趣能力。

执行状态：

- 已完成。
- 当前聊天区已使用“同好讲述 + 轻量证据卡”承载音乐提醒和同好群推荐。
- 兴趣空间动态继续走预览卡，确认后进入龙虾空间，不新增独立页面。
- 兴趣记忆仍通过聊天卡和右侧兴趣页管理，符合“像和小龙虾聊天一样使用兴趣能力”。

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

执行状态：

- 已完成。
- OpenClaw 新增结构化 `interest_profiles` 表，画像可独立于 `lobsters.interests_json` 保存、更新、删除。
- `saveInterestProfile` 同步写入结构化表和长期 memory，兼容阶段 4.5 的记忆恢复。
- `GET /api/interests/profiles` 优先读取结构化表；`POST /api/interests/profiles` 可保存新的兴趣画像。
- 前端仍保留 API 不可用时的本地 fallback。

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

执行状态：

- 已完成。
- OpenClaw 新增 `interest_events` 表，记录兴趣、事件类型、标题、摘要、来源类型、来源标签、来源 id 和 detail。
- 音乐提醒生成会写入 `reminder` 事件。
- 社群推荐会写入 `community_recommendation` 事件，并保留 public-only 详情。
- 兴趣空间动态预览会写入 `space_post_preview` 事件，detail 中记录 `previewRequired` 和 tool run 来源。
- `GET /api/interests/events` 可按最新事件查看，支持用 `interest` 查询参数筛选。

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

执行状态：

- 已完成。
- 新增 `POST /api/interests/reminders/generate`，通过 OpenClaw 工具链生成音乐提醒卡并记录兴趣事件。
- 新增 `POST /api/interests/communities/recommend`，通过公开群资料工具生成社群同好讲述卡并记录兴趣事件。
- 新增 `POST /api/interests/space-post-preview`，通过兴趣空间预览工具生成需要确认的空间动态预览并记录兴趣事件。
- 前端音乐提醒、同好群推荐和兴趣空间动态预览入口优先调用这些 API；失败时继续使用现有本地 mock fallback。

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

执行状态：

- 已完成。
- 前端兴趣讲述卡将来源显性拆成 `来源类型` 和 `来源说明`，覆盖模拟 QQ 音乐授权数据、公开群资料、用户聊天补充、已授权 QQ 群等类型。
- 兴趣空间动态预览卡也显示来源类型，并明确标注 `用户确认后发布`。

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

执行状态：

- 已完成。
- 社群推荐继续只读取公开群名、标签和简介；推荐卡展示 `公开资料` 标识。
- OpenClaw 社群推荐审查从单一短语扩展为越权短语扫描，覆盖 `他们最近在约`、`我看到群里`、`帮你判断靠不靠谱`、`代你申请`、`帮你整理入群问题`、`自动加入`。

### Task 10.3 空间动态发布审查

规则：

- 小龙虾只能生成预览。
- 用户确认后才发布到龙虾空间。
- 分享前脱敏。
- 评论回复只生成草稿。

验收标准：

- 高风险行为必须有确认。
- OpenClaw review 有记录。

执行状态：

- 已完成。
- 新增 `POST /api/interests/space-posts/publish`，仅在用户确认后把兴趣空间动态写入龙虾空间。
- 发布前执行脱敏检查，并写入 `user_confirmed_interest_space_post` 与 `desensitize_share_output` review。
- 前端确认发布入口改为调用 OpenClaw 发布接口；API 不可用时仍保留本地确认后的 fallback。

## 16. 阶段 11：Demo 展示建议

3 分钟 Demo 不要铺满所有兴趣。建议只展示一条主线加一个社群推荐闪现。

推荐展示：

1. 用户已认养小龙虾，兴趣里有音乐。
2. 小龙虾用同爱好者口吻主动讲述音乐新动态：来自模拟 QQ 音乐授权。
3. 用户问：`为什么提醒我？`
4. 小龙虾解释：因为兴趣记忆里关注了歌手，城市是深圳，提醒频率是重要提醒。
5. 用户从轻量证据卡点击生成龙虾空间动态预览。
6. 用户确认发布，小龙虾空间出现兴趣动态。
7. 解锁兴趣成就和音符挂饰。
8. 快速展示一次羽毛球社群同好讲述，轻量证据卡强调：只基于公开群资料。

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
- 聊天区能展示音乐同好讲述和轻量证据卡。
- 聊天区能展示羽毛球社群同好讲述和轻量证据卡。
- 社群讲述使用简洁文案。
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
- 小龙虾聊天能展示一次音乐同好讲述和轻量证据卡。
- 小龙虾聊天能展示一次羽毛球社群同好讲述和轻量证据卡。
- 社群讲述只基于公开资料，使用简洁文案。
- 音乐轻量证据卡可生成龙虾空间动态预览。
- 至少解锁一个兴趣成就和一个兴趣挂饰。

这个版本已经能表达核心变化：QQClaw 不只是处理群消息的小助手，而是一只会围绕用户兴趣主动感知、陪伴表达、发现同好机会并持续成长的 QQ AI 宠物。
