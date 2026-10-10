/** Geometry of the hero bridge, in SVG user units (viewBox 0 0 520 300). */
export const DECK_Y = 204;
export const TOWER_LEFT = 110;
export const TOWER_RIGHT = 410;
export const TOWER_TOP = 64;
const SAG_CONTROL_Y = 250;

/** Height of the main cable above `x`: a quadratic sag between the towers. */
export function cableY(x: number): number {
  const t = (x - TOWER_LEFT) / (TOWER_RIGHT - TOWER_LEFT);
  return (1 - t) ** 2 * TOWER_TOP + 2 * t * (1 - t) * SAG_CONTROL_Y + t ** 2 * TOWER_TOP;
}

export const CABLE_PATH = `M14 150 L${TOWER_LEFT} ${TOWER_TOP} Q260 ${SAG_CONTROL_Y} ${TOWER_RIGHT} ${TOWER_TOP} L506 150`;

/** x positions of the vertical hangers between the towers. */
export const HANGERS: number[] = Array.from({ length: 9 }, (_, index) => 140 + index * 30);
