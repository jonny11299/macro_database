// Scans a list of parsed file entries and extracts all URLs.
//
// Input:  fileList — the reactive store array from stores.js
//         Each entry: { name: fileName, sheets: [{ name, rows, columns }] }
//
// Output: flat array of link objects ready to POST to /api/links/bulk:
//         [{ file_name, sheet_name, header_name, full_link }]

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/i;

export function parseLinks(fileList) {
  const links = [];

  for (const file of fileList) {
    if (file.status !== 'ready' || !file.sheets) continue;

    for (const sheet of file.sheets) {
      for (const row of sheet.rows) {
        for (const [header_name, cellValue] of Object.entries(row)) {
          if (!cellValue || typeof cellValue !== 'string') continue;
          const trimmed = cellValue.trim();
          if (URL_PATTERN.test(trimmed)) {
            links.push({
              file_name:   file.name,
              sheet_name:  sheet.name,
              header_name: header_name || null,
              full_link:   trimmed,
            });
          }
        }
      }
    }
  }

  return links;
}
