// scripts/makeGitCommit.mjs
import git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

async function main() {
  const dir = process.cwd();
  console.log('Checking repository at:', dir);

  // Check if .git exists
  if (!fs.existsSync(path.join(dir, '.git'))) {
    console.log('No .git directory found.');
    return;
  }

  // Add all changed files
  const statusMatrix = await git.statusMatrix({ fs, dir });
  for (const [filepath, head, workdir, stage] of statusMatrix) {
    if (workdir !== stage) {
      if (workdir === 0) {
        await git.remove({ fs, dir, filepath });
      } else {
        await git.add({ fs, dir, filepath });
      }
    }
  }

  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'FitForm Assistant',
      email: 'assistant@fitform.ai',
    },
    message: 'Step 5: streaks, badges and personal progress dashboard',
  });

  console.log('Git commit successfully created with SHA:', sha);
}

main().catch((err) => {
  console.log('Git commit note:', err.message);
});
