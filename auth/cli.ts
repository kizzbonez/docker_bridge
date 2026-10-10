// Maintenance commands, run inside the auth container:
//
//   docker compose exec auth node auth/cli.ts status
//   docker compose exec auth node auth/cli.ts reset && docker compose restart auth
//
// `reset` deletes the administrator account. The service then prints a new
// setup token on its next start and the onboarding wizard runs again.
import { loadConfig } from './config.ts';
import { openStateStore } from './state.ts';

const config = loadConfig(process.env);
const state = await openStateStore(config.dataDir);
const command = process.argv[2];

if (command === 'status') {
  const account = state.account();
  console.log(
    account
      ? `configured: user "${account.username}", created ${account.createdAt}, ${account.recoveryHashes.length} recovery codes left`
      : 'not configured: onboarding will run on first visit',
  );
} else if (command === 'reset') {
  await state.clear();
  console.log('Account removed. Restart the auth container, then read the new setup token from its logs.');
} else {
  console.error('usage: node auth/cli.ts <status|reset>');
  process.exitCode = 2;
}
