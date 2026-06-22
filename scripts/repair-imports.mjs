import fs from 'fs';
import path from 'path';

function traverse(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') traverse(full);
    } else if (full.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf-8');
      let changed = false;

      // Match any import that contains a backslash
      const regex = /from\s+['"]([^'"]*\\+[^'"]*)['"]/g;
      if (regex.test(content)) {
        content = content.replace(regex, (match, p1) => {
          // Replace all backslashes with forward slashes
          const fixed = p1.replace(/\\/g, '/');
          return `from '${fixed}'`;
        });
        changed = true;
      }

      if (changed) fs.writeFileSync(full, content);
    }
  }
}

const workspaceRoot = process.cwd();
traverse(path.join(workspaceRoot, 'services'));
traverse(path.join(workspaceRoot, 'libs'));
console.log('Fixed backslashes!');
