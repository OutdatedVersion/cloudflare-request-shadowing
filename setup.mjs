// @ts-check
import { exec as execOriginal, execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { promisify } from 'node:util';
import { createPromptModule } from 'inquirer';
import ora from 'ora';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const exec = promisify(execOriginal);
const prompt = createPromptModule();

// https://stackoverflow.com/a/29770068
const getRandomString = () => {
  return crypto.getRandomValues(new BigUint64Array(1))[0].toString(36);
};

// I'm sorry
const getAvailableAccounts = async () => {
  const { stdout } = await exec('npx wrangler whoami');
  const lines = stdout.trim().split('\n');

  let inTable = false;
  const output = [];
  for (const line of lines) {
    if (line.includes('Account Name') && line.includes('Account ID')) {
      inTable = true;
      continue;
    }

    if (inTable) {
      if (line.includes('Token Permissions')) {
        break;
      }

      const [name, id] = line
        .split('│')
        .filter((s) => !!s)
        .map((s) => s.trim());

      if (name && id) {
        output.push({ name, id });
      }
    }
  }
  return output;
};

const projects = ['encryption', 'schema', 'api', 'shadower', 'web'];

console.log('Hello! 😀');
console.log('');
console.log('installing npm dependencies 📦');
for (const project of projects) {
  const spinner = ora({
    text: `${project}: npm clean-install`,
    indent: 2,
    spinner: 'binary',
  }).start();

  const cmd = exec('npm clean-install', {
    cwd: resolve(project),
  });
  const cmdOut = await cmd;

  if (cmd.child.exitCode !== 0) {
    spinner.fail();
    console.error(
      `failed to install dependencies 🚫\n-------------\n`,
      cmdOut.stderr.toString().trim(),
      '\n------------'
    );
    process.exit(1);
  }

  spinner.stopAndPersist({ suffixText: '✔' });
}
console.log('dependencies installed ✅');
console.log('');

const isLoggedIn = (
  await exec('npx wrangler whoami', { cwd: resolve('api') })
).stdout
  .toString()
  .includes('You are logged in');

if (isLoggedIn) {
  console.log("Looks like you've already setup Wrangler, moving on");
} else {
  console.log("Next, we're going to setup Wrangler (Cloudflare's CLI)");
  console.log(
    'Wrangler will open your browser prompting for credentials. Come back here once authorized.'
  );
  console.log('This setup helper script will never see your credentials');
  await wait(4000);
  await exec('npx wrangler login', { cwd: resolve('api') });
}

const {
  cloudflareAccountId,
  connectionString,
  authTeamName,
  authAudClaim,
  bringYourOwnEncryptionSecret,
} = await prompt([
  {
    name: 'cloudflareAccountId',
    message: 'Which Cloudflare account do you want to use?',
    type: 'list',
    choices: (
      await getAvailableAccounts()
    ).map((account) => ({
      name: account.name,
      value: account.id,
    })),
  },
  {
    message:
      'What is your Cloudflare Access team name? <teamName>.cloudflareaccess.com',
    type: 'input',
    name: 'authTeamName',
  },
  {
    message: 'What is your Cloudflare Access project audience claim?',
    type: 'input',
    name: 'authAudClaim',
    validate: (text) => typeof text === 'string' && /^[a-z0-9]+$/i.test(text),
  },
  {
    message: 'What is your database connection string?',
    type: 'password',
    name: 'connectionString',
  },
  {
    message: 'Do you have your own encryption secret?',
    type: 'confirm',
    name: 'hasEncryptionSecret',
  },
  {
    message: 'What is it?',
    type: 'password',
    name: 'encryptionSecret',
    when: (answers) => answers.hasEncryptionSecret,
  },
]);
const encryptionSecret =
  bringYourOwnEncryptionSecret ?? getRandomString() + getRandomString();

await writeFile(
  resolve('api', 'wrangler.toml'),
  (await readFile(resolve('api', 'wrangler.toml'), 'utf8'))
    .replace('AUTH_AUD_CLAIM = ""', `AUTH_AUD_CLAIM = "${authAudClaim}"`)
    .replace('AUTH_TEAM_NAME = ""', `AUTH_TEAM_NAME = "${authTeamName}"`)
);

for (const project of ['api', 'shadower']) {
  const content = await readFile(resolve(project, 'wrangler.toml'), 'utf8');
  if (!content.includes('account_id')) {
    await writeFile(
      resolve(project, 'wrangler.toml'),
      [`account_id = "${cloudflareAccountId}"`, ...content.split('\n')].join(
        '\n'
      )
    );
  }
}

const dir = await mkdtemp(resolve(tmpdir(), 'request-shadowing-config'));
await writeFile(
  resolve(dir, 'secret.json'),
  JSON.stringify({
    DATABASE_CONNECTION_STRING: connectionString,
    ENCRYPTION_SECRET: encryptionSecret,
  })
);

// Cleanup secrets
process.on('beforeExit', async () => {
  try {
    await rm(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`‼️ Failed to cleanup secrets. Please delete '${dir}'`);
    }
  }
});

for (const project of ['api', 'web']) {
  const spinner = ora({
    text: `${project}: Deploying`,
    indent: 2,
  }).start();
  execSync(`npm run deploy`, {
    cwd: project,
  });
  spinner.stopAndPersist({ suffixText: '✔️' });
}

for (const project of ['api', 'shadower']) {
  const spinner = ora({
    text: `${project}: Setting secrets`,
    indent: 2,
  }).start();
  execSync(`npx wrangler secret:bulk '${join(dir, 'secret.json')}'`, {
    cwd: project,
  });
  spinner.stopAndPersist({ suffixText: '✔️' });
}

if (!bringYourOwnEncryptionSecret) {
  console.log(`🔒 We generated an encryption secret for you`);
  console.log('Please store it somewhere safe just in-case');
  console.log(encryptionSecret);
}
