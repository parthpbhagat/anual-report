import git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

const dir = process.cwd();

async function runGitInitAndCommit() {
  console.log('====================================================');
  console.log('🚀 Preparing Git Repository for GitHub');
  console.log('====================================================\n');

  try {
    // 1. Initialize Git Repo if needed
    await git.init({ fs, dir });
    console.log('✅ Git repository initialized.');

    // 2. Add files respecting .gitignore
    const statusMatrix = await git.statusMatrix({ fs, dir });
    let addedCount = 0;

    for (const [filepath, headStatus, worktreeStatus, stageStatus] of statusMatrix) {
      // Exclude node_modules, .env, .git
      if (
        filepath.startsWith('node_modules') ||
        filepath === '.env' ||
        filepath.startsWith('.git')
      ) {
        continue;
      }

      if (worktreeStatus !== 0) {
        await git.add({ fs, dir, filepath });
        addedCount++;
      }
    }

    console.log(`✅ Staged ${addedCount} files for commit.`);

    // 3. Commit
    const commitSha = await git.commit({
      fs,
      dir,
      author: {
        name: 'Parth Bhagat',
        email: 'parthpbhagat@gmail.com'
      },
      message: 'feat: BSE Annual Report Finder with Supabase Cloud DB and PDF buttons'
    });

    console.log(`\n====================================================`);
    console.log(`🎉 Git Commit Successful! Commit Hash: ${commitSha.substring(0, 7)}`);
    console.log(`📍 Remote Repository Target: https://github.com/parthpbhagat/annual-report.git`);
    console.log(`====================================================`);
  } catch (err) {
    console.error('Git error:', err);
  }
}

runGitInitAndCommit();
