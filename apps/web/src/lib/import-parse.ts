import * as XLSX from 'xlsx';

export interface ParsedRow {
  rowNumber: number;
  values: Record<string, string>;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

// Parser CSV sederhana yang menangani kutip ganda.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function fromMatrix(matrix: string[][]): ParsedRow[] {
  if (matrix.length === 0) return [];
  const headers = matrix[0].map((h) => normalizeHeader(String(h)));
  const out: ParsedRow[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const values: Record<string, string> = {};
    headers.forEach((h, idx) => {
      values[h] = String(matrix[i][idx] ?? '').trim();
    });
    out.push({ rowNumber: i + 1, values });
  }
  return out;
}

// Parsing dilakukan di frontend; backend tetap memvalidasi ulang seluruh data.
export async function parseImportFile(file: File): Promise<ParsedRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    return fromMatrix(parseCsv(await file.text()));
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
  return fromMatrix(matrix.map((r) => r.map((c) => String(c ?? ''))));
}

export function downloadTemplate(fileName: string, headers: string[]): void {
  const blob = new Blob([`${headers.join(',')}\n`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
