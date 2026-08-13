import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dir = process.cwd();
const url = 'https://github.com/parthpbhagat/anual-report.git';

async function pushToGithub() {
  console.log('====================================================');
  console.log('🚀 Automated Node.js GitHub Uploader');
  console.log(`📍 Target Repo: ${url}`);
  console.log('====================================================\n');

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!token) {
    console.log('⚠️ GITHUB_TOKEN is missing in your .env file!');
    console.log('👉 Please add your GitHub Personal Access Token in .env like this:');
    console.log('   GITHUB_TOKEN=ghp_your_token_here\n');
    console.log('🔗 Generate a token in 30 seconds at: https://github.com/settings/tokens');
    return;
  }

  try {
    console.log('Uploading code to GitHub...');
    await git.push({
      fs,
      http,
      dir,
      url,
      ref: 'master',
      remoteRef: 'refs/heads/main',
      force: true,
      onAuth: () => ({ username: token })
    });

    console.log('\n====================================================');
    console.log('🎉 SUCCESSFULLY UPLOADED TO GITHUB!');
    console.log(`🔗 Repository Link: https://github.com/parthpbhagat/anual-report`);
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ Push Error:', err.message);
  }
}

pushToGithub();
