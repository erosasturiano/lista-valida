export interface ParsedSheet {
  headers: string[]
  rows: string[][]
}

export async function parseXLSXFile(file: File): Promise<ParsedSheet> {
  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)
  const entries = await extractZipEntries(data)

  let sharedStrings: string[] = []
  const ssEntry = entries.get('xl/sharedStrings.xml')
  if (ssEntry) {
    const xml = new TextDecoder().decode(ssEntry)
    sharedStrings = extractSharedStrings(xml)
  }

  let sheetEntry: Uint8Array | undefined
  for (const [name, content] of entries) {
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) {
      sheetEntry = content
      break
    }
  }
  if (!sheetEntry) throw new Error('Nenhuma planilha encontrada no arquivo XLSX')

  const sheetXml = new TextDecoder().decode(sheetEntry)
  return parseWorksheet(sheetXml, sharedStrings)
}

async function extractZipEntries(data: Uint8Array): Promise<Map<string, Uint8Array>> {
  const entries = new Map<string, Uint8Array>()
  let offset = 0

  while (offset < data.length - 4) {
    if (
      data[offset] !== 0x50 ||
      data[offset + 1] !== 0x4b ||
      data[offset + 2] !== 0x03 ||
      data[offset + 3] !== 0x04
    ) {
      offset++
      continue
    }

    const compressionMethod = data[offset + 8] | (data[offset + 9] << 8)
    const compressedSize = readUint32LE(data, offset + 18)
    const filenameLength = data[offset + 26] | (data[offset + 27] << 8)
    const extraFieldLength = data[offset + 28] | (data[offset + 29] << 8)

    const filenameStart = offset + 30
    const filename = new TextDecoder().decode(
      data.subarray(filenameStart, filenameStart + filenameLength),
    )
    const dataStart = filenameStart + filenameLength + extraFieldLength
    const fileData = data.subarray(dataStart, dataStart + compressedSize)

    if (!filename.endsWith('/')) {
      let content: Uint8Array
      if (compressionMethod === 0) {
        content = fileData
      } else if (compressionMethod === 8) {
        content = await inflateRaw(fileData)
      } else {
        offset = dataStart + compressedSize
        continue
      }
      if (!entries.has(filename)) {
        entries.set(filename, content)
      }
    }
    offset = dataStart + compressedSize
  }

  return entries
}

function readUint32LE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)) >>>
    0
  )
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream não suportado neste navegador.')
  }
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([data]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

function extractSharedStrings(xml: string): string[] {
  const strings: string[] = []
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const sis = doc.getElementsByTagName('si')
  for (let i = 0; i < sis.length; i++) {
    const ts = sis[i].getElementsByTagName('t')
    let text = ''
    for (let j = 0; j < ts.length; j++) {
      text += ts[j].textContent || ''
    }
    strings.push(text)
  }
  return strings
}

function parseWorksheet(xml: string, sharedStrings: string[]): ParsedSheet {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const rows = doc.getElementsByTagName('row')
  const allRows: string[][] = []

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].getElementsByTagName('c')
    const rowData: string[] = []
    for (let j = 0; j < cells.length; j++) {
      const cell = cells[j]
      const ref = cell.getAttribute('r') || ''
      const colIndex = parseColumnIndex(ref)
      const type = cell.getAttribute('t')
      const vEl = cell.getElementsByTagName('v')[0]
      const isEl = cell.getElementsByTagName('is')[0]

      let value = ''
      if (type === 's' && vEl) {
        value = sharedStrings[parseInt(vEl.textContent || '0', 10)] || ''
      } else if (type === 'inlineStr' && isEl) {
        const ts = isEl.getElementsByTagName('t')
        for (let k = 0; k < ts.length; k++) value += ts[k].textContent || ''
      } else if (vEl) {
        value = vEl.textContent || ''
      }

      while (rowData.length < colIndex) rowData.push('')
      rowData.push(value)
    }
    if (rowData.length > 0) allRows.push(rowData)
  }

  if (allRows.length === 0) return { headers: [], rows: [] }
  const headers = allRows[0].map((h) => h.trim())
  return { headers, rows: allRows.slice(1) }
}

function parseColumnIndex(ref: string): number {
  let col = 0
  for (let i = 0; i < ref.length; i++) {
    const ch = ref.charCodeAt(i)
    if (ch >= 65 && ch <= 90) col = col * 26 + (ch - 64)
    else break
  }
  return col - 1
}
