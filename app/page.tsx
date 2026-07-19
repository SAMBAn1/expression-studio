"use client";

import { useMemo, useState } from "react";

type View = "customers" | "invoices" | "builder" | "simulation";
type Level = "customer" | "invoice";
type ResultType = "amount" | "number" | "text" | "date";
type FunctionType = "SUM" | "COUNT" | "AVG" | "RATIO" | "AGE_DAYS" | "BUCKET";
type Operator = "equals" | "in" | "greaterThan" | "lessThan" | "contains";

type Customer = {
  id: string;
  name: string;
  region: string;
  collector: string;
  segment: string;
  risk: "Low" | "Medium" | "High";
  creditLimit: number;
};

type Invoice = {
  id: string;
  customerId: string;
  customerName: string;
  documentType: string;
  openAmount: number;
  invoiceAmount: number;
  dueDate: string;
  invoiceDate: string;
  status: "Open" | "Disputed" | "Promise" | "Closed";
  collector: string;
};

type Filter = {
  field: keyof Invoice | keyof Customer;
  operator: Operator;
  value: string;
};

type Expression = {
  id: string;
  name: string;
  level: Level;
  resultType: ResultType;
  functionType: FunctionType;
  sourceField: keyof Invoice;
  denominatorField: keyof Customer | "openAmount";
  filters: Filter[];
  description: string;
};

const today = new Date("2026-07-20T00:00:00");

const seedCustomers: Customer[] = [
  {
    id: "CUST-001",
    name: "Costco Wholesale",
    region: "West",
    collector: "Nia Sharma",
    segment: "Retail",
    risk: "Medium",
    creditLimit: 1450000,
  },
  {
    id: "CUST-002",
    name: "Northern Foods",
    region: "Midwest",
    collector: "Aarav Mehta",
    segment: "Grocery",
    risk: "Low",
    creditLimit: 840000,
  },
  {
    id: "CUST-003",
    name: "Blue Harbor Supply",
    region: "East",
    collector: "Mira Patel",
    segment: "Distribution",
    risk: "High",
    creditLimit: 520000,
  },
  {
    id: "CUST-004",
    name: "MetroCare Clinics",
    region: "South",
    collector: "Nia Sharma",
    segment: "Healthcare",
    risk: "Medium",
    creditLimit: 670000,
  },
];

const seedInvoices: Invoice[] = [
  {
    id: "INV-10031",
    customerId: "CUST-001",
    customerName: "Costco Wholesale",
    documentType: "RV",
    openAmount: 142000,
    invoiceAmount: 142000,
    dueDate: "2026-07-05",
    invoiceDate: "2026-06-05",
    status: "Open",
    collector: "Nia Sharma",
  },
  {
    id: "INV-10032",
    customerId: "CUST-001",
    customerName: "Costco Wholesale",
    documentType: "DZ",
    openAmount: 61000,
    invoiceAmount: 61000,
    dueDate: "2026-07-12",
    invoiceDate: "2026-06-12",
    status: "Open",
    collector: "Nia Sharma",
  },
  {
    id: "INV-10033",
    customerId: "CUST-001",
    customerName: "Costco Wholesale",
    documentType: "AB",
    openAmount: 38000,
    invoiceAmount: 72000,
    dueDate: "2026-06-22",
    invoiceDate: "2026-05-23",
    status: "Disputed",
    collector: "Nia Sharma",
  },
  {
    id: "INV-10041",
    customerId: "CUST-002",
    customerName: "Northern Foods",
    documentType: "RV",
    openAmount: 52000,
    invoiceAmount: 52000,
    dueDate: "2026-07-30",
    invoiceDate: "2026-06-30",
    status: "Promise",
    collector: "Aarav Mehta",
  },
  {
    id: "INV-10042",
    customerId: "CUST-002",
    customerName: "Northern Foods",
    documentType: "DA",
    openAmount: 118000,
    invoiceAmount: 118000,
    dueDate: "2026-06-18",
    invoiceDate: "2026-05-19",
    status: "Open",
    collector: "Aarav Mehta",
  },
  {
    id: "INV-10051",
    customerId: "CUST-003",
    customerName: "Blue Harbor Supply",
    documentType: "RV",
    openAmount: 91000,
    invoiceAmount: 91000,
    dueDate: "2026-05-28",
    invoiceDate: "2026-04-28",
    status: "Open",
    collector: "Mira Patel",
  },
  {
    id: "INV-10052",
    customerId: "CUST-003",
    customerName: "Blue Harbor Supply",
    documentType: "AB",
    openAmount: 43500,
    invoiceAmount: 43500,
    dueDate: "2026-06-09",
    invoiceDate: "2026-05-10",
    status: "Disputed",
    collector: "Mira Patel",
  },
  {
    id: "INV-10061",
    customerId: "CUST-004",
    customerName: "MetroCare Clinics",
    documentType: "DZ",
    openAmount: 78000,
    invoiceAmount: 78000,
    dueDate: "2026-07-02",
    invoiceDate: "2026-06-02",
    status: "Open",
    collector: "Nia Sharma",
  },
  {
    id: "INV-10062",
    customerId: "CUST-004",
    customerName: "MetroCare Clinics",
    documentType: "RV",
    openAmount: 22400,
    invoiceAmount: 22400,
    dueDate: "2026-08-04",
    invoiceDate: "2026-07-05",
    status: "Open",
    collector: "Nia Sharma",
  },
];

const initialExpression: Expression = {
  id: "expr-costco-doc-type-sum",
  name: "Open amount for selected document types",
  level: "customer",
  resultType: "amount",
  functionType: "SUM",
  sourceField: "openAmount",
  denominatorField: "creditLimit",
  filters: [
    { field: "documentType", operator: "in", value: "RV,DZ" },
    { field: "status", operator: "equals", value: "Open" },
  ],
  description:
    "Sum open invoice amounts where the document type is RV or DZ and status is Open.",
};

const invoiceFields = [
  "documentType",
  "status",
  "openAmount",
  "invoiceAmount",
  "dueDate",
  "invoiceDate",
  "collector",
] as const;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatValue(value: string | number, type: ResultType) {
  if (type === "amount") return money.format(Number(value || 0));
  if (type === "number") return Number(value || 0).toLocaleString("en-US");
  return String(value);
}

function daysBetween(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return Math.max(0, Math.round((today.getTime() - date.getTime()) / 86400000));
}

function matchesFilter(invoice: Invoice, customer: Customer | undefined, filter: Filter) {
  const record = { ...customer, ...invoice } as Record<string, string | number | undefined>;
  const raw = record[String(filter.field)];
  const target = String(raw ?? "").toLowerCase();
  const value = filter.value.toLowerCase();

  if (filter.operator === "equals") return target === value;
  if (filter.operator === "contains") return target.includes(value);
  if (filter.operator === "in") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .includes(target);
  }
  if (filter.operator === "greaterThan") return Number(raw ?? 0) > Number(filter.value);
  if (filter.operator === "lessThan") return Number(raw ?? 0) < Number(filter.value);
  return true;
}

function applyExpression(
  expression: Expression,
  customer: Customer,
  invoices: Invoice[],
) {
  const scoped = invoices.filter((invoice) => {
    if (expression.level === "customer" && invoice.customerId !== customer.id) return false;
    return expression.filters.every((filter) => matchesFilter(invoice, customer, filter));
  });

  if (expression.functionType === "COUNT") return scoped.length;
  if (expression.functionType === "AGE_DAYS") {
    if (!scoped.length) return 0;
    return Math.max(...scoped.map((invoice) => daysBetween(invoice.dueDate)));
  }
  if (expression.functionType === "BUCKET") {
    const oldest = scoped.length ? Math.max(...scoped.map((invoice) => daysBetween(invoice.dueDate))) : 0;
    if (oldest > 60) return "60+ days";
    if (oldest > 30) return "31-60 days";
    if (oldest > 0) return "1-30 days";
    return "Current";
  }

  const values = scoped.map((invoice) => Number(invoice[expression.sourceField] ?? 0));
  const sum = values.reduce((total, value) => total + value, 0);

  if (expression.functionType === "AVG") return values.length ? sum / values.length : 0;
  if (expression.functionType === "RATIO") {
    const denominator =
      expression.denominatorField === "openAmount"
        ? invoices
            .filter((invoice) => invoice.customerId === customer.id)
            .reduce((total, invoice) => total + invoice.openAmount, 0)
        : Number(customer[expression.denominatorField] ?? 0);
    return denominator ? (sum / denominator) * 100 : 0;
  }
  return sum;
}

function toSql(expression: Expression) {
  const table = expression.level === "customer" ? "invoice i" : "invoice i";
  const fn =
    expression.functionType === "COUNT"
      ? "COUNT(i.invoice_id)"
      : expression.functionType === "AVG"
        ? `AVG(i.${expression.sourceField})`
        : expression.functionType === "AGE_DAYS"
          ? "MAX(DATEDIFF(day, i.due_date, CURRENT_DATE))"
          : expression.functionType === "BUCKET"
            ? "CASE WHEN MAX(DATEDIFF(day, i.due_date, CURRENT_DATE)) > 60 THEN '60+ days' WHEN MAX(DATEDIFF(day, i.due_date, CURRENT_DATE)) > 30 THEN '31-60 days' WHEN MAX(DATEDIFF(day, i.due_date, CURRENT_DATE)) > 0 THEN '1-30 days' ELSE 'Current' END"
            : `SUM(i.${expression.sourceField})`;

  const filters = expression.filters
    .map((filter) => {
      const field = `i.${filter.field}`;
      if (filter.operator === "in") {
        const values = filter.value
          .split(",")
          .map((item) => `'${item.trim()}'`)
          .join(", ");
        return `${field} IN (${values})`;
      }
      if (filter.operator === "contains") return `${field} LIKE '%${filter.value}%'`;
      if (filter.operator === "greaterThan") return `${field} > ${filter.value}`;
      if (filter.operator === "lessThan") return `${field} < ${filter.value}`;
      return `${field} = '${filter.value}'`;
    })
    .join("\n  AND ");

  const ratio =
    expression.functionType === "RATIO"
      ? `ROUND((${fn} / NULLIF(c.${expression.denominatorField}, 0)) * 100, 2)`
      : fn;

  return `SELECT
  c.customer_id,
  c.customer_name,
  ${ratio} AS ${expression.name.toLowerCase().replaceAll(" ", "_")}
FROM customer c
JOIN ${table} ON i.customer_id = c.customer_id
WHERE ${filters || "1 = 1"}
GROUP BY c.customer_id, c.customer_name;`;
}

function parseCsv(text: string) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split(",").map((cell) => cell.trim()));
  const headers = rows[0] ?? [];
  return rows.slice(1).map((row) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = row[index] ?? "";
      return record;
    }, {}),
  );
}

function AppIcon({ label }: { label: string }) {
  return <span className="app-icon" aria-hidden="true">{label}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("builder");
  const [customers, setCustomers] = useState(seedCustomers);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [selectedCustomerId, setSelectedCustomerId] = useState("CUST-001");
  const [selectedIds, setSelectedIds] = useState(["CUST-001", "CUST-002", "CUST-003"]);
  const [expression, setExpression] = useState(initialExpression);
  const [uploadMessage, setUploadMessage] = useState("Seed data loaded");

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0];
  const selectedInvoices = invoices.filter((invoice) => invoice.customerId === selectedCustomer.id);
  const filteredInvoices = invoices.filter((invoice) =>
    expression.filters.every((filter) =>
      matchesFilter(invoice, customers.find((customer) => customer.id === invoice.customerId), filter),
    ),
  );

  const simulation = useMemo(
    () =>
      customers
        .filter((customer) => selectedIds.includes(customer.id))
        .map((customer) => ({
          customer,
          invoiceCount: invoices.filter((invoice) => invoice.customerId === customer.id).length,
          result: applyExpression(expression, customer, invoices),
        })),
    [customers, expression, invoices, selectedIds],
  );

  const totalOpen = invoices.reduce((total, invoice) => total + invoice.openAmount, 0);
  const generatedSql = toSql(expression);

  function updateFilter(index: number, patch: Partial<Filter>) {
    setExpression((current) => ({
      ...current,
      filters: current.filters.map((filter, filterIndex) =>
        filterIndex === index ? { ...filter, ...patch } : filter,
      ),
    }));
  }

  async function uploadData(file: File, type: "customers" | "invoices") {
    const rows = parseCsv(await file.text());
    if (type === "customers") {
      setCustomers((current) => [
        ...current,
        ...rows.map((row, index) => ({
          id: row.id || row.customerId || `CUST-UP-${index + 1}`,
          name: row.name || row.customerName || "Uploaded Customer",
          region: row.region || "Uploaded",
          collector: row.collector || "Unassigned",
          segment: row.segment || "General",
          risk: (row.risk as Customer["risk"]) || "Medium",
          creditLimit: Number(row.creditLimit || 0),
        })),
      ]);
      setUploadMessage(`${rows.length} customers uploaded`);
    } else {
      setInvoices((current) => [
        ...current,
        ...rows.map((row, index) => ({
          id: row.id || row.invoiceId || `INV-UP-${index + 1}`,
          customerId: row.customerId || "CUST-001",
          customerName: row.customerName || customers.find((customer) => customer.id === row.customerId)?.name || "Uploaded Customer",
          documentType: row.documentType || "RV",
          openAmount: Number(row.openAmount || 0),
          invoiceAmount: Number(row.invoiceAmount || row.openAmount || 0),
          dueDate: row.dueDate || "2026-07-20",
          invoiceDate: row.invoiceDate || "2026-06-20",
          status: (row.status as Invoice["status"]) || "Open",
          collector: row.collector || "Unassigned",
        })),
      ]);
      setUploadMessage(`${rows.length} invoices uploaded`);
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Administration navigation">
        <div className="brand">
          <button className="bento" aria-label="Open product switcher">
            <span />
            <span />
            <span />
            <span />
          </button>
          <div>
            <strong>Collections</strong>
            <small>Administration</small>
          </div>
        </div>
        <nav className="nav-list">
          {[
            ["builder", "Expression builder", "fx"],
            ["simulation", "Simulation lab", "sim"],
            ["customers", "Customers", "cus"],
            ["invoices", "Invoices", "inv"],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id as View)}
            >
              <AppIcon label={icon} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span>PoC focus</span>
          <strong>Clarity over platform complexity</strong>
          <p>Build SQL-safe values without exporting to a spreadsheet-style engine.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Admin workbench</p>
            <h1>Native expression builder for customer and invoice values</h1>
          </div>
          <div className="status-strip" aria-label="Dataset summary">
            <span>{customers.length} customers</span>
            <span>{invoices.length} invoices</span>
            <span>{money.format(totalOpen)} open</span>
          </div>
        </header>

        {view === "builder" && (
          <section className="builder-grid">
            <div className="panel builder-panel">
              <div className="panel-heading">
                <div>
                  <span>Step 1</span>
                  <h2>Define the value</h2>
                </div>
                <select
                  value={expression.functionType}
                  onChange={(event) =>
                    setExpression((current) => ({
                      ...current,
                      functionType: event.target.value as FunctionType,
                      resultType:
                        event.target.value === "BUCKET"
                          ? "text"
                          : event.target.value === "RATIO"
                            ? "number"
                            : current.resultType,
                    }))
                  }
                  aria-label="Expression function"
                >
                  <option>SUM</option>
                  <option>COUNT</option>
                  <option>AVG</option>
                  <option>RATIO</option>
                  <option>AGE_DAYS</option>
                  <option>BUCKET</option>
                </select>
              </div>

              <label className="field">
                Expression name
                <input
                  value={expression.name}
                  onChange={(event) =>
                    setExpression((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>

              <div className="control-row">
                <label className="field">
                  Calculate at
                  <select
                    value={expression.level}
                    onChange={(event) =>
                      setExpression((current) => ({ ...current, level: event.target.value as Level }))
                    }
                  >
                    <option value="customer">Customer level</option>
                    <option value="invoice">Invoice level</option>
                  </select>
                </label>
                <label className="field">
                  Result type
                  <select
                    value={expression.resultType}
                    onChange={(event) =>
                      setExpression((current) => ({
                        ...current,
                        resultType: event.target.value as ResultType,
                      }))
                    }
                  >
                    <option value="amount">Amount</option>
                    <option value="number">Number</option>
                    <option value="text">Text</option>
                    <option value="date">Date</option>
                  </select>
                </label>
              </div>

              <div className="control-row">
                <label className="field">
                  Source field
                  <select
                    value={expression.sourceField}
                    onChange={(event) =>
                      setExpression((current) => ({
                        ...current,
                        sourceField: event.target.value as keyof Invoice,
                      }))
                    }
                  >
                    <option value="openAmount">Open amount</option>
                    <option value="invoiceAmount">Invoice amount</option>
                  </select>
                </label>
                <label className="field">
                  Denominator
                  <select
                    value={expression.denominatorField}
                    onChange={(event) =>
                      setExpression((current) => ({
                        ...current,
                        denominatorField: event.target.value as Expression["denominatorField"],
                      }))
                    }
                  >
                    <option value="creditLimit">Credit limit</option>
                    <option value="openAmount">Total open amount</option>
                  </select>
                </label>
              </div>

              <div className="rule-header">
                <div>
                  <span>Step 2</span>
                  <h2>Choose conditions</h2>
                </div>
                <button
                  className="ghost"
                  onClick={() =>
                    setExpression((current) => ({
                      ...current,
                      filters: [...current.filters, { field: "documentType", operator: "equals", value: "RV" }],
                    }))
                  }
                >
                  Add condition
                </button>
              </div>

              <div className="rules">
                {expression.filters.map((filter, index) => (
                  <div className="rule" key={`${filter.field}-${index}`}>
                    <select
                      aria-label="Filter field"
                      value={filter.field}
                      onChange={(event) => updateFilter(index, { field: event.target.value as Filter["field"] })}
                    >
                      {invoiceFields.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter operator"
                      value={filter.operator}
                      onChange={(event) => updateFilter(index, { operator: event.target.value as Operator })}
                    >
                      <option value="equals">equals</option>
                      <option value="in">is in list</option>
                      <option value="greaterThan">greater than</option>
                      <option value="lessThan">less than</option>
                      <option value="contains">contains</option>
                    </select>
                    <input
                      aria-label="Filter value"
                      value={filter.value}
                      onChange={(event) => updateFilter(index, { value: event.target.value })}
                    />
                    <button
                      className="icon-button"
                      aria-label="Remove condition"
                      onClick={() =>
                        setExpression((current) => ({
                          ...current,
                          filters: current.filters.filter((_, filterIndex) => filterIndex !== index),
                        }))
                      }
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel story-panel">
              <div className="panel-heading">
                <div>
                  <span>Live preview</span>
                  <h2>What this expression means</h2>
                </div>
              </div>
              <p className="intent">{expression.description}</p>
              <div className="metric-row">
                <div>
                  <span>Matching invoices</span>
                  <strong>{filteredInvoices.length}</strong>
                </div>
                <div>
                  <span>Sample result</span>
                  <strong>{formatValue(simulation[0]?.result ?? 0, expression.resultType)}</strong>
                </div>
              </div>
              <pre className="sql-preview">{generatedSql}</pre>
            </div>
          </section>
        )}

        {view === "simulation" && (
          <section className="sim-grid">
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <span>Step 3</span>
                  <h2>Simulate on selected customers</h2>
                </div>
                <button className="primary" onClick={() => setSelectedIds(customers.map((customer) => customer.id))}>
                  Select all
                </button>
              </div>
              <div className="customer-picker">
                {customers.map((customer) => (
                  <label key={customer.id} className="check-row">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(customer.id)}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, customer.id]
                            : current.filter((id) => id !== customer.id),
                        )
                      }
                    />
                    <span>{customer.name}</span>
                    <small>{customer.risk} risk</small>
                  </label>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <span>Results</span>
                  <h2>Calculated field output</h2>
                </div>
              </div>
              <div className="result-list">
                {simulation.map(({ customer, invoiceCount, result }) => (
                  <button
                    key={customer.id}
                    className="result-row"
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setView("customers");
                    }}
                  >
                    <span>
                      <strong>{customer.name}</strong>
                      <small>{invoiceCount} invoices | {customer.collector}</small>
                    </span>
                    <b>{formatValue(result, expression.resultType)}</b>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "customers" && (
          <section className="data-grid">
            <div className="panel list-panel">
              <div className="panel-heading">
                <div>
                  <span>Customer view</span>
                  <h2>Customers</h2>
                </div>
                <label className="upload">
                  Upload CSV
                  <input type="file" accept=".csv" onChange={(event) => event.target.files?.[0] && uploadData(event.target.files[0], "customers")} />
                </label>
              </div>
              <div className="upload-note">{uploadMessage}</div>
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  className={selectedCustomer.id === customer.id ? "customer-card selected" : "customer-card"}
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <span>
                    <strong>{customer.name}</strong>
                    <small>{customer.id} | {customer.segment}</small>
                  </span>
                  <b>{customer.risk}</b>
                </button>
              ))}
            </div>
            <div className="panel detail-panel">
              <div className="detail-hero">
                <div>
                  <span>{selectedCustomer.region} | {selectedCustomer.collector}</span>
                  <h2>{selectedCustomer.name}</h2>
                </div>
                <strong>{formatValue(applyExpression(expression, selectedCustomer, invoices), expression.resultType)}</strong>
              </div>
              <div className="detail-stats">
                <div><span>Credit limit</span><b>{money.format(selectedCustomer.creditLimit)}</b></div>
                <div><span>Open invoices</span><b>{selectedInvoices.length}</b></div>
                <div><span>Risk</span><b>{selectedCustomer.risk}</b></div>
              </div>
              <div className="mini-table">
                {selectedInvoices.map((invoice) => (
                  <div key={invoice.id} className="invoice-row">
                    <span>
                      <strong>{invoice.id}</strong>
                      <small>{invoice.documentType} | Due {invoice.dueDate}</small>
                    </span>
                    <b>{money.format(invoice.openAmount)}</b>
                    <em>{invoice.status}</em>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "invoices" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span>Invoice view</span>
                <h2>Open items</h2>
              </div>
              <label className="upload">
                Upload CSV
                <input type="file" accept=".csv" onChange={(event) => event.target.files?.[0] && uploadData(event.target.files[0], "invoices")} />
              </label>
            </div>
            <div className="invoice-table">
              <div className="table-head">
                <span>Invoice</span>
                <span>Customer</span>
                <span>Doc type</span>
                <span>Due</span>
                <span>Status</span>
                <span>Open amount</span>
              </div>
              {invoices.map((invoice) => (
                <button
                  key={invoice.id}
                  className="table-row"
                  onClick={() => {
                    setSelectedCustomerId(invoice.customerId);
                    setView("customers");
                  }}
                >
                  <span>{invoice.id}</span>
                  <span>{invoice.customerName}</span>
                  <span>{invoice.documentType}</span>
                  <span>{invoice.dueDate}</span>
                  <span>{invoice.status}</span>
                  <strong>{money.format(invoice.openAmount)}</strong>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
