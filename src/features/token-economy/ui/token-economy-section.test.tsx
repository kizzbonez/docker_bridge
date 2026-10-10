import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BENCHMARKS, toBenchmarks } from '../model/benchmarks';
import { CONTEXT_WINDOW, computeEconomy } from '../model/economy';
import { TokenEconomySection } from './token-economy-section';

const raw = () => within(screen.getByTestId('economy-raw'));
const bridged = () => within(screen.getByTestId('economy-bridged'));

describe('benchmarks CSV', () => {
  it('loads the headline figures from the brief', () => {
    expect(BENCHMARKS[0]).toMatchObject({ id: 'gateway-502', rawTokens: 18400, bridgedTokens: 320, container: 'web-gateway' });
    expect(BENCHMARKS).toHaveLength(4);
  });

  it('drops rows with an unknown container or non-numeric counts', () => {
    const header = 'scenario_id,label,container,filter_pattern,raw_lines,raw_tokens,ansi_sequences,duplicate_lines,bridged_lines,bridged_tokens';
    expect(toBenchmarks(`${header}\nx,X,not-a-container,a,1,2,3,4,5,6`)).toEqual([]);
    expect(toBenchmarks(`${header}\nx,X,order-api,a,1,abc,3,4,5,6`)).toEqual([]);
    expect(toBenchmarks(`${header}\nx,X,order-api,a,1,2,3,4,5,6`)).toHaveLength(1);
  });
});

describe('computeEconomy', () => {
  const headline = BENCHMARKS[0];
  if (!headline) throw new Error('missing headline benchmark');

  it('reproduces a 98% reduction at about five cents per raw cycle', () => {
    const economy = computeEconomy(headline, 3, 12);
    expect(economy.reduction).toBeCloseTo(0.9826, 4);
    expect(economy.tokensSaved).toBe(18080);
    expect(economy.raw.costPerCycle).toBeCloseTo(0.0552, 6);
    expect(economy.bridged.costPerCycle).toBeCloseTo(0.00096, 6);
  });

  it('shows raw logs overflowing the window where the bridge barely registers', () => {
    const economy = computeEconomy(headline, 3, 12);
    expect(economy.raw.sessionTokens).toBeGreaterThan(CONTEXT_WINDOW);
    expect(economy.raw.cyclesThatFit).toBe(10);
    expect(economy.bridged.contextShare).toBeLessThan(0.02);
    expect(economy.bridged.cyclesThatFit).toBe(625);
  });
});

describe('TokenEconomySection', () => {
  it('shows both sides of the comparison for the default incident', () => {
    render(<TokenEconomySection />);
    expect(raw().getByText('18,400')).toBeInTheDocument();
    expect(raw().getByText('$0.0552')).toBeInTheDocument();
    expect(raw().getByText('Exceeds the context limit after cycle 10.')).toBeInTheDocument();
    expect(bridged().getByText('320')).toBeInTheDocument();
    expect(bridged().getByText('$0.0010')).toBeInTheDocument();
    expect(within(screen.getByTestId('reduction-banner')).getByText('98.3%')).toBeInTheDocument();
  });

  it('switches incident with the tabs', async () => {
    const user = userEvent.setup();
    render(<TokenEconomySection />);
    await user.click(screen.getByRole('tab', { name: 'Redis OOM crash' }));
    expect(raw().getByText('26,900')).toBeInTheDocument();
    expect(bridged().getByText('290')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtered MCP tool output')).toHaveTextContent('"container": "cache-redis"');
  });

  it('recomputes context pressure and cost from the controls', () => {
    render(<TokenEconomySection />);
    fireEvent.change(screen.getByLabelText(/Debug cycles in one session/), { target: { value: '5' } });
    expect(raw().getByText('10 cycles fit before the window fills.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Input price/), { target: { value: '15' } });
    expect(raw().getByText('$0.2760')).toBeInTheDocument();
  });

  it('moves the divider between raw and filtered output', () => {
    render(<TokenEconomySection />);
    const divider = screen.getByLabelText(/Comparison divider/);
    fireEvent.change(divider, { target: { value: '70' } });
    expect(screen.getByTestId('compare-raw')).toHaveStyle({ width: '70%' });
    expect(screen.getByLabelText('Raw docker logs')).toHaveTextContent('␛[');
  });

  it('offers the benchmark dataset as a CSV download', () => {
    render(<TokenEconomySection />);
    const link = screen.getByRole('link', { name: /Download benchmark CSV/ });
    expect(link).toHaveAttribute('download', 'dockerbridge-token-economy.csv');
    expect(link.getAttribute('href')).toMatch(/token-economy.*\.csv/);
  });
});
