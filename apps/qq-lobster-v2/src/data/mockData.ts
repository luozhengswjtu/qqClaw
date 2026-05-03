import type {
  AchievementCatalogItem,
  CapabilityCard,
  CheckInItem,
  Interest,
  LobsterProfile,
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
  personality: 'quiet_observer',
  interests: ['ai_tools'],
  mood: 'curious',
  level: 1,
}

export const personalityOptions: Array<{
  id: Personality
  label: string
  sample: string
}> = [
  {
    id: 'sharp_reliable',
    label: '毒舌但靠谱',
    sample: '我会吐槽，但结论先给你。',
  },
  {
    id: 'gentle_companion',
    label: '温柔陪伴',
    sample: '慢慢来，我陪你把消息理顺。',
  },
  {
    id: 'quiet_observer',
    label: '社恐观察',
    sample: '我不吵，但会默默捞重点。',
  },
  {
    id: 'cool_secretary',
    label: '高冷秘书',
    sample: '无关信息已过滤，重点如下。',
  },
  {
    id: 'team_spark',
    label: '热血队友',
    sample: '冲，今天也把群消息拿下。',
  },
]

export const interestOptions: Array<{
  id: Interest
  label: string
}> = [
  { id: 'ai_tools', label: 'AI 工具' },
  { id: 'course_project', label: '课程项目' },
  { id: 'game_group', label: '游戏社群' },
  { id: 'campus_event', label: '校园活动' },
  { id: 'memes', label: '表情包' },
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
    rewardId: 'shell-badge',
  },
  {
    id: 'first_view_work_log',
    title: '查看工作记录',
    description: '确认小龙虾把做过的事记录下来。',
    status: 'locked',
    rewardId: 'logbook',
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
    rewardId: 'star-ornament',
  },
]

export const lobsterRewards: LobsterReward[] = [
  {
    id: 'tiny-flag',
    title: '小红旗挂饰',
    description: '完成第一次聊天后解锁，后续可展示在小龙虾形象旁。',
    requiredCheckIns: 1,
    unlocked: false,
  },
  {
    id: 'shell-badge',
    title: '亮晶晶虾壳',
    description: '生成第一张群聊总结卡后，小龙虾资料卡会点亮第一枚徽章。',
    requiredCheckIns: 2,
    unlocked: false,
  },
  {
    id: 'logbook',
    title: '透明工作簿',
    description: '第一次查看工作记录后解锁。',
    requiredCheckIns: 3,
    unlocked: false,
  },
  {
    id: 'space-banner',
    title: '龙虾空间头图',
    description: '第一次由小龙虾主动发布空间动态后解锁。',
    requiredCheckIns: 4,
    unlocked: false,
  },
  {
    id: 'star-ornament',
    title: '星星挂饰',
    description: '探索完首批成长事件后解锁。',
    requiredCheckIns: 5,
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
    reward: '亮晶晶虾壳',
    hidden: false,
    hint: '授权一个群聊并生成总结卡。',
    triggerCheckInId: 'first_group_permission',
  },
  {
    key: 'first_work_log',
    id: 'first_work_log',
    title: '透明小本本',
    description: '第一次查看小龙虾留下的工作记录。',
    status: 'locked',
    reward: '透明工作簿',
    hidden: false,
    hint: '打开一次工作记录。',
    triggerCheckInId: 'first_view_work_log',
  },
  {
    key: 'first_space_post',
    id: 'first_space_post',
    title: '第一条虾动态',
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
    reward: '星星挂饰',
    hidden: false,
    hint: '在龙虾空间里回复一条评论。',
    triggerCheckInId: 'first_space_comment',
  },
]
