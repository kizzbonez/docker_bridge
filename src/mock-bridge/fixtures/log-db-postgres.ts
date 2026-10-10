import { clock } from './clock';

const SATURATION_STARTS_AT = 40;

const stamp = (i: number): string => `2026-10-10 ${clock(i, 4)}.${String((i * 71) % 1000).padStart(3, '0')} UTC`;

const authorized = (i: number): string =>
  `${stamp(i)} [${300 + i}] LOG:  connection authorized: user=orders database=orders application_name=order-api`;
const checkpoint = (i: number): string =>
  `${stamp(i)} [77] LOG:  checkpoint complete: wrote ${400 + i} buffers (2.5%); 0 WAL file(s) added`;
const tooMany = (i: number): string => `${stamp(i)} [${300 + i}] FATAL:  sorry, too many clients already`;
const reserved = (i: number): string =>
  `${stamp(i)} [${300 + i}] FATAL:  remaining connection slots are reserved for roles with the SUPERUSER attribute`;

function lineAt(i: number): string {
  if (i === 0) return `${stamp(i)} [1] LOG:  database system is ready to accept connections`;
  if (i >= SATURATION_STARTS_AT && i % 4 === 0) return tooMany(i);
  if (i >= SATURATION_STARTS_AT && i % 9 === 1) return reserved(i);
  return i % 10 === 7 ? checkpoint(i) : authorized(i);
}

/** Postgres primary: connection churn that tips into slot exhaustion. */
export const DB_POSTGRES_LOG: string[] = Array.from({ length: 90 }, (_, i) => lineAt(i));
