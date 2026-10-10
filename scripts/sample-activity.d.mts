export declare const SAMPLE_TOTALS: { calls: number; refused: number; failed: number; saved: number; clients: number };

/** Writes the sample activity log into `dir`, creating it. Returns `dir`. */
export declare function writeSampleActivity(dir: string): string;
