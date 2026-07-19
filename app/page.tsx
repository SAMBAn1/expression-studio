"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Braces,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Columns3,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  FlaskConical,
  FunctionSquare,
  Grid3X3,
  Info,
  LayoutGrid,
  ListFilter,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  type Condition,
  type Customer,
  type Expression,
  type FunctionKey,
  type Invoice,
  type Level,
  type Operator,
  type ResultType,
  evaluateExpression,
  fieldCatalog,
  formatResult,
  functionCatalog,
  getFieldValue,
  initialExpression,
  money,
  referenceHeaders,
  seedCustomers,
  seedInvoices,
  sqlParameters,
  toExcelFormula,
  toSql,
} from "./expression-data";

type View = "builder" | "simulation" | "customers" | "invoices";
type WorkspaceTab = {
  id: string;
  label: string;
  kind: "view" | "customer";
  view?: View;
  customerNumber?: string;
};
type UploadType = "customer" | "invoice";
type FormulaMode = "visual" | "formula";

type GridColumn<T> = {
  key: string;
  label: string;
  width: number;
  align?: "left" | "right";
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
};

const operatorLabels: Record<Operator, string> = {
  equals: "is",
  not_equals: "is not",
  in: "is any of",
  not_in: "is none of",
  greater_than: "is greater than",
  less_than: "is less than",
  contains: "contains",
  is_blank: "is blank",
};

const viewLabels: Record<View, string> = {
  builder: "Expression Studio",
  simulation: "Simulation Lab",
  customers: "Customers",
  invoices: "Invoices",
};

const viewIcons: Record<View, ReactNode> = {
  builder: <FunctionSquare size={18} />,
  simulation: <FlaskConical size={18} />,
  customers: <Users size={18} />,
  invoices: <FileSpreadsheet size={18} />,
};

const numericSourceFields = fieldCatalog.filter(
  (field) => field.kind === "amount" || field.kind === "number",
);
const conditionFields = fieldCatalog.filter((field) => field.entity === "Invoice" || field.key.startsWith("customer."));

function resultTypeForFunction(functionKey: FunctionKey): ResultType {
  if (["IF", "CONCAT", "UPPER", "LOWER", "TRIM", "COALESCE"].includes(functionKey)) return "text";
  if (functionKey === "EOMONTH") return "date";
  if (["COUNTIFS", "DAYS", "PERCENT"].includes(functionKey)) return "number";
  return "amount";
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});
  });
  return { headers, rows };
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill status-${value.toLowerCase()}`}>{value}</span>;
}

function IconButton({
  label,
  children,
  onClick,
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button className={`icon-button ${className}`} onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function DataGrid<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  onRowDoubleClick,
  selectedKey,
  emptyLabel,
}: {
  rows: T[];
  columns: GridColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  selectedKey?: string;
  emptyLabel: string;
}) {
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: columns[0]?.key ?? "",
    direction: "asc",
  });
  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return rows;
    return [...rows].sort((left, right) => {
      const leftValue = column.value(left);
      const rightValue = column.value(right);
      const compared = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue));
      return sort.direction === "asc" ? compared : -compared;
    });
  }, [columns, rows, sort]);
  const template = columns.map((column) => `${column.width}px`).join(" ");
  const gridStyle = { "--grid-columns": template } as CSSProperties;

  return (
    <div className="data-grid-frame" role="grid" aria-rowcount={rows.length + 1} style={gridStyle}>
      <div className="data-grid-scroll">
        <div className="data-grid-header" role="row">
          {columns.map((column) => (
            <button
              key={column.key}
              className={column.align === "right" ? "align-right" : ""}
              onClick={() => setSort((current) => ({
                key: column.key,
                direction: current.key === column.key && current.direction === "asc" ? "desc" : "asc",
              }))}
              role="columnheader"
            >
              {column.label}
              {sort.key === column.key && <ChevronDown className={sort.direction === "desc" ? "sort-desc" : ""} size={14} />}
            </button>
          ))}
        </div>
        {sortedRows.map((row) => (
          <button
            key={rowKey(row)}
            className={`data-grid-row ${selectedKey === rowKey(row) ? "is-selected" : ""}`}
            onClick={() => onRowClick?.(row)}
            onDoubleClick={() => onRowDoubleClick?.(row)}
            role="row"
          >
            {columns.map((column) => (
              <span key={column.key} className={column.align === "right" ? "align-right" : ""} role="gridcell">
                {column.render ? column.render(row) : column.value(row)}
              </span>
            ))}
          </button>
        ))}
        {!rows.length && <div className="grid-empty">{emptyLabel}</div>}
      </div>
    </div>
  );
}

function FunctionLibrary({
  selected,
  onSelect,
  onClose,
}: {
  selected: FunctionKey;
  onSelect: (key: FunctionKey) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const functions = functionCatalog.filter((item) =>
    `${item.key} ${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const categories = ["Conditional", "Math", "Logic", "Date", "Text"] as const;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="function-modal" role="dialog" aria-modal="true" aria-label="Function library">
        <header className="modal-header">
          <div>
            <span className="eyebrow">Excel-to-SQL catalog</span>
            <h2>Choose a function</h2>
          </div>
          <IconButton label="Close function library" onClick={onClose}><X size={18} /></IconButton>
        </header>
        <label className="search-field function-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SUMIFS, date, text..." autoFocus />
        </label>
        <div className="function-groups">
          {categories.map((category) => {
            const items = functions.filter((item) => item.category === category);
            if (!items.length) return null;
            return (
              <section key={category} className="function-group">
                <h3>{category}</h3>
                <div className="function-list">
                  {items.map((item) => (
                    <button
                      key={item.key}
                      className={selected === item.key ? "function-option selected" : "function-option"}
                      onClick={() => { onSelect(item.key); onClose(); }}
                    >
                      <span className="function-mark">{item.key.slice(0, 3)}</span>
                      <span>
                        <strong>{item.key}</strong>
                        <small>{item.label}</small>
                        <p>{item.description}</p>
                      </span>
                      {selected === item.key ? <Check size={18} /> : <ChevronRight size={18} />}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function HowToDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { title: "Name the outcome", body: "Start with the business value you want to create, then choose whether it belongs on every customer or every invoice.", example: "Selected document type open amount" },
    { title: "Build it like Excel", body: "Pick a familiar function. The visual sentence lets you choose fields and criteria without remembering formula syntax.", example: "SUMIFS(Open amount, Document type, {RV,DZ}, Status, Open)" },
    { title: "Test a small sample", body: "Choose representative customers and compare matched invoices with the calculated result before publishing.", example: "Costco Wholesale: 2 matched invoices = $203,000" },
    { title: "Review and publish", body: "Inspect the generated SQL and parameters, then save the calculated field for use in customer or invoice grids.", example: "The SQL is generated from approved fields and functions only." },
  ];
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="howto-drawer" role="dialog" aria-modal="true" aria-label="How to build an expression">
        <header className="drawer-header">
          <div className="howto-icon"><BookOpen size={20} /></div>
          <div><span className="eyebrow">Four-minute guide</span><h2>Build your first expression</h2></div>
          <IconButton label="Close guide" onClick={onClose}><X size={18} /></IconButton>
        </header>
        <div className="guide-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((item, index) => <button key={item.title} className={index <= step ? "complete" : ""} onClick={() => setStep(index)} aria-label={`Open step ${index + 1}`} />)}
        </div>
        <div className="guide-body">
          <span className="guide-step">Step {step + 1} of {steps.length}</span>
          <h3>{steps[step].title}</h3>
          <p>{steps[step].body}</p>
          <div className="guide-example">
            <span>Example</span>
            <strong>{steps[step].example}</strong>
          </div>
          {step === 1 && (
            <div className="mini-anatomy">
              <span className="anatomy-function">SUMIFS</span>
              <span className="anatomy-field">Open amount</span>
              <span className="anatomy-condition">where Document type is RV or DZ</span>
            </div>
          )}
        </div>
        <footer className="drawer-footer">
          <button className="secondary-button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ArrowLeft size={16} /> Back</button>
          {step < steps.length - 1 ? (
            <button className="primary-button" onClick={() => setStep((current) => current + 1)}>Next <ArrowRight size={16} /></button>
          ) : (
            <button className="primary-button" onClick={onClose}><Check size={16} /> Start building</button>
          )}
        </footer>
      </aside>
    </div>
  );
}

function UploadModal({
  initialType,
  customers,
  onUploadCustomers,
  onUploadInvoices,
  onClose,
}: {
  initialType: UploadType;
  customers: Customer[];
  onUploadCustomers: (rows: Customer[]) => void;
  onUploadInvoices: (rows: Invoice[]) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<UploadType>(initialType);
  const [message, setMessage] = useState<{ kind: "idle" | "error" | "success"; text: string }>({ kind: "idle", text: "" });
  const [isLoading, setIsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const schema = referenceHeaders[type];

  function downloadTemplate() {
    const core = type === "customer"
      ? ["customerNumber", "customerName", "region", "collector", "segment", "risk", "creditLimit", "currency"]
      : ["invoiceNumber", "customerNumber", "documentType", "openAmount", "invoiceAmount", "dueDate", "invoiceDate", "status", "collector"];
    const headers = [...core, ...schema.number, ...schema.text, ...schema.date];
    const example = type === "customer"
      ? ["CUST-100", "Example Customer", "West", "Nia Sharma", "Retail", "Low", "500000", "USD"]
      : ["INV-90001", "CUST-100", "RV", "12500", "12500", "2026-08-15", "2026-07-15", "Open", "Nia Sharma"];
    const csv = `${headers.join(",")}\n${[...example, ...Array(30).fill("")].join(",")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${type}-upload-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function ingest(file: File) {
    setIsLoading(true);
    setMessage({ kind: "idle", text: "" });
    const { headers, rows } = parseCsv(await file.text());
    const missing = schema.required.filter((required) => !headers.includes(required));
    if (missing.length) {
      setMessage({ kind: "error", text: `Missing required columns: ${missing.join(", ")}` });
      setIsLoading(false);
      return;
    }
    const invalidRow = rows.findIndex((row) => schema.required.some((required) => !row[required]?.trim()));
    if (invalidRow >= 0) {
      setMessage({ kind: "error", text: `Row ${invalidRow + 2} has an empty required value.` });
      setIsLoading(false);
      return;
    }
    const toReferences = (row: Record<string, string>) => Object.fromEntries([
      ...schema.number.map((key) => [key, row[key] ? Number(row[key]) : ""]),
      ...schema.text.map((key) => [key, row[key] ?? ""]),
      ...schema.date.map((key) => [key, row[key] ?? ""]),
    ].filter(([, value]) => value !== ""));

    if (type === "customer") {
      onUploadCustomers(rows.map((row) => ({
        customerNumber: row.customerNumber,
        customerName: row.customerName,
        region: row.region || "Unassigned",
        collector: row.collector || "Unassigned",
        segment: row.segment || "General",
        risk: (["Low", "Medium", "High"].includes(row.risk) ? row.risk : "Medium") as Customer["risk"],
        creditLimit: Number(row.creditLimit || 0),
        currency: row.currency || "USD",
        references: toReferences(row),
      })));
    } else {
      const customerNumbers = new Set(customers.map((customer) => customer.customerNumber));
      const unlinked = rows.filter((row) => !customerNumbers.has(row.customerNumber));
      if (unlinked.length) {
        setMessage({ kind: "error", text: `${unlinked.length} invoice row${unlinked.length === 1 ? "" : "s"} reference an unknown customer number.` });
        setIsLoading(false);
        return;
      }
      onUploadInvoices(rows.map((row) => ({
        invoiceNumber: row.invoiceNumber,
        customerNumber: row.customerNumber,
        customerName: customers.find((customer) => customer.customerNumber === row.customerNumber)?.customerName ?? "",
        documentType: row.documentType || "RV",
        openAmount: Number(row.openAmount || 0),
        invoiceAmount: Number(row.invoiceAmount || row.openAmount || 0),
        dueDate: row.dueDate || "2026-07-20",
        invoiceDate: row.invoiceDate || "2026-07-20",
        status: (["Open", "Disputed", "Promise", "Closed"].includes(row.status) ? row.status : "Open") as Invoice["status"],
        collector: row.collector || "Unassigned",
        references: toReferences(row),
      })));
    }
    setMessage({ kind: "success", text: `${rows.length} ${type === "customer" ? "customers" : "invoices"} validated and added.` });
    setIsLoading(false);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="upload-modal" role="dialog" aria-modal="true" aria-label="Upload data">
        <header className="modal-header">
          <div><span className="eyebrow">Data workspace</span><h2>Upload CSV data</h2></div>
          <IconButton label="Close upload" onClick={onClose}><X size={18} /></IconButton>
        </header>
        <div className="segmented-control upload-tabs" aria-label="Upload dataset">
          <button className={type === "customer" ? "active" : ""} onClick={() => { setType("customer"); setMessage({ kind: "idle", text: "" }); }}>Customers</button>
          <button className={type === "invoice" ? "active" : ""} onClick={() => { setType("invoice"); setMessage({ kind: "idle", text: "" }); }}>Invoices</button>
        </div>
        <button className="drop-zone" onClick={() => fileRef.current?.click()}>
          <span className="upload-orbit"><Upload size={24} /></span>
          <strong>Choose a {type} CSV</strong>
          <small>Rows are checked before anything is added to this demo.</small>
          <span className="browse-button">Browse files</span>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && ingest(event.target.files[0])} />
        </button>
        {isLoading && <div className="upload-message"><LoaderCircle className="spin" size={16} /> Reading and validating file...</div>}
        {message.kind !== "idle" && <div className={`upload-message ${message.kind}`}>{message.kind === "success" ? <Check size={16} /> : <Info size={16} />}{message.text}</div>}
        <div className="schema-header">
          <div><h3>{type === "customer" ? "Customer" : "Invoice"} schema</h3><p>32 reference-ready fields, plus core operating fields.</p></div>
          <button className="secondary-button" onClick={downloadTemplate}><Download size={16} /> Download template</button>
        </div>
        <div className="schema-grid">
          <div className="schema-group required"><span>Required</span>{schema.required.map((field) => <code key={field}>{field}</code>)}</div>
          <div className="schema-group"><span>Number refs</span><strong>10 fields</strong><small>numberRef1 ... numberRef10</small></div>
          <div className="schema-group"><span>Text refs</span><strong>10 fields</strong><small>textRef1 ... textRef10</small></div>
          <div className="schema-group"><span>Date refs</span><strong>10 fields</strong><small>dateRef1 ... dateRef10</small></div>
        </div>
        {type === "invoice" && <div className="link-note"><Database size={17} /><span><strong>Customer link:</strong> every invoice customerNumber must match an uploaded customer.</span></div>}
      </section>
    </div>
  );
}

function ExpressionBuilder({
  expression,
  setExpression,
  customers,
  invoices,
  onShowGuide,
  onShowFunctions,
  onOpenSimulation,
  onToast,
}: {
  expression: Expression;
  setExpression: (updater: (current: Expression) => Expression) => void;
  customers: Customer[];
  invoices: Invoice[];
  onShowGuide: () => void;
  onShowFunctions: () => void;
  onOpenSimulation: () => void;
  onToast: (message: string) => void;
}) {
  const [mode, setMode] = useState<FormulaMode>("visual");
  const [sqlOpen, setSqlOpen] = useState(true);
  const [formulaText, setFormulaText] = useState(toExcelFormula(expression));
  const simulation = customers.slice(0, 4).map((customer) => ({
    customer,
    matched: invoices.filter((invoice) => invoice.customerNumber === customer.customerNumber && expression.conditions.every((condition) => {
      const value = String(getFieldValue(condition.field, customer, invoice)).toLowerCase();
      if (condition.operator === "in") return condition.value.toLowerCase().split(",").map((item) => item.trim()).includes(value);
      if (condition.operator === "equals") return value === condition.value.toLowerCase();
      return true;
    })).length,
    result: evaluateExpression(expression, customer, invoices),
  }));
  const selectedFunction = functionCatalog.find((item) => item.key === expression.functionKey)!;

  function updateCondition(id: string, patch: Partial<Condition>) {
    setExpression((current) => ({ ...current, conditions: current.conditions.map((condition) => condition.id === id ? { ...condition, ...patch } : condition) }));
  }

  function applyRecipe(recipe: "sum" | "age" | "priority" | "percent") {
    const patches: Record<typeof recipe, Partial<Expression>> = {
      sum: { name: "Selected document type open amount", functionKey: "SUMIFS", resultType: "amount", sourceField: "invoice.openAmount", conditions: initialExpression.conditions },
      age: { name: "Oldest invoice age", functionKey: "DAYS", resultType: "number", sourceField: "invoice.dueDate", conditions: [{ id: "condition-age", field: "invoice.status", operator: "equals", value: "Open" }] },
      priority: { name: "Collection priority", functionKey: "IF", resultType: "text", sourceField: "invoice.openAmount", conditions: [{ id: "condition-priority", field: "invoice.status", operator: "equals", value: "Open" }] },
      percent: { name: "Credit utilization", functionKey: "PERCENT", resultType: "number", sourceField: "invoice.openAmount", conditions: [{ id: "condition-percent", field: "invoice.status", operator: "equals", value: "Open" }] },
    };
    setExpression((current) => ({ ...current, ...patches[recipe] }));
    onToast("Recipe loaded. The preview has been recalculated.");
  }

  return (
    <section className="builder-page page-enter">
      <header className="page-title-row">
        <div>
          <div className="title-kicker"><span className="live-dot" /> Draft · Auto-saved just now</div>
          <h1>Create a calculated field</h1>
          <p>Build with familiar spreadsheet logic. The platform translates it into governed SQL.</p>
        </div>
        <div className="page-actions">
          <button className="text-button" onClick={onShowGuide}><CircleHelp size={17} /> How to</button>
          <button className="secondary-button" onClick={() => onToast("Draft saved for this demo session.")}><Save size={16} /> Save draft</button>
          <button className="primary-button" onClick={onOpenSimulation}><FlaskConical size={16} /> Test on data</button>
        </div>
      </header>

      <div className="builder-layout">
        <div className="builder-main">
          <section className="builder-surface">
            <div className="surface-toolbar">
              <div className="segmented-control" aria-label="Builder mode">
                <button className={mode === "visual" ? "active" : ""} onClick={() => setMode("visual")}><LayoutGrid size={15} /> Visual</button>
                <button className={mode === "formula" ? "active" : ""} onClick={() => { setFormulaText(toExcelFormula(expression)); setMode("formula"); }}><Braces size={15} /> Formula</button>
              </div>
              <span className="validation-state"><ShieldCheck size={16} /> Valid expression</span>
            </div>

            {mode === "visual" ? (
              <div className="visual-builder">
                <div className="builder-section first-section">
                  <div className="step-number">1</div>
                  <div className="builder-section-body">
                    <div className="section-label"><span>Output</span><small>Where should this value appear?</small></div>
                    <div className="output-row">
                      <label className="field-control grow"><span>Field name</span><input value={expression.name} onChange={(event) => setExpression((current) => ({ ...current, name: event.target.value }))} /></label>
                      <label className="field-control compact"><span>Calculate for each</span><select value={expression.level} onChange={(event) => setExpression((current) => ({ ...current, level: event.target.value as Level }))}><option value="customer">Customer</option><option value="invoice">Invoice</option></select></label>
                      <label className="field-control compact"><span>Returns</span><select value={expression.resultType} onChange={(event) => setExpression((current) => ({ ...current, resultType: event.target.value as ResultType }))}><option value="amount">Amount</option><option value="number">Number</option><option value="text">Text</option><option value="date">Date</option></select></label>
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="step-number">2</div>
                  <div className="builder-section-body">
                    <div className="section-label"><span>Formula</span><small>Build the calculation as a readable sentence.</small></div>
                    <div className="sentence-canvas">
                      <span className="sentence-word">For each</span>
                      <span className="sentence-token entity-token">{expression.level === "customer" ? "Customer" : "Invoice"}</span>
                      <span className="sentence-word">calculate</span>
                      <button className="sentence-token function-token" onClick={onShowFunctions}><FunctionSquare size={16} /> {expression.functionKey}<ChevronDown size={15} /></button>
                      {!(["COUNTIFS", "DAYS", "IF", "CONCAT", "UPPER", "LOWER", "TRIM", "COALESCE", "EOMONTH"].includes(expression.functionKey)) && (
                        <>
                          <span className="sentence-word">of</span>
                          <label className="inline-select field-token">
                            <Database size={15} />
                            <select value={expression.sourceField} onChange={(event) => setExpression((current) => ({ ...current, sourceField: event.target.value }))}>
                              {numericSourceFields.map((field) => <option key={field.key} value={field.key}>{field.entity} · {field.label}</option>)}
                            </select>
                          </label>
                        </>
                      )}
                    </div>
                    <p className="function-description"><Info size={15} /> <strong>{selectedFunction.label}:</strong> {selectedFunction.description}</p>
                  </div>
                </div>

                <div className="builder-section condition-section">
                  <div className="step-number">3</div>
                  <div className="builder-section-body">
                    <div className="section-label condition-heading">
                      <div><span>Conditions</span><small>Only include records that meet every condition.</small></div>
                      <button className="add-condition" onClick={() => setExpression((current) => ({ ...current, conditions: [...current.conditions, { id: `condition-${Date.now()}`, field: "invoice.documentType", operator: "equals", value: "" }] }))}><Plus size={15} /> Add condition</button>
                    </div>
                    <div className="condition-list">
                      {expression.conditions.map((condition, index) => (
                        <div className="condition-row" key={condition.id}>
                          <span className="logic-join">{index === 0 ? "WHERE" : "AND"}</span>
                          <label className="inline-select condition-field">
                            <select value={condition.field} onChange={(event) => updateCondition(condition.id, { field: event.target.value })}>
                              <optgroup label="Invoice fields">{conditionFields.filter((field) => field.entity === "Invoice").map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</optgroup>
                              <optgroup label="Customer fields">{conditionFields.filter((field) => field.entity === "Customer").map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</optgroup>
                            </select>
                          </label>
                          <label className="inline-select operator-select"><select value={condition.operator} onChange={(event) => updateCondition(condition.id, { operator: event.target.value as Operator })}>{Object.entries(operatorLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                          {condition.operator !== "is_blank" && <input className="condition-value" value={condition.value} placeholder={condition.operator === "in" ? "RV, DZ" : "Enter value"} onChange={(event) => updateCondition(condition.id, { value: event.target.value })} />}
                          <IconButton label="Remove condition" onClick={() => setExpression((current) => ({ ...current, conditions: current.conditions.filter((item) => item.id !== condition.id) }))}><X size={16} /></IconButton>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="formula-editor">
                <div className="formula-editor-heading"><div><span className="eyebrow">Advanced mode</span><h3>Write it like a spreadsheet formula</h3></div><button className="text-button" onClick={onShowFunctions}><FunctionSquare size={16} /> Function reference</button></div>
                <div className="formula-input-wrap"><span>fx</span><textarea value={formulaText} onChange={(event) => setFormulaText(event.target.value)} spellCheck={false} /></div>
                <div className="formula-hints">
                  {functionCatalog.slice(0, 7).map((item) => <button key={item.key} onClick={() => setFormulaText((current) => `${current}${current ? " " : "="}${item.key}()`)}>{item.key}</button>)}
                </div>
                <div className="formula-validation"><ShieldCheck size={18} /><div><strong>Ready to compile</strong><span>Functions and field names are checked against the approved registry before SQL is generated.</span></div><button className="secondary-button" onClick={() => onToast("Formula validated against the approved registry.")}><RefreshCw size={15} /> Validate</button></div>
              </div>
            )}

            <div className="formula-bar">
              <span className="fx-mark">fx</span>
              <code>{toExcelFormula(expression)}</code>
              <span className="formula-valid"><Check size={14} /> Excel equivalent</span>
            </div>
          </section>

          <section className="sql-section">
            <button className="sql-heading" onClick={() => setSqlOpen((current) => !current)}>
              <span><span className="sql-icon"><Database size={17} /></span><span><strong>Generated SQL</strong><small>Parameterized · read-only · PostgreSQL</small></span></span>
              <ChevronDown className={sqlOpen ? "" : "collapsed"} size={18} />
            </button>
            {sqlOpen && (
              <div className="sql-content">
                <pre>{toSql(expression)}</pre>
                <div className="parameter-strip"><span>Parameters</span>{sqlParameters(expression).map((parameter) => <code key={parameter.name}>:{parameter.name} = {parameter.value || "(blank)"}</code>)}</div>
              </div>
            )}
          </section>

          <section className="recipe-section">
            <div className="recipe-heading"><div><span className="eyebrow">Quick starts</span><h2>Try another collections recipe</h2></div><WandSparkles size={21} /></div>
            <div className="recipe-grid">
              <button onClick={() => applyRecipe("sum")}><span className="recipe-icon coral"><Calculator size={18} /></span><strong>Conditional open amount</strong><small>SUMIFS by doc type and status</small></button>
              <button onClick={() => applyRecipe("age")}><span className="recipe-icon blue"><BarChart3 size={18} /></span><strong>Oldest invoice age</strong><small>DAYS from due date to today</small></button>
              <button onClick={() => applyRecipe("priority")}><span className="recipe-icon amber"><Sparkles size={18} /></span><strong>Collection priority</strong><small>IF exposure crosses threshold</small></button>
              <button onClick={() => applyRecipe("percent")}><span className="recipe-icon green"><BarChart3 size={18} /></span><strong>Credit utilization</strong><small>Open amount as % of credit limit</small></button>
            </div>
          </section>
        </div>

        <aside className="live-preview">
          <header><div><span className="eyebrow">Live sample</span><h2>Calculated results</h2></div><span className="sample-badge">4 customers</span></header>
          <div className="preview-summary"><span>Output field</span><strong>{expression.name || "Untitled field"}</strong><small>{expression.level === "customer" ? "Customer-level" : "Invoice-level"} · {expression.resultType}</small></div>
          <div className="preview-results">
            {simulation.map(({ customer, matched, result }, index) => (
              <div className="preview-result" key={customer.customerNumber} style={{ animationDelay: `${index * 45}ms` }}>
                <span className="customer-avatar">{customer.customerName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                <span><strong>{customer.customerName}</strong><small>{matched} matching invoice{matched === 1 ? "" : "s"}</small></span>
                <b>{formatResult(result, expression.resultType)}</b>
              </div>
            ))}
          </div>
          <div className="match-insight"><Filter size={17} /><span><strong>{invoices.filter((invoice) => ["RV", "DZ"].includes(invoice.documentType) && invoice.status === "Open").length} of {invoices.length}</strong> invoices match the current filter.</span></div>
          <button className="full-width-button" onClick={onOpenSimulation}>Open simulation lab <ArrowRight size={16} /></button>
        </aside>
      </div>
    </section>
  );
}

function SimulationLab({ expression, customers, invoices, onOpenCustomer }: { expression: Expression; customers: Customer[]; invoices: Invoice[]; onOpenCustomer: (customer: Customer) => void }) {
  const [selected, setSelected] = useState(customers.slice(0, 3).map((customer) => customer.customerNumber));
  const results = customers.filter((customer) => selected.includes(customer.customerNumber)).map((customer) => ({ customer, result: evaluateExpression(expression, customer, invoices), invoices: invoices.filter((invoice) => invoice.customerNumber === customer.customerNumber) }));
  return (
    <section className="standard-page page-enter">
      <header className="page-title-row"><div><div className="title-kicker"><FlaskConical size={14} /> Safe sample run</div><h1>Simulation Lab</h1><p>Validate the expression on a focused customer set before publishing it.</p></div><button className="primary-button"><ShieldCheck size={16} /> Approve for publish</button></header>
      <div className="simulation-layout">
        <section className="simulation-picker surface-panel"><header><div><span className="eyebrow">Step 1</span><h2>Select customers</h2></div><span>{selected.length} selected</span></header><label className="search-field"><Search size={16} /><input placeholder="Find a customer" /></label><div className="customer-check-list">{customers.map((customer) => <label key={customer.customerNumber} className={selected.includes(customer.customerNumber) ? "checked" : ""}><input type="checkbox" checked={selected.includes(customer.customerNumber)} onChange={() => setSelected((current) => current.includes(customer.customerNumber) ? current.filter((item) => item !== customer.customerNumber) : [...current, customer.customerNumber])} /><span className="customer-avatar">{customer.customerName.slice(0, 2).toUpperCase()}</span><span><strong>{customer.customerName}</strong><small>{customer.customerNumber} · {customer.region}</small></span><Check size={16} /></label>)}</div></section>
        <section className="simulation-results surface-panel"><header><div><span className="eyebrow">Step 2</span><h2>Review results</h2></div><span className="validation-state"><Check size={15} /> Run complete</span></header><div className="sim-formula"><span>fx</span><code>{toExcelFormula(expression)}</code></div><div className="sim-result-list">{results.map(({ customer, result, invoices: customerInvoices }) => <button key={customer.customerNumber} onDoubleClick={() => onOpenCustomer(customer)} onClick={() => onOpenCustomer(customer)}><span><strong>{customer.customerName}</strong><small>{customerInvoices.length} total invoices · {customer.risk} risk</small></span><span className="sim-value"><strong>{formatResult(result, expression.resultType)}</strong><small>{expression.name}</small></span><ChevronRight size={17} /></button>)}</div></section>
      </div>
    </section>
  );
}

function CustomerGrid({ customers, invoices, expression, onOpenCustomer, onUpload }: { customers: Customer[]; invoices: Invoice[]; expression: Expression; onOpenCustomer: (customer: Customer) => void; onUpload: () => void }) {
  const [query, setQuery] = useState("");
  const [showReferences, setShowReferences] = useState(false);
  const [selected, setSelected] = useState(customers[0]?.customerNumber);
  const filtered = customers.filter((customer) => `${customer.customerNumber} ${customer.customerName} ${customer.collector} ${customer.region}`.toLowerCase().includes(query.toLowerCase()));
  const baseColumns: GridColumn<Customer>[] = [
    { key: "customerNumber", label: "Customer #", width: 130, value: (row) => row.customerNumber, render: (row) => <strong className="grid-primary">{row.customerNumber}</strong> },
    { key: "customerName", label: "Customer name", width: 240, value: (row) => row.customerName, render: (row) => <span className="name-cell"><span className="tiny-avatar">{row.customerName.slice(0, 2).toUpperCase()}</span><strong>{row.customerName}</strong></span> },
    { key: "open", label: "Total open", width: 140, align: "right", value: (row) => invoices.filter((invoice) => invoice.customerNumber === row.customerNumber).reduce((sum, invoice) => sum + invoice.openAmount, 0), render: (row) => <strong>{money.format(invoices.filter((invoice) => invoice.customerNumber === row.customerNumber).reduce((sum, invoice) => sum + invoice.openAmount, 0))}</strong> },
    { key: "calculated", label: expression.name, width: 210, align: "right", value: (row) => String(evaluateExpression(expression, row, invoices)), render: (row) => <span className="calculated-cell">{formatResult(evaluateExpression(expression, row, invoices), expression.resultType)}<span>fx</span></span> },
    { key: "risk", label: "Risk", width: 100, value: (row) => row.risk, render: (row) => <StatusPill value={row.risk} /> },
    { key: "collector", label: "Collector", width: 155, value: (row) => row.collector },
    { key: "region", label: "Region", width: 110, value: (row) => row.region },
    { key: "segment", label: "Segment", width: 130, value: (row) => row.segment },
    { key: "creditLimit", label: "Credit limit", width: 140, align: "right", value: (row) => row.creditLimit, render: (row) => money.format(row.creditLimit) },
  ];
  const refColumns: GridColumn<Customer>[] = ["number", "text", "date"].flatMap((kind) => Array.from({ length: 10 }, (_, index) => ({ key: `${kind}Ref${index + 1}`, label: `${kind === "number" ? "Number" : kind === "text" ? "Text" : "Date"} ref ${index + 1}`, width: 135, value: (row: Customer) => row.references[`${kind}Ref${index + 1}`] ?? "—", align: kind === "number" ? "right" as const : "left" as const })));
  return (
    <section className="grid-page page-enter"><header className="page-title-row compact-title"><div><div className="title-kicker"><Users size={14} /> Master data</div><h1>Customers</h1><p>Double-click a row to open the customer in a workspace tab.</p></div><button className="primary-button" onClick={onUpload}><Upload size={16} /> Upload customers</button></header><div className="grid-toolbar"><label className="search-field grid-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers..." /></label><div className="grid-tools"><button className={showReferences ? "secondary-button active" : "secondary-button"} onClick={() => setShowReferences((current) => !current)}><Columns3 size={16} /> {showReferences ? "Hide" : "Show"} 30 reference fields</button><IconButton label="Filter grid"><ListFilter size={17} /></IconButton><IconButton label="Grid settings"><Settings2 size={17} /></IconButton></div></div><DataGrid rows={filtered} columns={showReferences ? [...baseColumns, ...refColumns] : baseColumns} rowKey={(row) => row.customerNumber} selectedKey={selected} onRowClick={(row) => setSelected(row.customerNumber)} onRowDoubleClick={onOpenCustomer} emptyLabel="No customers match your search." /><footer className="grid-footer"><span>{filtered.length} of {customers.length} customers</span><span><strong>Tip:</strong> Double-click any row to open details</span><div><button disabled><ChevronDown size={15} /></button><span>Page 1</span><button disabled><ChevronRight size={15} /></button></div></footer></section>
  );
}

function InvoiceGrid({ invoices, onOpenCustomer, onUpload }: { invoices: Invoice[]; onOpenCustomer: (customerNumber: string) => void; onUpload: () => void }) {
  const [query, setQuery] = useState("");
  const [showReferences, setShowReferences] = useState(false);
  const [selected, setSelected] = useState(invoices[0]?.invoiceNumber);
  const filtered = invoices.filter((invoice) => `${invoice.invoiceNumber} ${invoice.customerName} ${invoice.customerNumber} ${invoice.status}`.toLowerCase().includes(query.toLowerCase()));
  const baseColumns: GridColumn<Invoice>[] = [
    { key: "invoiceNumber", label: "Invoice #", width: 145, value: (row) => row.invoiceNumber, render: (row) => <strong className="grid-primary">{row.invoiceNumber}</strong> },
    { key: "customerName", label: "Customer", width: 245, value: (row) => row.customerName, render: (row) => <span className="stacked-cell"><strong>{row.customerName}</strong><small>{row.customerNumber}</small></span> },
    { key: "documentType", label: "Doc type", width: 105, value: (row) => row.documentType },
    { key: "openAmount", label: "Open amount", width: 145, align: "right", value: (row) => row.openAmount, render: (row) => <strong>{money.format(row.openAmount)}</strong> },
    { key: "invoiceAmount", label: "Invoice amount", width: 145, align: "right", value: (row) => row.invoiceAmount, render: (row) => money.format(row.invoiceAmount) },
    { key: "dueDate", label: "Due date", width: 130, value: (row) => row.dueDate },
    { key: "status", label: "Status", width: 115, value: (row) => row.status, render: (row) => <StatusPill value={row.status} /> },
    { key: "collector", label: "Collector", width: 155, value: (row) => row.collector },
    { key: "invoiceDate", label: "Invoice date", width: 130, value: (row) => row.invoiceDate },
  ];
  const refColumns: GridColumn<Invoice>[] = ["number", "text", "date"].flatMap((kind) => Array.from({ length: 10 }, (_, index) => ({ key: `${kind}Ref${index + 1}`, label: `${kind === "number" ? "Number" : kind === "text" ? "Text" : "Date"} ref ${index + 1}`, width: 135, value: (row: Invoice) => row.references[`${kind}Ref${index + 1}`] ?? "—", align: kind === "number" ? "right" as const : "left" as const })));
  return (
    <section className="grid-page page-enter"><header className="page-title-row compact-title"><div><div className="title-kicker"><FileSpreadsheet size={14} /> Transaction data</div><h1>Invoices</h1><p>Linked to customers by customerNumber and ready for expression testing.</p></div><button className="primary-button" onClick={onUpload}><Upload size={16} /> Upload invoices</button></header><div className="grid-toolbar"><label className="search-field grid-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoices or customers..." /></label><div className="grid-tools"><button className={showReferences ? "secondary-button active" : "secondary-button"} onClick={() => setShowReferences((current) => !current)}><Columns3 size={16} /> {showReferences ? "Hide" : "Show"} 30 reference fields</button><IconButton label="Filter grid"><ListFilter size={17} /></IconButton><IconButton label="Grid settings"><Settings2 size={17} /></IconButton></div></div><DataGrid rows={filtered} columns={showReferences ? [...baseColumns, ...refColumns] : baseColumns} rowKey={(row) => row.invoiceNumber} selectedKey={selected} onRowClick={(row) => setSelected(row.invoiceNumber)} onRowDoubleClick={(row) => onOpenCustomer(row.customerNumber)} emptyLabel="No invoices match your search." /><footer className="grid-footer"><span>{filtered.length} of {invoices.length} invoices</span><span>{money.format(filtered.reduce((sum, invoice) => sum + invoice.openAmount, 0))} open amount</span><div><button disabled><ChevronDown size={15} /></button><span>Page 1</span><button disabled><ChevronRight size={15} /></button></div></footer></section>
  );
}

function CustomerDetail({ customer, invoices, expression, onBack }: { customer: Customer; invoices: Invoice[]; expression: Expression; onBack: () => void }) {
  const customerInvoices = invoices.filter((invoice) => invoice.customerNumber === customer.customerNumber);
  const openAmount = customerInvoices.reduce((sum, invoice) => sum + invoice.openAmount, 0);
  const columns: GridColumn<Invoice>[] = [
    { key: "invoiceNumber", label: "Invoice #", width: 150, value: (row) => row.invoiceNumber, render: (row) => <strong className="grid-primary">{row.invoiceNumber}</strong> },
    { key: "documentType", label: "Doc type", width: 110, value: (row) => row.documentType },
    { key: "openAmount", label: "Open amount", width: 150, align: "right", value: (row) => row.openAmount, render: (row) => <strong>{money.format(row.openAmount)}</strong> },
    { key: "dueDate", label: "Due date", width: 140, value: (row) => row.dueDate },
    { key: "status", label: "Status", width: 120, value: (row) => row.status, render: (row) => <StatusPill value={row.status} /> },
    { key: "invoiceDate", label: "Invoice date", width: 140, value: (row) => row.invoiceDate },
    { key: "collector", label: "Collector", width: 170, value: (row) => row.collector },
  ];
  return (
    <section className="customer-detail-page page-enter"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to customers</button><header className="customer-profile-header"><div className="profile-identity"><span className="large-avatar">{customer.customerName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><span className="eyebrow">{customer.customerNumber}</span><h1>{customer.customerName}</h1><p>{customer.segment} · {customer.region} · Managed by {customer.collector}</p></div></div><div className="profile-actions"><StatusPill value={`${customer.risk} risk`} /><button className="secondary-button">More actions <ChevronDown size={15} /></button></div></header><div className="customer-metrics"><div><span>Total open</span><strong>{money.format(openAmount)}</strong><small>{customerInvoices.filter((invoice) => invoice.status === "Open").length} open invoices</small></div><div><span>Credit limit</span><strong>{money.format(customer.creditLimit)}</strong><small>{Math.round((openAmount / customer.creditLimit) * 100)}% utilized</small></div><div className="calculated-metric"><span>{expression.name}<b>fx</b></span><strong>{formatResult(evaluateExpression(expression, customer, invoices), expression.resultType)}</strong><small>Calculated in Expression Studio</small></div><div><span>Oldest due</span><strong>{Math.max(...customerInvoices.map((invoice) => Math.max(0, Math.round((new Date("2026-07-20").getTime() - new Date(invoice.dueDate).getTime()) / 86400000))), 0)} days</strong><small>As of Jul 20, 2026</small></div></div><div className="detail-content"><section className="detail-invoices"><header><div><span className="eyebrow">Open items</span><h2>Invoices</h2></div><button className="text-button"><Filter size={16} /> Filter</button></header><DataGrid rows={customerInvoices} columns={columns} rowKey={(row) => row.invoiceNumber} emptyLabel="No invoices for this customer." /></section><aside className="customer-profile-panel"><header><span className="eyebrow">Customer attributes</span><h2>Profile</h2></header><dl><div><dt>Customer number</dt><dd>{customer.customerNumber}</dd></div><div><dt>Collector</dt><dd>{customer.collector}</dd></div><div><dt>Region</dt><dd>{customer.region}</dd></div><div><dt>Segment</dt><dd>{customer.segment}</dd></div><div><dt>Currency</dt><dd>{customer.currency}</dd></div><div><dt>Text reference 1</dt><dd>{customer.references.textRef1 || "—"}</dd></div><div><dt>Number reference 1</dt><dd>{customer.references.numberRef1 || "—"}</dd></div><div><dt>Date reference 1</dt><dd>{customer.references.dateRef1 || "—"}</dd></div></dl></aside></div></section>
  );
}

export default function Home() {
  const [customers, setCustomers] = useState(seedCustomers);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [expression, setExpressionState] = useState(initialExpression);
  const [tabs, setTabs] = useState<WorkspaceTab[]>([{ id: "builder", label: "Expression Studio", kind: "view", view: "builder" }]);
  const [activeTabId, setActiveTabId] = useState("builder");
  const [showGuide, setShowGuide] = useState(false);
  const [showFunctions, setShowFunctions] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType | null>(null);
  const [toast, setToast] = useState("");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const activeView = activeTab?.kind === "view" ? activeTab.view : undefined;

  function setExpression(updater: (current: Expression) => Expression) {
    setExpressionState((current) => updater(current));
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function navigate(view: View) {
    const id = view;
    setTabs((current) => current.some((tab) => tab.id === id) ? current : [...current, { id, label: viewLabels[view], kind: "view", view }]);
    setActiveTabId(id);
  }

  function openCustomer(customer: Customer) {
    const id = `customer-${customer.customerNumber}`;
    setTabs((current) => current.some((tab) => tab.id === id) ? current : [...current, { id, label: customer.customerName, kind: "customer", customerNumber: customer.customerNumber }]);
    setActiveTabId(id);
  }

  function closeTab(id: string) {
    if (tabs.length === 1) return;
    const index = tabs.findIndex((tab) => tab.id === id);
    const next = tabs.filter((tab) => tab.id !== id);
    setTabs(next);
    if (activeTabId === id) setActiveTabId(next[Math.max(0, index - 1)]?.id ?? next[0].id);
  }

  function renderActiveTab() {
    if (activeTab?.kind === "customer") {
      const customer = customers.find((item) => item.customerNumber === activeTab.customerNumber) ?? customers[0];
      return <CustomerDetail customer={customer} invoices={invoices} expression={expression} onBack={() => navigate("customers")} />;
    }
    if (activeView === "customers") return <CustomerGrid customers={customers} invoices={invoices} expression={expression} onOpenCustomer={openCustomer} onUpload={() => setUploadType("customer")} />;
    if (activeView === "invoices") return <InvoiceGrid invoices={invoices} onOpenCustomer={(customerNumber) => { const customer = customers.find((item) => item.customerNumber === customerNumber); if (customer) openCustomer(customer); }} onUpload={() => setUploadType("invoice")} />;
    if (activeView === "simulation") return <SimulationLab expression={expression} customers={customers} invoices={invoices} onOpenCustomer={openCustomer} />;
    return <ExpressionBuilder expression={expression} setExpression={setExpression} customers={customers} invoices={invoices} onShowGuide={() => setShowGuide(true)} onShowFunctions={() => setShowFunctions(true)} onOpenSimulation={() => navigate("simulation")} onToast={showToast} />;
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="product-switcher" href="/" aria-label="Collections home"><span className="bento-mark"><Grid3X3 size={19} /></span><span><strong>Collections</strong><small>Administration</small></span></a>
        <nav className="primary-nav" aria-label="Administration navigation">
          <span className="nav-label">Build</span>
          {(["builder", "simulation"] as View[]).map((view) => <button key={view} className={activeView === view ? "active" : ""} onClick={() => navigate(view)}>{viewIcons[view]}<span>{viewLabels[view]}</span>{view === "builder" && <small>NEW</small>}</button>)}
          <span className="nav-label data-label">Data</span>
          {(["customers", "invoices"] as View[]).map((view) => <button key={view} className={activeView === view ? "active" : ""} onClick={() => navigate(view)}>{viewIcons[view]}<span>{viewLabels[view]}</span><b>{view === "customers" ? customers.length : invoices.length}</b></button>)}
        </nav>
        <div className="sidebar-bottom"><a href="/story"><BookOpen size={18} /><span><strong>Product story</strong><small>Problem, vision & PRD</small></span><ExternalLink size={14} /></a><button onClick={() => setShowGuide(true)}><CircleHelp size={18} /><span>Help & guidance</span></button><div className="user-strip"><span>NS</span><span><strong>Nia Sharma</strong><small>Administrator</small></span><ChevronDown size={15} /></div></div>
      </aside>

      <section className="app-workspace">
        <header className="global-bar"><div className="environment"><span>Acme Demo Environment</span><ChevronDown size={15} /></div><div className="global-actions"><button className="dataset-status"><span className="live-dot" /> Demo data active</button><IconButton label="Administration settings"><Settings2 size={18} /></IconButton><button className="howto-top" onClick={() => setShowGuide(true)}><CircleHelp size={17} /> How to</button></div></header>
        <div className="workspace-tabs" role="tablist">{tabs.map((tab) => <div className="workspace-tab-wrap" key={tab.id}><button className={`workspace-tab ${tab.id === activeTabId ? "active" : ""}`} onClick={() => setActiveTabId(tab.id)} role="tab" aria-selected={tab.id === activeTabId}>{tab.kind === "customer" ? <Users size={14} /> : viewIcons[tab.view ?? "builder"]}<span>{tab.label}</span></button>{tabs.length > 1 && <button className="tab-close" onClick={() => closeTab(tab.id)} aria-label={`Close ${tab.label} tab`} title={`Close ${tab.label} tab`}><X size={13} /></button>}</div>)}</div>
        <div className="page-container">{renderActiveTab()}</div>
      </section>

      {showGuide && <HowToDrawer onClose={() => setShowGuide(false)} />}
      {showFunctions && <FunctionLibrary selected={expression.functionKey} onSelect={(functionKey) => setExpression((current) => ({ ...current, functionKey, resultType: resultTypeForFunction(functionKey) }))} onClose={() => setShowFunctions(false)} />}
      {uploadType && <UploadModal initialType={uploadType} customers={customers} onUploadCustomers={(rows) => { setCustomers((current) => [...current, ...rows]); showToast(`${rows.length} customers uploaded successfully.`); }} onUploadInvoices={(rows) => { setInvoices((current) => [...current, ...rows]); showToast(`${rows.length} invoices uploaded successfully.`); }} onClose={() => setUploadType(null)} />}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </main>
  );
}
