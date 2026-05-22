import fs from 'fs-extra';
import path from 'path';

export async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tmp = filePath + '.lemu-tmp';
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(tmp, content, 'utf-8');
  await fs.rename(tmp, filePath);
}

export async function cleanupOrphanTempFiles(rootDir: string): Promise<string[]> {
  const cleaned: string[] = [];
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.lemu-tmp')) {
        const fullPath = path.join(rootDir, entry.name);
        await fs.remove(fullPath);
        cleaned.push(fullPath);
      } else if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        const sub = await cleanupOrphanTempFiles(path.join(rootDir, entry.name));
        cleaned.push(...sub);
      }
    }
  } catch {
  }
  return cleaned;
}
