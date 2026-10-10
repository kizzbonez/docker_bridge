import type { ReactNode } from 'react';

interface DataTableProps {
  caption: string;
  columns: string[];
  /** One array of cells per row; the first cell is the row header. */
  rows: ReactNode[][];
}

/** A scroll-safe reference table. */
export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-cyan-500/20" tabIndex={0} role="group" aria-label={caption}>
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-carbon-800/80 font-mono text-[11px] tracking-wider text-sky-300 uppercase">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-4 py-2.5 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cyan-500/10">
          {rows.map((cells, row) => (
            <tr key={row} className="align-top">
              {cells.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row" className="px-4 py-3 font-mono text-[13px] font-normal text-cyan-300">
                    {cell}
                  </th>
                ) : (
                  <td key={index} className="px-4 py-3 text-ink-dim">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
