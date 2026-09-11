export function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxRowLen = rows.reduce((max, row) => Math.max(max, (row[i] || '').length), 0);
    return Math.max(h.length, maxRowLen);
  });

  const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const headerLine = '| ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + ' |';

  console.log(separator);
  console.log(headerLine);
  console.log(separator);

  for (const row of rows) {
    const line = '| ' + row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | ') + ' |';
    console.log(line);
  }

  console.log(separator);
}
