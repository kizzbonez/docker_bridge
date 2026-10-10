// Best-effort secret redaction for anything read out of a container. It is a
// second line of defence, not a guarantee: a secret in an unusual format will
// get through, which is why credential files are also refused by the policy.

export const REDACTED = '«redacted»';

const SECRET_WORD = 'pass(?:word|wd)?|secret|token|api[_-]?key|private[_-]?key|credential|access[_-]?key';
// Names that hold credentials. Deliberately not "auth" or "session" alone:
// AUTH_MAX_FAILURES or SESSION_TTL are settings worth being able to read.
const SECRET_NAME = new RegExp(`${SECRET_WORD}|authorization|dsn|database_url|connection_?string|(^|_)keys?(_|$)`, 'i');

// scheme://user:password@host
const URL_CREDENTIALS = /([a-z][a-z0-9+.-]{1,20}:\/\/[^\s:/@]{1,80}):([^\s@/]{1,200})@/gi;
// password=value, api_key: "value", DB_PASSWORD=value. No leading wildcard,
// and bounded repeats, so this stays linear on long unbroken strings.
const ASSIGNMENT = new RegExp(`((?:${SECRET_WORD})[A-Za-z0-9_]{0,20}["']?\\s{0,3}[=:]\\s{0,3})("[^"]{0,400}"|'[^']{0,400}'|[^\\s,;&"']{1,400})`, 'gi');
const ENV_LINE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

export function isSecretName(name: string): boolean {
  return SECRET_NAME.test(name);
}

/** Hides passwords in URLs and the values of secret-looking assignments. */
export function redactSecrets(text: string): string {
  return text.replace(URL_CREDENTIALS, `$1:${REDACTED}@`).replace(ASSIGNMENT, `$1${REDACTED}`);
}

/** For `env`-style output: hides the whole value of any variable whose name looks secret. */
export function redactEnvLines(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const match = ENV_LINE.exec(line);
      return match && isSecretName(match[1] ?? '') ? `${match[1]}=${REDACTED}` : line;
    })
    .join('\n');
}
