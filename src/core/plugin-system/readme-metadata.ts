export interface ReadmeInteractionMeta {
  defaultPlaceholder?: string;
  primaryPlaceholder?: string;
}

export interface ReadmePrimaryInputMeta {
  enabled?: boolean;
  grammar?: string;
  examples?: string[];
}

export interface ReadmeMetadata {
  interaction?: ReadmeInteractionMeta;
  primaryInput?: ReadmePrimaryInputMeta;
  actions?: string[];
}

const META_HEADING_RE = /^##\s+META\s*$/m;

function extractMetaBlock(markdown: string): string | null {
  const start = markdown.search(META_HEADING_RE);
  if (start === -1) return null;
  const after = markdown.slice(start);
  const blockMatch = after.match(/```yaml\n([\s\S]*?)```/);
  return blockMatch ? blockMatch[1].trim() : null;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseScalar(s: string): string | boolean | number {
  const t = s.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  const n = Number(t);
  if (!isNaN(n) && t.length > 0) return n;
  return stripQuotes(t);
}

export function parseReadmeMetadata(markdown: string): ReadmeMetadata | null {
  const yaml = extractMetaBlock(markdown);
  if (!yaml) return null;
  return parseMetaYaml(yaml);
}

export function parseMetaYaml(yaml: string): ReadmeMetadata {
  const result: ReadmeMetadata = {};
  const lines = yaml.split('\n');
  let i = 0;

  function skipEmpty(): boolean {
    while (i < lines.length && lines[i].trim() === '') i++;
    return i < lines.length;
  }

  function lineIndent(line: string): number {
    return line.search(/\S/);
  }

  while (skipEmpty()) {
    const topLine = lines[i];
    const topIndent = lineIndent(topLine);
    const topMatch = topLine.trim().match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)?$/);
    if (!topMatch) { i++; continue; }

    const sectionKey = topMatch[1] as keyof ReadmeMetadata;
    const rest = topMatch[2]?.trim() ?? '';

    if (rest) {
      if (rest.startsWith('-')) {
        const arr = rest.slice(1).trim();
        const items = [parseScalar(arr)];
        i++;
        while (i < lines.length) {
          const l = lines[i].trim();
          if (l.startsWith('- ')) {
            items.push(parseScalar(l.slice(2)));
            i++;
          } else {
            break;
          }
        }
        if (sectionKey === 'actions') {
          result.actions = items as string[];
        }
      } else {
        (result as Record<string, unknown>)[sectionKey] = parseScalar(rest);
        i++;
      }
      continue;
    }

    i++;
    const sectionObj: Record<string, unknown> = {};
    const sectionIndent = topIndent + 2;

    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === '') { i++; continue; }
      const ind = lineIndent(l);
      if (ind < sectionIndent) break;

      const lMatch = l.trim().match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)?$/);
      if (!lMatch) { i++; continue; }

      const key = lMatch[1];
      const valStr = lMatch[2]?.trim() ?? '';

      if (valStr === '' || valStr === undefined) {
        i++;
        const arr: unknown[] = [];
        const arrIndent = lineIndent(lines[i] ?? '');
        while (i < lines.length) {
          const al = lines[i].trim();
          if (al.startsWith('- ')) {
            arr.push(parseScalar(al.slice(2)));
            i++;
          } else {
            break;
          }
        }
        sectionObj[key] = arr;
      } else {
        sectionObj[key] = parseScalar(valStr);
        i++;
      }
    }

    if (sectionKey === 'interaction') {
      result.interaction = sectionObj as ReadmeInteractionMeta;
    } else if (sectionKey === 'primaryInput') {
      result.primaryInput = sectionObj as ReadmePrimaryInputMeta;
    } else {
      (result as Record<string, unknown>)[sectionKey] = sectionObj;
    }
  }

  return result;
}

export function mergeReadmeIntoPlugin(
  plugin: { id: string; interaction?: unknown; actions?: unknown[] },
  meta: ReadmeMetadata,
): void {
  if (!meta) return;

  if (meta.interaction || meta.primaryInput) {
    const existing = (plugin.interaction as Record<string, unknown> | undefined) ?? {};
    if (meta.interaction) {
      const placeholders = existing.placeholders as Record<string, string> ?? {};
      if (meta.interaction.defaultPlaceholder) placeholders.defaultPlaceholder = meta.interaction.defaultPlaceholder;
      if (meta.interaction.primaryPlaceholder) placeholders.primaryPlaceholder = meta.interaction.primaryPlaceholder;
      existing.placeholders = placeholders;
    }
    if (meta.primaryInput) {
      existing.primaryInput = {
        enabled: meta.primaryInput.enabled ?? true,
        grammar: meta.primaryInput.grammar,
        examples: meta.primaryInput.examples,
      };
    }
    (plugin as Record<string, unknown>).interaction = existing;
  }
}
