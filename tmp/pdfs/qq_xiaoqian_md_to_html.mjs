import fs from 'node:fs'
import path from 'node:path'

const [sourcePath, targetPath] = process.argv.slice(2)

if (!sourcePath || !targetPath) {
  throw new Error('Usage: node qq_xiaoqian_md_to_html.mjs <source.md> <target.html>')
}

const source = fs.readFileSync(sourcePath, 'utf8')

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineMarkdown(value) {
  let text = escapeHtml(value)
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return text
}

function renderTable(lines) {
  const rows = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(1, -1).split('|').map((cell) => inlineMarkdown(cell.trim())))

  const [head, separator, ...body] = rows
  void separator
  return [
    '<table>',
    '<thead><tr>',
    ...head.map((cell) => `<th>${cell}</th>`),
    '</tr></thead>',
    '<tbody>',
    ...body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`),
    '</tbody>',
    '</table>',
  ].join('')
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let paragraph = []
  let list = []
  let code = []
  let table = []
  let inCode = false

  const flushParagraph = () => {
    if (!paragraph.length) return
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (!list.length) return
    html.push('<ol>')
    for (const item of list) {
      html.push(`<li>${inlineMarkdown(item).replaceAll('&lt;br&gt;', '<br>')}</li>`)
    }
    html.push('</ol>')
    list = []
  }

  const flushTable = () => {
    if (!table.length) return
    html.push(renderTable(table))
    table = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
        code = []
        inCode = false
      } else {
        flushParagraph()
        flushList()
        flushTable()
        inCode = true
      }
      continue
    }

    if (inCode) {
      code.push(rawLine)
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushTable()
      continue
    }

    if (/^\|.+\|$/.test(line)) {
      flushParagraph()
      flushList()
      table.push(line)
      continue
    }

    flushTable()

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1].length
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    const listItem = /^\d+\.\s+(.+)$/.exec(line)
    if (listItem) {
      flushParagraph()
      list.push(listItem[1])
      continue
    }

    const listContinuation = /^\s{2,}(.+)$/.exec(rawLine)
    if (listContinuation && list.length) {
      list[list.length - 1] += `<br>${listContinuation[1].trim()}`
      continue
    }

    const bulletItem = /^[-*]\s+(.+)$/.exec(line)
    if (bulletItem) {
      flushParagraph()
      list.push(bulletItem[1])
      continue
    }

    flushList()
    paragraph.push(line.trim())
  }

  flushParagraph()
  flushList()
  flushTable()

  return html.join('\n')
}

const body = renderMarkdown(source)

const document = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>QQ小钳说明文档初版</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 18mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #162033;
      font-family: "Noto Sans SC", "Microsoft YaHei", "DengXian", "SimHei", sans-serif;
      font-size: 10.5pt;
      line-height: 1.72;
      background: #ffffff;
    }

    h1, h2, h3 {
      color: #0f2f66;
      line-height: 1.35;
      page-break-after: avoid;
    }

    h1 {
      margin: 0 0 10mm;
      padding: 7mm 8mm;
      color: #ffffff;
      font-size: 23pt;
      border-radius: 12px;
      background: linear-gradient(135deg, #1677ff, #42a5ff);
    }

    h2 {
      margin: 9mm 0 3mm;
      padding-left: 3mm;
      font-size: 15pt;
      border-left: 4px solid #1677ff;
    }

    h3 {
      margin: 6mm 0 2mm;
      font-size: 12pt;
    }

    p {
      margin: 2mm 0 3mm;
    }

    strong {
      color: #0f2f66;
      font-weight: 700;
    }

    code {
      padding: 0.4mm 1.2mm;
      border-radius: 4px;
      color: #0f4a8a;
      background: #eef6ff;
      font-family: Consolas, "Microsoft YaHei", monospace;
      font-size: 0.92em;
    }

    pre {
      margin: 4mm 0;
      padding: 4mm;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid #d8e7ff;
      border-radius: 8px;
      background: #f6faff;
      page-break-inside: avoid;
    }

    pre code {
      padding: 0;
      color: #162033;
      background: transparent;
      font-size: 9.5pt;
      line-height: 1.65;
    }

    ol {
      margin: 2mm 0 4mm;
      padding-left: 7mm;
    }

    li {
      margin: 1.2mm 0;
    }

    table {
      width: 100%;
      margin: 4mm 0 6mm;
      border-collapse: collapse;
      table-layout: fixed;
      page-break-inside: auto;
      font-size: 9.2pt;
      line-height: 1.55;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
    }

    th {
      color: #0f2f66;
      font-weight: 700;
      background: #eaf4ff;
    }

    th, td {
      padding: 2.6mm 2.3mm;
      vertical-align: top;
      border: 1px solid #cfe0f5;
      word-break: break-word;
    }

    tbody tr:nth-child(even) td {
      background: #fbfdff;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
${body}
</body>
</html>
`

fs.mkdirSync(path.dirname(targetPath), { recursive: true })
fs.writeFileSync(targetPath, document, 'utf8')
