import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

// No page here: these check the web image itself, so they run once rather
// than once per viewport.

/**
 * Starts the web image with a FRAME_ANCESTORS setting and has nginx print the
 * configuration it would run with. A refused setting stops the container.
 */
function framePolicy(setting: string): { started: boolean; output: string } {
  const args = ['run', '--rm', '-e', `FRAME_ANCESTORS=${setting}`, 'dockerbridge-dashboard:local', 'nginx', '-T'];
  try {
    return { started: true, output: execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    return { started: false, output: stdout + stderr };
  }
}

test.describe('who may frame the site', () => {
  test('nobody, unless a site is named', async ({ request }) => {
    const headers = (await request.get('/login/')).headers();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('a named https site, and then the older header steps aside', () => {
    const one = framePolicy('https://portfolio.example.com');
    expect(one.started).toBe(true);
    expect(one.output).toContain('default "https://portfolio.example.com";');
    expect(one.output).toMatch(/map "" \$x_frame_options \{\s+default "";/);

    const several = framePolicy('self https://portfolio.example.com https://*.example.org');
    expect(several.output).toContain(`default "'self' https://portfolio.example.com https://*.example.org";`);
    expect(framePolicy('self').output).toContain('default "SAMEORIGIN";');
  });

  test('refuses to start with a setting that would let anyone in, or that is not a list of sites', () => {
    const hostile = ['*', 'https://*', 'http://portfolio.example.com', 'none https://a.example.com', 'https://a.example.com; add_header X-Evil 1', 'https://a.example.com/path', "'self'"];
    for (const setting of hostile) {
      const result = framePolicy(setting);
      expect(result.started, setting).toBe(false);
      expect(result.output, setting).toContain('FRAME_ANCESTORS:');
    }
  });
});
