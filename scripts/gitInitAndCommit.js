// Script to initialize git repository and create the first commit using isomorphic-git
const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');

async function main() {
  const dir = path.resolve(__dirname, '..');
  console.log('Target directory:', dir);

  // 1. Initialize repository if .git doesn't exist
  const gitDir = path.join(dir, '.git');
  if (!fs.existsSync(gitDir)) {
    console.log('Initializing git repository...');
    await git.init({ fs, dir });
    console.log('Initialized empty Git repository in', gitDir);
  }

  // 2. Discover files to stage (respecting .gitignore rules)
  const ignoredPatterns = [
    'node_modules',
    '.next',
    '.git',
    'dev.db-journal',
    '.DS_Store',
    '*.tsbuildinfo',
  ];

  function getAllFiles(currentDir, relativePath = '') {
    let results = [];
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (ignoredPatterns.some((pattern) => rel.startsWith(pattern) || entry.name === pattern)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(getAllFiles(fullPath, rel));
      } else if (entry.isFile()) {
        results.push(rel);
      }
    }
    return results;
  }

  const filesToAdd = getAllFiles(dir);
  console.log(`Staging ${filesToAdd.length} files...`);

  for (const filepath of filesToAdd) {
    await git.add({ fs, dir, filepath });
  }

  // 3. Make commit
  console.log('Creating commit...');
  const sha = await git.commit({
    fs,
    dir,
    message: 'UI Upgrade: Radiating lines background system with 30fps canvas and interactive glass timeline for /plan',
    author: {
      name: 'FitForm Developer',
      email: 'developer@fitform.local',
    },
  });

  console.log('Successfully created initial commit with SHA:', sha);
}

main().catch((err) => {
  console.error('Git initialization error:', err);
  process.exit(1);
});
