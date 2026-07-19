import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Braces,
  Database,
  FlaskConical,
  FunctionSquare,
  Gauge,
  Layers3,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Table2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The Case for Native Expressions | Collections",
  description: "The product story, experience principles, technical approach, and roadmap for bringing Excel-like calculations natively into Collections.",
};

const capabilities = [
  ["Conditional aggregation", "SUMIFS, COUNTIFS, AVERAGEIFS", "FILTER, CASE, SUM, COUNT, AVG", "PoC"],
  ["Math", "SUM, MIN, MAX, ROUND, ABS, percentages", "Native numeric functions", "PoC"],
  ["Logic", "IF, IFS, IFERROR", "CASE, COALESCE", "PoC"],
  ["Dates", "DAYS, DATEDIF, EOMONTH", "Date arithmetic, DATE_TRUNC", "PoC"],
  ["Text", "CONCAT, UPPER, LOWER, TRIM", "String functions", "PoC"],
  ["Lookups", "XLOOKUP, VLOOKUP", "Governed joins", "Next"],
];

export default function StoryPage() {
  return (
    <main className="story-shell">
      <nav className="story-nav" aria-label="Product story navigation">
        <Link href="/story" className="story-brand"><span>fx</span> Collections Expression Studio</Link>
        <div className="story-nav-links">
          <a href="#problem">Problem</a>
          <a href="#principles">Principles</a>
          <a href="#architecture">Architecture</a>
          <a href="#roadmap">Roadmap</a>
          <Link href="/">Open prototype <ArrowRight size={14} /></Link>
        </div>
      </nav>

      <header className="story-hero">
        <Image className="story-hero-image" src="/og.png" alt="Collections Expression Studio interface showing a formula translated into SQL" fill priority sizes="100vw" />
        <div className="story-hero-inner">
          <span className="eyebrow"><Sparkles size={15} /> Product concept · Collections administration</span>
          <h1>Excel-like answers, without leaving Collections.</h1>
          <p>Expression Studio gives administrators and consultants a visual way to create customer and invoice values, then turns each governed expression into SQL that runs where the data already lives.</p>
          <div className="story-hero-actions">
            <Link href="/">Try the working prototype <ArrowRight size={16} /></Link>
            <a href="#problem"><BookOpen size={16} /> Read the product case</a>
          </div>
          <div className="story-proof">
            <div><strong>1 native journey</strong><span>From business question to tested field</span></div>
            <div><strong>30 + 30 fields</strong><span>Reference fields at both data levels</span></div>
            <div><strong>Zero raw SQL</strong><span>For admins building expressions</span></div>
          </div>
        </div>
      </header>

      <section className="story-band story-problem" id="problem">
        <div className="story-band-inner">
          <div className="story-section-heading">
            <div><span className="eyebrow">The problem</span><h2>A simple SUMIF should not require a data journey.</h2></div>
            <p>Today, a request such as “sum open amounts for RV and DZ documents at customer level” can require data to leave the Collections SQL environment, move through LiveCube infrastructure, be calculated in a spreadsheet-like layer, and return to the product. The calculation is simple; the path is not.</p>
          </div>
          <div className="problem-flow">
            <div className="flow-side current">
              <h3>Current path</h3>
              <ol><li>Identify data in Collections</li><li>Export or replicate into LiveCube</li><li>Reconstruct logic in another data model</li><li>Calculate and validate externally</li><li>Return the value to the product</li></ol>
              <div className="flow-callout">More touchpoints, more ownership boundaries, and slower iteration for straightforward logic.</div>
            </div>
            <div className="flow-arrow"><ArrowRight size={24} /></div>
            <div className="flow-side proposed">
              <h3>Native path</h3>
              <ol><li>Describe the value visually</li><li>Translate from Excel semantics to SQL</li><li>Simulate on selected customers</li><li>Review governed SQL and parameters</li><li>Publish as a native calculated field</li></ol>
              <div className="flow-callout">One product journey, operating on the database and context users already trust.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="story-band use-case-band">
        <div className="story-band-inner use-case-layout">
          <div className="use-case-copy">
            <span className="eyebrow">Representative use case</span>
            <h2>Turn the Costco request into a reusable field.</h2>
            <p>The user thinks in spreadsheet terms: sum open amount when document type is RV or DZ and status is Open. Expression Studio preserves that mental model while generating an execution plan the platform can govern.</p>
            <blockquote>“Show the sum of open amounts for selected document types, for every customer.”</blockquote>
          </div>
          <div className="formula-showcase">
            <div className="formula-showcase-header"><span>Selected document type open amount</span><span>Customer-level · Amount</span></div>
            <div className="formula-showcase-body">
              <div className="showcase-sentence">For each <span className="s-condition">Customer</span> calculate <span className="s-fn">SUMIFS</span> of <span className="s-field">Open amount</span> where <span className="s-condition">Document type is RV or DZ</span> and <span className="s-condition">Status is Open</span></div>
              <div className="showcase-result"><span><strong>Costco Wholesale</strong>2 matching invoices</span><b>$203,000</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="story-band principles-band" id="principles">
        <div className="story-band-inner">
          <div className="story-section-heading">
            <div><span className="eyebrow">Experience principles</span><h2>Familiar enough to start. Governed enough to scale.</h2></div>
            <p>The interface is not a thin SQL editor and it is not a spreadsheet clone. It uses spreadsheet language to make intent familiar, then adds product safeguards, simulation, lineage, and control.</p>
          </div>
          <div className="principles-grid">
            <article className="principle"><span><FunctionSquare size={20} /></span><h3>Speak spreadsheet</h3><p>Use familiar names such as SUMIFS, IF, DAYS, CONCAT, and ROUND so the first step feels known.</p></article>
            <article className="principle"><span><Layers3 size={20} /></span><h3>Build visually</h3><p>Compose a readable business sentence from approved fields, operators, and functions.</p></article>
            <article className="principle"><span><FlaskConical size={20} /></span><h3>Simulate narrowly</h3><p>Test on representative customers and their invoices before spending effort on a full run.</p></article>
            <article className="principle"><span><ShieldCheck size={20} /></span><h3>Reveal the execution</h3><p>Show parameterized SQL, result type, scope, and matched records without asking users to write SQL.</p></article>
          </div>
        </div>
      </section>

      <section className="story-band capability-band">
        <div className="story-band-inner">
          <div className="story-section-heading">
            <div><span className="eyebrow">Capability boundary</span><h2>Cover the SQL-translatable core of Excel first.</h2></div>
            <p>The product promise should be precise: support spreadsheet functions whose behavior can be represented safely and predictably in SQL at customer or invoice grain. Functions that depend on worksheet layout, volatile state, macros, or arbitrary code remain out of scope.</p>
          </div>
          <div className="capability-table">
            <div className="capability-row header"><span>Family</span><span>Spreadsheet language</span><span>SQL execution</span><span>Coverage</span></div>
            {capabilities.map(([family, spreadsheet, sql, status]) => <div className="capability-row" key={family}><span><strong>{family}</strong></span><span>{spreadsheet}</span><span>{sql}</span><span><b className="coverage-pill">{status}</b></span></div>)}
          </div>
        </div>
      </section>

      <section className="story-band architecture-band" id="architecture">
        <div className="story-band-inner">
          <div className="story-section-heading">
            <div><span className="eyebrow">Technical concept</span><h2>Store intent, compile safely, execute natively.</h2></div>
            <p>The durable artifact is a typed expression definition, not a raw SQL string. A Java or Python service validates its fields and functions, compiles parameterized SQL for the supported database dialect, executes against the required grain, and records lineage.</p>
          </div>
          <div className="architecture-flow">
            <div className="architecture-node"><span><Braces size={23} /></span><strong>Expression definition</strong><small>Typed function, fields, scope, conditions</small></div>
            <div className="architecture-node"><span><ShieldCheck size={23} /></span><strong>Policy validator</strong><small>Allowlist, type checks, cost guardrails</small></div>
            <div className="architecture-node"><span><Database size={23} /></span><strong>SQL compiler</strong><small>Parameterized, dialect-aware query plan</small></div>
            <div className="architecture-node"><span><Table2 size={23} /></span><strong>Native field</strong><small>Customer or invoice result with lineage</small></div>
          </div>
          <div className="trust-strip"><div><LockKeyhole size={17} />No arbitrary SQL input</div><div><Gauge size={17} />Sample and cost limits</div><div><RefreshCw size={17} />Versioned expressions</div><div><ShieldCheck size={17} />Permissions and audit history</div></div>
        </div>
      </section>

      <section className="story-band roadmap-band" id="roadmap">
        <div className="story-band-inner">
          <div className="story-section-heading">
            <div><span className="eyebrow">Product roadmap</span><h2>Prove value quickly, then earn breadth.</h2></div>
            <p>The first release should solve high-frequency collections questions with exceptional clarity. Breadth follows observed demand, not a promise to reproduce every corner of Excel on day one.</p>
          </div>
          <div className="roadmap">
            <article className="roadmap-phase"><span>Phase 1 · Proof</span><h3>Conditional calculations</h3><ul><li>Customer and invoice output levels</li><li>Math, logic, date, and text foundations</li><li>CSV upload with 30 reference fields per level</li><li>Selected-customer simulation and SQL preview</li></ul></article>
            <article className="roadmap-phase"><span>Phase 2 · Productize</span><h3>Govern and publish</h3><ul><li>Role-based authoring and approvals</li><li>Expression versions and dependencies</li><li>Query cost analysis and runtime monitoring</li><li>Calculated fields available across Collections</li></ul></article>
            <article className="roadmap-phase"><span>Phase 3 · Extend</span><h3>Advanced composition</h3><ul><li>Governed lookups and reusable sub-expressions</li><li>More SQL dialects and function mappings</li><li>AI-assisted formula drafting with review</li><li>Usage analytics and template marketplace</li></ul></article>
          </div>
          <div className="success-metrics"><div><strong>&lt; 5 min</strong><span>Median time from business question to validated expression</span></div><div><strong>80%</strong><span>Target share of simple LiveCube calculation requests handled natively</span></div><div><strong>100%</strong><span>Published expressions with owner, version, scope, and SQL lineage</span></div></div>
        </div>
      </section>

      <section className="story-cta"><div className="story-cta-inner"><h2>The fastest way to understand the idea is to build the Costco expression yourself.</h2><Link href="/">Open the working prototype <ArrowRight size={17} /></Link></div></section>
      <footer className="story-footer"><span>Collections Expression Studio · Product concept</span><span>Designed for internal exploration and stakeholder discussion</span></footer>
    </main>
  );
}
