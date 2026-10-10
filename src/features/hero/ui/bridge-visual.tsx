import type { CSSProperties } from 'react';
import { CABLE_PATH, DECK_Y, HANGERS, TOWER_LEFT, TOWER_RIGHT, TOWER_TOP, cableY } from './bridge-geometry';

const LABEL = 'fill-ink-dim font-mono text-[11px] tracking-[0.18em]';
const SUBLABEL = 'fill-ink-mute font-mono text-[9px] tracking-[0.14em]';
const SPAN = { '--span': '452px' } as CSSProperties;

function Structure() {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={CABLE_PATH} className="stroke-sky-400" strokeWidth="2.5" strokeLinejoin="round" />
      {HANGERS.map((x) => (
        <path key={x} d={`M${x} ${cableY(x)}V${DECK_Y}`} className="stroke-sky-400/50" strokeWidth="1.2" />
      ))}
      <path d={`M${TOWER_LEFT} ${TOWER_TOP - 10}V250M${TOWER_RIGHT} ${TOWER_TOP - 10}V250`} className="stroke-sky-400" strokeWidth="6" />
      <path d={`M14 ${DECK_Y}H506`} className="stroke-cyan-500" strokeWidth="5" />
      <path d={`M14 ${DECK_Y + 12}H506`} className="stroke-cyan-500/25" strokeWidth="1" strokeDasharray="2 6" />
    </g>
  );
}

/** Requests travel east along the deck, results come back west. Hidden when motion is reduced. */
function Packets() {
  return (
    <g style={SPAN} className="motion-reduce:hidden">
      <circle cx="34" cy={DECK_Y - 9} r="4" className="animate-packet-east fill-cyan-300" />
      <circle cx="34" cy={DECK_Y - 9} r="4" className="animate-packet-east fill-cyan-300 [animation-delay:-1.6s]" />
      <circle cx="34" cy={DECK_Y + 22} r="4" className="animate-packet-west fill-emerald-400 [animation-delay:-0.8s]" />
      <circle cx="34" cy={DECK_Y + 22} r="4" className="animate-packet-west fill-emerald-400 [animation-delay:-2.4s]" />
    </g>
  );
}

function Labels() {
  return (
    <g textAnchor="middle">
      <text x={TOWER_LEFT} y="32" className={LABEL}>MCP CLIENT</text>
      <text x={TOWER_LEFT} y="46" className={SUBLABEL}>AGENT · STDIO</text>
      <text x={TOWER_RIGHT} y="32" className={LABEL}>DOCKER ENGINE</text>
      <text x={TOWER_RIGHT} y="46" className={SUBLABEL}>UNIX SOCKET</text>
      <text x="260" y="262" className="fill-sky-400 font-mono text-[12px] tracking-[0.2em]">DOCKERBRIDGE MCP</text>
      <text x="260" y="278" className={SUBLABEL}>JSON-RPC 2.0 · GUARDED · TOKEN-BUDGETED</text>
    </g>
  );
}

/** Hero illustration: the suspension bridge from the logo, carrying live traffic. */
export function BridgeVisual() {
  return (
    <svg
      viewBox="0 0 520 300"
      role="img"
      aria-label="Diagram: an MCP client and the Docker Engine connected by the DockerBridge MCP server"
      className="h-auto w-full"
    >
      <Structure />
      <Packets />
      <Labels />
    </svg>
  );
}
