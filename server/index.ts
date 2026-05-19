import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { setupWebSocket } from './ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const WORKSPACE = process.env.LEMU_WORKSPACE || process.cwd();

// List directory contents
app.get('/api/fs/list', async (req, res) => {
  try {
    const dir = req.query.dir as string || '.';
    const target = path.resolve(WORKSPACE, dir);

    if (!target.startsWith(WORKSPACE)) {
      return res.json({ success: false, error: 'Path outside workspace' });
    }

    const entries = await fs.readdir(target, { withFileTypes: true });
    const result = entries.map((e: fs.Dirent) => ({
      name: e.name,
      isDir: e.isDirectory(),
    }));

    res.json({ success: true, entries: result });
  } catch (err) {
    res.json({ success: false, error: (err as Error).message });
  }
});

// Read file
app.get('/api/fs/read', async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.json({ success: false, error: 'No path specified' });
    }

    const target = path.resolve(WORKSPACE, filePath);

    if (!target.startsWith(WORKSPACE)) {
      return res.json({ success: false, error: 'Path outside workspace' });
    }

    const content = await fs.readFile(target, 'utf-8');
    res.json({ success: true, content });
  } catch (err) {
    res.json({ success: false, error: (err as Error).message });
  }
});

// Copy file/directory
app.post('/api/fs/copy', async (req, res) => {
  try {
    const { src, dest } = req.body;
    const srcPath = path.resolve(WORKSPACE, src);
    const destPath = path.resolve(WORKSPACE, dest);

    if (!srcPath.startsWith(WORKSPACE) || !destPath.startsWith(WORKSPACE)) {
      return res.json({ success: false, error: 'Path outside workspace' });
    }

    await fs.copy(srcPath, destPath);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: (err as Error).message });
  }
});

// Move file/directory
app.post('/api/fs/move', async (req, res) => {
  try {
    const { src, dest } = req.body;
    const srcPath = path.resolve(WORKSPACE, src);
    const destPath = path.resolve(WORKSPACE, dest);

    if (!srcPath.startsWith(WORKSPACE) || !destPath.startsWith(WORKSPACE)) {
      return res.json({ success: false, error: 'Path outside workspace' });
    }

    await fs.move(srcPath, destPath);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: (err as Error).message });
  }
});

// Delete file/directory
app.post('/api/fs/delete', async (req, res) => {
  try {
    const { path: delPath } = req.body;
    const target = path.resolve(WORKSPACE, delPath);

    if (!target.startsWith(WORKSPACE)) {
      return res.json({ success: false, error: 'Path outside workspace' });
    }

    const stat = await fs.stat(target);
    const kind = stat.isDirectory() ? 'directory' : 'file';
    await fs.remove(target);
    res.json({ success: true, kind });
  } catch (err) {
    res.json({ success: false, error: (err as Error).message });
  }
});

// Write file
app.post('/api/fs/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      return res.json({ success: false, error: 'No path specified' });
    }

    const target = path.resolve(WORKSPACE, filePath);
    if (!target.startsWith(WORKSPACE)) {
      return res.json({ success: false, error: 'Path outside workspace' });
    }

    await fs.ensureDir(path.dirname(target));
    await fs.writeFile(target, content, 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: (err as Error).message });
  }
});

// Search file contents (cross-platform — pure Node.js, no grep dependency)
const SEARCH_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html']);

async function walkDir(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    if (entry.isDirectory()) {
      files.push(...await walkDir(fullPath));
    } else if (SEARCH_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

app.get('/api/fs/search', async (req, res) => {
  try {
    const pattern = req.query.pattern as string;
    const dir = req.query.dir as string || '.';

    if (!pattern) {
      return res.json({ success: false, error: 'No pattern specified' });
    }

    const target = path.resolve(WORKSPACE, dir);

    if (!target.startsWith(WORKSPACE)) {
      return res.json({ success: false, error: 'Path outside workspace' });
    }

    const results: Array<{ file: string; line: number; content: string }> = [];
    const files = await walkDir(target);

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(pattern)) {
            results.push({
              file: path.relative(WORKSPACE, filePath),
              line: i + 1,
              content: lines[i].trim(),
            });
          }
        }
      } catch {
        // skip unreadable files
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.json({ success: false, error: (err as Error).message });
  }
});

// Shell execution
app.post('/api/shell/exec', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.json({ success: false, error: 'No command specified' });
    }

    const result = execSync(command, {
      encoding: 'utf-8',
      cwd: WORKSPACE,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    });

    res.json({
      success: true,
      stdout: result,
      stderr: '',
      code: 0,
    });
  } catch (err) {
    const execErr = err as {
      stdout?: string;
      stderr?: string;
      status?: number;
      message: string;
    };
    res.json({
      success: true,
      stdout: execErr.stdout || '',
      stderr: execErr.stderr || execErr.message,
      code: execErr.status ?? 1,
    });
  }
});

// File tree endpoint
app.get('/api/fs/tree', async (req, res) => {
  try {
    const dir = (req.query.dir as string) || '.';
    const depth = Math.min(parseInt(req.query.depth as string) || 2, 5);
    const target = path.resolve(WORKSPACE, dir);
    if (!target.startsWith(WORKSPACE)) return res.json({ success: false, error: 'Path outside workspace' });

    async function buildTree(dirPath: string, remaining: number): Promise<string[]> {
      if (remaining <= 0) return ['  ...'];
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const lines: string[] = [];
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const fullPath = path.join(dirPath, e.name);
        const relPath = path.relative(WORKSPACE, fullPath);
        if (e.isDirectory()) {
          lines.push(`  ${relPath}/`);
          if (remaining > 1) {
            const sub = await buildTree(fullPath, remaining - 1);
            lines.push(...sub.map((l) => `  ${l}`));
          }
        } else {
          lines.push(`  ${relPath}`);
        }
      }
      return lines;
    }

    const tree = await buildTree(target, depth);
    res.json({ success: true, tree: tree.join('\n') });
  } catch (err) {
    res.json({ success: false, error: (err as Error).message });
  }
});

// Serve files for browser preview
app.get('/preview/*', async (req, res) => {
  try {
    const filePath = (req.params as Record<string, string>)['0'];
    const target = path.resolve(WORKSPACE, filePath);
    if (!target.startsWith(WORKSPACE)) return res.status(403).send('Forbidden');
    res.sendFile(target);
  } catch {
    res.status(404).send('Not found');
  }
});

// Get workspace info
app.get('/api/workspace', (req, res) => {
  res.json({
    success: true,
    cwd: WORKSPACE,
    name: path.basename(WORKSPACE),
  });
});

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`lemu server running on http://localhost:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
});
