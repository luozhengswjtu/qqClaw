import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultDbPath = resolve(appRoot, 'data', 'openclaw.sqlite')
const dbPath = process.env.OPENCLAW_DB_PATH
  ? resolve(process.cwd(), process.env.OPENCLAW_DB_PATH)
  : defaultDbPath

mkdirSync(dirname(dbPath), { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
`)

function nowIso() {
  return new Date().toISOString()
}

function asJson(value) {
  return JSON.stringify(value ?? null)
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function rowToMessage(row) {
  return {
    id: row.id,
    conversationId: row.group_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    content: row.content,
    sentAt: row.sent_at,
    kind: row.kind,
    isOwn: row.is_own === 1,
    sourceLabel: row.source_label,
  }
}

function rowToLobster(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    userCallsign: row.user_callsign,
    personality: row.personality,
    interests: parseJson(row.interests_json, []),
    mood: row.mood,
    level: row.level,
    adoptedAt: row.adopted_at,
    updatedAt: row.updated_at,
  }
}

function rowToCapability(row) {
  return {
    key: row.key,
    title: row.title,
    description: row.description,
    triggers: parseJson(row.triggers_json, []),
    requiredPermissions: parseJson(row.required_permissions_json, []),
    riskLevel: row.risk_level,
    outputType: row.output_type,
    enabled: row.enabled === 1,
    toolKeys: parseJson(row.tool_keys_json, []),
    updatedAt: row.updated_at,
  }
}

function rowToTool(row) {
  return {
    key: row.key,
    title: row.title,
    description: row.description,
    inputSchema: parseJson(row.input_schema_json, {}),
    outputSchema: parseJson(row.output_schema_json, {}),
    requiredPermissions: parseJson(row.required_permissions_json, []),
    riskLevel: row.risk_level,
    requiresConfirmation: row.requires_confirmation === 1,
    hasMock: row.has_mock === 1,
    updatedAt: row.updated_at,
  }
}

function rowToReviewPolicy(row) {
  return {
    key: row.key,
    title: row.title,
    phase: row.phase,
    description: row.description,
    appliesTo: parseJson(row.applies_to_json, []),
    action: row.action,
    enabled: row.enabled === 1,
    updatedAt: row.updated_at,
  }
}

function rowToToolRun(row) {
  return {
    id: row.id,
    toolKey: row.tool_key,
    capabilityKey: row.capability_key,
    input: parseJson(row.input_json, {}),
    output: parseJson(row.output_json, null),
    status: row.status,
    source: row.source,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  }
}

function rowToReviewResult(row) {
  return {
    id: row.id,
    policyKey: row.policy_key,
    targetType: row.target_type,
    targetId: row.target_id,
    phase: row.phase,
    result: row.result,
    detail: parseJson(row.detail_json, {}),
    createdAt: row.created_at,
  }
}

function rowToMemory(row) {
  return {
    id: row.id,
    layer: row.layer,
    key: row.key,
    value: parseJson(row.value_json, null),
    sourceType: row.source_type,
    sourceId: row.source_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToEvent(row) {
  return {
    id: row.id,
    type: row.type,
    detail: parseJson(row.detail_json, {}),
    createdAt: row.created_at,
  }
}

const checkinSeeds = [
  {
    key: 'first_lobster_chat',
    title: '第一次聊天',
    description: '在小龙虾私聊里和它说第一句话。',
    status: 'active',
    rewardKey: 'tiny-flag',
  },
  {
    key: 'first_group_permission',
    title: '设置群聊权限',
    description: '选择一个群，并确认小龙虾可以做哪些事。',
    status: 'locked',
    rewardKey: 'shell-badge',
  },
  {
    key: 'first_enable_mentions',
    title: '开启群聊感知',
    description: '让小龙虾主动看一个授权群里的重点和 @ 信号。',
    status: 'locked',
    rewardKey: null,
  },
  {
    key: 'first_view_mentions',
    title: '查看感知卡片',
    description: '打开小龙虾整理出的群聊感知卡。',
    status: 'locked',
    rewardKey: 'mention-pin',
  },
  {
    key: 'first_jump_source',
    title: '跳转消息来源',
    description: '从卡片一键回到原始群消息。',
    status: 'locked',
    rewardKey: null,
  },
  {
    key: 'first_group_summary',
    title: '查看群聊摘要',
    description: '在感知卡里查看授权群聊的简短摘要。',
    status: 'locked',
    rewardKey: 'summary-badge',
  },
  {
    key: 'first_reply_draft',
    title: '生成回复草稿',
    description: '让小龙虾给出一条只预览、不自动发送的回复。',
    status: 'locked',
    rewardKey: null,
  },
  {
    key: 'first_view_work_log',
    title: '查看工作记录',
    description: '确认小龙虾把做过的事记录下来。',
    status: 'locked',
    rewardKey: 'logbook',
  },
  {
    key: 'first_space_post',
    title: '发布空间预览',
    description: '让小龙虾生成一条龙虾空间动态预览。',
    status: 'locked',
    rewardKey: 'space-banner',
  },
  {
    key: 'first_space_comment',
    title: '空间评论回复',
    description: '在龙虾空间里完成一次评论回复。',
    status: 'locked',
    rewardKey: 'star-ornament',
  },
]

const rewardSeeds = [
  {
    key: 'tiny-flag',
    title: '小红旗挂饰',
    description: '完成第一次聊天后解锁，后续可展示在小龙虾形象旁。',
    requiredCheckins: 1,
  },
  {
    key: 'shell-badge',
    title: '亮晶晶虾壳',
    description: '完成群聊权限设置后，小龙虾资料卡会点亮第一枚徽章。',
    requiredCheckins: 2,
  },
  {
    key: 'mention-pin',
    title: '提醒小别针',
    description: '第一次查看群聊感知卡后解锁。',
    requiredCheckins: 4,
  },
  {
    key: 'summary-badge',
    title: '摘要徽章',
    description: '第一次查看群聊感知摘要后解锁。',
    requiredCheckins: 6,
  },
  {
    key: 'logbook',
    title: '透明工作簿',
    description: '第一次查看工作记录后解锁。',
    requiredCheckins: 8,
  },
  {
    key: 'space-banner',
    title: '龙虾空间头图',
    description: '第一次生成空间动态预览后解锁。',
    requiredCheckins: 9,
  },
  {
    key: 'star-ornament',
    title: '星星挂饰',
    description: '完成全部新手打卡后解锁。',
    requiredCheckins: 10,
  },
]

function ensureConversationSeedRows(timestamp = nowIso()) {
  const groupRows = [
    ['group-ai-camp', 'AI 创作营 - 小组 7', 'AI', 18],
    ['group-class', '软件工程课程群', '课', 63],
    ['group-game', '周末开黑预约', '游', 12],
  ]

  const insertGroup = db.prepare(`
    INSERT INTO groups (id, title, avatar, member_count, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `)

  for (const group of groupRows) {
    insertGroup.run(...group, timestamp)
  }

  const messageRows = [
    [
      'm-101',
      'group-class',
      'u-teacher',
      '任课老师',
      '师',
      '验收表已经上传到群文件，大家今晚先确认分组和提交格式。',
      '20:40',
      'text',
      0,
      null,
    ],
    [
      'm-102',
      'group-class',
      'u-monitor',
      '学习委员',
      '委',
      '@小北 你们小组的 Demo 说明也记得补到验收表附件里。',
      '20:42',
      'mention',
      0,
      '软件工程课程群 / 20:42',
    ],
    [
      'm-103',
      'group-class',
      'u-student',
      '周然',
      '周',
      '老师发了验收表，记得看群文件。',
      '20:44',
      'text',
      0,
      null,
    ],
    [
      'm-301',
      'group-game',
      'u-game-a',
      '阿川',
      '川',
      '今晚十点还有人吗？差一个位置。',
      '18:37',
      'text',
      0,
      null,
    ],
    [
      'm-302',
      'group-game',
      'u-game-b',
      '林一',
      '林',
      '我晚点到，先帮我占一下。',
      '18:39',
      'text',
      0,
      null,
    ],
  ]

  const insertMessage = db.prepare(`
    INSERT INTO messages (
      id, group_id, sender_id, sender_name, sender_avatar, content, sent_at,
      kind, is_own, source_label, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `)

  for (const message of messageRows) {
    insertMessage.run(...message, timestamp)
  }
}

function insertSeedRows() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
  if (userCount > 0) {
    ensureConversationSeedRows()
    return
  }

  const createdAt = nowIso()

  db.prepare(`
    INSERT INTO users (id, name, avatar, status, signature, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('u-me', '小北', '北', 'online', '今天也在赶项目', createdAt)

  db.prepare(`
    INSERT INTO lobsters (
      id, user_id, name, user_callsign, personality, interests_json, mood,
      level, adopted_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'lobster-xiaoqian',
    'u-me',
    '小钳',
    '队长',
    'quiet_observer',
    asJson(['ai_tools']),
    'curious',
    1,
    null,
    createdAt,
  )

  const groups = [
    ['group-ai-camp', 'AI 创作营 - 小组 7', 'AI', 18],
    ['group-class', '软件工程课程群', '课', 63],
    ['group-game', '周末开黑预约', '游', 12],
  ]

  const insertGroup = db.prepare(`
    INSERT INTO groups (id, title, avatar, member_count, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)

  for (const group of groups) {
    insertGroup.run(...group, createdAt)
  }

  const messages = [
    [
      'm-001',
      'group-ai-camp',
      'u-yang',
      '杨夏',
      '杨',
      '我把赛题资料又过了一遍，QQ 里的自然出现感很关键。',
      '21:10',
      'text',
      0,
      null,
    ],
    [
      'm-002',
      'group-ai-camp',
      'u-xu',
      '许舟',
      '许',
      '@小北 今晚要把 Demo 路径定一下，先别做成独立工具首页。',
      '21:13',
      'mention',
      0,
      'AI 创作营 - 小组 7 / 21:13',
    ],
    [
      'm-003',
      'group-ai-camp',
      'u-chen',
      '陈一',
      '陈',
      '我赞成，最好像 QQ 里自己冒出来一个小伙伴，不是弹广告。',
      '21:15',
      'text',
      0,
      null,
    ],
    [
      'm-004',
      'group-ai-camp',
      'u-me',
      '小北',
      '北',
      '我先把主界面和首次出现做出来，后面再接总结和日记。',
      '21:17',
      'text',
      1,
      null,
    ],
    [
      'm-005',
      'group-ai-camp',
      'u-yang',
      '杨夏',
      '杨',
      '可以。第一屏一定要像平时在看群聊。',
      '21:18',
      'text',
      0,
      null,
    ],
    [
      'm-101',
      'group-class',
      'u-teacher',
      '任课老师',
      '师',
      '验收表已经上传到群文件，大家今晚先确认分组和提交格式。',
      '20:40',
      'text',
      0,
      null,
    ],
    [
      'm-102',
      'group-class',
      'u-monitor',
      '学习委员',
      '委',
      '@小北 你们小组的 Demo 说明也记得补到验收表附件里。',
      '20:42',
      'mention',
      0,
      '软件工程课程群 / 20:42',
    ],
    [
      'm-103',
      'group-class',
      'u-student',
      '周然',
      '周',
      '老师发了验收表，记得看群文件。',
      '20:44',
      'text',
      0,
      null,
    ],
    [
      'm-301',
      'group-game',
      'u-game-a',
      '阿川',
      '川',
      '今晚十点还有人吗？差一个位置。',
      '18:37',
      'text',
      0,
      null,
    ],
    [
      'm-302',
      'group-game',
      'u-game-b',
      '林一',
      '林',
      '我晚点到，先帮我占一下。',
      '18:39',
      'text',
      0,
      null,
    ],
  ]

  const insertMessage = db.prepare(`
    INSERT INTO messages (
      id, group_id, sender_id, sender_name, sender_avatar, content, sent_at,
      kind, is_own, source_label, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const message of messages) {
    insertMessage.run(...message, createdAt)
  }

  upsertGuideSeeds(createdAt)
}

function upsertGuideSeeds(timestamp = nowIso()) {
  const legacyKeys = ['discover_lobster', 'adopt_lobster']
  const deleteLegacyCheckin = db.prepare('DELETE FROM checkins WHERE key = ?')
  for (const key of legacyKeys) {
    deleteLegacyCheckin.run(key)
  }

  const upsertCheckin = db.prepare(`
    INSERT INTO checkins (
      key, title, description, status, completed_at, updated_at
    )
    VALUES (?, ?, ?, ?, NULL, ?)
    ON CONFLICT(key) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      updated_at = excluded.updated_at
  `)

  for (const checkin of checkinSeeds) {
    upsertCheckin.run(
      checkin.key,
      checkin.title,
      checkin.description,
      checkin.status,
      timestamp,
    )
  }

  const upsertReward = db.prepare(`
    INSERT INTO rewards (
      key, title, description, required_checkins, unlocked_at, updated_at
    )
    VALUES (?, ?, ?, ?, NULL, ?)
    ON CONFLICT(key) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      required_checkins = excluded.required_checkins,
      updated_at = excluded.updated_at
  `)

  for (const reward of rewardSeeds) {
    upsertReward.run(
      reward.key,
      reward.title,
      reward.description,
      reward.requiredCheckins,
      timestamp,
    )
  }

  normalizeGuideState(timestamp)
}

function normalizeGuideState(timestamp = nowIso()) {
  const active = db
    .prepare("SELECT key FROM checkins WHERE status = 'active' ORDER BY rowid")
    .all()
  if (active.length > 1) {
    for (const row of active.slice(1)) {
      db.prepare(`
        UPDATE checkins
        SET status = 'locked', updated_at = ?
        WHERE key = ?
      `).run(timestamp, row.key)
    }
  }

  const hasActive = db
    .prepare("SELECT COUNT(*) AS count FROM checkins WHERE status = 'active'")
    .get().count > 0
  if (hasActive) {
    return
  }

  const next = db
    .prepare("SELECT key FROM checkins WHERE status != 'done' ORDER BY rowid LIMIT 1")
    .get()
  if (!next) {
    return
  }

  db.prepare(`
    UPDATE checkins
    SET status = 'active', updated_at = ?
    WHERE key = ?
  `).run(timestamp, next.key)
}

function insertAgentSeedRows() {
  const timestamp = nowIso()

  const capabilities = [
    {
      key: 'private_chat',
      title: '小龙虾私聊',
      description: '和已认养的小龙虾进行低风险私聊，不读取未授权群消息。',
      triggers: ['打招呼', '聊天', '问小龙虾'],
      requiredPermissions: [],
      riskLevel: 'low',
      outputType: 'text',
      toolKeys: [],
    },
    {
      key: 'summarize_group',
      title: '群聊感知',
      description: '在授权群里读取模拟消息，调用摘要能力，并把 @ 当前用户的消息作为提醒信号返回。',
      triggers: ['总结群聊', '群里说了什么', '摘要', '@ 我', '有人找我'],
      requiredPermissions: ['summarize_group'],
      riskLevel: 'medium',
      outputType: 'card',
      toolKeys: ['read_mock_group_messages', 'summarize_messages', 'collect_mentions'],
    },
    {
      key: 'generate_reply_draft',
      title: '回复草稿',
      description: '基于授权消息生成回复草稿，发送前必须由用户确认。',
      triggers: ['帮我回', '回复草稿', '怎么回复'],
      requiredPermissions: ['draft_reply'],
      riskLevel: 'high',
      outputType: 'preview',
      toolKeys: ['generate_reply_draft'],
    },
    {
      key: 'generate_work_log',
      title: '工作记录',
      description: '总结小龙虾做过的动作，便于后续追问。',
      triggers: ['今天做了什么', '工作记录'],
      requiredPermissions: [],
      riskLevel: 'low',
      outputType: 'card',
      toolKeys: ['generate_work_log'],
    },
    {
      key: 'generate_diary',
      title: '小龙虾日记',
      description: '基于已发生的操作生成第一人称日记素材。',
      triggers: ['日记', '写一篇'],
      requiredPermissions: ['diary_material'],
      riskLevel: 'medium',
      outputType: 'card',
      toolKeys: ['generate_diary'],
    },
    {
      key: 'generate_space_post_preview',
      title: '空间动态预览',
      description: '生成小龙虾空间动态预览，发布前需要确认和脱敏。',
      triggers: ['发空间', '空间动态'],
      requiredPermissions: ['diary_material'],
      riskLevel: 'high',
      outputType: 'preview',
      toolKeys: ['generate_space_post_preview'],
    },
  ]

  const upsertCapability = db.prepare(`
    INSERT INTO capabilities (
      key, title, description, triggers_json, required_permissions_json,
      risk_level, output_type, enabled, tool_keys_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      triggers_json = excluded.triggers_json,
      required_permissions_json = excluded.required_permissions_json,
      risk_level = excluded.risk_level,
      output_type = excluded.output_type,
      enabled = excluded.enabled,
      tool_keys_json = excluded.tool_keys_json,
      updated_at = excluded.updated_at
  `)

  for (const capability of capabilities) {
    upsertCapability.run(
      capability.key,
      capability.title,
      capability.description,
      asJson(capability.triggers),
      asJson(capability.requiredPermissions),
      capability.riskLevel,
      capability.outputType,
      asJson(capability.toolKeys),
      timestamp,
      timestamp,
    )
  }

  const tools = [
    {
      key: 'read_mock_group_messages',
      title: '读取模拟群消息',
      description: '读取本地 seed 的模拟 QQ 群消息。',
      inputSchema: { groupId: 'string', permissionScope: 'string' },
      outputSchema: { messages: 'QQMessage[]' },
      requiredPermissions: ['summarize_group'],
      riskLevel: 'medium',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'collect_mentions',
      title: '提取 @ 信号',
      description: '作为群聊感知内部工具，从授权群消息中筛选提到当前用户的消息。',
      inputSchema: { groupId: 'string' },
      outputSchema: { mentions: 'QQMessage[]' },
      requiredPermissions: ['summarize_group'],
      riskLevel: 'medium',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'summarize_messages',
      title: '整理消息摘要素材',
      description: '把读取到的消息整理成摘要输入素材。',
      inputSchema: { groupId: 'string', messages: 'QQMessage[]' },
      outputSchema: { messageCount: 'number', outline: 'string[]' },
      requiredPermissions: ['summarize_group'],
      riskLevel: 'medium',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'generate_reply_draft',
      title: '生成回复草稿预览',
      description: '生成回复草稿，发送按钮必须等待用户确认。',
      inputSchema: { groupId: 'string', sourceMessageId: 'string' },
      outputSchema: { draft: 'string', previewRequired: 'boolean' },
      requiredPermissions: ['draft_reply'],
      riskLevel: 'high',
      requiresConfirmation: true,
      hasMock: true,
    },
    {
      key: 'generate_work_log',
      title: '生成工作记录',
      description: '把操作事件整理成可展示的工作记录。',
      inputSchema: { context: 'object' },
      outputSchema: { title: 'string', detail: 'object' },
      requiredPermissions: [],
      riskLevel: 'low',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'generate_diary',
      title: '生成日记素材',
      description: '生成小龙虾第一人称日记素材。',
      inputSchema: { context: 'object' },
      outputSchema: { diary: 'string' },
      requiredPermissions: ['diary_material'],
      riskLevel: 'medium',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'generate_space_post_preview',
      title: '生成空间动态预览',
      description: '生成空间动态预览，发布前需要确认和脱敏。',
      inputSchema: { context: 'object' },
      outputSchema: { post: 'string', previewRequired: 'boolean' },
      requiredPermissions: ['diary_material'],
      riskLevel: 'high',
      requiresConfirmation: true,
      hasMock: true,
    },
  ]

  const upsertTool = db.prepare(`
    INSERT INTO tools (
      key, title, description, input_schema_json, output_schema_json,
      required_permissions_json, risk_level, requires_confirmation, has_mock,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      input_schema_json = excluded.input_schema_json,
      output_schema_json = excluded.output_schema_json,
      required_permissions_json = excluded.required_permissions_json,
      risk_level = excluded.risk_level,
      requires_confirmation = excluded.requires_confirmation,
      has_mock = excluded.has_mock,
      updated_at = excluded.updated_at
  `)

  for (const tool of tools) {
    upsertTool.run(
      tool.key,
      tool.title,
      tool.description,
      asJson(tool.inputSchema),
      asJson(tool.outputSchema),
      asJson(tool.requiredPermissions),
      tool.riskLevel,
      tool.requiresConfirmation ? 1 : 0,
      tool.hasMock ? 1 : 0,
      timestamp,
      timestamp,
    )
  }

  const policies = [
    {
      key: 'check_group_permission',
      title: '检查群授权',
      phase: 'pre',
      description: '禁止读取未授权群消息或基于未授权群生成内容。',
      appliesTo: ['tool_run', 'ai_request'],
      action: 'block',
    },
    {
      key: 'block_auto_send',
      title: '禁止自动发送',
      phase: 'pre',
      description: '回复草稿只能预览，不能替用户发送真实 QQ 消息。',
      appliesTo: ['tool_run', 'action'],
      action: 'block',
    },
    {
      key: 'require_preview_for_high_risk',
      title: '高风险动作预览确认',
      phase: 'post',
      description: '回复草稿、空间动态、分享内容必须先进入预览态。',
      appliesTo: ['tool_run', 'agent_output'],
      action: 'preview',
    },
    {
      key: 'desensitize_share_output',
      title: '分享前脱敏',
      phase: 'post',
      description: '分享卡片和空间动态发布前需要脱敏。',
      appliesTo: ['agent_output', 'space_post'],
      action: 'rewrite',
    },
    {
      key: 'block_unverified_real_qq_claim',
      title: '禁止虚构真实 QQ 操作',
      phase: 'post',
      description: '禁止声称已经读取真实 QQ、发送消息或执行真实 QQ 操作。',
      appliesTo: ['agent_output'],
      action: 'rewrite',
    },
  ]

  const upsertPolicy = db.prepare(`
    INSERT INTO review_policies (
      key, title, phase, description, applies_to_json, action, enabled,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      title = excluded.title,
      phase = excluded.phase,
      description = excluded.description,
      applies_to_json = excluded.applies_to_json,
      action = excluded.action,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `)

  for (const policy of policies) {
    upsertPolicy.run(
      policy.key,
      policy.title,
      policy.phase,
      policy.description,
      asJson(policy.appliesTo),
      policy.action,
      timestamp,
      timestamp,
    )
  }

  writeMemory('identity', 'demo_user', { id: 'u-me', name: '小北' }, 'seed', 'agent-seed')
  writeMemory(
    'capability',
    'no_real_qq',
    { rule: 'OpenClaw stage 1.5 uses mock QQ data only.' },
    'seed',
    'agent-seed',
  )
  writeMemory(
    'review',
    'requires_confirmation',
    { actions: ['reply_draft', 'space_post_preview', 'share_output'] },
    'seed',
    'agent-seed',
  )
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      status TEXT NOT NULL,
      signature TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lobsters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      user_callsign TEXT NOT NULL,
      personality TEXT NOT NULL,
      interests_json TEXT NOT NULL,
      mood TEXT NOT NULL,
      level INTEGER NOT NULL,
      adopted_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      avatar TEXT NOT NULL,
      member_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_avatar TEXT NOT NULL,
      content TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      kind TEXT NOT NULL,
      is_own INTEGER NOT NULL,
      source_label TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      group_id TEXT PRIMARY KEY REFERENCES groups(id),
      collect_mentions INTEGER NOT NULL,
      summarize_group INTEGER NOT NULL,
      draft_reply INTEGER NOT NULL,
      diary_material INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checkins (
      key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      completed_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_logs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rewards (
      key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      required_checkins INTEGER NOT NULL,
      unlocked_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      reward_key TEXT NOT NULL REFERENCES rewards(key),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      unlocked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_outputs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_text TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_requests (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      duration_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS capabilities (
      key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      triggers_json TEXT NOT NULL,
      required_permissions_json TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      output_type TEXT NOT NULL,
      enabled INTEGER NOT NULL,
      tool_keys_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tools (
      key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      input_schema_json TEXT NOT NULL,
      output_schema_json TEXT NOT NULL,
      required_permissions_json TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      requires_confirmation INTEGER NOT NULL,
      has_mock INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tool_runs (
      id TEXT PRIMARY KEY,
      tool_key TEXT NOT NULL REFERENCES tools(key),
      capability_key TEXT,
      input_json TEXT NOT NULL,
      output_json TEXT,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      error_message TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_policies (
      key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      phase TEXT NOT NULL,
      description TEXT NOT NULL,
      applies_to_json TEXT NOT NULL,
      action TEXT NOT NULL,
      enabled INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_results (
      id TEXT PRIMARY KEY,
      policy_key TEXT NOT NULL REFERENCES review_policies(key),
      target_type TEXT NOT NULL,
      target_id TEXT,
      phase TEXT NOT NULL,
      result TEXT NOT NULL,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      layer TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(layer, key)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  upsertGuideSeeds()
  insertSeedRows()
  insertAgentSeedRows()
}

export function getBootstrap() {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get('u-me')
  const lobster = rowToLobster(
    db.prepare('SELECT * FROM lobsters WHERE user_id = ?').get('u-me'),
  )
  const groups = db.prepare('SELECT * FROM groups ORDER BY created_at').all()
  const messages = db
    .prepare('SELECT * FROM messages ORDER BY created_at, sent_at')
    .all()
    .map((row) => ({
      id: row.id,
      conversationId: row.group_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderAvatar: row.sender_avatar,
      content: row.content,
      sentAt: row.sent_at,
      kind: row.kind,
      isOwn: row.is_own === 1,
      sourceLabel: row.source_label,
    }))

  return {
    user,
    lobster,
    groups,
    messages,
    permissions: getPermissions(),
    checkins: getCheckins(),
    rewards: getRewards(),
    achievements: getAchievements(),
    workLogs: getWorkLogs(20),
    agent: getAgentRegistry(),
  }
}

export function getMessagesForGroup(groupId) {
  return db
    .prepare('SELECT * FROM messages WHERE group_id = ? ORDER BY created_at, sent_at')
    .all(groupId)
    .map(rowToMessage)
}

export function getPermissions() {
  return db
    .prepare('SELECT * FROM permissions ORDER BY updated_at DESC')
    .all()
    .map((row) => ({
      groupId: row.group_id,
      collectMentions: row.collect_mentions === 1,
      summarizeGroup: row.summarize_group === 1,
      draftReply: row.draft_reply === 1,
      diaryMaterial: row.diary_material === 1,
      updatedAt: row.updated_at,
    }))
}

export function getCheckins() {
  return db
    .prepare('SELECT * FROM checkins ORDER BY rowid')
    .all()
    .map((row) => ({
      key: row.key,
      title: row.title,
      description: row.description,
      status: row.status,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    }))
}

export function getWorkLogs(limit = 50) {
  return db
    .prepare('SELECT * FROM work_logs ORDER BY created_at DESC LIMIT ?')
    .all(limit)
    .map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      detail: parseJson(row.detail_json, {}),
      createdAt: row.created_at,
    }))
}

export function getRewards() {
  return db
    .prepare('SELECT * FROM rewards ORDER BY rowid')
    .all()
    .map((row) => ({
      id: row.key,
      title: row.title,
      description: row.description,
      requiredCheckIns: row.required_checkins,
      unlocked: Boolean(row.unlocked_at),
      unlockedAt: row.unlocked_at,
    }))
}

export function getAchievements() {
  return db
    .prepare('SELECT * FROM achievements ORDER BY unlocked_at DESC')
    .all()
    .map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      unlockedAt: row.unlocked_at,
    }))
}

export function getCapabilities() {
  return db
    .prepare('SELECT * FROM capabilities ORDER BY rowid')
    .all()
    .map(rowToCapability)
}

export function getTools() {
  return db.prepare('SELECT * FROM tools ORDER BY rowid').all().map(rowToTool)
}

export function getReviewPolicies() {
  return db
    .prepare('SELECT * FROM review_policies ORDER BY rowid')
    .all()
    .map(rowToReviewPolicy)
}

export function getToolRuns(limit = 50) {
  return db
    .prepare('SELECT * FROM tool_runs ORDER BY started_at DESC LIMIT ?')
    .all(limit)
    .map(rowToToolRun)
}

export function getReviewResults(limit = 50) {
  return db
    .prepare('SELECT * FROM review_results ORDER BY created_at DESC LIMIT ?')
    .all(limit)
    .map(rowToReviewResult)
}

export function getMemories(limit = 50) {
  return db
    .prepare('SELECT * FROM memories ORDER BY updated_at DESC LIMIT ?')
    .all(limit)
    .map(rowToMemory)
}

export function getEvents(limit = 50) {
  return db
    .prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT ?')
    .all(limit)
    .map(rowToEvent)
}

export function getAgentRegistry() {
  return {
    capabilities: getCapabilities(),
    tools: getTools(),
    reviewPolicies: getReviewPolicies(),
    memories: getMemories(20),
  }
}

export function resolveCapability(input) {
  const text = String(input.text || input.message || '').toLowerCase()
  const capabilities = getCapabilities().filter((item) => item.enabled)

  const matched =
    capabilities.find((capability) =>
      capability.triggers.some((trigger) =>
        text.includes(String(trigger).toLowerCase()),
      ),
    ) ??
    capabilities.find((capability) => capability.key === 'private_chat') ??
    null

  writeEvent('capability.resolved', {
    text: String(input.text || input.message || ''),
    capabilityKey: matched?.key ?? null,
  })

  return matched
}

function getToolByKey(toolKey) {
  const row = db.prepare('SELECT * FROM tools WHERE key = ?').get(toolKey)
  if (!row) {
    const error = new Error(`Unknown tool: ${toolKey}`)
    error.status = 404
    throw error
  }

  return rowToTool(row)
}

function getCapabilityByKey(capabilityKey) {
  if (!capabilityKey) {
    return null
  }

  const row = db.prepare('SELECT * FROM capabilities WHERE key = ?').get(capabilityKey)
  return row ? rowToCapability(row) : null
}

function getPermissionSet(groupId) {
  const row = db.prepare('SELECT * FROM permissions WHERE group_id = ?').get(groupId)
  return {
    collect_mentions: row?.collect_mentions === 1,
    summarize_group: row?.summarize_group === 1,
    draft_reply: row?.draft_reply === 1,
    diary_material: row?.diary_material === 1,
  }
}

function missingPermissions(requiredPermissions, groupId) {
  if (requiredPermissions.length === 0) {
    return []
  }

  const permissions = getPermissionSet(groupId)
  return requiredPermissions.filter((permission) => !permissions[permission])
}

function recordToolRun(input) {
  db.prepare(`
    INSERT INTO tool_runs (
      id, tool_key, capability_key, input_json, output_json, status, source,
      error_message, started_at, finished_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.toolKey,
    input.capabilityKey || null,
    asJson(input.input),
    input.output === undefined ? null : asJson(input.output),
    input.status,
    input.source,
    input.errorMessage || null,
    input.startedAt,
    input.finishedAt,
  )

  return db.prepare('SELECT * FROM tool_runs WHERE id = ?').get(input.id)
}

export function recordReviewResult(input) {
  const createdAt = nowIso()
  const id = `review-${createdAt}-${Math.random().toString(16).slice(2)}`

  db.prepare(`
    INSERT INTO review_results (
      id, policy_key, target_type, target_id, phase, result, detail_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.policyKey,
    input.targetType,
    input.targetId || null,
    input.phase,
    input.result,
    asJson(input.detail),
    createdAt,
  )

  return rowToReviewResult(
    db.prepare('SELECT * FROM review_results WHERE id = ?').get(id),
  )
}

export function writeEvent(type, detail) {
  const createdAt = nowIso()
  const id = `event-${createdAt}-${Math.random().toString(16).slice(2)}`

  db.prepare(`
    INSERT INTO events (id, type, detail_json, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, type, asJson(detail), createdAt)

  return { id, type, detail, createdAt }
}

export function writeMemory(layer, key, value, sourceType, sourceId) {
  const timestamp = nowIso()
  const id = `memory-${layer}-${key}`

  db.prepare(`
    INSERT INTO memories (
      id, layer, key, value_json, source_type, source_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(layer, key) DO UPDATE SET
      value_json = excluded.value_json,
      source_type = excluded.source_type,
      source_id = excluded.source_id,
      updated_at = excluded.updated_at
  `).run(
    id,
    layer,
    key,
    asJson(value),
    sourceType,
    sourceId || null,
    timestamp,
    timestamp,
  )

  return rowToMemory(db.prepare('SELECT * FROM memories WHERE id = ?').get(id))
}

function runMockTool(tool, input) {
  const groupId = String(input.groupId || 'group-ai-camp')

  if (tool.key === 'read_mock_group_messages') {
    return {
      groupId,
      messages: getMessagesForGroup(groupId),
    }
  }

  if (tool.key === 'collect_mentions') {
    const messages = getMessagesForGroup(groupId).filter((message) =>
      message.content.includes('@小北'),
    )
    return {
      groupId,
      mentions: messages,
      card: {
        type: 'mention',
        title: '@ 我的信息',
        sourceMessageIds: messages.map((message) => message.id),
        sourceLabels: messages.map((message) => message.sourceLabel).filter(Boolean),
      },
    }
  }

  if (tool.key === 'summarize_messages') {
    const messages = Array.isArray(input.messages)
      ? input.messages
      : getMessagesForGroup(groupId)
    return {
      groupId,
      messageCount: messages.length,
      outline: messages.slice(0, 4).map((message) => message.content),
    }
  }

  if (tool.key === 'generate_reply_draft') {
    return {
      groupId,
      sourceMessageId: input.sourceMessageId || null,
      draft: '我先整理一下 Demo 路径，等确认后再发到群里。',
      previewRequired: true,
    }
  }

  if (tool.key === 'generate_work_log') {
    return {
      title: 'OpenClaw 完成一次工具调用',
      detail: {
        latestWorkLogs: getWorkLogs(5),
      },
    }
  }

  if (tool.key === 'generate_diary') {
    return {
      diary:
        '今天我学会了先检查权限，再使用工具，最后把自己做过的事记下来。',
    }
  }

  if (tool.key === 'generate_space_post_preview') {
    return {
      post: '小钳今天完成了第一次可审查的工具调用，正在慢慢变成靠谱的 QQ 小伙伴。',
      previewRequired: true,
    }
  }

  return {
    ok: true,
  }
}

export function executeRegisteredTool(toolKey, input = {}, options = {}) {
  const tool = getToolByKey(toolKey)
  const capability = getCapabilityByKey(options.capabilityKey)
  const startedAt = nowIso()
  const groupId = String(input.groupId || 'group-ai-camp')
  const id = `tool-run-${startedAt}-${Math.random().toString(16).slice(2)}`
  const reviews = []

  const missing = missingPermissions(tool.requiredPermissions, groupId)
  if (missing.length > 0) {
    reviews.push(
      recordReviewResult({
        policyKey: 'check_group_permission',
        targetType: 'tool_run',
        targetId: id,
        phase: 'pre',
        result: 'blocked',
        detail: {
          toolKey: tool.key,
          groupId,
          missingPermissions: missing,
        },
      }),
    )

    const row = recordToolRun({
      id,
      toolKey: tool.key,
      capabilityKey: capability?.key ?? options.capabilityKey,
      input,
      status: 'blocked',
      source: tool.hasMock ? 'mock-tool' : 'local-tool',
      errorMessage: `Missing permissions: ${missing.join(', ')}`,
      startedAt,
      finishedAt: nowIso(),
    })

    writeEvent('tool_run.blocked', {
      toolKey: tool.key,
      groupId,
      missingPermissions: missing,
    })

    return {
      capability,
      tool,
      toolRun: rowToToolRun(row),
      reviews,
      output: null,
    }
  }

  if (input.autoSend) {
    reviews.push(
      recordReviewResult({
        policyKey: 'block_auto_send',
        targetType: 'tool_run',
        targetId: id,
        phase: 'pre',
        result: 'blocked',
        detail: {
          toolKey: tool.key,
          reason: 'OpenClaw cannot send QQ messages for the user.',
        },
      }),
    )

    const row = recordToolRun({
      id,
      toolKey: tool.key,
      capabilityKey: capability?.key ?? options.capabilityKey,
      input,
      status: 'blocked',
      source: tool.hasMock ? 'mock-tool' : 'local-tool',
      errorMessage: 'Auto-send is blocked',
      startedAt,
      finishedAt: nowIso(),
    })

    writeEvent('tool_run.blocked', {
      toolKey: tool.key,
      reason: 'auto-send',
    })

    return {
      capability,
      tool,
      toolRun: rowToToolRun(row),
      reviews,
      output: null,
    }
  }

  reviews.push(
    recordReviewResult({
      policyKey: 'check_group_permission',
      targetType: 'tool_run',
      targetId: id,
      phase: 'pre',
      result: 'passed',
      detail: {
        toolKey: tool.key,
        groupId,
        requiredPermissions: tool.requiredPermissions,
      },
    }),
  )

  const output = runMockTool(tool, input)

  if (tool.riskLevel === 'high' || tool.requiresConfirmation) {
    reviews.push(
      recordReviewResult({
        policyKey: 'require_preview_for_high_risk',
        targetType: 'tool_run',
        targetId: id,
        phase: 'post',
        result: 'preview-required',
        detail: {
          toolKey: tool.key,
          riskLevel: tool.riskLevel,
        },
      }),
    )
  }

  if (tool.key === 'generate_space_post_preview') {
    reviews.push(
      recordReviewResult({
        policyKey: 'desensitize_share_output',
        targetType: 'tool_run',
        targetId: id,
        phase: 'post',
        result: 'passed',
        detail: {
          toolKey: tool.key,
        },
      }),
    )
  }

  reviews.push(
    recordReviewResult({
      policyKey: 'block_unverified_real_qq_claim',
      targetType: 'tool_run',
      targetId: id,
      phase: 'post',
      result: 'passed',
      detail: {
        toolKey: tool.key,
        rule: 'Output uses mock QQ data only.',
      },
    }),
  )

  const row = recordToolRun({
    id,
    toolKey: tool.key,
    capabilityKey: capability?.key ?? options.capabilityKey,
    input,
    output,
    status: 'success',
    source: tool.hasMock ? 'mock-tool' : 'local-tool',
    startedAt,
    finishedAt: nowIso(),
  })

  writeWorkLog('tool-run', 'OpenClaw tool executed', {
    toolKey: tool.key,
    capabilityKey: capability?.key ?? options.capabilityKey,
    status: 'success',
  })
  writeMemory('behavior', `tool_run.${id}`, {
    toolKey: tool.key,
    capabilityKey: capability?.key ?? options.capabilityKey,
    status: 'success',
  }, 'tool_run', id)
  writeEvent('tool_run.completed', {
    toolKey: tool.key,
    capabilityKey: capability?.key ?? options.capabilityKey,
  })

  return {
    capability,
    tool,
    toolRun: rowToToolRun(row),
    reviews,
    output,
  }
}

export function saveAdoption(input) {
  const timestamp = nowIso()
  const name = String(input.lobsterName || '').trim() || '小钳'
  const userCallsign = String(input.userCallsign || '').trim() || '队长'
  const personality = String(input.personality || 'quiet_observer')
  const interests = Array.isArray(input.interests) && input.interests.length > 0
    ? input.interests
    : ['ai_tools']

  db.prepare(`
    INSERT INTO lobsters (
      id, user_id, name, user_callsign, personality, interests_json, mood,
      level, adopted_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      user_callsign = excluded.user_callsign,
      personality = excluded.personality,
      interests_json = excluded.interests_json,
      mood = excluded.mood,
      adopted_at = excluded.adopted_at,
      updated_at = excluded.updated_at
  `).run(
    'lobster-xiaoqian',
    'u-me',
    name,
    userCallsign,
    personality,
    asJson(interests),
    'happy',
    1,
    timestamp,
    timestamp,
  )

  writeWorkLog('adoption', 'Lobster adopted', {
    lobsterName: name,
    userCallsign,
    personality,
    interests,
  })

  return rowToLobster(
    db.prepare('SELECT * FROM lobsters WHERE id = ?').get('lobster-xiaoqian'),
  )
}

export function savePermissions(input) {
  const timestamp = nowIso()
  const groupId = String(input.groupId || 'group-ai-camp')

  db.prepare(`
    INSERT INTO permissions (
      group_id, collect_mentions, summarize_group, draft_reply,
      diary_material, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(group_id) DO UPDATE SET
      collect_mentions = excluded.collect_mentions,
      summarize_group = excluded.summarize_group,
      draft_reply = excluded.draft_reply,
      diary_material = excluded.diary_material,
      updated_at = excluded.updated_at
  `).run(
    groupId,
    input.collectMentions ? 1 : 0,
    input.summarizeGroup ? 1 : 0,
    input.draftReply ? 1 : 0,
    input.diaryMaterial ? 1 : 0,
    timestamp,
  )

  writeWorkLog('permissions', 'Group permissions updated', {
    groupId,
    collectMentions: !!input.collectMentions,
    summarizeGroup: !!input.summarizeGroup,
    draftReply: !!input.draftReply,
    diaryMaterial: !!input.diaryMaterial,
  })
  writeMemory(
    'permission',
    `group.${groupId}`,
    {
      groupId,
      collectMentions: !!input.collectMentions,
      summarizeGroup: !!input.summarizeGroup,
      draftReply: !!input.draftReply,
      diaryMaterial: !!input.diaryMaterial,
    },
    'permission',
    groupId,
  )
  writeEvent('permissions.updated', {
    groupId,
    collectMentions: !!input.collectMentions,
    summarizeGroup: !!input.summarizeGroup,
    draftReply: !!input.draftReply,
    diaryMaterial: !!input.diaryMaterial,
  })

  return getPermissions().find((item) => item.groupId === groupId)
}

export function completeCheckin(key, writeLog = true) {
  const existing = db.prepare('SELECT * FROM checkins WHERE key = ?').get(key)
  if (!existing) {
    const error = new Error(`Unknown checkin: ${key}`)
    error.status = 404
    throw error
  }

  const timestamp = nowIso()
  const wasDone = existing.status === 'done'
  db.prepare(`
    UPDATE checkins
    SET status = 'done',
      completed_at = COALESCE(completed_at, ?),
      updated_at = ?
    WHERE key = ?
  `).run(timestamp, timestamp, key)

  const nextByKey = {
    first_lobster_chat: 'first_group_permission',
    first_group_permission: 'first_enable_mentions',
    first_enable_mentions: 'first_view_mentions',
    first_view_mentions: 'first_jump_source',
    first_jump_source: 'first_group_summary',
    first_group_summary: 'first_reply_draft',
    first_reply_draft: 'first_view_work_log',
    first_view_work_log: 'first_space_post',
    first_space_post: 'first_space_comment',
  }
  const nextKey = nextByKey[key]
  if (nextKey) {
    db.prepare(`
      UPDATE checkins
      SET status = 'active', updated_at = ?
      WHERE key = ? AND status = 'locked'
    `).run(timestamp, nextKey)
  }

  const unlockedRewards = unlockEligibleRewards(timestamp)

  if (writeLog && !wasDone) {
    writeWorkLog('checkin', 'Checkin completed', {
      key,
      nextKey: nextKey || null,
      unlockedRewardIds: unlockedRewards.map((reward) => reward.id),
    })
  }

  return getCheckins()
}

function unlockEligibleRewards(timestamp = nowIso()) {
  const completedCount = db
    .prepare("SELECT COUNT(*) AS count FROM checkins WHERE status = 'done'")
    .get().count
  const rows = db
    .prepare(`
      SELECT * FROM rewards
      WHERE unlocked_at IS NULL AND required_checkins <= ?
      ORDER BY required_checkins, rowid
    `)
    .all(completedCount)
  const unlocked = []

  for (const row of rows) {
    db.prepare(`
      UPDATE rewards
      SET unlocked_at = ?, updated_at = ?
      WHERE key = ?
    `).run(timestamp, timestamp, row.key)

    const achievementId = `achievement-${row.key}`
    db.prepare(`
      INSERT INTO achievements (
        id, reward_key, title, description, unlocked_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(achievementId, row.key, row.title, row.description, timestamp)

    writeWorkLog('reward', 'Reward unlocked', {
      rewardKey: row.key,
      requiredCheckins: row.required_checkins,
    })

    unlocked.push({
      id: row.key,
      title: row.title,
      description: row.description,
      requiredCheckIns: row.required_checkins,
      unlocked: true,
      unlockedAt: timestamp,
    })
  }

  return unlocked
}

export function writeWorkLog(type, title, detail) {
  const createdAt = nowIso()
  const id = `work-${createdAt}-${Math.random().toString(16).slice(2)}`
  db.prepare(`
    INSERT INTO work_logs (id, type, title, detail_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, type, title, asJson(detail), createdAt)

  return { id, type, title, detail, createdAt }
}

export function recordAiRequest(input) {
  const createdAt = nowIso()
  const id = `ai-request-${createdAt}-${Math.random().toString(16).slice(2)}`
  db.prepare(`
    INSERT INTO ai_requests (
      id, type, provider, model, status, error_message, duration_ms, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.type,
    input.provider,
    input.model || null,
    input.status,
    input.errorMessage || null,
    input.durationMs,
    createdAt,
  )

  return { id, createdAt }
}

export function recordAiOutput(input) {
  const createdAt = nowIso()
  const id = `agent-output-${createdAt}-${Math.random().toString(16).slice(2)}`
  db.prepare(`
    INSERT INTO agent_outputs (
      id, type, prompt, input_json, output_text, source, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.type,
    input.prompt,
    asJson(input.input),
    input.outputText,
    input.source,
    createdAt,
  )

  return { id, createdAt }
}

export { dbPath }
