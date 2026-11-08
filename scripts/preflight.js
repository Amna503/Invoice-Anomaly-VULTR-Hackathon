#!/usr/bin/env node
/**
 * Interactive Pre-flight Deployment Checklist
 * Run before deploying to ensure everything is ready
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let checksCompleted = 0;
let totalChecks = 0;

console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${BLUE}   Invoice Anomaly Desk - Deployment Checklist${RESET}`);
console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

const checks = [
  {
    section: '🔑 Credentials',
    items: [
      { text: 'Vultr Serverless Inference API key obtained', auto: false },
      { text: 'ADMIN_TOKEN generated (32+ characters)', auto: true, check: checkAdminToken },
      { text: 'API key tested with scripts/listModels.js', auto: false }
    ]
  },
  {
    section: '💾 Database',
    items: [
      { text: 'MongoDB running (local or container)', auto: false },
      { text: 'MONGODB_URI configured in .env', auto: true, check: checkMongoUri },
      { text: 'Test data seeded (npm run seed)', auto: false }
    ]
  },
  {
    section: '📦 Code',
    items: [
      { text: 'All dependencies installed (npm install)', auto: true, check: checkDependencies },
      { text: 'No syntax errors (all .js files valid)', auto: true, check: checkSyntax },
      { text: 'All changes committed to git', auto: true, check: checkGitStatus }
    ]
  },
  {
    section: '🧪 Testing',
    items: [
      { text: 'Server starts without errors (npm run dev)', auto: false },
      { text: 'Health endpoint responds (GET /api/health)', auto: false },
      { text: 'Can upload sample invoice', auto: false },
      { text: 'Pipeline processes invoice successfully', auto: false }
    ]
  },
  {
    section: '🐳 Docker',
    items: [
      { text: 'Docker Desktop running', auto: true, check: checkDocker },
      { text: 'docker-compose.yml configured', auto: true, check: () => existsSync('docker-compose.yml') },
      { text: 'Docker build succeeds (docker-compose build)', auto: false },
      { text: 'Docker containers start (docker-compose up)', auto: false }
    ]
  },
  {
    section: '☁️ Vultr Deployment',
    items: [
      { text: 'Vultr Cloud Compute VM provisioned', auto: false },
      { text: 'SSH access to VM configured', auto: false },
      { text: 'Docker installed on VM', auto: false },
      { text: '.env copied to VM with production values', auto: false },
      { text: 'CORS_ORIGIN set to production frontend URL', auto: false }
    ]
  },
  {
    section: '📚 Documentation',
    items: [
      { text: 'README.md updated with live URL', auto: false },
      { text: 'API documentation reviewed', auto: true, check: () => existsSync('docs/api-contract.md') },
      { text: 'Deployment guide reviewed', auto: true, check: () => existsSync('docs/deployment.md') }
    ]
  }
];

// Automatic check functions
function checkAdminToken() {
  try {
    const env = readFileSync('.env', 'utf8');
    const match = env.match(/ADMIN_TOKEN=(.+)/);
    if (!match) return false;
    const token = match[1].trim();
    return token.length >= 32 && !token.includes('generate');
  } catch {
    return false;
  }
}

function checkMongoUri() {
  try {
    const env = readFileSync('.env', 'utf8');
    return /MONGODB_URI=mongodb:\/\/.+/.test(env);
  } catch {
    return false;
  }
}

function checkDependencies() {
  return existsSync('backend/node_modules') && existsSync('backend/package-lock.json');
}

function checkSyntax() {
  try {
    execSync('cd backend && find src -name "*.js" -exec node --check {} \\; 2>/dev/null', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().length === 0;
  } catch {
    return false;
  }
}

function checkDocker() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Run checks
async function runChecklist() {
  for (const section of checks) {
    console.log(`\n${YELLOW}${section.section}${RESET}`);
    console.log('─'.repeat(50));

    for (const item of section.items) {
      totalChecks++;

      if (item.auto && item.check) {
        // Automatic check
        const passed = item.check();
        if (passed) {
          console.log(`${GREEN}✅${RESET} ${item.text}`);
          checksCompleted++;
        } else {
          console.log(`${RED}❌${RESET} ${item.text}`);
        }
      } else {
        // Manual confirmation
        const answer = await new Promise((resolve) => {
          rl.question(`   ${item.text}? ${BLUE}(y/n)${RESET} `, (ans) => {
            resolve(ans.toLowerCase().trim());
          });
        });

        if (answer === 'y' || answer === 'yes') {
          console.log(`${GREEN}✅${RESET} Confirmed`);
          checksCompleted++;
        } else {
          console.log(`${RED}❌${RESET} Skipped`);
        }
      }
    }
  }

  // Summary
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}   Summary${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

  const percentage = Math.round((checksCompleted / totalChecks) * 100);
  console.log(`Completed: ${checksCompleted}/${totalChecks} checks (${percentage}%)\n`);

  if (percentage === 100) {
    console.log(`${GREEN}🎉 ALL CHECKS COMPLETE - READY FOR DEPLOYMENT!${RESET}\n`);
  } else if (percentage >= 80) {
    console.log(`${YELLOW}⚠️  Almost ready - complete remaining checks before deploying${RESET}\n`);
  } else {
    console.log(`${RED}❌ Not ready for deployment - complete required checks${RESET}\n`);
  }

  rl.close();
}

runChecklist().catch(console.error);
