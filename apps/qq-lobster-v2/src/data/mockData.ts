import type {
  AchievementCatalogItem,
  CapabilityCard,
  CheckInItem,
  Interest,
  InterestProfile,
  LobsterProfile,
  MusicListeningSnapshot,
  LobsterReward,
  Personality,
  QQConversation,
  QQMessage,
  QQUser,
  GroupMember,
} from '../types'

export const currentUser: QQUser = {
  id: 'u-me',
  name: '小北',
  avatar: '北',
  status: 'online',
  signature: '今天也在赶项目',
}

export const defaultLobsterProfile: LobsterProfile = {
  id: 'lobster-xiaoqian',
  name: '小钳',
  userCallsign: '队长',
  personality: 'team_spark',
  interests: ['music'],
  mood: 'curious',
  level: 1,
}

export const personalityOptions: Array<{
  id: Personality
  label: string
  sample: string
}> = [
  {
    id: 'team_spark',
    label: '热血队友',
    sample: '冲，今天也把群消息拿下。',
  },
  {
    id: 'cool_secretary',
    label: '清醒参谋',
    sample: '我会先理清重点，再陪你做决定。',
  },
]

export const interestOptions: Array<{
  id: Interest
  label: string
}> = [
  { id: 'music', label: '音乐' },
  { id: 'badminton', label: '羽毛球' },
  { id: 'custom', label: '自定义' },
]

export const interestDemoScope = {
  primaryDepth: {
    interest: 'music',
    label: '音乐',
    sourceLabel: '模拟 QQ 音乐授权数据',
    summary:
      '第一版兴趣系统主打音乐纵深，围绕歌手、歌曲、歌单、曲风和演出提醒做陪伴式 Demo。',
  },
  genericCapabilityExample: {
    interest: 'badminton',
    label: '羽毛球',
    sourceLabel: '公开社群资料 mock',
    summary:
      '社群推荐保留为兴趣系统通用能力，Demo 只用羽毛球 mock 卡展示 QQ 社交生态。',
  },
  firstVersionLimits: [
    '不接真实 QQ 音乐 API',
    '不真实搜索 QQ 群',
    '不自动加群',
    '不自动发动态',
    '不自动替用户评论或申请加入',
    '不做复杂多兴趣调度',
    '不做完整推荐算法',
  ],
  profileSourceRules: [
    '用户在认养时主动选择的兴趣',
    '用户在聊天中主动补充的偏好',
    '用户明确授权的腾讯生态数据',
    '用户主动设置的城市、频率、关键词、屏蔽项',
    '用户使用过程中的明确反馈',
  ],
  inferenceRules: [
    '可解释',
    '可查看',
    '可修改',
    '可删除',
    '不作为事实强行写入',
  ],
  highRiskActionPolicy: [
    {
      action: 'interest_space_post',
      policy: 'preview_then_user_confirm',
    },
    {
      action: 'community_join_or_apply',
      policy: 'forbidden_auto_execute',
    },
    {
      action: 'comment_or_private_message',
      policy: 'preview_then_user_confirm',
    },
  ],
} as const

export const mockQqMusicListeningSnapshot: MusicListeningSnapshot = {
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

export const demoInterestProfileSeeds: InterestProfile[] = [
  {
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
          'Demo 使用模拟授权数据，只用于生成音乐提醒、兴趣日记素材和空间动态草稿。',
        evidenceText:
          '用户在 Demo 初始状态中已授权模拟 QQ 音乐；实时歌单快照显示最近播放包含林俊杰、周杰伦和日音歌单。',
      },
    ],
    reminderFrequency: 'important_only',
    tone: 'same_interest_friend',
    mutedTopics: [],
    updatedAt: '2026-05-04T09:00:00.000Z',
  },
  {
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
    updatedAt: '2026-05-04T09:05:00.000Z',
  },
]

export const conversations: QQConversation[] = [
  {
    id: 'group-ai-camp',
    type: 'group',
    title: 'AI 创作营 - 小组 7',
    avatar: 'AI',
    lastMessage: '@小北 今晚要把 Demo 路径定一下',
    lastAt: '21:18',
    unreadCount: 4,
    pinned: true,
    memberCount: 18,
  },
  {
    id: 'group-class',
    type: 'group',
    title: '软件工程课程群',
    avatar: '课',
    lastMessage: '老师发了验收表，记得看群文件',
    lastAt: '20:44',
    unreadCount: 2,
    memberCount: 63,
  },
  {
    id: 'direct-yang',
    type: 'direct',
    title: '杨夏',
    avatar: '杨',
    lastMessage: '你看下那个小龙虾的首次出现感',
    lastAt: '19:52',
    unreadCount: 1,
  },
  {
    id: 'group-game',
    type: 'group',
    title: '周末开黑预约',
    avatar: '游',
    lastMessage: '今晚十点还有人吗？',
    lastAt: '18:37',
    unreadCount: 0,
    memberCount: 12,
  },
]

export const messages: QQMessage[] = [
  {
    id: 'm-001',
    conversationId: 'group-ai-camp',
    senderId: 'u-yang',
    senderName: '杨夏',
    senderAvatar: '杨',
    content: '我把赛题资料又过了一遍，QQ 里的自然出现感很关键。',
    sentAt: '21:10',
    kind: 'text',
  },
  {
    id: 'm-002',
    conversationId: 'group-ai-camp',
    senderId: 'u-xu',
    senderName: '许舟',
    senderAvatar: '许',
    content: '@小北 今晚要把 Demo 路径定一下，先别做成独立工具首页。',
    sentAt: '21:13',
    kind: 'mention',
    sourceLabel: 'AI 创作营 - 小组 7 / 21:13',
  },
  {
    id: 'm-003',
    conversationId: 'group-ai-camp',
    senderId: 'u-chen',
    senderName: '陈一',
    senderAvatar: '陈',
    content: '我赞成，最好像 QQ 里自己冒出来一个小伙伴，不是弹广告。',
    sentAt: '21:15',
    kind: 'text',
  },
  {
    id: 'm-004',
    conversationId: 'group-ai-camp',
    senderId: 'u-me',
    senderName: '小北',
    senderAvatar: '北',
    content: '我先把主界面和首次出现做出来，后面再接总结和日记。',
    sentAt: '21:17',
    kind: 'text',
    isOwn: true,
  },
  {
    id: 'm-005',
    conversationId: 'group-ai-camp',
    senderId: 'u-yang',
    senderName: '杨夏',
    senderAvatar: '杨',
    content: '可以。第一屏一定要像平时在看群聊。',
    sentAt: '21:18',
    kind: 'text',
  },
  {
    id: 'm-101',
    conversationId: 'group-class',
    senderId: 'u-teacher',
    senderName: '任课老师',
    senderAvatar: '师',
    content: '验收表已经上传到群文件，大家今晚先确认分组和提交格式。',
    sentAt: '20:40',
    kind: 'text',
  },
  {
    id: 'm-102',
    conversationId: 'group-class',
    senderId: 'u-monitor',
    senderName: '学习委员',
    senderAvatar: '委',
    content: '@小北 你们小组的 Demo 说明也记得补到验收表附件里。',
    sentAt: '20:42',
    kind: 'mention',
    sourceLabel: '软件工程课程群 / 20:42',
  },
  {
    id: 'm-103',
    conversationId: 'group-class',
    senderId: 'u-student',
    senderName: '周然',
    senderAvatar: '周',
    content: '老师发了验收表，记得看群文件。',
    sentAt: '20:44',
    kind: 'text',
  },
  {
    id: 'm-201',
    conversationId: 'direct-yang',
    senderId: 'u-yang',
    senderName: '杨夏',
    senderAvatar: '杨',
    content: '你看下那个小龙虾的首次出现感，别像功能入口。',
    sentAt: '19:52',
    kind: 'text',
  },
  {
    id: 'm-202',
    conversationId: 'direct-yang',
    senderId: 'u-me',
    senderName: '小北',
    senderAvatar: '北',
    content: '我会让它像 QQ 里自然冒出来的小伙伴。',
    sentAt: '19:55',
    kind: 'text',
    isOwn: true,
  },
  {
    id: 'm-301',
    conversationId: 'group-game',
    senderId: 'u-game-a',
    senderName: '阿川',
    senderAvatar: '川',
    content: '今晚十点还有人吗？差一个位置。',
    sentAt: '18:37',
    kind: 'text',
  },
  {
    id: 'm-302',
    conversationId: 'group-game',
    senderId: 'u-game-b',
    senderName: '林一',
    senderAvatar: '林',
    content: '我晚点到，先帮我占一下。',
    sentAt: '18:39',
    kind: 'text',
  },
]

export const groupMembers: GroupMember[] = [
  {
    id: 'u-me',
    name: '小北',
    avatar: '北',
    role: 'member',
    online: true,
  },
  {
    id: 'u-yang',
    name: '杨夏',
    avatar: '杨',
    role: 'owner',
    online: true,
  },
  {
    id: 'u-xu',
    name: '许舟',
    avatar: '许',
    role: 'member',
    online: true,
  },
  {
    id: 'u-chen',
    name: '陈一',
    avatar: '陈',
    role: 'member',
    online: false,
  },
]

// checkin is a legacy internal trigger/progress source, not user-facing copy.
export const lobsterCheckIns: CheckInItem[] = [
  {
    id: 'first_lobster_chat',
    title: '第一次聊天',
    description: '在小龙虾私聊里和它说第一句话。',
    status: 'active',
    rewardId: 'tiny-flag',
  },
  {
    id: 'first_group_permission',
    title: '处理一次群聊提醒',
    description:
      '选择授权群，让小龙虾生成一张包含摘要、@ 信号、来源跳转和回复草稿入口的总结卡。',
    status: 'locked',
    rewardId: undefined,
  },
  {
    id: 'first_space_post',
    title: '主动发布空间动态',
    description: '让小龙虾感知值得记录的小节点，并自动发进本地龙虾空间。',
    status: 'locked',
    rewardId: 'space-banner',
  },
  {
    id: 'first_space_comment',
    title: '空间评论回复',
    description: '在龙虾空间里完成一次评论回复。',
    status: 'locked',
    rewardId: undefined,
  },
  {
    id: 'community_saved',
    title: '先收藏一下',
    description: '第一次收藏推荐的 QQ 同好群。',
    status: 'locked',
    rewardId: 'music-note',
  },
  {
    id: 'first_diary_view',
    title: '查看第一条日记',
    description: '第一次打开小龙虾写下的隐藏日记。',
    status: 'locked',
    rewardId: undefined,
  },
  {
    id: 'first_skill_install',
    title: '第一次安装技能',
    description: '第一次把音乐小技能装进小龙虾的小背包。',
    status: 'locked',
    rewardId: 'shell-badge',
  },
  {
    id: 'first_interest_feed_view',
    title: '第一次查看兴趣动态',
    description: '第一次查看基于音乐兴趣生成的新动态。',
    status: 'locked',
    rewardId: undefined,
  },
  {
    id: 'interest_topic_streak_3',
    title: '连续三次讨论兴趣话题',
    description: '连续三次和小龙虾讨论音乐兴趣话题。',
    status: 'locked',
    rewardId: undefined,
  },
  {
    id: 'four_accessories_unlocked',
    title: '解锁四个挂饰',
    description: '小龙虾的四个可佩戴挂饰全部点亮。',
    status: 'locked',
    rewardId: undefined,
  },
]

export const lobsterRewards: LobsterReward[] = [
  {
    id: 'tiny-flag',
    title: '小红旗挂饰',
    description: '完成第一次聊天后解锁，后续可展示在小龙虾形象旁。',
    requiredCheckIns: 1,
    requiredCheckInId: 'first_lobster_chat',
    unlocked: false,
  },
  {
    id: 'space-banner',
    title: '龙虾空间头图',
    description: '第一次由小龙虾主动发布空间动态后解锁。',
    requiredCheckIns: 2,
    requiredCheckInId: 'first_space_post',
    unlocked: false,
  },
  {
    id: 'music-note',
    title: '小音符挂饰',
    description: '第一次收藏推荐 QQ 群后，小龙虾会戴上一枚小音符。',
    requiredCheckIns: 3,
    requiredCheckInId: 'community_saved',
    unlocked: false,
  },
  {
    id: 'shell-badge',
    title: '耳机挂饰',
    description: '第一次安装音乐技能后，小龙虾会戴上一副耳机。',
    requiredCheckIns: 4,
    requiredCheckInId: 'first_skill_install',
    unlocked: false,
  },
]

export const mockCards: CapabilityCard[] = []

export const mockAchievements: AchievementCatalogItem[] = [
  {
    key: 'first_claw_touch',
    id: 'first_claw_touch',
    title: '初次碰钳',
    description: '你和小龙虾完成了第一次对话，它开始记住你了。',
    status: 'locked',
    reward: '小红旗挂饰',
    hidden: false,
    hint: '和小龙虾私聊一句话。',
    triggerCheckInId: 'first_lobster_chat',
  },
  {
    key: 'first_group_signal',
    id: 'first_group_signal',
    title: '捞到重点',
    description: '第一次让小龙虾从群聊里捞出值得看的提醒。',
    status: 'locked',
    reward: '重点提醒点亮',
    hidden: false,
    hint: '授权一个群聊并生成总结卡。',
    triggerCheckInId: 'first_group_permission',
  },
  {
    key: 'first_space_post',
    id: 'first_space_post',
    title: '第一条龙虾动态',
    description: '小龙虾第一次把值得记录的小事发进龙虾空间。',
    status: 'locked',
    reward: '龙虾空间头图',
    hidden: false,
    hint: '让小龙虾生成一条空间动态。',
    triggerCheckInId: 'first_space_post',
  },
  {
    key: 'first_space_reply',
    id: 'first_space_reply',
    title: '评论也会回',
    description: '第一次在龙虾空间里完成评论回复。',
    status: 'locked',
    reward: '互动记录点亮',
    hidden: false,
    hint: '在龙虾空间里回复一条评论。',
    triggerCheckInId: 'first_space_comment',
  },
  {
    key: 'community_saved',
    id: 'community_saved',
    title: '先收藏一下',
    description: '你第一次先收藏了推荐的 QQ 同好群。',
    status: 'locked',
    reward: '小音符挂饰',
    hidden: false,
    hint: '收藏一次推荐 QQ 群。',
    triggerCheckInId: 'community_saved',
  },
  {
    key: 'first_diary_view',
    id: 'first_diary_view',
    title: '查看第一条日记',
    description: '你第一次打开了小龙虾写下的隐藏日记。',
    status: 'locked',
    reward: '日记记录点亮',
    hidden: false,
    hint: '打开第一条小龙虾日记。',
    triggerCheckInId: 'first_diary_view',
  },
  {
    key: 'first_skill_install',
    id: 'first_skill_install',
    title: '第一次安装技能',
    description: '你第一次把音乐小技能装进小龙虾的小背包。',
    status: 'locked',
    reward: '耳机挂饰',
    hidden: false,
    hint: '安装一次音乐小技能。',
    triggerCheckInId: 'first_skill_install',
  },
  {
    key: 'first_interest_feed_view',
    id: 'first_interest_feed_view',
    title: '第一次查看兴趣动态',
    description: '你第一次查看了基于音乐兴趣生成的新动态。',
    status: 'locked',
    reward: '兴趣动态点亮',
    hidden: false,
    hint: '查看一次音乐兴趣动态。',
    triggerCheckInId: 'first_interest_feed_view',
  },
  {
    key: 'interest_topic_streak_3',
    id: 'interest_topic_streak_3',
    title: '连续三次讨论兴趣话题',
    description: '你连续三次和小龙虾讨论了音乐兴趣话题。',
    status: 'locked',
    reward: '兴趣讨论点亮',
    hidden: false,
    hint: '连续发送三条音乐相关聊天。',
    triggerCheckInId: 'interest_topic_streak_3',
  },
  {
    key: 'four_accessories_unlocked',
    id: 'four_accessories_unlocked',
    title: '解锁四个挂饰',
    description: '小龙虾的四个可佩戴挂饰已经全部点亮。',
    status: 'locked',
    reward: '挂饰栏全部点亮',
    hidden: false,
    hint: '解锁全部四个挂饰。',
    triggerCheckInId: 'four_accessories_unlocked',
  },
]
