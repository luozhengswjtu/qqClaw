const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const DNA =
  "Anthropomorphic crayfish mascot in the design language of Tencent's QQ Penguin (QQ企鹅) IP — a cute Tencent-style mascot character, NOT a realistic crustacean and NOT a generic chibi animal. " +
  'Posture: standing UPRIGHT on two short stubby legs, like a QQ-Penguin-style mascot greeting the viewer. ' +
  'Body: pear-shaped, plump and round; big head, smaller torso, two short legs visible at the bottom; cream-white belly #ffe0d1, bright orange-red shell on the head and back #f45c35 with darker #d93f25 shading. ' +
  'Hands = the two front CLAWS, used like cartoon hands for waving, holding, gesturing. ' +
  'Head: a pair of small slender antennae on top (so it still reads as a crayfish), big round black eyes with bold white highlights, soft pink cheek blush, simple friendly mouth. ' +
  "Signature accessory (must appear in every full-body image): a bright RED scarf wrapped around the neck — this is the IP anchor, in the same spirit as QQ Penguin's red scarf. " +
  'Tail: only a short small crayfish tail tucked behind/under the body, NOT dragging long. ' +
  'Style: glossy 3D-ish soft cel-shading, smooth gradients, clean rounded vector outline, Tencent QQ-mascot feel; cute, friendly, harmless, like a Tencent IP plushie come to life. ' +
  'Hard NOs: no human face, no human proportions, no realistic crustacean anatomy, no horror, no sharp teeth, no weapons, no extra limbs, no text, no watermark, no logo. ' +
  'Single character only, centered, full body visible, generous padding around the character. ' +
  'Soft top light, no shadow on background. ' +
  'Transparent background (PNG alpha) unless the scene specifies otherwise.'

const SCARF_LINE =
  "Signature accessory (must appear in every full-body image): a bright RED scarf wrapped around the neck — this is the IP anchor, in the same spirit as QQ Penguin's red scarf. "
const FULL_BODY_LINE =
  'Single character only, centered, full body visible, generous padding around the character. '

const dnaForBadge = DNA.replace(SCARF_LINE, '').replace(FULL_BODY_LINE, '')

const rows = [
  ['图名', '应用场景', '应用位置', '完整提示词'],

  [
    'lobster-happy.png',
    '默认开心打招呼，全项目最高频的"小龙虾本人"形象，覆盖大部分聊天和奖励瞬间。',
    '聊天每条 AI 消息头像；返回小龙虾入口（QQShell.tsx:231）；认养完成页（AdoptionFlow.tsx:287）；空间动态卡；日记惊喜弹层；右侧主形象当 lobsterProfile.mood===\'happy\'（LobsterChatView.tsx:2302）；多处 size=sm/lg 调用。',
    DNA +
      ' Pose: standing upright on two short stubby legs in a confident QQ-mascot greeting pose; ONE claw raised high in a friendly wave, the OTHER claw resting on the hip; eyes closed in a wide cheerful upward-arc smile; body slightly leaning forward toward the viewer. The bright red scarf flows softly to one side as if caught in a small breeze. This is the DEFAULT friendly greeting pose used as the chat avatar across the whole product. ' +
      'Output: 1024x1024 PNG with transparent background.',
  ],

  [
    'lobster-curious.png',
    '好奇/探头/试探，认养前自然出现入口和认养性格选择阶段。',
    'QQ 主界面浮动入口（QQShell.tsx:350）；认养性格阶段（AdoptionFlow.tsx:69, 89）；首次出现的好奇瞬间；右侧主形象当 mood===\'curious\'。',
    DNA +
      ' Pose: standing upright on two short stubby legs; head clearly tilted to the right in a curious gesture; eyes wide open and big with bold circular highlights; ONE claw lightly touching its own chin in a "hmm?" thinking pose, the other claw hanging at the side; body slightly leaning forward as if peeking; a small soft pastel question-mark sparkle floats beside the head; the red scarf hangs gently. Friendly, harmless, slightly hesitant feeling. ' +
      'Output: 1024x1024 PNG with transparent background.',
  ],

  [
    'lobster-focused.png',
    '认真处理群聊/工作/思考的状态形象。',
    '右侧主形象当 lobsterProfile.mood===\'focused\'（LobsterChatView.tsx:2302）；处理群聊感知卡片、生成回复草稿、生成 work_log 时的状态切换；阶段 5/6 群聊感知卡周边可复用。',
    DNA +
      ' Pose: standing upright with good posture on two short stubby legs; ONE claw holds a tiny spiral notebook, the OTHER claw holds a small pencil with the tip on the page as if jotting down a note; slight focused frown, lips pressed into a small concentrated line; a small glint on one eye showing concentration; head slightly tilted as if listening carefully; the red scarf is tied neatly. Calm, attentive, professional-but-cute QQ-mascot office-worker feeling. ' +
      'Output: 1024x1024 PNG with transparent background.',
  ],

  [
    'lobster-peek.png',
    '首次自然出现"探头冒上来"的关键帧，配合 lobster-peek-in 动画。',
    'QQShell 首次出现入口浮动气泡顶部（约 1.4 秒后从聊天界面右下方探出）；阶段 1 体验中"自然出现感"的核心视觉。',
    DNA +
      ' Composition: ONLY the upper body of the mascot is visible — head with antennae, big eyes, shoulders, neck wrapped in the red scarf, and ONE claw — peeking up from the BOTTOM edge of the frame as if popping up from behind a chat bubble. The visible claw waves above its head. A small white speech bubble above the lobster contains the Chinese text "嗨～". The two short legs and tail are NOT shown; lower body is cleanly cut off by the frame edge. The visible parts must clearly show the antennae, big eyes, red scarf and orange-red shell so the IP is instantly recognizable. ' +
      'Output: 1024x1024 PNG with transparent background.',
  ],

  [
    'lobster-proud.png',
    '解锁奖励/写完日记/打卡完成时的"得意"瞬间，扩展用 mood。',
    '成就解锁弹层（AchievementMomentOverlay.tsx）；打卡完成反馈卡；日记完成回到聊天流瞬间；奖励/挂饰装备成功反馈。',
    DNA +
      ' Pose: standing upright on two short stubby legs in a classic QQ-mascot hero stance; BOTH claws on hips like a tiny superhero; chest slightly puffed; eyes closed in a smug confident grin showing a single tiny tooth; one tiny red heart and a small golden star floating above the head; the red scarf billows slightly behind. Cheerful, harmlessly proud, like a kid showing off a drawing. ' +
      'Output: 1024x1024 PNG with transparent background.',
  ],

  [
    'lobster-writing.png',
    '写日记/work_log 生成中的状态形象，强化"小龙虾在偷偷写日记"惊喜感。',
    '隐藏日记惊喜弹层（"队长，我刚刚偷偷写了一篇日记"）；work_log 卡片头图；日记卡内的小图；阶段 6/7 相关卡片。',
    DNA +
      ' Pose: wearing a small dark-navy beret tilted on top between the antennae; sitting upright on a small wooden stool at a tiny desk; ONE claw holds a pencil with the tip on the page, the OTHER claw holds open a small leather-bound journal; soft focused expression, faint blush; a small ink bottle, a folded letter and a tiny pressed leaf as decorative props on the desk; the red scarf is still tied around the neck. Cozy, warm, slightly secretive feeling — like the mascot is writing a private diary entry. ' +
      'Output: 1024x1024 PNG with transparent background.',
  ],

  [
    'lobster-oops.png',
    'AI fallback / 工具失败 / 审查未通过时的安抚形象，软化错误体感。',
    '聊天消息状态为 \'fallback\' 或 \'failed\' 时的头像；权限被拒绝/审查不通过时的提示卡；OpenClaw 不可用降级时的右侧主形象。',
    DNA +
      ' Pose: standing upright on two short stubby legs; a small sweat drop on the temple; ONE claw scratches the back of its own head sheepishly, the OTHER claw is raised in a small apologetic wave; tongue tip slightly out; eyebrows angled up apologetically; body bowing slightly forward in an "oops, sorry" gesture; the red scarf hangs straight down. Soft, harmless, cute-apologetic feeling — never actually sad or scary. ' +
      'Output: 1024x1024 PNG with transparent background.',
  ],

  [
    'diary-card-bg.png',
    '第一篇隐藏日记的卡片背景。',
    '日记惊喜弹层背景；隐藏日记右侧入口解锁后的日记详情卡背景；diary 类型卡片（CardType===\'diary\'）；阶段 7 相关。',
    DNA +
      ' This image is a WIDE HORIZONTAL SCENE, NOT a portrait. Soft cream paper journal background with subtle dotted-grid texture, a few washi-tape strips on the corners, a small claw-shaped red ink stamp, an ink bottle, a pressed leaf and a postage stamp as decorative stickers. The QQ-Penguin-style anthropomorphic crayfish (per the DNA spec, including the bright red scarf) is placed at the LOWER-LEFT third of the frame, sitting upright on a small wooden stool at a tiny desk and writing in an open journal. The center and right two-thirds of the frame are intentionally LEFT EMPTY (clean cream paper) so that diary text can be overlaid on top. Pastel warm palette, soft natural daylight from upper left. ' +
      'Output: 1600x900 PNG, opaque cream background is OK (transparency not required for this banner).',
  ],

  [
    'space-banner.png',
    '小龙虾自己 QQ 空间的头图。',
    'lobster_space 视图顶部 banner；右侧"龙虾空间"入口预览图；阶段 8 小龙虾空间相关。',
    DNA +
      ' This image is a WIDE HORIZONTAL BANNER, NOT a portrait. Soft sky-blue gradient background with floating soft bubbles, gentle cloud shapes and a few small paper-plane silhouettes. The QQ-Penguin-style anthropomorphic crayfish (per the DNA spec, including the bright red scarf) PEEKS OUT from the LOWER-RIGHT corner only — upper body and one waving claw visible — smiling at the viewer; the lower legs and tail are cleanly cut off by the frame. The LEFT TWO-THIRDS of the frame is intentionally LEFT EMPTY (clean blue gradient) so that nickname and signature can be overlaid on top. QQ-Zone style social header feeling. ' +
      'Output: 1600x600 PNG, opaque sky-blue background is OK (transparency not required for this banner).',
  ],

  [
    'badge-shell.png',
    '"第一捞 @"成就/挂饰图标。',
    '成就墙；挂饰装备 AccessoryOnAvatar 右下角小图标（LobsterChatView.tsx:2303）；rewards 列表预览；下一奖励预告。',
    dnaForBadge +
      ' This image is NOT a full-body character — it is a CIRCULAR MEDAL BADGE ICON. Round badge with a polished gold metallic rim and a navy-blue inner disc. In the center, a glossy minimalist QQ-Penguin-style anthropomorphic-crayfish HEAD-AND-SHOULDERS silhouette in #f45c35 (with antennae visible on top and a small hint of the red scarf around the neck, no full body) facing forward; a small white "@" symbol is stamped on the upper-right of the silhouette like a postal mark. Subtle metallic shading on the rim. NO text other than the @ symbol. ' +
      'Output: 512x512 PNG with transparent background outside the circular badge.',
  ],

  [
    'badge-logbook.png',
    '"首次写日记"成就/挂饰图标。',
    '成就墙；挂饰装备 AccessoryOnAvatar 右下角小图标；rewards 列表预览；下一奖励预告。',
    dnaForBadge +
      ' This image is NOT a full-body character — it is a CIRCULAR MEDAL BADGE ICON. Round badge with a polished gold metallic rim and a cream inner disc. In the center, an OPEN JOURNAL BOOK icon with a tiny chibi orange-red crayfish CLAW (with a small hint of red scarf fabric peeking from one side) holding a pencil over the page, plus one small ink dot and a folded ribbon bookmark. Subtle metallic shading on the rim. NO text. ' +
      'Output: 512x512 PNG with transparent background outside the circular badge.',
  ],
]

const colWidths = [22, 38, 56, 90]

function buildSheetXml(rows) {
  const colsXml = colWidths
    .map(
      (w, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`
    )
    .join('')
  const rowsXml = rows
    .map((row, ri) => {
      const cells = row
        .map((val, ci) => {
          const ref = String.fromCharCode(65 + ci) + (ri + 1)
          const styleId = ri === 0 ? '1' : '2'
          return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(val)}</t></is></c>`
        })
        .join('')
      const ht = ri === 0 ? 22 : 90
      return `<row r="${ri + 1}" ht="${ht}" customHeight="1">${cells}</row>`
    })
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${rowsXml}</sheetData>` +
    '</worksheet>'
  )
}

const files = {
  '[Content_Types].xml':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>',
  '_rels/.rels':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>',
  'xl/workbook.xml':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="lobster prompts" sheetId="1" r:id="rId1"/></sheets>' +
    '</workbook>',
  'xl/_rels/workbook.xml.rels':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>',
  'xl/styles.xml':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEEFE6"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>',
  'xl/worksheets/sheet1.xml': buildSheetXml(rows),
}

function dosTime() {
  const now = new Date()
  const time =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() / 2) & 0x1f)
  const date =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0xf) << 5) |
    (now.getDate() & 0x1f)
  return { time, date }
}

function buildZip(files) {
  const localParts = []
  const central = []
  let offset = 0
  const { time, date } = dosTime()

  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, 'utf8')
    const compressed = zlib.deflateRawSync(data)
    const crc = zlib.crc32(data)
    const nameBuf = Buffer.from(name, 'utf8')

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)

    localParts.push(local, nameBuf, compressed)

    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(20, 4)
    cd.writeUInt16LE(20, 6)
    cd.writeUInt16LE(0x0800, 8)
    cd.writeUInt16LE(8, 10)
    cd.writeUInt16LE(time, 12)
    cd.writeUInt16LE(date, 14)
    cd.writeUInt32LE(crc, 16)
    cd.writeUInt32LE(compressed.length, 20)
    cd.writeUInt32LE(data.length, 24)
    cd.writeUInt16LE(nameBuf.length, 28)
    cd.writeUInt16LE(0, 30)
    cd.writeUInt16LE(0, 32)
    cd.writeUInt16LE(0, 34)
    cd.writeUInt16LE(0, 36)
    cd.writeUInt32LE(0, 38)
    cd.writeUInt32LE(offset, 42)

    central.push(cd, nameBuf)

    offset += local.length + nameBuf.length + compressed.length
  }

  const cdStart = offset
  const cdBuf = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(Object.keys(files).length, 8)
  eocd.writeUInt16LE(Object.keys(files).length, 10)
  eocd.writeUInt32LE(cdBuf.length, 12)
  eocd.writeUInt32LE(cdStart, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, cdBuf, eocd])
}

const out = path.resolve(__dirname, '..', '..', 'lobster-image-prompts.xlsx')
fs.writeFileSync(out, buildZip(files))
console.log('written:', out, fs.statSync(out).size, 'bytes')
console.log('badge DNA scarf removed:', !dnaForBadge.includes('RED scarf'))
console.log('badge DNA full-body removed:', !dnaForBadge.includes('full body visible'))
