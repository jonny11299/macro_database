import * as XLSX from 'xlsx'

// ── Merge expansion ───────────────────────────────────────────────────────────
// ws['!merges'] is an array of { s: {r,c}, e: {r,c} } range objects.
// SheetJS only stores the value in the top-left cell of each merge; every
// other cell in the range is absent from the sheet object. We copy the
// top-left value into every covered cell before converting to a 2-D array.
function expandMerges(ws) {
  const merges = ws['!merges']
  if (!merges || merges.length === 0) return

  for (const { s, e } of merges) {
    const originAddr = XLSX.utils.encode_cell({ r: s.r, c: s.c })
    const originCell = ws[originAddr]
    if (!originCell) continue

    for (let r = s.r; r <= e.r; r++) {
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue   // top-left already has the value
        ws[XLSX.utils.encode_cell({ r, c })] = { ...originCell }
      }
    }
  }
}

// ── Trailing-empty trimming ───────────────────────────────────────────────────

function lastNonEmptyRow(data) {
  for (let r = data.length - 1; r >= 0; r--) {
    if (data[r].some(cell => cell !== null && cell !== undefined && cell !== '')) {
      return r
    }
  }
  return -1
}

function lastNonEmptyCol(data) {
  const maxCols = Math.max(0, ...data.map(r => r.length))
  for (let c = maxCols - 1; c >= 0; c--) {
    if (data.some(row => {
      const v = row[c]
      return v !== null && v !== undefined && v !== ''
    })) {
      return c
    }
  }
  return -1
}

// Trim trailing empties then add ROW_PAD / COL_PAD blank rows/cols as visual
// breathing room. Rows are padded to uniform width so the header always matches.
const ROW_PAD = 2
const COL_PAD = 2

function trim2D(data) {
  const lr = lastNonEmptyRow(data)
  if (lr === -1) return []

  // Extend 2 rows beyond the last data row; synthesize empty rows if the
  // sheet didn't have them (SheetJS stops at !ref, so slice won't go further).
  const endRow = lr + ROW_PAD
  const slicedRows = data.slice(0, endRow + 1)
  while (slicedRows.length < endRow + 1) slicedRows.push([])

  const lc = lastNonEmptyCol(slicedRows)
  if (lc === -1) return []

  // Extend 2 cols beyond the last data col; pad every row to that width
  const endCol = lc + COL_PAD

  return slicedRows.map(row => {
    const padded = row.slice(0, endCol + 1)
    while (padded.length <= endCol) padded.push(null)
    return padded
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse a File object (.xls or .xlsx) and return an array of sheet descriptors:
 *   [{ name: string, rows: object[], columns: { key, label }[] }]
 *
 * The first row of each sheet is used as column headers. Subsequent rows
 * become plain objects keyed by those headers.
 */
export function parseWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })

        const sheets = wb.SheetNames.map(name => {
          const ws = wb.Sheets[name]

          expandMerges(ws)

          const raw = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: null,
            blankrows: true,
          })

          const trimmed = trim2D(raw)
          if (trimmed.length === 0) {
            return { name, rows: [], columns: [] }
          }

          const headerRow = trimmed[0].map((h, i) =>
            h !== null && h !== undefined && h !== ''
              ? String(h)
              : `col_${i}`
          )

          const columns = headerRow.map(label => ({ key: label, label }))

          const rows = trimmed.slice(1).map(rowArr => {
            const obj = {}
            headerRow.forEach((key, i) => {
              const v = rowArr[i]
              obj[key] = v !== null && v !== undefined ? String(v) : ''
            })
            return obj
          })

          return { name, rows, columns }
        })

        resolve(sheets)
      } catch (err) {
        reject(new Error(`Failed to parse file: ${err.message}`))
      }
    }

    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsArrayBuffer(file)
  })
}
