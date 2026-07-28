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
  CircleCheck,
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
  Pencil,
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
import ExpressionBuilderV2 from "./expression-builder-v2";
import {
  type Condition,
  type ConditionGroup,
  type Customer,
  type Expression,
  type FunctionKey,
  type Invoice,
  type Level,
  type Operator,
  type SavedExpression,
  evaluateExpression,
  fieldCatalog,
  formatResult,
  functionCatalog,
  getConditionGroups,
  getExpressionSourceFields,
  inferResultType,
  initialExpression,
  isConditionalFunction,
  isSameLevelMathFunction,
  matchesExpressionConditions,
  money,
  referenceHeaders,
  seedCustomers,
  seedExpressions,
  seedInvoices,
  sourceFieldsForFunction,
  sqlParameters,
  toExcelFormula,
  toSql,
} from "./expression-data";

type View = "expressions" | "builder" | "simulation" | "customers" | "invoices";
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
  greater_or_equal: "is at least",
  less_or_equal: "is at most",
  between: "is between",
  before: "is before",
  after: "is after",
  on_or_before: "is on or before",
  on_or_after: "is on or after",
  contains: "contains",
  is_blank: "is blank",
};

const operatorsByKind: Record<"amount" | "number" | "text" | "date", Operator[]> = {
  text: ["equals", "not_equals", "in", "not_in", "contains", "is_blank"],
  amount: ["equals", "not_equals", "greater_than", "less_than", "greater_or_equal", "less_or_equal", "between", "is_blank"],
  number: ["equals", "not_equals", "greater_than", "less_than", "greater_or_equal", "less_or_equal", "between", "is_blank"],
  date: ["equals", "not_equals", "before", "after", "on_or_before", "on_or_after", "between", "is_blank"],
};

function operatorLabel(fieldKey: string, operator: Operator) {
  const kind = fieldCatalog.find((field) => field.key === fieldKey)?.kind;
  if (kind === "date" && operator === "equals") return "is on";
  if (kind === "date" && operator === "not_equals") return "is not on";
  return operatorLabels[operator];
}

function sourceSelection(functionKey: FunctionKey, level: Level, current: string[] = []) {
  const candidates = sourceFieldsForFunction(functionKey, level);
  const compatible = current.filter((key) => candidates.some((field) => field.key === key));
  if (!isSameLevelMathFunction(functionKey)) return compatible.length ? compatible.slice(0, 1) : candidates.slice(0, 1).map((field) => field.key);
  const minimum = ["ROUND", "ABS"].includes(functionKey) ? 1 : 2;
  const selected = [...compatible];
  for (const candidate of candidates) {
    if (selected.length >= minimum) break;
    if (!selected.includes(candidate.key)) selected.push(candidate.key);
  }
  return selected.slice(0, 5);
}

const viewLabels: Record<View, string> = {
  expressions: "Expression Studio",
  builder: "Calculated field",
  simulation: "Simulation Lab",
  customers: "Customers",
  invoices: "Invoices",
};

const viewIcons: Record<View, ReactNode> = {
  expressions: <FunctionSquare size={18} />,
  builder: <FunctionSquare size={18} />,
  simulation: <FlaskConical size={18} />,
  customers: <Users size={18} />,
  invoices: <FileSpreadsheet size={18} />,
};

const conditionFields = fieldCatalog.filter((field) => field.entity === "Invoice");

const resultTypeLabels = { amount: "Amount", number: "Number", text: "Text", date: "Date" } as const;

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
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button className={`icon-button ${className}`} onClick={onClick} aria-label={label} title={label} disabled={disabled}>
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
  level,
  onSelect,
  onClose,
}: {
  selected: FunctionKey;
  level: Level;
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
                  {items.map((item) => {
                    const unavailable = item.category === "Conditional" && level === "invoice";
                    const ready = item.category === "Conditional" || item.category === "Math";
                    return (
                      <button
                        key={item.key}
                        className={`function-option ${selected === item.key ? "selected" : ""} ${unavailable ? "unavailable" : ""}`}
                        onClick={() => { onSelect(item.key); onClose(); }}
                        disabled={unavailable}
                        title={unavailable ? "Conditional aggregation needs a child data level. Choose Customer to aggregate Invoice rows." : undefined}
                      >
                        <span className="function-mark">{item.key.slice(0, 3)}</span>
                        <span>
                          <strong>{item.key}</strong>
                          <small>{item.label}</small>
                          <p>{unavailable ? "Available when calculating for each Customer." : item.description}</p>
                        </span>
                        {ready ? <CircleCheck className="function-ready" size={18} /> : selected === item.key ? <Check size={18} /> : <ChevronRight size={18} />}
                      </button>
                    );
                  })}
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
    { title: "Choose where it appears", body: "Start with the record that needs the result. Customer values can summarize invoices; invoice values calculate one row at a time.", example: "One open invoice amount total on every customer" },
    { title: "Choose the business outcome", body: "Pick a total, count, average, or same-record calculation. Expression Studio selects the underlying function for you.", example: "Total invoice value" },
    { title: "Narrow the records", body: "Include every invoice or add plain-language rules. Rules in one set use AND; an alternative set creates OR logic.", example: "Status is Open AND Document type is any of RV, DZ" },
    { title: "Name, test, and publish", body: "Review a few representative results, then approve the field for customer or invoice grids.", example: "Test on Costco Wholesale and three other customers" },
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
              <span className="anatomy-function">Total</span>
              <span className="anatomy-field">Open amount</span>
              <span className="anatomy-condition">from matching invoices</span>
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

function CalculatedFieldsLibrary({
  fields,
  onNew,
  onEdit,
  onRun,
  onShowGuide,
}: {
  fields: SavedExpression[];
  onNew: () => void;
  onEdit: (expression: SavedExpression) => void;
  onRun: (expression: SavedExpression) => void;
  onShowGuide: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | SavedExpression["status"]>("All");
  const visibleFields = fields.filter((field) => {
    const matchesQuery = `${field.name} ${field.description} ${field.functionKey}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "All" || field.status === status);
  });
  const published = fields.filter((field) => field.status === "Published").length;
  const customerLevel = fields.filter((field) => field.level === "customer").length;

  return (
    <section className="fields-library page-enter">
      <header className="page-title-row">
        <div>
          <div className="title-kicker"><FunctionSquare size={14} /> Administration · Calculated fields</div>
          <h1>Calculated fields</h1>
          <p>Create, test, publish, and maintain reusable customer and invoice values.</p>
        </div>
        <div className="page-actions">
          <button className="text-button" onClick={onShowGuide}><CircleHelp size={17} /> How to</button>
          <button className="primary-button" onClick={onNew}><Plus size={16} /> New calculated field</button>
        </div>
      </header>

      <div className="field-summary-strip" aria-label="Calculated field summary">
        <div><span>Total fields</span><strong>{fields.length}</strong><small>Across customer and invoice levels</small></div>
        <div><span>Published</span><strong>{published}</strong><small>Available for product views</small></div>
        <div><span>Drafts</span><strong>{fields.length - published}</strong><small>Still being configured</small></div>
        <div><span>Customer level</span><strong>{customerLevel}</strong><small>{fields.length - customerLevel} invoice-level fields</small></div>
      </div>

      <section className="field-library-surface">
        <div className="field-library-toolbar">
          <div><span className="eyebrow">Expression Studio</span><h2>Your calculated fields</h2></div>
          <div className="field-library-filters">
            <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fields or functions" /></label>
            <label className="status-filter"><ListFilter size={15} /><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as "All" | SavedExpression["status"])}><option>All</option><option>Published</option><option>Draft</option></select></label>
          </div>
        </div>
        <div className="field-table" role="table" aria-label="Saved calculated fields">
          <div className="field-table-header" role="row"><span>Field</span><span>Level</span><span>Output</span><span>Function</span><span>Status</span><span>Last updated</span><span>Actions</span></div>
          {visibleFields.map((field) => {
            const resultType = inferResultType(field);
            return (
              <div className="field-table-row" role="row" key={field.id}>
                <button className="field-identity" onClick={() => onEdit(field)}>
                  <span className="field-fx">fx</span>
                  <span><strong>{field.name}</strong><small>{field.description}</small></span>
                </button>
                <span className="field-level">{field.level === "customer" ? "Customer" : "Invoice"}</span>
                <span className={`output-pill output-${resultType}`}>{resultTypeLabels[resultType]}</span>
                <span className="function-code">{field.functionKey}</span>
                <StatusPill value={field.status} />
                <span className="field-updated"><strong>{field.updatedAt}</strong><small>{field.usedIn ? `Used in ${field.usedIn} view${field.usedIn === 1 ? "" : "s"}` : "Not used yet"}</small></span>
                <span className="field-row-actions">
                  <IconButton label={`Edit ${field.name}`} onClick={() => onEdit(field)}><Pencil size={15} /></IconButton>
                  <button className="run-field-button" onClick={() => onRun(field)}><FlaskConical size={15} /> Run</button>
                </span>
              </div>
            );
          })}
          {!visibleFields.length && <div className="field-library-empty"><Search size={22} /><strong>No calculated fields found</strong><span>Try another search or create a new field.</span></div>}
        </div>
      </section>
    </section>
  );
}

export function LegacyExpressionBuilder({
  expression,
  setExpression,
  customers,
  invoices,
  onShowGuide,
  onShowFunctions,
  onOpenSimulation,
  onBackToLibrary,
  onSaveDraft,
  onPublish,
  onToast,
}: {
  expression: Expression;
  setExpression: (updater: (current: Expression) => Expression) => void;
  customers: Customer[];
  invoices: Invoice[];
  onShowGuide: () => void;
  onShowFunctions: () => void;
  onOpenSimulation: () => void;
  onBackToLibrary: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onToast: (message: string) => void;
}) {
  const [mode, setMode] = useState<FormulaMode>("visual");
  const [sqlOpen, setSqlOpen] = useState(true);
  const [formulaText, setFormulaText] = useState(toExcelFormula(expression));
  const conditionGroups = getConditionGroups(expression);
  const customerSimulation = customers.slice(0, 4).map((customer) => ({
    customer,
    matched: invoices.filter((invoice) => invoice.customerNumber === customer.customerNumber && matchesExpressionConditions(expression, customer, invoice)).length,
    result: evaluateExpression(expression, customer, invoices),
  }));
  const invoiceSimulation = invoices.slice(0, 4).map((invoice) => {
    const customer = customers.find((item) => item.customerNumber === invoice.customerNumber) ?? customers[0];
    return { invoice, customer, result: evaluateExpression(expression, customer, invoices, invoice) };
  });
  const selectedFunction = functionCatalog.find((item) => item.key === expression.functionKey)!;
  const availableSourceFields = sourceFieldsForFunction(expression.functionKey, expression.level);
  const resultType = inferResultType(expression);
  const sourceFieldKeys = getExpressionSourceFields(expression);
  const sourceField = fieldCatalog.find((field) => field.key === sourceFieldKeys[0]);
  const conditionalFunction = isConditionalFunction(expression.functionKey);
  const sameLevelMath = isSameLevelMathFunction(expression.functionKey);
  const incompatible = conditionalFunction && expression.level === "invoice";
  const addableMath = ["SUM", "AVERAGE", "PRODUCT", "MIN", "MAX"].includes(expression.functionKey);
  const minimumOperands = ["ROUND", "ABS"].includes(expression.functionKey) ? 1 : 2;
  const calculationPhrases: Record<FunctionKey, string> = {
    SUMIFS: "sum the values in",
    COUNTIFS: "count matching records",
    AVERAGEIFS: "average the values in",
    SUM: "add fields",
    AVERAGE: "average fields",
    DIFFERENCE: "subtract fields",
    PRODUCT: "multiply fields",
    MIN: "find the smallest field value",
    MAX: "find the largest field value",
    IF: "classify using",
    ROUND: "round",
    ABS: "find the absolute value of",
    DAYS: "calculate days from",
    EOMONTH: "find the month end for",
    CONCAT: "join text from",
    UPPER: "convert to uppercase",
    LOWER: "convert to lowercase",
    TRIM: "trim spaces from",
    COALESCE: "use the first available value from",
    PERCENT: "calculate the percentage from",
  };

  function setConditionGroups(groups: ConditionGroup[]) {
    setExpression((current) => ({ ...current, conditionGroups: groups, conditions: groups.flatMap((group) => group.conditions) }));
  }

  function updateCondition(groupId: string, id: string, patch: Partial<Condition>) {
    setConditionGroups(conditionGroups.map((group) => group.id === groupId
      ? { ...group, conditions: group.conditions.map((condition) => condition.id === id ? { ...condition, ...patch } : condition) }
      : group));
  }

  function setOperand(index: number, key: string) {
    const next = [...sourceFieldKeys];
    next[index] = key;
    setExpression((current) => ({ ...current, sourceField: next[0], sourceFields: next }));
  }

  function applyRecipe(recipe: "sum" | "age" | "priority" | "difference") {
    const patches: Record<typeof recipe, Partial<Expression>> = {
      sum: { name: "Selected document type open amount", level: "customer", functionKey: "SUMIFS", sourceField: "invoice.openAmount", sourceFields: ["invoice.openAmount"], conditions: initialExpression.conditions, conditionGroups: initialExpression.conditionGroups },
      age: { name: "Oldest invoice age", level: "customer", functionKey: "DAYS", sourceField: "invoice.dueDate", sourceFields: ["invoice.dueDate"], conditions: [{ id: "condition-age", field: "invoice.status", operator: "equals", value: "Open" }], conditionGroups: [{ id: "group-age", conditions: [{ id: "condition-age", field: "invoice.status", operator: "equals", value: "Open" }] }] },
      priority: { name: "Collection priority", level: "customer", functionKey: "IF", sourceField: "invoice.openAmount", sourceFields: ["invoice.openAmount"], conditions: [{ id: "condition-priority", field: "invoice.status", operator: "equals", value: "Open" }], conditionGroups: [{ id: "group-priority", conditions: [{ id: "condition-priority", field: "invoice.status", operator: "equals", value: "Open" }] }] },
      difference: { name: "Applied invoice amount", level: "invoice", functionKey: "DIFFERENCE", sourceField: "invoice.invoiceAmount", sourceFields: ["invoice.invoiceAmount", "invoice.openAmount"], conditions: [], conditionGroups: [] },
    };
    setExpression((current) => ({ ...current, ...patches[recipe] }));
    onToast("Recipe loaded. The preview has been recalculated.");
  }

  return (
    <section className="builder-page page-enter">
      <button className="back-link" onClick={onBackToLibrary}><ArrowLeft size={16} /> All calculated fields</button>
      <header className="page-title-row">
        <div>
          <div className="title-kicker"><span className="live-dot" /> Editing · Changes stay local until saved</div>
          <h1>{expression.name || "Create a calculated field"}</h1>
          <p>Build with familiar spreadsheet logic. The platform translates it into governed SQL.</p>
        </div>
        <div className="page-actions">
          <button className="text-button" onClick={onShowGuide}><CircleHelp size={17} /> How to</button>
          <button className="secondary-button" onClick={onSaveDraft}><Save size={16} /> Save draft</button>
          <button className="primary-button" onClick={onOpenSimulation} disabled={incompatible}><FlaskConical size={16} /> Test on data</button>
          <button className="publish-button" onClick={onPublish} disabled={incompatible}><ShieldCheck size={16} /> Save & publish</button>
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
              <span className={incompatible ? "validation-state needs-attention" : "validation-state"}>{incompatible ? <Info size={16} /> : <ShieldCheck size={16} />} {incompatible ? "Needs attention" : "Valid expression"}</span>
            </div>

            {mode === "visual" ? (
              <div className="visual-builder">
                <div className="builder-section first-section">
                  <div className="step-number">1</div>
                  <div className="builder-section-body">
                    <div className="section-label"><span>Field details</span><small>Name the value and choose where it belongs.</small></div>
                    <div className="output-row">
                      <label className="field-control grow"><span>Field name</span><input value={expression.name} onChange={(event) => setExpression((current) => ({ ...current, name: event.target.value }))} /></label>
                      <label className="field-control compact"><span>Calculate for each</span><select value={expression.level} onChange={(event) => setExpression((current) => {
                        const level = event.target.value as Level;
                        const sources = sourceSelection(current.functionKey, level, getExpressionSourceFields(current));
                        return { ...current, level, sourceField: sources[0] ?? "", sourceFields: sources };
                      })}><option value="customer">Customer</option><option value="invoice">Invoice</option></select></label>
                    </div>
                    <label className="field-control description-control"><span>Description</span><input value={expression.description} onChange={(event) => setExpression((current) => ({ ...current, description: event.target.value }))} placeholder="What business question does this field answer?" /></label>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="step-number">2</div>
                  <div className="builder-section-body">
                    <div className="section-label"><span>Calculation</span><small>Build the calculation as a readable sentence.</small></div>
                    <div className="sentence-canvas">
                      <span className="sentence-word">For each</span>
                      <span className="sentence-token entity-token">{expression.level === "customer" ? "Customer" : "Invoice"}</span>
                      <span className="sentence-word">use</span>
                      <button className="sentence-token function-token" onClick={onShowFunctions}><FunctionSquare size={16} /><span>{selectedFunction.label}<small>{expression.functionKey}</small></span><ChevronDown size={15} /></button>
                      <span className="sentence-word">to {calculationPhrases[expression.functionKey]}</span>
                      {!sameLevelMath && availableSourceFields.length > 0 && (
                        <label className="inline-select field-token">
                          <Database size={15} />
                          <select aria-label="Value to calculate" value={expression.sourceField} onChange={(event) => setExpression((current) => ({ ...current, sourceField: event.target.value, sourceFields: [event.target.value] }))}>
                            {availableSourceFields.map((field) => <option key={field.key} value={field.key}>{field.entity} · {field.label}</option>)}
                          </select>
                        </label>
                      )}
                    </div>
                    {incompatible ? (
                      <div className="grain-warning"><Info size={18} /><span><strong>Conditional aggregation needs a lower data level</strong>This demo has Invoice rows below Customer. Choose <b>Customer</b> above to sum, count, or average its invoices.</span></div>
                    ) : sameLevelMath ? (
                      <div className="operand-editor">
                        <header><span><strong>Fields to combine</strong><small>Only {expression.level === "customer" ? "Customer" : "Invoice"} fields can be combined here.</small></span>{addableMath && sourceFieldKeys.length < 5 && <button className="add-condition" onClick={() => {
                          const next = availableSourceFields.find((field) => !sourceFieldKeys.includes(field.key));
                          if (next) setExpression((current) => ({ ...current, sourceFields: [...sourceFieldKeys, next.key] }));
                        }}><Plus size={14} /> Add field</button>}</header>
                        <div className="operand-list">
                          {sourceFieldKeys.map((key, index) => (
                            <div className="operand-row" key={`${key}-${index}`}>
                              <span>{expression.functionKey === "DIFFERENCE" ? (index === 0 ? "Start with" : "Subtract") : expression.functionKey === "PERCENT" ? (index === 0 ? "Part" : "Total") : `Value ${index + 1}`}</span>
                              <label className="inline-select field-token"><Database size={15} /><select aria-label={`Value ${index + 1}`} value={key} onChange={(event) => setOperand(index, event.target.value)}>{availableSourceFields.map((field) => <option key={field.key} value={field.key}>{field.entity} · {field.label}</option>)}</select></label>
                              {sourceFieldKeys.length > minimumOperands && <IconButton label={`Remove value ${index + 1}`} onClick={() => {
                                const next = sourceFieldKeys.filter((_, sourceIndex) => sourceIndex !== index);
                                setExpression((current) => ({ ...current, sourceField: next[0], sourceFields: next }));
                              }}><X size={15} /></IconButton>}
                            </div>
                          ))}
                        </div>
                        <div className="grain-note"><CircleCheck size={15} /><span>Same-level calculation: one result is computed from fields on each {expression.level} row.</span></div>
                      </div>
                    ) : availableSourceFields.length > 0 ? (
                      <div className="measure-explainer"><Database size={16} /><span><strong>Child value: {sourceField?.entity} · {sourceField?.label}</strong>{conditionalFunction ? "This field is read from Invoice rows one level below Customer. Conditions decide which invoices qualify." : "The function operates on this field."}</span></div>
                    ) : (
                      <div className="measure-explainer"><Info size={16} /><span><strong>No value field needed</strong>{expression.functionKey} counts the records that match your conditions.</span></div>
                    )}
                    <p className="function-description"><Info size={15} /> <strong>{selectedFunction.label}:</strong> {selectedFunction.description}</p>
                  </div>
                </div>

                {conditionalFunction && !incompatible && (
                  <div className="builder-section condition-section">
                    <div className="step-number">3</div>
                    <div className="builder-section-body">
                      <div className="section-label condition-heading">
                        <div><span>Include invoice records where</span><small>Every rule inside a group uses AND. Any OR group can match.</small></div>
                      </div>
                      <div className="condition-groups">
                        {conditionGroups.map((group, groupIndex) => (
                          <div key={group.id}>
                            {groupIndex > 0 && <div className="or-divider"><span>OR</span></div>}
                            <section className="condition-group">
                              <header><span><strong>Group {groupIndex + 1}</strong><small>All rules in this group must match</small></span>{conditionGroups.length > 1 && <IconButton label={`Remove group ${groupIndex + 1}`} onClick={() => setConditionGroups(conditionGroups.filter((item) => item.id !== group.id))}><X size={15} /></IconButton>}</header>
                              <div className="condition-list">
                                {group.conditions.map((condition, index) => {
                                  const field = fieldCatalog.find((item) => item.key === condition.field) ?? conditionFields[0];
                                  const operators = operatorsByKind[field.kind];
                                  const inputType = field.kind === "date" ? "date" : field.kind === "amount" || field.kind === "number" ? "number" : "text";
                                  return (
                                    <div className={`condition-row ${condition.operator === "between" ? "has-range" : ""}`} key={condition.id}>
                                      <span className="logic-join">{index === 0 ? "WHERE" : "AND"}</span>
                                      <label className="inline-select condition-field"><select value={condition.field} onChange={(event) => {
                                        const nextField = fieldCatalog.find((item) => item.key === event.target.value) ?? conditionFields[0];
                                        updateCondition(group.id, condition.id, { field: event.target.value, operator: operatorsByKind[nextField.kind][0], value: "", secondValue: "" });
                                      }}>{conditionFields.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                                      <label className="inline-select operator-select"><select value={condition.operator} onChange={(event) => updateCondition(group.id, condition.id, { operator: event.target.value as Operator, secondValue: "" })}>{operators.map((operator) => <option key={operator} value={operator}>{operatorLabel(condition.field, operator)}</option>)}</select></label>
                                      {condition.operator !== "is_blank" && <div className="condition-inputs"><input type={inputType} className="condition-value" value={condition.value} placeholder={condition.operator === "in" || condition.operator === "not_in" ? "RV, DZ" : "Enter value"} onChange={(event) => updateCondition(group.id, condition.id, { value: event.target.value })} />{condition.operator === "between" && <><span>and</span><input type={inputType} className="condition-value" value={condition.secondValue ?? ""} aria-label="End value" onChange={(event) => updateCondition(group.id, condition.id, { secondValue: event.target.value })} /></>}</div>}
                                      <IconButton label="Remove condition" disabled={group.conditions.length === 1} onClick={() => setConditionGroups(conditionGroups.map((item) => item.id === group.id ? { ...item, conditions: item.conditions.filter((rule) => rule.id !== condition.id) } : item))}><X size={16} /></IconButton>
                                    </div>
                                  );
                                })}
                              </div>
                              <button className="add-condition" onClick={() => setConditionGroups(conditionGroups.map((item) => item.id === group.id ? { ...item, conditions: [...item.conditions, { id: `condition-${Date.now()}`, field: "invoice.documentType", operator: "equals", value: "" }] } : item))}><Plus size={14} /> Add AND condition</button>
                            </section>
                          </div>
                        ))}
                        <button className="add-or-group" onClick={() => setConditionGroups([...conditionGroups, { id: `group-${Date.now()}`, conditions: [{ id: `condition-${Date.now()}`, field: "invoice.documentType", operator: "equals", value: "" }] }])}><Plus size={15} /> Add OR group</button>
                      </div>
                    </div>
                  </div>
                )}
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
            <div className="detected-output"><Sparkles size={17} /><span><strong>Output detected automatically: {resultTypeLabels[resultType]}</strong><small>Based on {expression.functionKey}{availableSourceFields.length > 0 && sourceField ? ` and ${sourceField.label}` : ""}. No data type selection is needed.</small></span><Check size={17} /></div>
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
              <button onClick={() => applyRecipe("difference")}><span className="recipe-icon green"><Calculator size={18} /></span><strong>Applied invoice amount</strong><small>Invoice amount minus open amount</small></button>
            </div>
          </section>
        </div>

        <aside className="live-preview">
          <header><div><span className="eyebrow">Live sample</span><h2>Calculated results</h2></div><span className="sample-badge">4 {expression.level === "customer" ? "customers" : "invoices"}</span></header>
          <div className="preview-summary"><span>Output field</span><strong>{expression.name || "Untitled field"}</strong><small>{expression.level === "customer" ? "Customer-level" : "Invoice-level"} · {resultTypeLabels[resultType]} · auto-detected</small></div>
          <div className="preview-results">
            {expression.level === "customer" ? customerSimulation.map(({ customer, matched, result }, index) => (
              <div className="preview-result" key={customer.customerNumber} style={{ animationDelay: `${index * 45}ms` }}><span className="customer-avatar">{customer.customerName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{customer.customerName}</strong><small>{conditionalFunction ? `${matched} matching invoice${matched === 1 ? "" : "s"}` : customer.customerNumber}</small></span><b>{formatResult(result, resultType)}</b></div>
            )) : invoiceSimulation.map(({ invoice, result }, index) => (
              <div className="preview-result" key={invoice.invoiceNumber} style={{ animationDelay: `${index * 45}ms` }}><span className="customer-avatar">{invoice.documentType}</span><span><strong>{invoice.invoiceNumber}</strong><small>{invoice.customerName}</small></span><b>{formatResult(result, resultType)}</b></div>
            ))}
          </div>
          {conditionalFunction && !incompatible && <div className="match-insight"><Filter size={17} /><span><strong>{invoices.filter((invoice) => {
            const customer = customers.find((item) => item.customerNumber === invoice.customerNumber) ?? customers[0];
            return matchesExpressionConditions(expression, customer, invoice);
          }).length} of {invoices.length}</strong> invoices match the current filter.</span></div>}
          <button className="full-width-button" onClick={onOpenSimulation} disabled={incompatible}>Open simulation lab <ArrowRight size={16} /></button>
        </aside>
      </div>
    </section>
  );
}

function SimulationLab({ expression, customers, invoices, onOpenCustomer, onPublish }: { expression: Expression; customers: Customer[]; invoices: Invoice[]; onOpenCustomer: (customer: Customer) => void; onPublish: () => void }) {
  const [selected, setSelected] = useState(customers.slice(0, 3).map((customer) => customer.customerNumber));
  const results = customers.filter((customer) => selected.includes(customer.customerNumber)).map((customer) => ({ customer, result: evaluateExpression(expression, customer, invoices), invoices: invoices.filter((invoice) => invoice.customerNumber === customer.customerNumber) }));
  const invoiceResults = invoices.filter((invoice) => selected.includes(invoice.customerNumber)).map((invoice) => {
    const customer = customers.find((item) => item.customerNumber === invoice.customerNumber) ?? customers[0];
    return { invoice, customer, result: evaluateExpression(expression, customer, invoices, invoice) };
  });
  return (
    <section className="standard-page page-enter">
      <header className="page-title-row"><div><div className="title-kicker"><FlaskConical size={14} /> Safe sample run</div><h1>Simulation Lab</h1><p>Validate the expression on a focused customer set before publishing it.</p></div><button className="primary-button" onClick={onPublish}><ShieldCheck size={16} /> Approve & publish</button></header>
      <div className="simulation-layout">
        <section className="simulation-picker surface-panel"><header><div><span className="eyebrow">Step 1</span><h2>Select customers</h2></div><span>{selected.length} selected</span></header><label className="search-field"><Search size={16} /><input placeholder="Find a customer" /></label><div className="customer-check-list">{customers.map((customer) => <label key={customer.customerNumber} className={selected.includes(customer.customerNumber) ? "checked" : ""}><input type="checkbox" checked={selected.includes(customer.customerNumber)} onChange={() => setSelected((current) => current.includes(customer.customerNumber) ? current.filter((item) => item !== customer.customerNumber) : [...current, customer.customerNumber])} /><span className="customer-avatar">{customer.customerName.slice(0, 2).toUpperCase()}</span><span><strong>{customer.customerName}</strong><small>{customer.customerNumber} · {customer.region}</small></span><Check size={16} /></label>)}</div></section>
        <section className="simulation-results surface-panel"><header><div><span className="eyebrow">Step 2</span><h2>Review {expression.level === "customer" ? "customer" : "invoice"} results</h2></div><span className="validation-state"><Check size={15} /> Run complete</span></header><div className="sim-formula"><span>fx</span><code>{toExcelFormula(expression)}</code></div><div className="sim-result-list">{expression.level === "customer" ? results.map(({ customer, result, invoices: customerInvoices }) => <button key={customer.customerNumber} onDoubleClick={() => onOpenCustomer(customer)} onClick={() => onOpenCustomer(customer)}><span><strong>{customer.customerName}</strong><small>{customerInvoices.length} total invoices · {customer.risk} risk</small></span><span className="sim-value"><strong>{formatResult(result, inferResultType(expression))}</strong><small>{expression.name}</small></span><ChevronRight size={17} /></button>) : invoiceResults.map(({ invoice, customer, result }) => <button key={invoice.invoiceNumber} onDoubleClick={() => onOpenCustomer(customer)} onClick={() => onOpenCustomer(customer)}><span><strong>{invoice.invoiceNumber}</strong><small>{invoice.customerName} · {invoice.documentType}</small></span><span className="sim-value"><strong>{formatResult(result, inferResultType(expression))}</strong><small>{expression.name}</small></span><ChevronRight size={17} /></button>)}</div></section>
      </div>
    </section>
  );
}

function CustomerGrid({ customers, invoices, expression, onOpenCustomer, onUpload }: { customers: Customer[]; invoices: Invoice[]; expression: Expression; onOpenCustomer: (customer: Customer) => void; onUpload: () => void }) {
  const [query, setQuery] = useState("");
  const [showReferences, setShowReferences] = useState(false);
  const [selected, setSelected] = useState(customers[0]?.customerNumber);
  const filtered = customers.filter((customer) => `${customer.customerNumber} ${customer.customerName} ${customer.collector} ${customer.region}`.toLowerCase().includes(query.toLowerCase()));
  const calculatedColumn: GridColumn<Customer> = { key: "calculated", label: expression.name, width: 210, align: "right", value: (row) => String(evaluateExpression(expression, row, invoices)), render: (row) => <span className="calculated-cell">{formatResult(evaluateExpression(expression, row, invoices), inferResultType(expression))}<span>fx</span></span> };
  const baseColumns: GridColumn<Customer>[] = [
    { key: "customerNumber", label: "Customer #", width: 130, value: (row) => row.customerNumber, render: (row) => <strong className="grid-primary">{row.customerNumber}</strong> },
    { key: "customerName", label: "Customer name", width: 240, value: (row) => row.customerName, render: (row) => <span className="name-cell"><span className="tiny-avatar">{row.customerName.slice(0, 2).toUpperCase()}</span><strong>{row.customerName}</strong></span> },
    { key: "open", label: "Total open", width: 140, align: "right", value: (row) => invoices.filter((invoice) => invoice.customerNumber === row.customerNumber).reduce((sum, invoice) => sum + invoice.openAmount, 0), render: (row) => <strong>{money.format(invoices.filter((invoice) => invoice.customerNumber === row.customerNumber).reduce((sum, invoice) => sum + invoice.openAmount, 0))}</strong> },
    ...(expression.level === "customer" ? [calculatedColumn] : []),
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

function InvoiceGrid({ invoices, customers, expression, onOpenCustomer, onUpload }: { invoices: Invoice[]; customers: Customer[]; expression: Expression; onOpenCustomer: (customerNumber: string) => void; onUpload: () => void }) {
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
    ...(expression.level === "invoice" ? [{ key: "calculated", label: expression.name, width: 190, align: "right" as const, value: (row: Invoice) => {
      const customer = customers.find((item) => item.customerNumber === row.customerNumber) ?? customers[0];
      return String(evaluateExpression(expression, customer, invoices, row));
    }, render: (row: Invoice) => {
      const customer = customers.find((item) => item.customerNumber === row.customerNumber) ?? customers[0];
      return <span className="calculated-cell">{formatResult(evaluateExpression(expression, customer, invoices, row), inferResultType(expression))}<span>fx</span></span>;
    } }] : []),
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
    ...(expression.level === "invoice" ? [{ key: "calculated", label: expression.name, width: 180, align: "right" as const, value: (row: Invoice) => String(evaluateExpression(expression, customer, invoices, row)), render: (row: Invoice) => <span className="calculated-cell">{formatResult(evaluateExpression(expression, customer, invoices, row), inferResultType(expression))}<span>fx</span></span> }] : []),
    { key: "dueDate", label: "Due date", width: 140, value: (row) => row.dueDate },
    { key: "status", label: "Status", width: 120, value: (row) => row.status, render: (row) => <StatusPill value={row.status} /> },
    { key: "invoiceDate", label: "Invoice date", width: 140, value: (row) => row.invoiceDate },
    { key: "collector", label: "Collector", width: 170, value: (row) => row.collector },
  ];
  return (
    <section className="customer-detail-page page-enter"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to customers</button><header className="customer-profile-header"><div className="profile-identity"><span className="large-avatar">{customer.customerName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><span className="eyebrow">{customer.customerNumber}</span><h1>{customer.customerName}</h1><p>{customer.segment} · {customer.region} · Managed by {customer.collector}</p></div></div><div className="profile-actions"><StatusPill value={`${customer.risk} risk`} /><button className="secondary-button">More actions <ChevronDown size={15} /></button></div></header><div className="customer-metrics"><div><span>Total open</span><strong>{money.format(openAmount)}</strong><small>{customerInvoices.filter((invoice) => invoice.status === "Open").length} open invoices</small></div><div><span>Credit limit</span><strong>{money.format(customer.creditLimit)}</strong><small>{Math.round((openAmount / customer.creditLimit) * 100)}% utilized</small></div><div className="calculated-metric"><span>{expression.name}<b>fx</b></span><strong>{expression.level === "customer" ? formatResult(evaluateExpression(expression, customer, invoices), expression.resultType) : `${customerInvoices.length} invoice values`}</strong><small>{expression.level === "customer" ? "Calculated in Expression Studio" : "Shown in the invoice grid below"}</small></div><div><span>Oldest due</span><strong>{Math.max(...customerInvoices.map((invoice) => Math.max(0, Math.round((new Date("2026-07-20").getTime() - new Date(invoice.dueDate).getTime()) / 86400000))), 0)} days</strong><small>As of Jul 20, 2026</small></div></div><div className="detail-content"><section className="detail-invoices"><header><div><span className="eyebrow">Open items</span><h2>Invoices</h2></div><button className="text-button"><Filter size={16} /> Filter</button></header><DataGrid rows={customerInvoices} columns={columns} rowKey={(row) => row.invoiceNumber} emptyLabel="No invoices for this customer." /></section><aside className="customer-profile-panel"><header><span className="eyebrow">Customer attributes</span><h2>Profile</h2></header><dl><div><dt>Customer number</dt><dd>{customer.customerNumber}</dd></div><div><dt>Collector</dt><dd>{customer.collector}</dd></div><div><dt>Region</dt><dd>{customer.region}</dd></div><div><dt>Segment</dt><dd>{customer.segment}</dd></div><div><dt>Currency</dt><dd>{customer.currency}</dd></div><div><dt>Text reference 1</dt><dd>{customer.references.textRef1 || "—"}</dd></div><div><dt>Number reference 1</dt><dd>{customer.references.numberRef1 || "—"}</dd></div><div><dt>Date reference 1</dt><dd>{customer.references.dateRef1 || "—"}</dd></div></dl></aside></div></section>
  );
}

export default function Home() {
  const [customers, setCustomers] = useState(seedCustomers);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [savedExpressions, setSavedExpressions] = useState(seedExpressions);
  const [expression, setExpressionState] = useState<Expression>(initialExpression);
  const [tabs, setTabs] = useState<WorkspaceTab[]>([{ id: "expressions", label: "Expression Studio", kind: "view", view: "expressions" }]);
  const [activeTabId, setActiveTabId] = useState("expressions");
  const [showGuide, setShowGuide] = useState(false);
  const [showFunctions, setShowFunctions] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType | null>(null);
  const [toast, setToast] = useState("");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const activeView = activeTab?.kind === "view" ? activeTab.view : undefined;

  function setExpression(updater: (current: Expression) => Expression) {
    setExpressionState((current) => {
      const next = updater(current);
      return { ...next, resultType: inferResultType(next) };
    });
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

  function openEditor(field: Expression) {
    const next = {
      ...field,
      sourceFields: getExpressionSourceFields(field),
      conditions: field.conditions.map((condition) => ({ ...condition })),
      conditionGroups: getConditionGroups(field).map((group) => ({ ...group, conditions: group.conditions.map((condition) => ({ ...condition })) })),
    };
    setExpressionState({ ...next, resultType: inferResultType(next) });
    setTabs((current) => {
      const editorTab = { id: "builder", label: field.name || "New calculated field", kind: "view" as const, view: "builder" as const };
      return current.some((tab) => tab.id === "builder")
        ? current.map((tab) => tab.id === "builder" ? editorTab : tab)
        : [...current, editorTab];
    });
    setActiveTabId("builder");
  }

  function createExpression() {
    openEditor({
      id: `expr-${Date.now()}`,
      name: "Untitled calculated field",
      description: "",
      level: "customer",
      resultType: "amount",
      functionKey: "SUMIFS",
      sourceField: "invoice.openAmount",
      sourceFields: ["invoice.openAmount"],
      conditions: [{ id: `condition-${Date.now()}`, field: "invoice.status", operator: "equals", value: "Open" }],
      conditionGroups: [{ id: `group-${Date.now()}`, conditions: [{ id: `condition-${Date.now()}`, field: "invoice.status", operator: "equals", value: "Open" }] }],
    });
  }

  function saveExpression(status: SavedExpression["status"]) {
    const saved: SavedExpression = {
      ...expression,
      resultType: inferResultType(expression),
      status,
      updatedAt: "Just now",
      usedIn: savedExpressions.find((field) => field.id === expression.id)?.usedIn ?? 0,
    };
    setSavedExpressions((current) => current.some((field) => field.id === saved.id)
      ? current.map((field) => field.id === saved.id ? saved : field)
      : [saved, ...current]);
    showToast(status === "Published" ? `${saved.name} published and ready to use.` : `${saved.name} saved to calculated fields.`);
    navigate("expressions");
  }

  function runExpression(field: Expression) {
    setExpressionState({
      ...field,
      resultType: inferResultType(field),
      sourceFields: getExpressionSourceFields(field),
      conditions: field.conditions.map((condition) => ({ ...condition })),
      conditionGroups: getConditionGroups(field).map((group) => ({ ...group, conditions: group.conditions.map((condition) => ({ ...condition })) })),
    });
    navigate("simulation");
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
    if (activeView === "expressions") return <CalculatedFieldsLibrary fields={savedExpressions} onNew={createExpression} onEdit={openEditor} onRun={runExpression} onShowGuide={() => setShowGuide(true)} />;
    if (activeView === "customers") return <CustomerGrid customers={customers} invoices={invoices} expression={expression} onOpenCustomer={openCustomer} onUpload={() => setUploadType("customer")} />;
    if (activeView === "invoices") return <InvoiceGrid invoices={invoices} customers={customers} expression={expression} onOpenCustomer={(customerNumber) => { const customer = customers.find((item) => item.customerNumber === customerNumber); if (customer) openCustomer(customer); }} onUpload={() => setUploadType("invoice")} />;
    if (activeView === "simulation") return <SimulationLab expression={expression} customers={customers} invoices={invoices} onOpenCustomer={openCustomer} onPublish={() => saveExpression("Published")} />;
    return <ExpressionBuilderV2 expression={expression} setExpression={setExpression} customers={customers} invoices={invoices} onShowGuide={() => setShowGuide(true)} onShowFunctions={() => setShowFunctions(true)} onOpenSimulation={() => navigate("simulation")} onBackToLibrary={() => navigate("expressions")} onSaveDraft={() => saveExpression("Draft")} onToast={showToast} />;
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="product-switcher" href="/" aria-label="Collections home"><span className="bento-mark"><Grid3X3 size={19} /></span><span><strong>Collections</strong><small>Administration</small></span></a>
        <nav className="primary-nav" aria-label="Administration navigation">
          <span className="nav-label">Build</span>
          {(["expressions", "simulation"] as View[]).map((view) => <button key={view} className={activeView === view || (view === "expressions" && activeView === "builder") ? "active" : ""} onClick={() => navigate(view)}>{viewIcons[view]}<span>{viewLabels[view]}</span>{view === "expressions" && <small>NEW</small>}</button>)}
          <span className="nav-label data-label">Data</span>
          {(["customers", "invoices"] as View[]).map((view) => <button key={view} className={activeView === view ? "active" : ""} onClick={() => navigate(view)}>{viewIcons[view]}<span>{viewLabels[view]}</span><b>{view === "customers" ? customers.length : invoices.length}</b></button>)}
        </nav>
        <div className="sidebar-bottom"><a href="/story"><BookOpen size={18} /><span><strong>Product story</strong><small>Problem, vision & PRD</small></span><ExternalLink size={14} /></a><button onClick={() => setShowGuide(true)}><CircleHelp size={18} /><span>Help & guidance</span></button><div className="user-strip"><span>NS</span><span><strong>Nia Sharma</strong><small>Administrator</small></span><ChevronDown size={15} /></div></div>
      </aside>

      <section className="app-workspace">
        <header className="global-bar"><div className="environment"><span>Acme Demo Environment</span><ChevronDown size={15} /></div><div className="global-actions"><button className="dataset-status"><span className="live-dot" /> Demo data active</button><IconButton label="Administration settings"><Settings2 size={18} /></IconButton><button className="howto-top" onClick={() => setShowGuide(true)}><CircleHelp size={17} /> How to</button></div></header>
        <div className="workspace-tabs" role="tablist">{tabs.map((tab) => <div className="workspace-tab-wrap" key={tab.id}><button className={`workspace-tab ${tab.id === activeTabId ? "active" : ""}`} onClick={() => setActiveTabId(tab.id)} role="tab" aria-selected={tab.id === activeTabId}>{tab.kind === "customer" ? <Users size={14} /> : viewIcons[tab.view ?? "expressions"]}<span>{tab.label}</span></button>{tabs.length > 1 && <button className="tab-close" onClick={() => closeTab(tab.id)} aria-label={`Close ${tab.label} tab`} title={`Close ${tab.label} tab`}><X size={13} /></button>}</div>)}</div>
        <div className="page-container">{renderActiveTab()}</div>
      </section>

      {showGuide && <HowToDrawer onClose={() => setShowGuide(false)} />}
      {showFunctions && <FunctionLibrary selected={expression.functionKey} level={expression.level} onSelect={(functionKey) => setExpression((current) => {
        const sources = sourceSelection(functionKey, current.level, getExpressionSourceFields(current));
        return { ...current, functionKey, sourceField: sources[0] ?? "", sourceFields: sources };
      })} onClose={() => setShowFunctions(false)} />}
      {uploadType && <UploadModal initialType={uploadType} customers={customers} onUploadCustomers={(rows) => { setCustomers((current) => [...current, ...rows]); showToast(`${rows.length} customers uploaded successfully.`); }} onUploadInvoices={(rows) => { setInvoices((current) => [...current, ...rows]); showToast(`${rows.length} invoices uploaded successfully.`); }} onClose={() => setUploadType(null)} />}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </main>
  );
}
