import { PROJECT_TREE } from '../model/facts';
import { CodeSample } from '../ui/code-sample';
import { DocSection } from '../ui/doc-section';
import { Bullets, C } from '../ui/prose';

const RULES = [
  <>
    <strong className="text-ink">Layers point one way.</strong> <C>shared</C> knows nothing about the product;{' '}
    <C>mock-bridge</C> is pure TypeScript with no React; <C>features</C> compose both.
  </>,
  <>
    <strong className="text-ink">One purpose per file.</strong> ESLint fails the build above 200 lines per file or 40
    lines per function, so components are split before they grow.
  </>,
  <>
    <strong className="text-ink">One source of truth.</strong> The simulator, the playground and this page all call the
    same mock tools and read the same schemas, so they cannot disagree.
  </>,
];

export function ProjectLayout() {
  return (
    <DocSection id="project-layout" lead="Where things live, and the three rules that keep it maintainable.">
      <CodeSample title="repository" text={PROJECT_TREE} />
      <Bullets items={RULES} />
    </DocSection>
  );
}
