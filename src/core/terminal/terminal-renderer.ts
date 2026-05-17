export interface TerminalBuffer {
  lines: string[];
  maxLines: number;
}

export function createBuffer(maxLines = 500): TerminalBuffer {
  return { lines: [], maxLines };
}

export function appendToBuffer(buffer: TerminalBuffer, data: string): void {
  const parts = data.split(/\r?\n/);
  for (const part of parts) {
    if (buffer.lines.length === 0) {
      buffer.lines.push(part);
    } else {
      const last = buffer.lines[buffer.lines.length - 1];
      if (data.startsWith('\r') && !data.startsWith('\r\n')) {
        buffer.lines[buffer.lines.length - 1] = part;
      } else {
        buffer.lines.push(part);
      }
    }
  }
  if (buffer.lines.length > buffer.maxLines) {
    buffer.lines.splice(0, buffer.lines.length - buffer.maxLines);
  }
}

export function getBufferText(buffer: TerminalBuffer): string {
  return buffer.lines.join('\n');
}
