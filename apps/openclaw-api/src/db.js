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

function rowToInterestProfile(row) {
  return createInterestProfile({
    id: row.id,
    interest: row.interest,
    enabled: row.enabled === 1,
    topics: parseJson(row.topics_json, []),
    city: row.city || undefined,
    sources: parseJson(row.sources_json, []),
    reminderFrequency: row.reminder_frequency,
    tone: row.tone,
    mutedTopics: parseJson(row.muted_topics_json, []),
    updatedAt: row.updated_at,
  })
}

function rowToInterestEvent(row) {
  return {
    id: row.id,
    interest: row.interest,
    type: row.type,
    title: row.title,
    summary: row.summary,
    sourceType: row.source_type,
    sourceLabel: row.source_label,
    sourceId: row.source_id,
    detail: parseJson(row.detail_json, {}),
    createdAt: row.created_at,
  }
}

function rowToLobsterChatLine(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    status: row.status || undefined,
    source: row.source || undefined,
    outputId: row.output_id || undefined,
    card: parseJson(row.card_json, undefined),
    suggestions: parseJson(row.suggestions_json, undefined),
  }
}

function normalizeInterest(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
}

function normalizeInterestTopics(topics) {
  if (!Array.isArray(topics)) {
    return []
  }

  return Array.from(
    new Set(
      topics
        .map((topic) => String(topic || '').trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  )
}

function createInterestProfile({
  id,
  interest,
  enabled = true,
  topics = [],
  city,
  sources = [],
  reminderFrequency = 'important_only',
  tone = 'same_interest_friend',
  mutedTopics = [],
  updatedAt = nowIso(),
}) {
  return {
    id: id || `interest-profile-${interest}`,
    interest,
    enabled: Boolean(enabled),
    topics: normalizeInterestTopics(topics),
    city: city ? String(city) : undefined,
    sources,
    reminderFrequency,
    tone,
    mutedTopics: normalizeInterestTopics(mutedTopics),
    updatedAt,
  }
}

function interestMemoryKey(interest) {
  return `profile.${normalizeInterest(interest)}`
}

function getInterestProfileFromMemory(interest) {
  const key = interestMemoryKey(interest)
  const tableRow = db
    .prepare(
      'SELECT * FROM interest_profiles WHERE user_id = ? AND interest = ?',
    )
    .get('u-me', normalizeInterest(interest))

  if (tableRow) {
    return rowToInterestProfile(tableRow)
  }

  const row = db
    .prepare("SELECT * FROM memories WHERE layer = 'interest' AND key = ?")
    .get(key)

  return row ? rowToMemory(row).value : null
}

function getAllInterestProfileMemories() {
  return db
    .prepare(
      "SELECT * FROM memories WHERE layer = 'interest' AND key LIKE 'profile.%' ORDER BY updated_at DESC",
    )
    .all()
    .map(rowToMemory)
}

function upsertInterestProfileRow(profile, userId = 'u-me') {
  const timestamp = nowIso()

  db.prepare(`
    INSERT INTO interest_profiles (
      id, user_id, interest, enabled, topics_json, city, sources_json,
      reminder_frequency, tone, muted_topics_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, interest) DO UPDATE SET
      id = excluded.id,
      enabled = excluded.enabled,
      topics_json = excluded.topics_json,
      city = excluded.city,
      sources_json = excluded.sources_json,
      reminder_frequency = excluded.reminder_frequency,
      tone = excluded.tone,
      muted_topics_json = excluded.muted_topics_json,
      updated_at = excluded.updated_at
  `).run(
    profile.id,
    userId,
    profile.interest,
    profile.enabled ? 1 : 0,
    asJson(profile.topics),
    profile.city || null,
    asJson(profile.sources),
    profile.reminderFrequency,
    profile.tone,
    asJson(profile.mutedTopics),
    timestamp,
    profile.updatedAt || timestamp,
  )

  return rowToInterestProfile(
    db
      .prepare(
        'SELECT * FROM interest_profiles WHERE user_id = ? AND interest = ?',
      )
      .get(userId, profile.interest),
  )
}

function migrateInterestProfileMemoriesToTable() {
  const memories = getAllInterestProfileMemories()

  for (const memory of memories) {
    if (!memory.value?.interest) {
      continue
    }

    upsertInterestProfileRow(
      createInterestProfile({
        ...memory.value,
        interest: normalizeInterest(memory.value.interest),
      }),
    )
  }
}

function isHighRiskInterestText(text) {
  return /住址|身份证|银行卡|财务|健康|病历|学校班级|班级|宿舍|手机号|电话|支付|授权|发动态|加群|申请加入/.test(
    text,
  )
}

function parseLowRiskInterestUpdate(text) {
  const topics = []
  const addIfMentioned = (keyword) => {
    if (text.includes(keyword)) {
      topics.push(keyword)
    }
  }

  ;['林俊杰', '周杰伦', '日摇', '摇滚', '民谣', '电子', '新歌', '演唱会'].forEach(
    addIfMentioned,
  )

  if (topics.length > 0 && /喜欢|关注|最近听|在听|常听|想听/.test(text)) {
    return {
      interest: 'music',
      topics,
      receipt: `已记住一点音乐偏好：${topics.join('、')}。`,
    }
  }

  const badmintonTopics = []
  if (/羽毛球|约球|搭子/.test(text)) {
    if (text.includes('固定搭子') || text.includes('搭子')) {
      badmintonTopics.push('固定搭子')
    }
    if (text.includes('周末')) {
      badmintonTopics.push('周末约球')
    }
    if (text.includes('新手')) {
      badmintonTopics.push('新手友好')
    }
    if (badmintonTopics.length === 0) {
      badmintonTopics.push('羽毛球')
    }

    return {
      interest: 'badminton',
      topics: badmintonTopics,
      receipt: `已记住一点羽毛球偏好：${badmintonTopics.join('、')}。`,
    }
  }

  return null
}

function getInterestProfilesByInput(interest) {
  const normalized = normalizeInterest(interest)
  const profiles = getInterestProfiles()
  if (!normalized) {
    return profiles
  }

  return profiles.filter((profile) => profile.interest === normalized)
}

function getInterestSourceLabel(profile) {
  const source = profile?.sources?.[profile.sources.length - 1] ?? profile?.sources?.[0]
  return source?.title ?? '兴趣记忆'
}

function getMockQqMusicAuthorization() {
  const row = db
    .prepare("SELECT * FROM memories WHERE layer = 'interest' AND key = 'authorization.qq_music'")
    .get()
  const value = row ? rowToMemory(row).value : null

  return {
    authorized: value?.authorized === true,
    sourceLabel: value?.sourceLabel ?? '模拟 QQ 音乐授权数据',
    grantedAt: value?.grantedAt ?? null,
  }
}

function getMockQqMusicListeningSnapshot() {
  return {
    sourceLabel: '模拟 QQ 音乐实时歌单快照',
    syncedAt: '2026-05-06T20:18:00.000+08:00',
    recentPlays: [
      {
        title: '不为谁而作的歌',
        artist: '林俊杰',
        playedAt: '今天 20:12',
        playlist: '最近循环最多',
        listenType: 'recent_play',
        moodTag: '慢慢放松',
      },
      {
        title: '可惜没如果',
        artist: '林俊杰',
        playedAt: '今天 19:48',
        playlist: '最近循环最多',
        listenType: 'loop',
        moodTag: '有点低落',
      },
      {
        title: '晴天',
        artist: '周杰伦',
        playedAt: '今天 18:36',
        playlist: '老歌翻红收藏',
        listenType: 'favorite',
        moodTag: '旧歌回听',
      },
      {
        title: '群青',
        artist: 'YOASOBI',
        playedAt: '昨天 23:10',
        playlist: '晚上写代码用',
        listenType: 'recent_play',
        moodTag: '提神',
      },
      {
        title: 'Lemon',
        artist: '米津玄师',
        playedAt: '昨天 22:42',
        playlist: '晚上写代码用',
        listenType: 'recent_play',
        moodTag: '安静回落',
      },
    ],
    playlists: [
      {
        name: '最近循环最多',
        trackCount: 28,
        updatedAt: '今天 20:15',
        highlights: ['林俊杰', '周杰伦', '情绪慢歌'],
        note: '今晚林俊杰相关歌曲出现最密集。',
      },
      {
        name: '晚上写代码用',
        trackCount: 42,
        updatedAt: '昨天 23:30',
        highlights: ['日摇', '日音', '轻摇滚'],
        note: '夜间更常打开，适合聊提神和沉浸感。',
      },
      {
        name: '老歌翻红收藏',
        trackCount: 35,
        updatedAt: '今天 18:40',
        highlights: ['周杰伦', '林俊杰', '校园感'],
        note: '收藏歌单里旧歌回听明显。',
      },
    ],
    loopSignals: [
      {
        title: '可惜没如果',
        artist: '林俊杰',
        count: 4,
        window: '近 6 小时',
      },
      {
        title: '晴天',
        artist: '周杰伦',
        count: 3,
        window: '近 24 小时',
      },
    ],
    topArtists: [
      {
        name: '林俊杰',
        reason: '近 7 天播放最多，今晚也连续出现在最近播放里。',
      },
      {
        name: '周杰伦',
        reason: '收藏歌单占比高，旧歌回听明显。',
      },
      {
        name: 'YOASOBI / 米津玄师',
        reason: '夜间歌单里出现频繁，偏日音和日摇情绪线。',
      },
    ],
    listeningTrend:
      '今晚更偏林俊杰的情绪慢歌，老歌回听比新歌探索多一点，夜间歌单带一点日音和轻摇滚。',
    chatSuggestions: [
      '从最近循环的林俊杰聊起，问用户今天是不是更想听慢歌。',
      '根据“老歌翻红收藏”聊周杰伦旧歌为什么容易回听。',
      '从夜间日音歌单切入，聊写代码时适合的提神曲风。',
    ],
  }
}

function getMockQqMusicSignals(profile) {
  const authorization = getMockQqMusicAuthorization()
  if (!authorization.authorized) {
    return {
      authorizationStatus: 'not_authorized',
      sourceLabel: authorization.sourceLabel,
      signals: [],
      listeningSnapshot: null,
    }
  }

  const topics = profile?.topics?.length ? profile.topics : ['林俊杰', '周杰伦']
  const secondaryTopic = topics[1] || topics[0]
  const city = profile?.city || '深圳'
  const listeningSnapshot = getMockQqMusicListeningSnapshot()

  return {
    authorizationStatus: 'authorized',
    sourceLabel: authorization.sourceLabel,
    listeningSnapshot,
    signals: [
      {
        id: 'mock-music-signal-jj-lin-shenzhen',
        interest: 'music',
        title: `${topics[0]}演唱会消息更新`,
        summary: `${topics[0]}${city}演唱会信息有更新，可以作为一条音乐提醒。`,
        topics: [topics[0], '演唱会'].filter(Boolean),
        city,
        sourceType: 'qq_music',
        sourceLabel: authorization.sourceLabel,
        riskLevel: 'medium',
      },
      {
        id: 'mock-music-signal-playlist',
        interest: 'music',
        title: `${secondaryTopic}发布了新歌相关动态`,
        summary: `${secondaryTopic}有新歌相关消息，和你保存的音乐兴趣匹配。`,
        topics: [secondaryTopic, '新歌'].filter(Boolean),
        city,
        sourceType: 'qq_music',
        sourceLabel: authorization.sourceLabel,
        riskLevel: 'low',
      },
    ],
  }
}

function getPublicInterestGroupProfiles(interest) {
  const normalized = normalizeInterest(interest) || 'badminton'
  const allGroups = [
    {
      id: 'public-group-music-livehouse-shenzhen',
      interest: 'music',
      title: '深圳 Livehouse 同好群',
      tags: ['音乐', 'livehouse', '新歌', '演出'],
      city: '深圳',
      memberCount: 96,
      publicIntro: '公开群资料显示：分享新歌、演出信息和现场体验。',
      sourceType: 'public_group_profile',
      sourceLabel: '公开群资料',
      publicOnly: true,
    },
    {
      id: 'public-group-music-playlist-night',
      interest: 'music',
      title: '晚间歌单交换所',
      tags: ['音乐', '歌单', '林俊杰', '周杰伦'],
      city: '线上',
      memberCount: 142,
      publicIntro: '公开群资料显示：交换最近循环歌单，讨论歌手和新歌。',
      sourceType: 'public_group_profile',
      sourceLabel: '公开群资料',
      publicOnly: true,
    },
    {
      id: 'public-group-badminton-nanshan',
      interest: 'badminton',
      title: '南山羽毛球周末搭子',
      tags: ['羽毛球', '周末约球', '新手友好'],
      city: '深圳南山',
      memberCount: 128,
      publicIntro: '公开群资料显示：周末约球、新手友好、AA 场地费。',
      sourceType: 'public_group_profile',
      sourceLabel: '公开群资料',
      publicOnly: true,
    },
    {
      id: 'public-group-badminton-afterwork',
      interest: 'badminton',
      title: '科技园下班羽毛球',
      tags: ['羽毛球', '工作日晚场', '固定搭子'],
      city: '深圳南山',
      memberCount: 76,
      publicIntro: '公开群资料显示：工作日晚场，适合找固定搭子。',
      sourceType: 'public_group_profile',
      sourceLabel: '公开群资料',
      publicOnly: true,
    },
  ]

  return allGroups.filter((group) => group.interest === normalized)
}

function rankInterestSignals({ interest, signals = [], profiles = [] }) {
  const normalized = normalizeInterest(interest)
  const profile = profiles.find((item) => item.interest === normalized) ?? profiles[0]
  const profileTopics = new Set(profile?.topics ?? [])

  return signals
    .map((signal) => {
      const topics = Array.isArray(signal.topics) ? signal.topics : []
      const topicScore = topics.filter((topic) => profileTopics.has(topic)).length
      const sourceScore = signal.sourceType === 'qq_music' ? 2 : 1
      const riskPenalty = signal.riskLevel === 'high' ? 3 : signal.riskLevel === 'medium' ? 1 : 0

      return {
        ...signal,
        score: topicScore * 3 + sourceScore - riskPenalty,
        reason:
          profile && topicScore > 0
            ? `匹配兴趣记忆：${topics.filter((topic) => profileTopics.has(topic)).join('、')}`
            : '来自可解释的 mock 兴趣信号。',
      }
    })
    .sort((a, b) => b.score - a.score)
}

function hasInterestExternalAction(input) {
  const text = [
    input.action,
    input.intent,
    input.text,
    input.command,
    input.preview,
    input.post,
  ]
    .filter(Boolean)
    .join(' ')

  return /加群|申请|加入|私聊群主|自动发布|直接发布|autoJoin|joinGroup|messageOwner|autoPublish/i.test(
    text,
  )
}

function includesUnsafeCommunityWording(text) {
  const unsafePatterns = [
    ['他们', '最近', '在约'],
    ['我看到', '群里'],
    ['帮你判断', '靠不靠谱'],
    ['帮你整理', '入群问题'],
    ['代你', '申请'],
    ['自动', '加入'],
    ['我帮你判断', '这个群', '靠谱'],
    ['我看到', '群里', '正在聊'],
  ].map((parts) => parts.join(''))

  return unsafePatterns.some((phrase) => text.includes(phrase))
}

function rowToEvent(row) {
  return {
    id: row.id,
    type: row.type,
    detail: parseJson(row.detail_json, {}),
    createdAt: row.created_at,
  }
}

function rowToAgentOutput(row) {
  return {
    id: row.id,
    type: row.type,
    prompt: row.prompt,
    input: parseJson(row.input_json, {}),
    outputText: row.output_text,
    source: row.source,
    createdAt: row.created_at,
  }
}

function rowToSpaceComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    authorType: row.author_type,
    content: row.content,
    sourceOutputId: row.source_output_id,
    sourceToolRunId: row.source_tool_run_id,
    previewRequired: row.preview_required === 1,
    createdAt: row.created_at,
  }
}

function rowToSpacePost(row) {
  return {
    id: row.id,
    kind: row.kind,
    authorLobsterId: row.author_lobster_id,
    authorName: row.author_name,
    content: row.content,
    sourceOutputId: row.source_output_id,
    sourceWorkLogId: row.source_work_log_id,
    sourceToolRunId: row.source_tool_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    title: '处理一次群聊提醒',
    description:
      '选择授权群，让小龙虾生成一张包含摘要、@ 信号、来源跳转和回复草稿入口的总结卡。',
    status: 'locked',
    rewardKey: 'shell-badge',
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
    title: '主动发布空间动态',
    description: '让小龙虾感知值得记录的小节点，并自动发进本地龙虾空间。',
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
  {
    key: 'first_interest_memory',
    title: '第一次同频',
    description: '第一次补充一条可解释的兴趣画像。',
    status: 'locked',
    rewardKey: 'music-note',
  },
  {
    key: 'first_music_signal',
    title: '小小听歌虾',
    description: '第一次生成音乐同好提醒。',
    status: 'locked',
    rewardKey: 'music-note',
  },
  {
    key: 'first_interest_space_post',
    title: '同好动态',
    description: '第一次发布兴趣空间动态。',
    status: 'locked',
    rewardKey: 'music-note',
  },
  {
    key: 'first_community_card',
    title: '发现同好',
    description: '第一次看到兴趣社群推荐。',
    status: 'locked',
    rewardKey: 'badminton-racket',
  },
  {
    key: 'community_saved',
    title: '先收藏一下',
    description: '第一次收藏推荐社群。',
    status: 'locked',
    rewardKey: 'badminton-racket',
  },
  {
    key: 'safe_distance',
    title: '安全距离',
    description: '多次收藏同好群但不急着申请加入。',
    status: 'locked',
    rewardKey: 'lookout-shell',
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
    description: '生成第一张群聊总结卡后，小龙虾资料卡会点亮第一枚徽章。',
    requiredCheckins: 2,
  },
  {
    key: 'logbook',
    title: '透明工作簿',
    description: '第一次查看工作记录后解锁。',
    requiredCheckins: 3,
  },
  {
    key: 'space-banner',
    title: '龙虾空间头图',
    description: '第一次由小龙虾主动发布空间动态后解锁。',
    requiredCheckins: 4,
  },
  {
    key: 'star-ornament',
    title: '星星挂饰',
    description: '完成全部新手打卡后解锁。',
    requiredCheckins: 5,
  },
  {
    key: 'music-note',
    title: '小音符挂饰',
    description: '第一次生成音乐同好提醒后，小龙虾会戴上一枚小音符。',
    requiredCheckins: 7,
  },
  {
    key: 'badminton-racket',
    title: '小球拍挂饰',
    description: '第一次发现羽毛球同好群后，小龙虾会带上小球拍。',
    requiredCheckins: 9,
  },
  {
    key: 'lookout-shell',
    title: '安全距离贴纸',
    description: '多次收藏但不急着申请加入时，小龙虾会贴上一枚观察贴纸。',
    requiredCheckins: 11,
  },
]

const achievementEventByCheckin = {
  first_lobster_chat: {
    event: 'chat.first_message',
    achievementKey: 'first_claw_touch',
  },
  first_group_permission: {
    event: 'group.first_signal',
    achievementKey: 'first_group_signal',
  },
  first_view_work_log: {
    event: 'worklog.first_view',
    achievementKey: 'first_work_log',
  },
  first_space_post: {
    event: 'space.first_post',
    achievementKey: 'first_space_post',
  },
  first_space_comment: {
    event: 'space.first_comment_reply',
    achievementKey: 'first_space_reply',
  },
  first_interest_memory: {
    event: 'interest.memory.first_saved',
    achievementKey: 'first_interest_memory',
  },
  first_music_signal: {
    event: 'interest.music.first_signal',
    achievementKey: 'first_music_signal',
  },
  first_interest_space_post: {
    event: 'interest.space.first_post',
    achievementKey: 'first_interest_space_post',
  },
  first_community_card: {
    event: 'interest.community.first_card',
    achievementKey: 'first_community_card',
  },
  community_saved: {
    event: 'interest.community.first_saved',
    achievementKey: 'community_saved',
  },
  safe_distance: {
    event: 'interest.community.safe_distance',
    achievementKey: 'safe_distance',
  },
}

const achievementByRewardKey = {
  'tiny-flag': {
    key: 'first_claw_touch',
    title: '初次碰钳',
    description: '你和小龙虾完成了第一次对话，它开始记住你了。',
    reward: '小红旗挂饰',
  },
  'shell-badge': {
    key: 'first_group_signal',
    title: '捞到重点',
    description: '第一次让小龙虾从群聊里捞出值得看的提醒。',
    reward: '亮晶晶虾壳',
  },
  logbook: {
    key: 'first_work_log',
    title: '透明小本本',
    description: '第一次查看小龙虾留下的工作记录。',
    reward: '透明工作簿',
  },
  'space-banner': {
    key: 'first_space_post',
    title: '第一条虾动态',
    description: '小龙虾第一次把值得记录的小事发进龙虾空间。',
    reward: '龙虾空间头图',
  },
  'star-ornament': {
    key: 'first_space_reply',
    title: '评论也会回',
    description: '第一次在龙虾空间里完成评论回复。',
    reward: '星星挂饰',
  },
  'music-note': {
    key: 'first_music_signal',
    title: '小小听歌虾',
    description: '小龙虾第一次用同好口吻讲述了一条音乐新动态。',
    reward: '小音符挂饰',
  },
  'badminton-racket': {
    key: 'first_community_card',
    title: '发现同好',
    description: '小龙虾第一次基于公开资料讲述了一个可能适合的同好群。',
    reward: '小球拍挂饰',
  },
  'lookout-shell': {
    key: 'safe_distance',
    title: '安全距离',
    description:
      '不急着加入也很好，先蹲一蹲、看一看，也是很聪明的社交方式。',
    reward: '安全距离贴纸',
  },
}

function getAchievementTrigger(checkinKey) {
  const trigger = achievementEventByCheckin[checkinKey]
  return trigger ? { checkInId: checkinKey, ...trigger } : null
}

function getAchievementTriggerForRewardKey(rewardKey) {
  const achievementKey = achievementByRewardKey[rewardKey]?.key
  if (!achievementKey) {
    return null
  }

  const entry = Object.entries(achievementEventByCheckin).find(
    ([, trigger]) => trigger.achievementKey === achievementKey,
  )

  return entry ? { checkInId: entry[0], ...entry[1] } : null
}

function rewardToAchievement(row, timestamp) {
  const catalog = achievementByRewardKey[row.key]
  const achievementId = `achievement-${row.key}`
  const achievementKey = catalog?.key ?? achievementId

  return {
    id: achievementId,
    key: achievementKey,
    title: catalog?.title ?? row.title,
    description: catalog?.description ?? row.description,
    status: 'unlocked',
    reward: catalog?.reward ?? row.title,
    hidden: false,
    hint: '',
    triggerCheckInId: row.triggerCheckInId,
    event: row.event,
    unlockedAt: timestamp,
  }
}

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
  const legacyKeys = [
    'discover_lobster',
    'adopt_lobster',
    'first_enable_mentions',
    'first_view_mentions',
    'first_jump_source',
    'first_group_summary',
    'first_reply_draft',
  ]
  const legacyRewardKeys = ['mention-pin', 'summary-badge']
  const deleteLegacyCheckin = db.prepare('DELETE FROM checkins WHERE key = ?')
  for (const key of legacyKeys) {
    deleteLegacyCheckin.run(key)
  }
  const deleteLegacyAchievement = db.prepare(
    'DELETE FROM achievements WHERE reward_key = ?',
  )
  const deleteLegacyReward = db.prepare('DELETE FROM rewards WHERE key = ?')
  for (const key of legacyRewardKeys) {
    deleteLegacyAchievement.run(key)
    deleteLegacyReward.run(key)
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
      description: '基于已沉淀的 checkins、work_logs 和 agent_outputs 生成第一人称日记素材。',
      triggers: ['日记', '写一篇'],
      requiredPermissions: [],
      riskLevel: 'medium',
      outputType: 'card',
      toolKeys: ['generate_diary'],
    },
    {
      key: 'generate_space_post_preview',
      title: '空间动态预览',
      description: '生成小龙虾空间动态预览，发布前需要确认和脱敏。',
      triggers: ['发空间', '空间动态'],
      requiredPermissions: [],
      riskLevel: 'high',
      outputType: 'preview',
      toolKeys: ['generate_space_post_preview'],
    },
    {
      key: 'interest_brief',
      title: '兴趣简报',
      description: '基于已保存的兴趣记忆生成可解释的兴趣简报。',
      triggers: ['兴趣简报', '我的兴趣', '音乐', '歌手', '羽毛球'],
      requiredPermissions: [],
      riskLevel: 'low',
      outputType: 'card',
      toolKeys: ['read_mock_interest_profile', 'rank_interest_signals'],
    },
    {
      key: 'interest_reminder',
      title: '兴趣提醒',
      description: '基于兴趣记忆和 mock 信号生成重要兴趣提醒，必须显示来源。',
      triggers: ['兴趣提醒', '新歌', '演唱会', '音乐提醒', '羽毛球提醒'],
      requiredPermissions: [],
      riskLevel: 'medium',
      outputType: 'card',
      toolKeys: [
        'read_mock_interest_profile',
        'read_mock_qq_music_signals',
        'rank_interest_signals',
        'generate_interest_reminder_card',
      ],
    },
    {
      key: 'interest_space_post_preview',
      title: '兴趣空间动态预览',
      description: '基于兴趣记忆生成龙虾空间动态预览，发布前必须确认。',
      triggers: ['兴趣空间', '音乐空间', '羽毛球空间', '兴趣动态预览'],
      requiredPermissions: [],
      riskLevel: 'high',
      outputType: 'preview',
      toolKeys: ['generate_interest_space_post_preview'],
    },
    {
      key: 'interest_community_recommendation',
      title: '兴趣社群推荐',
      description: '只基于公开资料生成兴趣社群推荐卡，不读取未授权群聊。',
      triggers: ['羽毛球群', '同好群', '兴趣社群', '找搭子', '社群推荐'],
      requiredPermissions: [],
      riskLevel: 'medium',
      outputType: 'card',
      toolKeys: ['read_public_group_profiles', 'generate_interest_community_card'],
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
      description: '基于 OpenClaw 已沉淀记录生成小龙虾第一人称日记素材。',
      inputSchema: { context: 'object' },
      outputSchema: { diary: 'string' },
      requiredPermissions: [],
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
      requiredPermissions: [],
      riskLevel: 'high',
      requiresConfirmation: true,
      hasMock: true,
    },
    {
      key: 'read_mock_interest_profile',
      title: '读取模拟兴趣画像',
      description: '读取本地 memory 中的兴趣画像，只返回可解释来源。',
      inputSchema: { interest: 'string' },
      outputSchema: { profiles: 'InterestProfile[]' },
      requiredPermissions: [],
      riskLevel: 'low',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'read_mock_qq_music_signals',
      title: '读取模拟 QQ 音乐信号',
      description: '只读取 Demo 的 mock QQ 音乐授权信号，不接入真实 QQ 音乐。',
      inputSchema: { interest: 'music' },
      outputSchema: { authorizationStatus: 'string', signals: 'object[]' },
      requiredPermissions: [],
      riskLevel: 'medium',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'read_public_group_profiles',
      title: '读取公开群资料',
      description: '只读取公开群名、标签和简介，不读取未授权群聊消息。',
      inputSchema: { interest: 'string' },
      outputSchema: { publicGroups: 'object[]' },
      requiredPermissions: [],
      riskLevel: 'medium',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'rank_interest_signals',
      title: '排序兴趣信号',
      description: '根据兴趣画像、来源可信度和风险等级对候选兴趣信号排序。',
      inputSchema: { interest: 'string', signals: 'object[]' },
      outputSchema: { ranked: 'object[]' },
      requiredPermissions: [],
      riskLevel: 'low',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'generate_interest_reminder_card',
      title: '生成兴趣提醒卡',
      description: '生成低到中风险兴趣提醒卡，输出必须包含来源。',
      inputSchema: { interest: 'string', signal: 'object' },
      outputSchema: { card: 'object', sourceLabel: 'string' },
      requiredPermissions: [],
      riskLevel: 'medium',
      requiresConfirmation: false,
      hasMock: true,
    },
    {
      key: 'generate_interest_space_post_preview',
      title: '生成兴趣空间动态预览',
      description: '生成兴趣相关的龙虾空间动态预览，不自动发布。',
      inputSchema: { interest: 'string', signal: 'object' },
      outputSchema: { preview: 'string', previewRequired: 'boolean' },
      requiredPermissions: [],
      riskLevel: 'high',
      requiresConfirmation: true,
      hasMock: true,
    },
    {
      key: 'generate_interest_community_card',
      title: '生成兴趣社群推荐卡',
      description: '基于公开群资料生成社群推荐卡，不替用户判断，不自动加群。',
      inputSchema: { interest: 'string', publicGroups: 'object[]' },
      outputSchema: { card: 'object', publicOnly: 'boolean' },
      requiredPermissions: [],
      riskLevel: 'medium',
      requiresConfirmation: false,
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
    {
      key: 'interest_reminder_requires_source',
      title: '兴趣提醒必须显示来源',
      phase: 'post',
      description: '兴趣提醒卡可以直接展示，但必须显示兴趣画像和信号来源。',
      appliesTo: ['tool_run', 'agent_output'],
      action: 'annotate',
    },
    {
      key: 'qq_music_mock_authorization_visible',
      title: 'QQ 音乐 mock 授权状态可见',
      phase: 'post',
      description: '读取 QQ 音乐 mock 信号时必须返回授权状态和来源说明。',
      appliesTo: ['tool_run'],
      action: 'annotate',
    },
    {
      key: 'interest_space_preview_required',
      title: '兴趣空间动态必须预览',
      phase: 'post',
      description: '兴趣空间动态只能生成预览，发布前必须确认。',
      appliesTo: ['tool_run', 'space_post'],
      action: 'preview',
    },
    {
      key: 'user_confirmed_interest_space_post',
      title: '兴趣空间动态用户确认',
      phase: 'pre',
      description: '兴趣空间动态发布必须来自用户确认，不能由小龙虾自动发布。',
      appliesTo: ['space_post', 'action'],
      action: 'require_confirmation',
    },
    {
      key: 'public_group_only_for_community',
      title: '社群推荐只用公开资料',
      phase: 'post',
      description: '社群推荐只能使用公开群名、标签和简介，不能暗示读取群聊消息。',
      appliesTo: ['tool_run'],
      action: 'annotate',
    },
    {
      key: 'block_interest_external_action',
      title: '禁止自动执行兴趣外部动作',
      phase: 'pre',
      description: '加群、申请加入、私聊群主或代用户发布必须阻断。',
      appliesTo: ['tool_run', 'action'],
      action: 'block',
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

    CREATE TABLE IF NOT EXISTS lobster_chat_lines (
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

    CREATE TABLE IF NOT EXISTS space_posts (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      author_lobster_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      source_output_id TEXT,
      source_work_log_id TEXT,
      source_tool_run_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS space_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES space_posts(id),
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT NOT NULL,
      author_type TEXT NOT NULL,
      content TEXT NOT NULL,
      source_output_id TEXT,
      source_tool_run_id TEXT,
      preview_required INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS space_interactions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES space_posts(id),
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      detail_json TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS interest_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      interest TEXT NOT NULL,
      enabled INTEGER NOT NULL,
      topics_json TEXT NOT NULL,
      city TEXT,
      sources_json TEXT NOT NULL,
      reminder_frequency TEXT NOT NULL,
      tone TEXT NOT NULL,
      muted_topics_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, interest)
    );

    CREATE TABLE IF NOT EXISTS interest_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      interest TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_label TEXT NOT NULL,
      source_id TEXT,
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
  migrateInterestProfileMemoriesToTable()
}

export function resetDemoState() {
  db.exec('BEGIN IMMEDIATE')
  try {
    db.exec(`
      DELETE FROM events;
      DELETE FROM memories;
      DELETE FROM interest_events;
      DELETE FROM interest_profiles;
      DELETE FROM review_results;
      DELETE FROM review_policies;
      DELETE FROM tool_runs;
      DELETE FROM tools;
      DELETE FROM capabilities;
      DELETE FROM ai_requests;
      DELETE FROM space_interactions;
      DELETE FROM space_comments;
      DELETE FROM space_posts;
      DELETE FROM lobster_chat_lines;
      DELETE FROM agent_outputs;
      DELETE FROM achievements;
      DELETE FROM rewards;
      DELETE FROM work_logs;
      DELETE FROM checkins;
      DELETE FROM permissions;
      DELETE FROM messages;
      DELETE FROM groups;
      DELETE FROM lobsters;
      DELETE FROM users;
    `)
    insertSeedRows()
    insertAgentSeedRows()
    migrateInterestProfileMemoriesToTable()
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return getBootstrap()
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
    lobsterChatLines: getLobsterChatLines(),
    permissions: getPermissions(),
    checkins: getCheckins(),
    rewards: getRewards(),
    achievements: getAchievements(),
    workLogs: getWorkLogs(20),
    diary: getHiddenDiaryState(),
    space: getSpaceState(),
    interestProfiles: getInterestProfiles(),
    agent: getAgentRegistry(),
  }
}

export function getLobsterChatLines(limit = 200) {
  return db
    .prepare('SELECT * FROM lobster_chat_lines ORDER BY created_at, rowid LIMIT ?')
    .all(limit)
    .map(rowToLobsterChatLine)
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

export function getAgentOutputs(limit = 50) {
  return db
    .prepare('SELECT * FROM agent_outputs ORDER BY created_at DESC LIMIT ?')
    .all(limit)
    .map(rowToAgentOutput)
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

export function getInterestProfiles() {
  const rows = db
    .prepare(
      'SELECT * FROM interest_profiles WHERE user_id = ? ORDER BY updated_at DESC',
    )
    .all('u-me')

  if (rows.length > 0) {
    return rows.map(rowToInterestProfile)
  }

  return getAllInterestProfileMemories().map((memory) => memory.value)
}

export function getInterestEvents(limit = 50, interest) {
  const normalized = normalizeInterest(interest)

  if (normalized) {
    return db
      .prepare(
        'SELECT * FROM interest_events WHERE user_id = ? AND interest = ? ORDER BY created_at DESC LIMIT ?',
      )
      .all('u-me', normalized, limit)
      .map(rowToInterestEvent)
  }

  return db
    .prepare(
      'SELECT * FROM interest_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    )
    .all('u-me', limit)
    .map(rowToInterestEvent)
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

function getSpacePostsRaw() {
  return db
    .prepare('SELECT * FROM space_posts ORDER BY created_at DESC')
    .all()
    .map(rowToSpacePost)
}

function getSpaceCommentsForPost(postId) {
  return db
    .prepare('SELECT * FROM space_comments WHERE post_id = ? ORDER BY created_at')
    .all(postId)
    .map(rowToSpaceComment)
}

function getSpaceInteractionCounts(postId) {
  const rows = db
    .prepare(`
      SELECT type, COUNT(*) AS count
      FROM space_interactions
      WHERE post_id = ?
      GROUP BY type
    `)
    .all(postId)

  return rows.reduce(
    (counts, row) => ({
      ...counts,
      [row.type]: row.count,
    }),
    { like: 0, share: 0 },
  )
}

function getLatestHiddenDiaryForSpace() {
  const state = getHiddenDiaryState()
  return state.entry ?? state.entries[0] ?? null
}

function ensureSeedSpacePosts() {
  const timestamp = nowIso()
  const lobster = rowToLobster(
    db.prepare('SELECT * FROM lobsters WHERE user_id = ?').get('u-me'),
  )
  const lobsterName = lobster?.name || '小钳'
  const hasAchievementPost = db
    .prepare("SELECT 1 FROM space_posts WHERE kind = 'achievement' LIMIT 1")
    .get()
  const latestAchievement = getAchievements()[0]

  if (!hasAchievementPost && latestAchievement) {
    const achievementPost = saveSpacePost({
      kind: 'achievement',
      content: `${lobsterName} 解锁了「${latestAchievement.title}」。今天的打卡又往前走了一步。`,
      sourceWorkLogId: latestAchievement.id,
    })
    seedSpaceComments(achievementPost.id, timestamp)
  }

  for (const post of getSpacePostsRaw()) {
    seedSpaceComments(post.id, timestamp)
  }
}

function seedSpaceComments(postId, timestamp = nowIso()) {
  const existing = db
    .prepare('SELECT COUNT(*) AS count FROM space_comments WHERE post_id = ?')
    .get(postId).count

  if (existing > 0) {
    return
  }

  const comments = [
    {
      id: `space-comment-${postId}-friend`,
      authorId: 'u-yang',
      authorName: '杨夏',
      authorAvatar: '杨',
      authorType: 'friend',
      content: '这个像真的住进 QQ 里的小伙伴了。',
    },
    {
      id: `space-comment-${postId}-lobster-friend`,
      authorId: 'lobster-lanlan',
      authorName: '蓝蓝虾',
      authorAvatar: '蓝',
      authorType: 'friend_lobster',
      content: '我也想来评论一下，今天的小钳很认真。',
    },
  ]

  const insert = db.prepare(`
    INSERT INTO space_comments (
      id, post_id, author_id, author_name, author_avatar, author_type, content,
      source_output_id, source_tool_run_id, preview_required, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `)

  for (const comment of comments) {
    insert.run(
      comment.id,
      postId,
      comment.authorId,
      comment.authorName,
      comment.authorAvatar,
      comment.authorType,
      comment.content,
      null,
      null,
      0,
      timestamp,
    )
  }
}

export function getSpaceState() {
  ensureSeedSpacePosts()

  const posts = getSpacePostsRaw().map((post) => {
    const comments = getSpaceCommentsForPost(post.id)
    const interactions = getSpaceInteractionCounts(post.id)

    return {
      ...post,
      comments,
      likeCount: interactions.like,
      shareCount: interactions.share,
      commentCount: comments.length,
      likedByMe: Boolean(
        db
          .prepare(
            "SELECT 1 FROM space_interactions WHERE post_id = ? AND user_id = ? AND type = 'like'",
          )
          .get(post.id, 'u-me'),
      ),
    }
  })

  return {
    owner: rowToLobster(
      db.prepare('SELECT * FROM lobsters WHERE user_id = ?').get('u-me'),
    ),
    posts,
  }
}

export function saveSpacePost(input) {
  const timestamp = nowIso()
  const lobster = rowToLobster(
    db.prepare('SELECT * FROM lobsters WHERE user_id = ?').get('u-me'),
  )
  const id = input.id || `space-post-${timestamp}-${Math.random().toString(16).slice(2)}`
  const kind = String(input.kind || 'diary')
  const content = String(input.content || '').trim()

  if (!content) {
    const error = new Error('Space post content is required')
    error.status = 400
    throw error
  }

  db.prepare(`
    INSERT INTO space_posts (
      id, kind, author_lobster_id, author_name, content, source_output_id,
      source_work_log_id, source_tool_run_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      kind = excluded.kind,
      author_lobster_id = excluded.author_lobster_id,
      author_name = excluded.author_name,
      content = excluded.content,
      source_output_id = excluded.source_output_id,
      source_work_log_id = excluded.source_work_log_id,
      source_tool_run_id = excluded.source_tool_run_id,
      updated_at = excluded.updated_at
  `).run(
    id,
    kind,
    lobster?.id || 'lobster-xiaoqian',
    lobster?.name || '小钳',
    content,
    input.sourceOutputId || null,
    input.sourceWorkLogId || null,
    input.sourceToolRunId || null,
    timestamp,
    timestamp,
  )

  writeWorkLog('space-post', 'Lobster space post created', {
    postId: id,
    kind,
    sourceOutputId: input.sourceOutputId || null,
    sourceWorkLogId: input.sourceWorkLogId || null,
    sourceToolRunId: input.sourceToolRunId || null,
  })
  writeMemory(
    'space',
    `post.${id}`,
    {
      postId: id,
      kind,
      content,
    },
    'space_post',
    id,
  )
  writeEvent('space.post.created', {
    postId: id,
    kind,
  })
  seedSpaceComments(id, timestamp)

  return rowToSpacePost(db.prepare('SELECT * FROM space_posts WHERE id = ?').get(id))
}

export function recordSpaceInteraction(input) {
  const post = db.prepare('SELECT * FROM space_posts WHERE id = ?').get(input.postId)
  if (!post) {
    const error = new Error(`Unknown space post: ${input.postId}`)
    error.status = 404
    throw error
  }

  const type = String(input.type || '')
  if (!['like', 'share'].includes(type)) {
    const error = new Error(`Unsupported space interaction: ${type}`)
    error.status = 400
    throw error
  }

  if (type === 'like') {
    const existing = db
      .prepare(
        "SELECT * FROM space_interactions WHERE post_id = ? AND user_id = ? AND type = 'like'",
      )
      .get(input.postId, 'u-me')
    if (existing) {
      return getSpaceState()
    }
  }

  const createdAt = nowIso()
  const id = `space-interaction-${createdAt}-${Math.random().toString(16).slice(2)}`
  db.prepare(`
    INSERT INTO space_interactions (id, post_id, user_id, type, detail_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.postId,
    'u-me',
    type,
    asJson(input.detail || {}),
    createdAt,
  )

  writeWorkLog('space-interaction', 'Space interaction recorded', {
    postId: input.postId,
    type,
  })
  writeEvent('space.interaction.recorded', {
    postId: input.postId,
    type,
  })

  return getSpaceState()
}

export function saveSpaceComment(input) {
  const post = db.prepare('SELECT * FROM space_posts WHERE id = ?').get(input.postId)
  if (!post) {
    const error = new Error(`Unknown space post: ${input.postId}`)
    error.status = 404
    throw error
  }

  const content = String(input.content || '').trim()
  if (!content) {
    const error = new Error('Space comment content is required')
    error.status = 400
    throw error
  }

  const createdAt = nowIso()
  const id = input.id || `space-comment-${createdAt}-${Math.random().toString(16).slice(2)}`

  db.prepare(`
    INSERT INTO space_comments (
      id, post_id, author_id, author_name, author_avatar, author_type, content,
      source_output_id, source_tool_run_id, preview_required, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.postId,
    input.authorId || 'u-me',
    input.authorName || '小北',
    input.authorAvatar || '北',
    input.authorType || 'human',
    content,
    input.sourceOutputId || null,
    input.sourceToolRunId || null,
    input.previewRequired ? 1 : 0,
    createdAt,
  )

  writeWorkLog('space-comment', 'Space comment recorded', {
    postId: input.postId,
    commentId: id,
    authorType: input.authorType || 'human',
    previewRequired: !!input.previewRequired,
  })
  writeEvent('space.comment.created', {
    postId: input.postId,
    commentId: id,
    authorType: input.authorType || 'human',
  })

  return rowToSpaceComment(
    db.prepare('SELECT * FROM space_comments WHERE id = ?').get(id),
  )
}

export function resolveCapability(input) {
  const text = String(input.text || input.message || '').toLowerCase()
  const capabilities = getCapabilities().filter((item) => item.enabled)
  const triggerMatches = capabilities
    .flatMap((capability) =>
      capability.triggers.map((trigger) => ({
        capability,
        trigger: String(trigger).toLowerCase(),
      })),
    )
    .filter((item) => item.trigger && text.includes(item.trigger))
    .sort((a, b) => b.trigger.length - a.trigger.length)

  const matched =
    triggerMatches[0]?.capability ??
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

function normalizeLobsterChatLine(line) {
  const createdAt = line?.createdAt || line?.created_at || nowIso()

  return {
    id: String(line?.id || `lobster-chat-${createdAt}-${Math.random().toString(16).slice(2)}`),
    role: line?.role === 'user' ? 'user' : 'lobster',
    content: String(line?.content || ''),
    status: line?.status ? String(line.status) : null,
    source: line?.source ? String(line.source) : null,
    outputId: line?.outputId || line?.output_id ? String(line.outputId || line.output_id) : null,
    card: line?.card ?? null,
    suggestions: Array.isArray(line?.suggestions) ? line.suggestions : null,
    createdAt,
  }
}

export function saveLobsterChatLine(input) {
  const line = normalizeLobsterChatLine(input)

  db.prepare(`
    INSERT INTO lobster_chat_lines (
      id, role, content, status, source, output_id, card_json, suggestions_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      role = excluded.role,
      content = excluded.content,
      status = excluded.status,
      source = excluded.source,
      output_id = excluded.output_id,
      card_json = excluded.card_json,
      suggestions_json = excluded.suggestions_json,
      created_at = excluded.created_at
  `).run(
    line.id,
    line.role,
    line.content,
    line.status,
    line.source,
    line.outputId,
    line.card ? asJson(line.card) : null,
    line.suggestions ? asJson(line.suggestions) : null,
    line.createdAt,
  )

  return rowToLobsterChatLine(
    db.prepare('SELECT * FROM lobster_chat_lines WHERE id = ?').get(line.id),
  )
}

export function saveLobsterChatLines(lines) {
  const normalizedLines = Array.isArray(lines) ? lines : []
  if (normalizedLines.length === 0) {
    return []
  }

  db.exec('BEGIN IMMEDIATE')
  try {
    const savedLines = normalizedLines.map((item) => saveLobsterChatLine(item))
    db.exec('COMMIT')
    return savedLines
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
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

export function deleteMemory(layer, key) {
  db.prepare('DELETE FROM memories WHERE layer = ? AND key = ?').run(layer, key)

  writeEvent('memory.deleted', {
    layer,
    key,
  })

  return true
}

export function recordInterestEvent(input) {
  const interest = normalizeInterest(input?.interest)
  const type = String(input?.type || '').trim()
  const title = String(input?.title || '').trim()
  const summary = String(input?.summary || '').trim()
  const createdAt = input?.createdAt || nowIso()
  const id =
    input?.id ||
    `interest-event-${interest || 'unknown'}-${createdAt}-${Math.random()
      .toString(16)
      .slice(2)}`

  if (!interest || !type || !title || !summary) {
    const error = new Error('Interest event requires interest, type, title and summary')
    error.status = 400
    throw error
  }

  db.prepare(`
    INSERT INTO interest_events (
      id, user_id, interest, type, title, summary, source_type, source_label,
      source_id, detail_json, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    'u-me',
    interest,
    type,
    title,
    summary,
    String(input.sourceType || 'mock'),
    String(input.sourceLabel || 'mock'),
    input.sourceId || null,
    asJson(input.detail ?? {}),
    createdAt,
  )

  writeEvent('interest.event.recorded', {
    interest,
    type,
    eventId: id,
    sourceType: input.sourceType || 'mock',
  })

  return rowToInterestEvent(
    db.prepare('SELECT * FROM interest_events WHERE id = ?').get(id),
  )
}

export function saveInterestProfile(profile, sourceType = 'manual', sourceId = null) {
  const interest = normalizeInterest(profile?.interest)
  if (!interest) {
    const error = new Error('Interest is required')
    error.status = 400
    throw error
  }

  const normalized = createInterestProfile({
    ...profile,
    interest,
    sources: Array.isArray(profile?.sources) ? profile.sources : [],
    updatedAt: nowIso(),
  })
  const memory = writeMemory(
    'interest',
    interestMemoryKey(interest),
    normalized,
    sourceType,
    sourceId || normalized.id,
  )
  const savedProfile = upsertInterestProfileRow(normalized)

  writeWorkLog('interest_profile_updated', 'Interest profile updated', {
    interest,
    topics: normalized.topics,
    sources: normalized.sources.map((source) => ({
      type: source.type,
      title: source.title,
      authorized: source.authorized,
    })),
  })
  writeEvent('interest.profile.updated', {
    interest,
    sourceType,
  })

  return savedProfile ?? memory.value
}

export function deleteInterestProfile(interest) {
  const normalized = normalizeInterest(interest)
  if (!normalized) {
    const error = new Error('Interest is required')
    error.status = 400
    throw error
  }

  deleteMemory('interest', interestMemoryKey(normalized))
  db
    .prepare('DELETE FROM interest_profiles WHERE user_id = ? AND interest = ?')
    .run('u-me', normalized)
  writeWorkLog('interest_profile_updated', 'Interest profile deleted', {
    interest: normalized,
  })
  writeEvent('interest.profile.deleted', {
    interest: normalized,
  })

  return getInterestProfiles()
}

export function updateInterestProfileSettings(interest, patch) {
  const normalized = normalizeInterest(interest)
  const existing = getInterestProfileFromMemory(normalized)
  if (!existing) {
    const error = new Error(`Unknown interest profile: ${normalized}`)
    error.status = 404
    throw error
  }
  const hasTopicsPatch = Array.isArray(patch?.topics)
  const hasCityPatch = Object.prototype.hasOwnProperty.call(patch ?? {}, 'city')
  const topics = hasTopicsPatch
    ? normalizeInterestTopics(patch.topics)
    : existing.topics
  const city = hasCityPatch
    ? String(patch.city || '').trim() || undefined
    : existing.city
  const sources =
    hasTopicsPatch || hasCityPatch
      ? [
          ...existing.sources,
          {
            id: `source-user-setting-${Date.now()}`,
            type: 'user_setting',
            title: '你手动修改了兴趣记忆',
            authorized: false,
            permissionNote:
              '用户可随时查看、修改、删除这条兴趣记忆，或关闭相关提醒。',
            evidenceText: [
              topics.length > 0 ? `关注对象：${topics.join('、')}` : '',
              city ? `城市：${city}` : '',
            ]
              .filter(Boolean)
              .join('；'),
          },
        ]
      : existing.sources

  return saveInterestProfile(
    {
      ...existing,
      topics,
      city,
      sources,
      reminderFrequency:
        typeof patch?.reminderFrequency === 'string'
          ? patch.reminderFrequency
          : existing.reminderFrequency,
      mutedTopics: Array.isArray(patch?.mutedTopics)
        ? patch.mutedTopics
        : existing.mutedTopics,
      enabled:
        typeof patch?.enabled === 'boolean' ? patch.enabled : existing.enabled,
    },
    'user_feedback',
    `interest-${normalized}`,
  )
}

export function authorizeMockQqMusic() {
  const profile = createInterestProfile({
    id: 'seed-music-authorized',
    interest: 'music',
    enabled: true,
    topics: ['林俊杰', '周杰伦', '日摇'],
    city: '深圳',
    sources: [
      {
        id: 'source-mock-qq-music',
        type: 'qq_music',
        title: '模拟 QQ 音乐授权数据',
        authorized: true,
        permissionNote:
          'Demo 使用模拟 QQ 音乐授权数据，只用于生成音乐提醒、兴趣日记素材、龙虾空间动态草稿和兴趣成就。',
        evidenceText:
          '用户在 Demo 中确认授权模拟 QQ 音乐；实时歌单快照显示最近播放包含林俊杰、周杰伦和日音歌单。',
      },
    ],
    reminderFrequency: 'important_only',
    tone: 'same_interest_friend',
    mutedTopics: [],
  })

  writeMemory(
    'interest',
    'authorization.qq_music',
    {
      authorized: true,
      sourceLabel: '模拟 QQ 音乐授权数据',
      grantedAt: profile.updatedAt,
    },
    'qq_music',
    'mock-qq-music',
  )

  return saveInterestProfile(profile, 'qq_music', 'mock-qq-music')
}

export function inferAndSaveInterestFromChat(text) {
  const content = String(text || '').trim()
  if (!content) {
    return { status: 'none' }
  }

  if (isHighRiskInterestText(content)) {
    writeWorkLog('interest_profile_update_pending', 'Interest update needs confirmation', {
      reason: 'high_risk_or_external_action',
      evidenceText: content,
    })

    return {
      status: 'needs_confirmation',
      reason: '这类信息或动作影响较高，需要你确认后我才会保存或执行。',
      evidenceText: content,
    }
  }

  const update = parseLowRiskInterestUpdate(content)
  if (!update) {
    return { status: 'none' }
  }

  const existing = getInterestProfileFromMemory(update.interest)
  const topics = normalizeInterestTopics([
    ...(existing?.topics ?? []),
    ...update.topics,
  ])
  const sources = [
    ...(existing?.sources ?? []),
    {
      id: `source-chat-${Date.now()}`,
      type: 'chat',
      title: '你刚刚在聊天里提到',
      authorized: false,
      permissionNote:
        '低风险兴趣偏好可自动保存；你可以随时查看、修改或删除。',
      evidenceText: content,
    },
  ]
  const profile = saveInterestProfile(
    createInterestProfile({
      ...(existing ?? {}),
      id: existing?.id || `interest-profile-${update.interest}`,
      interest: update.interest,
      enabled: existing?.enabled ?? true,
      topics,
      city: existing?.city,
      sources,
      reminderFrequency: existing?.reminderFrequency ?? 'important_only',
      tone: existing?.tone ?? 'same_interest_friend',
      mutedTopics: existing?.mutedTopics ?? [],
    }),
    'chat',
    'lobster-chat',
  )

  return {
    status: 'saved',
    profile,
    receipt: update.receipt,
  }
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

  if (tool.key === 'read_mock_interest_profile') {
    const profiles = getInterestProfilesByInput(input.interest)
    return {
      interest: input.interest || null,
      profiles,
      sourceLabels: profiles.map(getInterestSourceLabel),
    }
  }

  if (tool.key === 'read_mock_qq_music_signals') {
    const profile = getInterestProfilesByInput('music')[0]
    return {
      interest: 'music',
      ...getMockQqMusicSignals(profile),
    }
  }

  if (tool.key === 'read_public_group_profiles') {
    const interest = input.interest || 'badminton'
    return {
      interest,
      publicGroups: getPublicInterestGroupProfiles(interest),
      boundary:
        '只使用公开群名、标签和简介，不读取未授权群聊消息，不自动申请加入。',
    }
  }

  if (tool.key === 'rank_interest_signals') {
    const profiles = Array.isArray(input.profiles)
      ? input.profiles
      : getInterestProfilesByInput(input.interest)
    const ranked = rankInterestSignals({
      interest: input.interest,
      signals: Array.isArray(input.signals) ? input.signals : [],
      profiles,
    })

    return {
      interest: input.interest || null,
      ranked,
    }
  }

  if (tool.key === 'generate_interest_reminder_card') {
    const profile = getInterestProfilesByInput(input.interest)[0]
    const signal = input.signal || getMockQqMusicSignals(profile).signals[0]
    const sourceLabel = signal?.sourceLabel ?? getInterestSourceLabel(profile)

    return {
      card: {
        type: 'interest_reminder',
        interest: input.interest || profile?.interest || signal?.interest || 'music',
        narrative:
          '我刚看到一条和林俊杰有关的深圳演出更新，感觉你可能会在意。因为你授权了模拟 QQ 音乐数据，兴趣记忆里也有林俊杰和深圳，所以我把它夹出来给你看。Demo 数据是模拟的，不代表真实票务信息。',
        title: signal?.title ?? '你关注的兴趣有新动态',
        summary: signal?.summary ?? '我找到一条和兴趣记忆相关的 mock 信号。',
        reason:
          signal?.reason ??
          `基于你的兴趣记忆：${profile?.topics?.join('、') || '已保存偏好'}。`,
        sourceLabel,
        sourceType: signal?.sourceType ?? profile?.sources?.[0]?.type ?? 'mock',
        riskNote: '低到中风险兴趣提醒，可直接展示；来源已标注。',
        actions: [
          {
            id: 'view_source',
            label: '查看来源',
          },
          {
            id: 'generate_space_post',
            label: '生成龙虾空间动态',
          },
        ],
      },
      sourceLabel,
      previewRequired: false,
    }
  }

  if (tool.key === 'generate_interest_space_post_preview') {
    const profile = getInterestProfilesByInput(input.interest)[0]
    const signal = input.signal || getMockQqMusicSignals(profile).signals[0]
    return {
      interest: input.interest || profile?.interest || signal?.interest || 'music',
      preview:
        input.preview ||
        `小钳想发一条兴趣动态：${signal?.summary ?? '今天的兴趣记忆有了新素材。'}`,
      sourceLabel: signal?.sourceLabel ?? getInterestSourceLabel(profile),
      sourceType: signal?.sourceType ?? profile?.sources?.[0]?.type ?? 'mock',
      previewRequired: true,
      blockedActions: ['autoPublish', 'sendWithoutConfirmation'],
    }
  }

  if (tool.key === 'generate_interest_community_card') {
    const interest = input.interest || 'badminton'
    const publicGroups = Array.isArray(input.publicGroups)
      ? input.publicGroups
      : getPublicInterestGroupProfiles(interest)
    const firstGroup = publicGroups[0]

    return {
      card: {
        type: 'interest_community',
        interest,
        narrative:
          firstGroup
            ? `我发现一个可能适合你的${interest === 'music' ? '音乐' : '兴趣'}同好群：${firstGroup.title}。${firstGroup.publicIntro} 我只看公开资料，不读取群聊内容，也不会替你申请加入。`
            : '暂时没有匹配的公开社群资料。我不会读取未授权群聊，也不会替你申请加入。',
        title: '公开社群资料推荐',
        summary: publicGroups.length
          ? `${publicGroups[0].title} 和你的兴趣标签较接近。`
          : '暂时没有匹配的公开社群资料。',
        groups: publicGroups.map((group) => ({
          id: group.id,
          title: group.title,
          tags: group.tags,
          city: group.city,
          memberCount: group.memberCount,
          publicIntro: group.publicIntro,
          sourceLabel: group.sourceLabel,
        })),
        reason: '只根据公开群名、标签和简介推荐，不读取群聊消息，不替你判断是否加入。',
        sourceLabel: '公开群资料',
        riskNote: '中风险社群推荐，只展示公开资料，不自动加群或私聊群主。',
        sourceDetail:
          '只使用公开群名、公开标签和公开简介。是否进一步查看或申请加入，由你自己决定。',
        community: publicGroups[0]
          ? {
              id: publicGroups[0].id,
              title: publicGroups[0].title,
              tags: publicGroups[0].tags,
              publicIntro: publicGroups[0].publicIntro,
              city: publicGroups[0].city,
              sourceLabel: publicGroups[0].sourceLabel,
              reason:
                interest === 'music'
                  ? '公开资料与音乐、歌手、演出和歌单话题接近。'
                  : '公开资料与固定搭子、周末约球、新手友好的兴趣记忆接近。',
              boundary: '未加入群，仅基于公开资料。',
            }
          : undefined,
        actions: [
          {
            id: 'view_source',
            label: '查看公开资料',
          },
          {
            id: 'favorite',
            label: '收藏',
          },
          {
            id: 'apply_to_join',
            label: '申请加入',
          },
        ],
      },
      publicOnly: true,
      blockedActions: ['joinGroup', 'messageOwner'],
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
  const isInterestTool =
    tool.key.startsWith('interest_') ||
    tool.key.includes('_interest_') ||
    capability?.key?.startsWith('interest_')

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

  if (isInterestTool && hasInterestExternalAction(input)) {
    reviews.push(
      recordReviewResult({
        policyKey: 'block_interest_external_action',
        targetType: 'tool_run',
        targetId: id,
        phase: 'pre',
        result: 'blocked',
        detail: {
          toolKey: tool.key,
          capabilityKey: capability?.key ?? options.capabilityKey,
          reason: 'Interest tools cannot join groups, message owners, or publish for the user.',
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
      errorMessage: 'Interest external action is blocked',
      startedAt,
      finishedAt: nowIso(),
    })

    writeEvent('tool_run.blocked', {
      toolKey: tool.key,
      reason: 'interest-external-action',
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

  if (tool.key === 'generate_interest_reminder_card') {
    reviews.push(
      recordReviewResult({
        policyKey: 'interest_reminder_requires_source',
        targetType: 'tool_run',
        targetId: id,
        phase: 'post',
        result: output.sourceLabel || output.card?.sourceLabel ? 'passed' : 'blocked',
        detail: {
          toolKey: tool.key,
          sourceLabel: output.sourceLabel ?? output.card?.sourceLabel ?? null,
          previewRequired: false,
        },
      }),
    )
  }

  if (tool.key === 'read_mock_qq_music_signals') {
    reviews.push(
      recordReviewResult({
        policyKey: 'qq_music_mock_authorization_visible',
        targetType: 'tool_run',
        targetId: id,
        phase: 'post',
        result: 'passed',
        detail: {
          toolKey: tool.key,
          authorizationStatus: output.authorizationStatus,
          sourceLabel: output.sourceLabel,
        },
      }),
    )
  }

  if (tool.key === 'generate_interest_space_post_preview') {
    reviews.push(
      recordReviewResult({
        policyKey: 'interest_space_preview_required',
        targetType: 'tool_run',
        targetId: id,
        phase: 'post',
        result: output.previewRequired ? 'preview-required' : 'blocked',
        detail: {
          toolKey: tool.key,
          previewRequired: output.previewRequired === true,
        },
      }),
    )
  }

  if (tool.key === 'read_public_group_profiles' || tool.key === 'generate_interest_community_card') {
    const boundaryText = JSON.stringify(output)
    reviews.push(
      recordReviewResult({
        policyKey: 'public_group_only_for_community',
        targetType: 'tool_run',
        targetId: id,
        phase: 'post',
        result:
          output.publicOnly !== false && !includesUnsafeCommunityWording(boundaryText)
            ? 'passed'
            : 'blocked',
        detail: {
          toolKey: tool.key,
          publicOnly: output.publicOnly !== false,
          forbiddenExpressionFound: includesUnsafeCommunityWording(boundaryText),
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
  writeMemory(
    'interest',
    'selected_interests',
    {
      interests,
      source: 'adoption',
      note:
        '用户在认养时主动选择的兴趣标签；具体兴趣画像需要来自聊天补充、授权数据、用户设置或使用反馈。',
    },
    'adoption',
    'lobster-xiaoqian',
  )

  if (interests.includes('music')) {
    writeMemory(
      'interest',
      'selected.music',
      {
        interest: 'music',
        selected: true,
        authorized: false,
        note: '用户选择了音乐兴趣，但尚未确认模拟 QQ 音乐授权。',
      },
      'adoption',
      'lobster-xiaoqian',
    )
  }

  if (interests.includes('badminton')) {
    saveInterestProfile(
      createInterestProfile({
        id: 'seed-badminton-community',
        interest: 'badminton',
        enabled: true,
        topics: ['固定搭子', '周末约球', '新手友好'],
        city: '深圳南山',
        sources: [
          {
            id: 'source-public-badminton-group',
            type: 'public_group_profile',
            title: '公开群资料',
            authorized: false,
            permissionNote:
              '只读取公开群名、标签和简介，不读取未授权群聊消息，不自动申请加入。',
            evidenceText:
              '用户曾在聊天中说过想找固定搭子；候选群信息只来自公开群名、标签和简介。',
          },
        ],
        reminderFrequency: 'important_only',
        tone: 'same_interest_friend',
        mutedTopics: [],
      }),
      'adoption',
      'lobster-xiaoqian',
    )
  }

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

function getHiddenDiaryEntry() {
  const row = db
    .prepare("SELECT * FROM memories WHERE layer = 'diary' AND key = ?")
    .get('hidden_first_diary')

  return row ? rowToMemory(row).value : null
}

function getReusableHiddenDiaryEntry(entry) {
  return entry?.source === 'real-ai' ? entry : null
}

export function getDiaryTriggerContext() {
  const lobster = rowToLobster(
    db.prepare('SELECT * FROM lobsters WHERE user_id = ?').get('u-me'),
  )
  const checkins = getCheckins()
  const permissions = getPermissions()
  const workLogs = getWorkLogs(80)
  const agentOutputs = getAgentOutputs(40)

  const completedCheckins = checkins
    .filter((item) => item.status === 'done')
    .map((item) => item.key)
  const authorizedGroups = permissions.filter(
    (permission) => permission.summarizeGroup,
  )
  const summaryLogs = workLogs.filter((item) => item.type === 'summarize-group')
  const replyDraftLogs = workLogs.filter((item) => item.type === 'reply-draft')
  const summaryOutputs = agentOutputs.filter(
    (item) => item.type === 'summarize_group',
  )
  const replyDraftOutputs = agentOutputs.filter(
    (item) => item.type === 'generate_reply_draft',
  )
  const hasMentionSignal = summaryLogs.some(
    (item) => Number(item.detail?.mentionCount || 0) > 0,
  )

  const checks = [
    {
      key: 'adopted',
      passed: Boolean(lobster?.adoptedAt),
    },
    {
      key: 'first_lobster_chat_done',
      passed: completedCheckins.includes('first_lobster_chat'),
    },
    {
      key: 'authorized_group',
      passed: authorizedGroups.length > 0,
    },
    {
      key: 'viewed_at_signal',
      passed: hasMentionSignal,
    },
    {
      key: 'summarized_group',
      passed: summaryLogs.length > 0 && summaryOutputs.length > 0,
    },
    {
      key: 'reply_draft_generated',
      passed: replyDraftLogs.length > 0 && replyDraftOutputs.length > 0,
    },
  ]

  return {
    eligible: checks.every((item) => item.passed),
    checks,
    materials: {
      lobster,
      completedCheckins,
      authorizedGroups: authorizedGroups.map((item) => item.groupId),
      latestWorkLogs: workLogs.slice(0, 8),
      latestAgentOutputs: agentOutputs.slice(0, 6).map((item) => ({
        id: item.id,
        type: item.type,
        outputText: item.outputText,
        source: item.source,
        createdAt: item.createdAt,
      })),
      mentionCount: summaryLogs.reduce(
        (count, item) => count + Number(item.detail?.mentionCount || 0),
        0,
      ),
      summaryOutputId: summaryOutputs[0]?.id ?? null,
      replyDraftOutputId: replyDraftOutputs[0]?.id ?? null,
    },
  }
}

export function getHiddenDiaryState() {
  const context = getDiaryTriggerContext()
  const entry = getReusableHiddenDiaryEntry(getHiddenDiaryEntry())

  return {
    eligible: context.eligible,
    canTrigger: context.eligible && !entry,
    checks: context.checks,
    triggered: Boolean(entry),
    revealed: Boolean(entry?.revealedAt),
    unlocked: Boolean(entry?.revealedAt),
    entry,
    entries: entry ? [entry] : [],
  }
}

export function saveHiddenDiaryEntry(input) {
  const createdAt = input.createdAt || nowIso()
  const entry = {
    id: input.id || `hidden-diary-${createdAt}`,
    title: input.title || '偷偷写的一页',
    text: input.text,
    quote: input.quote,
    todayAchievement: input.todayAchievement,
    source: input.source,
    outputId: input.outputId,
    toolRunId: input.toolRunId,
    image: input.image ?? null,
    createdAt,
    revealedAt: input.revealedAt ?? null,
  }

  writeMemory(
    'diary',
    'hidden_first_diary',
    entry,
    'agent_output',
    entry.outputId,
  )
  writeEvent('diary.hidden_first.triggered', {
    diaryId: entry.id,
    outputId: entry.outputId,
    toolRunId: entry.toolRunId,
  })

  return entry
}

export function attachHiddenDiaryImage(image) {
  const entry = getHiddenDiaryEntry()
  if (!entry) {
    const error = new Error('Hidden diary has not been triggered')
    error.status = 404
    throw error
  }

  const updatedEntry = {
    ...entry,
    image,
  }

  writeMemory(
    'diary',
    'hidden_first_diary',
    updatedEntry,
    'image',
    image.id,
  )
  writeWorkLog('diary-image', 'Diary image generated', {
    diaryId: updatedEntry.id,
    imageId: image.id,
    source: image.source,
  })
  writeEvent('diary.hidden_first.image_generated', {
    diaryId: updatedEntry.id,
    imageId: image.id,
    source: image.source,
  })

  return updatedEntry
}

export function revealHiddenDiaryEntry() {
  const entry = getHiddenDiaryEntry()
  if (!entry) {
    const error = new Error('Hidden diary has not been triggered')
    error.status = 404
    throw error
  }

  const revealedEntry = entry.revealedAt
    ? entry
    : {
        ...entry,
        revealedAt: nowIso(),
      }

  if (!entry.revealedAt) {
    writeMemory(
      'diary',
      'hidden_first_diary',
      revealedEntry,
      'agent_output',
      revealedEntry.outputId,
    )
    writeWorkLog('hidden-diary-reveal', 'Hidden diary revealed', {
      diaryId: revealedEntry.id,
      outputId: revealedEntry.outputId,
    })
    writeEvent('diary.hidden_first.revealed', {
      diaryId: revealedEntry.id,
      outputId: revealedEntry.outputId,
    })
  }

  return getHiddenDiaryState()
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
  const achievementTrigger = getAchievementTrigger(key)
  db.prepare(`
    UPDATE checkins
    SET status = 'done',
      completed_at = COALESCE(completed_at, ?),
      updated_at = ?
    WHERE key = ?
  `).run(timestamp, timestamp, key)

  const nextByKey = {
    first_lobster_chat: 'first_group_permission',
    first_group_permission: 'first_view_work_log',
    first_view_work_log: 'first_space_post',
    first_space_post: 'first_space_comment',
    first_space_comment: 'first_interest_memory',
    first_interest_memory: 'first_music_signal',
    first_music_signal: 'first_interest_space_post',
    first_interest_space_post: 'first_community_card',
    first_community_card: 'community_saved',
    community_saved: 'safe_distance',
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
  const newlyUnlockedAchievements = unlockedRewards.map((reward) =>
    rewardToAchievement(
      {
        ...reward,
        key: reward.id,
        event: reward.event,
        triggerCheckInId: reward.triggerCheckInId,
      },
      timestamp,
    ),
  )

  if (writeLog && !wasDone) {
    writeWorkLog('checkin', 'Checkin completed', {
      key,
      nextKey: nextKey || null,
      achievementEvent: achievementTrigger?.event ?? null,
      achievementKey: achievementTrigger?.achievementKey ?? null,
      unlockedRewardIds: unlockedRewards.map((reward) => reward.id),
      unlockedAchievementIds: newlyUnlockedAchievements.map(
        (achievement) => achievement.id,
      ),
    })
  }

  return {
    checkins: getCheckins(),
    newlyUnlockedRewards: wasDone ? [] : unlockedRewards,
    newlyUnlockedAchievements: wasDone ? [] : newlyUnlockedAchievements,
  }
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
    const rewardTrigger = getAchievementTriggerForRewardKey(row.key)
    db.prepare(`
      UPDATE rewards
      SET unlocked_at = ?, updated_at = ?
      WHERE key = ?
    `).run(timestamp, timestamp, row.key)

    const achievement = rewardToAchievement(
      {
        ...row,
        event: rewardTrigger?.event,
        triggerCheckInId: rewardTrigger?.checkInId,
      },
      timestamp,
    )
    db.prepare(`
      INSERT INTO achievements (
        id, reward_key, title, description, unlocked_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(
      achievement.id,
      row.key,
      achievement.title,
      achievement.description,
      timestamp,
    )

    writeWorkLog('reward', 'Reward unlocked', {
      rewardKey: row.key,
      requiredCheckins: row.required_checkins,
      achievementEvent: rewardTrigger?.event ?? null,
      achievementKey: achievement.key,
    })

    unlocked.push({
      id: row.key,
      title: row.title,
      description: row.description,
      requiredCheckIns: row.required_checkins,
      unlocked: true,
      unlockedAt: timestamp,
      event: rewardTrigger?.event,
      triggerCheckInId: rewardTrigger?.checkInId,
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
