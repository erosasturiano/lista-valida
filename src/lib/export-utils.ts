const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function createZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const localChunks: Uint8Array[] = []
  const centralEntries: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const nameBytes = enc.encode(file.name)
    const crc = crc32(file.data)
    const lh = new Uint8Array(30 + nameBytes.length)
    const dv = new DataView(lh.buffer)
    dv.setUint32(0, 0x04034b50, true)
    dv.setUint16(8, 0, true)
    dv.setUint32(14, crc, true)
    dv.setUint32(18, file.data.length, true)
    dv.setUint32(22, file.data.length, true)
    dv.setUint16(26, nameBytes.length, true)
    lh.set(nameBytes, 30)
    localChunks.push(lh, file.data)
    const cd = new Uint8Array(46 + nameBytes.length)
    const cdv = new DataView(cd.buffer)
    cdv.setUint32(0, 0x02014b50, true)
    cdv.setUint16(10, 0, true)
    cdv.setUint32(16, crc, true)
    cdv.setUint32(20, file.data.length, true)
    cdv.setUint32(24, file.data.length, true)
    cdv.setUint16(28, nameBytes.length, true)
    cdv.setUint32(42, offset, true)
    cd.set(nameBytes, 46)
    centralEntries.push(cd)
    offset += lh.length + file.data.length
  }
  let cdSize = 0
  for (const cd of centralEntries) cdSize += cd.length
  const eocd = new Uint8Array(22)
  const edv = new DataView(eocd.buffer)
  edv.setUint32(0, 0x06054b50, true)
  edv.setUint16(8, files.length, true)
  edv.setUint16(10, files.length, true)
  edv.setUint32(12, cdSize, true)
  edv.setUint32(16, offset, true)
  const total = offset + cdSize + 22
  const result = new Uint8Array(total)
  let pos = 0
  for (const c of [...localChunks, ...centralEntries, eocd]) {
    result.set(c, pos)
    pos += c.length
  }
  return result
}

function colName(idx: number): string {
  let s = ''
  let n = idx + 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildXlsx(headers: string[], rows: (string | number)[][]): Uint8Array {
  const enc = new TextEncoder()
  let sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
  sheet += `<row r="1">`
  headers.forEach((h, i) => {
    sheet += `<c r="${colName(i)}1" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`
  })
  sheet += `</row>`
  rows.forEach((row, ri) => {
    const r = ri + 2
    sheet += `<row r="${r}">`
    row.forEach((val, ci) => {
      const ref = `${colName(ci)}${r}`
      if (typeof val === 'number' && !isNaN(val)) sheet += `<c r="${ref}"><v>${val}</v></c>`
      else sheet += `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(val))}</t></is></c>`
    })
    sheet += `</row>`
  })
  sheet += `</sheetData></worksheet>`
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relat\u00f3rio" sheetId="1" r:id="rId1"/></sheets></workbook>`
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`
  return createZip([
    { name: '[Content_Types].xml', data: enc.encode(ct) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'xl/workbook.xml', data: enc.encode(wb) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
  ])
}

export function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'campanha'
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const BOM = '\uFEFF'
  const lines = [
    BOM + headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(';'),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')),
  ]
  triggerDownload(
    new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }),
    `${filename}.csv`,
  )
}

export function downloadXlsx(filename: string, headers: string[], rows: (string | number)[][]) {
  const xlsx = buildXlsx(headers, rows)
  triggerDownload(
    new Blob([xlsx], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${filename}.xlsx`,
  )
}
