const ANSI_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]/g;
const CARRIAGE_RETURN = /\r\n?/g;

export interface AnsiChunk {
  text: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  foreground?: string;
  background?: string;
}

const COLOR_MAP: Record<number, string> = {
  30: '#000000', 31: '#cd3131', 32: '#0dbc79', 33: '#e5e510',
  34: '#2472c8', 35: '#bc3fbc', 36: '#11a8cd', 37: '#e5e5e5',
  90: '#666666', 91: '#f14c4c', 92: '#23d18b', 93: '#f5f543',
  94: '#3b8eea', 95: '#d670d6', 96: '#29b8db', 97: '#ffffff',
};

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '').replace(CARRIAGE_RETURN, '\n');
}

export function parseAnsi(text: string): AnsiChunk[] {
  const chunks: AnsiChunk[] = [];
  let current: AnsiChunk = { text: '' };
  let bold = false, dim = false, italic = false, underline = false;
  let fg: string | undefined;
  let bg: string | undefined;

  const flush = () => {
    if (current.text) {
      chunks.push({ ...current, bold, dim, italic, underline, foreground: fg, background: bg });
      current = { text: '' };
    }
  };

  let i = 0;
  while (i < text.length) {
    if (text[i] === '\x1b' && text[i + 1] === '[') {
      const end = text.indexOf('m', i);
      if (end === -1) { current.text += text.slice(i); break; }
      const codes = text.slice(i + 2, end).split(';');
      flush();
      for (const codeStr of codes) {
        const code = parseInt(codeStr, 10);
        if (code === 0) { bold = false; dim = false; italic = false; underline = false; fg = undefined; bg = undefined; }
        else if (code === 1) bold = true;
        else if (code === 2) dim = true;
        else if (code === 3) italic = true;
        else if (code === 4) underline = true;
        else if (code === 22) bold = false;
        else if (code === 23) italic = false;
        else if (code === 24) underline = false;
        else if (code >= 30 && code <= 37) fg = COLOR_MAP[code];
        else if (code === 39) fg = undefined;
        else if (code >= 40 && code <= 47) bg = COLOR_MAP[code - 10];
        else if (code === 49) bg = undefined;
        else if (code === 90) fg = COLOR_MAP[90];
        else if (code === 91) fg = COLOR_MAP[91];
        else if (code === 92) fg = COLOR_MAP[92];
        else if (code === 93) fg = COLOR_MAP[93];
        else if (code === 94) fg = COLOR_MAP[94];
        else if (code === 95) fg = COLOR_MAP[95];
        else if (code === 96) fg = COLOR_MAP[96];
        else if (code === 97) fg = COLOR_MAP[97];
      }
      i = end + 1;
    } else if (text[i] === '\r') {
      current.text += '\n';
      i++;
      if (text[i] === '\n') i++;
    } else {
      current.text += text[i];
      i++;
    }
  }
  flush();
  return chunks;
}

export function ansiToHtml(text: string): string {
  const chunks = parseAnsi(text);
  return chunks
    .map((chunk) => {
      let style = '';
      if (chunk.bold) style += 'font-weight:bold;';
      if (chunk.dim) style += 'opacity:0.7;';
      if (chunk.italic) style += 'font-style:italic;';
      if (chunk.underline) style += 'text-decoration:underline;';
      if (chunk.foreground) style += `color:${chunk.foreground};`;
      if (chunk.background) style += `background:${chunk.background};`;
      const escaped = chunk.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      if (style) return `<span style="${style}">${escaped}</span>`;
      return escaped;
    })
    .join('');
}
