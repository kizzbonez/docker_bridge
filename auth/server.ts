import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createContext } from './context.ts';

const RULE = '─'.repeat(64);

/** First start only: the token that unlocks onboarding. Shown in the logs, never stored. */
function printSetupBanner(token: string): void {
  console.log(
    [
      RULE,
      ' DockerBridge — first-time setup',
      '',
      ' Open the dashboard in a browser and enter this one-time setup token:',
      '',
      `     ${token}`,
      '',
      ' It stops working as soon as the administrator account is created.',
      RULE,
    ].join('\n'),
  );
}

const config = loadConfig(process.env);
const ctx = await createContext(config, { sink: (line) => console.log(line) });
if (ctx.state.account() === null) printSetupBanner(ctx.setup.token);

const server = createApp(ctx);
server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({ level: 'info', message: 'auth service listening', port: config.port }));
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // Do not let a stuck connection block shutdown.
    setTimeout(() => process.exit(0), 3_000).unref();
  });
}
