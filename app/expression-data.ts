export type Level = "customer" | "invoice";
export type ResultType = "amount" | "number" | "text" | "date";
export type FunctionKey =
  | "SUMIFS"
  | "COUNTIFS"
  | "AVERAGEIFS"
  | "MIN"
  | "MAX"
  | "IF"
  | "ROUND"
  | "ABS"
  | "DAYS"
  | "EOMONTH"
  | "CONCAT"
  | "UPPER"
  | "LOWER"
  | "TRIM"
  | "COALESCE"
  | "PERCENT";

export type Operator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "greater_than"
  | "less_than"
  | "contains"
  | "is_blank";

export type ReferenceValues = Record<string, string | number>;

export type Customer = {
  customerNumber: string;
  customerName: string;
  region: string;
  collector: string;
  segment: string;
  risk: "Low" | "Medium" | "High";
  creditLimit: number;
  currency: string;
  references: ReferenceValues;
};

export type Invoice = {
  invoiceNumber: string;
  customerNumber: string;
  customerName: string;
  documentType: string;
  openAmount: number;
  invoiceAmount: number;
  dueDate: string;
  invoiceDate: string;
  status: "Open" | "Disputed" | "Promise" | "Closed";
  collector: string;
  references: ReferenceValues;
};

export type Condition = {
  id: string;
  field: string;
  operator: Operator;
  value: string;
};

export type Expression = {
  id: string;
  name: string;
  description: string;
  level: Level;
  resultType: ResultType;
  functionKey: FunctionKey;
  sourceField: string;
  conditions: Condition[];
};

export type FunctionDefinition = {
  key: FunctionKey;
  label: string;
  category: "Conditional" | "Math" | "Logic" | "Date" | "Text";
  description: string;
  excelExample: string;
  sqlPattern: string;
};

export type FieldDefinition = {
  key: string;
  label: string;
  entity: "Customer" | "Invoice";
  kind: "amount" | "number" | "text" | "date";
  sql: string;
};

export const functionCatalog: FunctionDefinition[] = [
  { key: "SUMIFS", label: "Conditional sum", category: "Conditional", description: "Add values that match one or more conditions.", excelExample: "SUMIFS(sum_range, criteria_range, criteria)", sqlPattern: "SUM(CASE WHEN ... THEN value END)" },
  { key: "COUNTIFS", label: "Conditional count", category: "Conditional", description: "Count records that match one or more conditions.", excelExample: "COUNTIFS(criteria_range, criteria)", sqlPattern: "COUNT(*) FILTER (WHERE ...)" },
  { key: "AVERAGEIFS", label: "Conditional average", category: "Conditional", description: "Average values for records that meet your conditions.", excelExample: "AVERAGEIFS(avg_range, criteria_range, criteria)", sqlPattern: "AVG(value) FILTER (WHERE ...)" },
  { key: "MIN", label: "Minimum", category: "Math", description: "Return the smallest value in the selected scope.", excelExample: "MIN(range)", sqlPattern: "MIN(value)" },
  { key: "MAX", label: "Maximum", category: "Math", description: "Return the largest value in the selected scope.", excelExample: "MAX(range)", sqlPattern: "MAX(value)" },
  { key: "ROUND", label: "Round", category: "Math", description: "Round a number to a fixed number of decimals.", excelExample: "ROUND(number, digits)", sqlPattern: "ROUND(value, digits)" },
  { key: "ABS", label: "Absolute value", category: "Math", description: "Return a number without its sign.", excelExample: "ABS(number)", sqlPattern: "ABS(value)" },
  { key: "PERCENT", label: "Percentage", category: "Math", description: "Calculate a ratio and return it as a percentage.", excelExample: "part / total * 100", sqlPattern: "part / NULLIF(total, 0) * 100" },
  { key: "IF", label: "If / then", category: "Logic", description: "Return one value when a condition is true and another when false.", excelExample: "IF(test, value_if_true, value_if_false)", sqlPattern: "CASE WHEN ... THEN ... ELSE ... END" },
  { key: "COALESCE", label: "First non-blank", category: "Logic", description: "Use the first available value from a list of fields.", excelExample: "IFERROR(value, fallback)", sqlPattern: "COALESCE(value, fallback)" },
  { key: "DAYS", label: "Days between", category: "Date", description: "Calculate the number of days between two dates.", excelExample: "DAYS(end_date, start_date)", sqlPattern: "DATE_PART('day', end_date - start_date)" },
  { key: "EOMONTH", label: "End of month", category: "Date", description: "Return the last date of a month, with an optional offset.", excelExample: "EOMONTH(start_date, months)", sqlPattern: "DATE_TRUNC('month', date) + INTERVAL '1 month - 1 day'" },
  { key: "CONCAT", label: "Join text", category: "Text", description: "Combine text from multiple fields.", excelExample: "CONCAT(text1, text2)", sqlPattern: "CONCAT(value_1, value_2)" },
  { key: "UPPER", label: "Uppercase", category: "Text", description: "Convert text to uppercase.", excelExample: "UPPER(text)", sqlPattern: "UPPER(value)" },
  { key: "LOWER", label: "Lowercase", category: "Text", description: "Convert text to lowercase.", excelExample: "LOWER(text)", sqlPattern: "LOWER(value)" },
  { key: "TRIM", label: "Trim spaces", category: "Text", description: "Remove extra spaces from text.", excelExample: "TRIM(text)", sqlPattern: "TRIM(value)" },
];

const coreFields: FieldDefinition[] = [
  { key: "customer.customerNumber", label: "Customer number", entity: "Customer", kind: "text", sql: "c.customer_number" },
  { key: "customer.customerName", label: "Customer name", entity: "Customer", kind: "text", sql: "c.customer_name" },
  { key: "customer.region", label: "Region", entity: "Customer", kind: "text", sql: "c.region" },
  { key: "customer.collector", label: "Collector", entity: "Customer", kind: "text", sql: "c.collector" },
  { key: "customer.segment", label: "Segment", entity: "Customer", kind: "text", sql: "c.segment" },
  { key: "customer.risk", label: "Risk", entity: "Customer", kind: "text", sql: "c.risk" },
  { key: "customer.creditLimit", label: "Credit limit", entity: "Customer", kind: "amount", sql: "c.credit_limit" },
  { key: "invoice.invoiceNumber", label: "Invoice number", entity: "Invoice", kind: "text", sql: "i.invoice_number" },
  { key: "invoice.documentType", label: "Document type", entity: "Invoice", kind: "text", sql: "i.document_type" },
  { key: "invoice.openAmount", label: "Open amount", entity: "Invoice", kind: "amount", sql: "i.open_amount" },
  { key: "invoice.invoiceAmount", label: "Invoice amount", entity: "Invoice", kind: "amount", sql: "i.invoice_amount" },
  { key: "invoice.dueDate", label: "Due date", entity: "Invoice", kind: "date", sql: "i.due_date" },
  { key: "invoice.invoiceDate", label: "Invoice date", entity: "Invoice", kind: "date", sql: "i.invoice_date" },
  { key: "invoice.status", label: "Status", entity: "Invoice", kind: "text", sql: "i.status" },
  { key: "invoice.collector", label: "Invoice collector", entity: "Invoice", kind: "text", sql: "i.collector" },
];

function referenceFields(entity: "Customer" | "Invoice"): FieldDefinition[] {
  const prefix = entity.toLowerCase();
  return (["number", "text", "date"] as const).flatMap((kind) =>
    Array.from({ length: 10 }, (_, index) => ({
      key: `${prefix}.${kind}Ref${index + 1}`,
      label: `${kind === "number" ? "Number" : kind === "text" ? "Text" : "Date"} reference ${index + 1}`,
      entity,
      kind: kind === "number" ? "number" : kind,
      sql: `${entity === "Customer" ? "c" : "i"}.${kind}_ref_${index + 1}`,
    })),
  );
}

export const fieldCatalog = [
  ...coreFields,
  ...referenceFields("Customer"),
  ...referenceFields("Invoice"),
];

export const referenceHeaders = {
  customer: {
    required: ["customerNumber", "customerName"],
    number: Array.from({ length: 10 }, (_, index) => `numberRef${index + 1}`),
    text: Array.from({ length: 10 }, (_, index) => `textRef${index + 1}`),
    date: Array.from({ length: 10 }, (_, index) => `dateRef${index + 1}`),
  },
  invoice: {
    required: ["invoiceNumber", "customerNumber"],
    number: Array.from({ length: 10 }, (_, index) => `numberRef${index + 1}`),
    text: Array.from({ length: 10 }, (_, index) => `textRef${index + 1}`),
    date: Array.from({ length: 10 }, (_, index) => `dateRef${index + 1}`),
  },
};

function refs(values: Partial<ReferenceValues>): ReferenceValues {
  return values;
}

export const seedCustomers: Customer[] = [
  { customerNumber: "CUST-001", customerName: "Costco Wholesale", region: "West", collector: "Nia Sharma", segment: "Retail", risk: "Medium", creditLimit: 1450000, currency: "USD", references: refs({ textRef1: "Strategic", textRef2: "US-West", numberRef1: 92, numberRef2: 14, dateRef1: "2024-01-15" }) },
  { customerNumber: "CUST-002", customerName: "Northern Foods", region: "Midwest", collector: "Aarav Mehta", segment: "Grocery", risk: "Low", creditLimit: 840000, currency: "USD", references: refs({ textRef1: "Core", textRef2: "US-Central", numberRef1: 74, numberRef2: 8, dateRef1: "2023-09-04" }) },
  { customerNumber: "CUST-003", customerName: "Blue Harbor Supply", region: "East", collector: "Mira Patel", segment: "Distribution", risk: "High", creditLimit: 520000, currency: "USD", references: refs({ textRef1: "Watchlist", textRef2: "US-East", numberRef1: 41, numberRef2: 31, dateRef1: "2025-02-11" }) },
  { customerNumber: "CUST-004", customerName: "MetroCare Clinics", region: "South", collector: "Nia Sharma", segment: "Healthcare", risk: "Medium", creditLimit: 670000, currency: "USD", references: refs({ textRef1: "Core", textRef2: "US-South", numberRef1: 66, numberRef2: 12, dateRef1: "2024-06-27" }) },
  { customerNumber: "CUST-005", customerName: "Apex Home Markets", region: "West", collector: "Aarav Mehta", segment: "Retail", risk: "Low", creditLimit: 930000, currency: "USD", references: refs({ textRef1: "Growth", textRef2: "US-West", numberRef1: 81, numberRef2: 5, dateRef1: "2022-11-18" }) },
];

export const seedInvoices: Invoice[] = [
  { invoiceNumber: "INV-10031", customerNumber: "CUST-001", customerName: "Costco Wholesale", documentType: "RV", openAmount: 142000, invoiceAmount: 142000, dueDate: "2026-07-05", invoiceDate: "2026-06-05", status: "Open", collector: "Nia Sharma", references: refs({ textRef1: "Warehouse 14", numberRef1: 12, dateRef1: "2026-06-06" }) },
  { invoiceNumber: "INV-10032", customerNumber: "CUST-001", customerName: "Costco Wholesale", documentType: "DZ", openAmount: 61000, invoiceAmount: 61000, dueDate: "2026-07-12", invoiceDate: "2026-06-12", status: "Open", collector: "Nia Sharma", references: refs({ textRef1: "Warehouse 07", numberRef1: 7, dateRef1: "2026-06-13" }) },
  { invoiceNumber: "INV-10033", customerNumber: "CUST-001", customerName: "Costco Wholesale", documentType: "AB", openAmount: 38000, invoiceAmount: 72000, dueDate: "2026-06-22", invoiceDate: "2026-05-23", status: "Disputed", collector: "Nia Sharma", references: refs({ textRef1: "Warehouse 22", numberRef1: 24, dateRef1: "2026-05-24" }) },
  { invoiceNumber: "INV-10041", customerNumber: "CUST-002", customerName: "Northern Foods", documentType: "RV", openAmount: 52000, invoiceAmount: 52000, dueDate: "2026-07-30", invoiceDate: "2026-06-30", status: "Promise", collector: "Aarav Mehta", references: refs({ textRef1: "PO-8812", numberRef1: 2, dateRef1: "2026-07-01" }) },
  { invoiceNumber: "INV-10042", customerNumber: "CUST-002", customerName: "Northern Foods", documentType: "DA", openAmount: 118000, invoiceAmount: 118000, dueDate: "2026-06-18", invoiceDate: "2026-05-19", status: "Open", collector: "Aarav Mehta", references: refs({ textRef1: "PO-9031", numberRef1: 32, dateRef1: "2026-05-20" }) },
  { invoiceNumber: "INV-10051", customerNumber: "CUST-003", customerName: "Blue Harbor Supply", documentType: "RV", openAmount: 91000, invoiceAmount: 91000, dueDate: "2026-05-28", invoiceDate: "2026-04-28", status: "Open", collector: "Mira Patel", references: refs({ textRef1: "Port East", numberRef1: 53, dateRef1: "2026-04-29" }) },
  { invoiceNumber: "INV-10052", customerNumber: "CUST-003", customerName: "Blue Harbor Supply", documentType: "AB", openAmount: 43500, invoiceAmount: 43500, dueDate: "2026-06-09", invoiceDate: "2026-05-10", status: "Disputed", collector: "Mira Patel", references: refs({ textRef1: "Port North", numberRef1: 41, dateRef1: "2026-05-11" }) },
  { invoiceNumber: "INV-10061", customerNumber: "CUST-004", customerName: "MetroCare Clinics", documentType: "DZ", openAmount: 78000, invoiceAmount: 78000, dueDate: "2026-07-02", invoiceDate: "2026-06-02", status: "Open", collector: "Nia Sharma", references: refs({ textRef1: "Clinic 18", numberRef1: 17, dateRef1: "2026-06-03" }) },
  { invoiceNumber: "INV-10062", customerNumber: "CUST-004", customerName: "MetroCare Clinics", documentType: "RV", openAmount: 22400, invoiceAmount: 22400, dueDate: "2026-08-04", invoiceDate: "2026-07-05", status: "Open", collector: "Nia Sharma", references: refs({ textRef1: "Clinic 03", numberRef1: 0, dateRef1: "2026-07-06" }) },
  { invoiceNumber: "INV-10071", customerNumber: "CUST-005", customerName: "Apex Home Markets", documentType: "RV", openAmount: 86400, invoiceAmount: 86400, dueDate: "2026-07-16", invoiceDate: "2026-06-16", status: "Open", collector: "Aarav Mehta", references: refs({ textRef1: "Store 48", numberRef1: 4, dateRef1: "2026-06-17" }) },
];

export const initialExpression: Expression = {
  id: "expr-costco-doc-type-sum",
  name: "Selected document type open amount",
  description: "Open amount for active invoices with selected document types.",
  level: "customer",
  resultType: "amount",
  functionKey: "SUMIFS",
  sourceField: "invoice.openAmount",
  conditions: [
    { id: "condition-1", field: "invoice.documentType", operator: "in", value: "RV, DZ" },
    { id: "condition-2", field: "invoice.status", operator: "equals", value: "Open" },
  ],
};

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function getFieldValue(field: string, customer: Customer, invoice?: Invoice) {
  const [entity, key] = field.split(".");
  const record = entity === "invoice" ? invoice : customer;
  if (!record) return "";
  if (/^(number|text|date)Ref\d+$/.test(key)) return record.references[key] ?? "";
  return (record as unknown as Record<string, string | number>)[key] ?? "";
}

export function matchesCondition(condition: Condition, customer: Customer, invoice?: Invoice) {
  const raw = getFieldValue(condition.field, customer, invoice);
  const target = String(raw ?? "").toLowerCase();
  const value = condition.value.toLowerCase();
  if (condition.operator === "equals") return target === value;
  if (condition.operator === "not_equals") return target !== value;
  if (condition.operator === "contains") return target.includes(value);
  if (condition.operator === "is_blank") return target.trim() === "";
  if (condition.operator === "in" || condition.operator === "not_in") {
    const values = value.split(",").map((item) => item.trim()).filter(Boolean);
    const included = values.includes(target);
    return condition.operator === "in" ? included : !included;
  }
  if (condition.operator === "greater_than") return Number(raw) > Number(condition.value);
  if (condition.operator === "less_than") return Number(raw) < Number(condition.value);
  return true;
}

export function evaluateExpression(expression: Expression, customer: Customer, invoices: Invoice[]) {
  const scoped = invoices.filter((invoice) =>
    invoice.customerNumber === customer.customerNumber &&
    expression.conditions.every((condition) => matchesCondition(condition, customer, invoice)),
  );
  const values = scoped.map((invoice) => Number(getFieldValue(expression.sourceField, customer, invoice) || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  switch (expression.functionKey) {
    case "COUNTIFS": return scoped.length;
    case "AVERAGEIFS": return values.length ? total / values.length : 0;
    case "MIN": return values.length ? Math.min(...values) : 0;
    case "MAX": return values.length ? Math.max(...values) : 0;
    case "ROUND": return Math.round(total);
    case "ABS": return Math.abs(total);
    case "PERCENT": return customer.creditLimit ? (total / customer.creditLimit) * 100 : 0;
    case "DAYS": {
      const oldest = scoped.map((invoice) => Math.max(0, Math.round((new Date("2026-07-20").getTime() - new Date(invoice.dueDate).getTime()) / 86400000)));
      return oldest.length ? Math.max(...oldest) : 0;
    }
    case "IF": return total > customer.creditLimit * 0.2 ? "Priority" : "Standard";
    case "CONCAT": return `${customer.customerName} - ${customer.region}`;
    case "UPPER": return customer.customerName.toUpperCase();
    case "LOWER": return customer.customerName.toLowerCase();
    case "TRIM": return customer.customerName.trim();
    case "COALESCE": return customer.collector || "Unassigned";
    case "EOMONTH": return "2026-07-31";
    default: return total;
  }
}

export function formatResult(value: string | number, resultType: ResultType) {
  if (resultType === "amount") return money.format(Number(value || 0));
  if (resultType === "number") return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return String(value);
}

function excelValue(condition: Condition) {
  if (condition.operator === "in") {
    return `{${condition.value.split(",").map((item) => `"${item.trim()}"`).join(",")}}`;
  }
  return `"${condition.value}"`;
}

export function toExcelFormula(expression: Expression) {
  const source = fieldCatalog.find((field) => field.key === expression.sourceField)?.label ?? expression.sourceField;
  const criteria = expression.conditions.flatMap((condition) => {
    const label = fieldCatalog.find((field) => field.key === condition.field)?.label ?? condition.field;
    return [label, excelValue(condition)];
  });
  if (expression.functionKey === "COUNTIFS") return `=COUNTIFS(${criteria.join(", ")})`;
  if (expression.functionKey === "AVERAGEIFS") return `=AVERAGEIFS(${source}, ${criteria.join(", ")})`;
  if (expression.functionKey === "IF") return `=IF(${source}>20%*Credit limit, "Priority", "Standard")`;
  if (expression.functionKey === "DAYS") return "=MAX(DAYS(TODAY(), Due date))";
  if (["CONCAT", "UPPER", "LOWER", "TRIM"].includes(expression.functionKey)) return `=${expression.functionKey}(${source})`;
  if (expression.functionKey === "PERCENT") return `=SUMIFS(${source}, ${criteria.join(", ")}) / Credit limit * 100`;
  if (["MIN", "MAX", "ROUND", "ABS", "EOMONTH", "COALESCE"].includes(expression.functionKey)) return `=${expression.functionKey}(${source})`;
  return `=SUMIFS(${source}, ${criteria.join(", ")})`;
}

function conditionSql(condition: Condition, parameterIndex: number) {
  const field = fieldCatalog.find((item) => item.key === condition.field)?.sql ?? condition.field;
  const param = `:p${parameterIndex}`;
  if (condition.operator === "in" || condition.operator === "not_in") return `${field} ${condition.operator === "not_in" ? "NOT " : ""}IN (${param})`;
  if (condition.operator === "contains") return `${field} ILIKE ${param}`;
  if (condition.operator === "greater_than") return `${field} > ${param}`;
  if (condition.operator === "less_than") return `${field} < ${param}`;
  if (condition.operator === "not_equals") return `${field} <> ${param}`;
  if (condition.operator === "is_blank") return `NULLIF(TRIM(${field}), '') IS NULL`;
  return `${field} = ${param}`;
}

export function toSql(expression: Expression) {
  const source = fieldCatalog.find((field) => field.key === expression.sourceField)?.sql ?? "i.open_amount";
  const where = expression.conditions.map((condition, index) => conditionSql(condition, index + 1)).join("\n    AND ") || "1 = 1";
  let calculation = `SUM(${source}) FILTER (WHERE ${where})`;
  if (expression.functionKey === "COUNTIFS") calculation = `COUNT(*) FILTER (WHERE ${where})`;
  if (expression.functionKey === "AVERAGEIFS") calculation = `AVG(${source}) FILTER (WHERE ${where})`;
  if (expression.functionKey === "MIN") calculation = `MIN(${source}) FILTER (WHERE ${where})`;
  if (expression.functionKey === "MAX") calculation = `MAX(${source}) FILTER (WHERE ${where})`;
  if (expression.functionKey === "PERCENT") calculation = `ROUND((SUM(${source}) FILTER (WHERE ${where}) / NULLIF(c.credit_limit, 0)) * 100, 2)`;
  if (expression.functionKey === "DAYS") calculation = "MAX(DATE_PART('day', CURRENT_DATE - i.due_date))";
  if (expression.functionKey === "IF") calculation = `CASE WHEN SUM(${source}) FILTER (WHERE ${where}) > c.credit_limit * 0.20 THEN 'Priority' ELSE 'Standard' END`;
  if (expression.functionKey === "ROUND") calculation = `ROUND(SUM(${source}) FILTER (WHERE ${where}), 0)`;
  if (expression.functionKey === "ABS") calculation = `ABS(SUM(${source}) FILTER (WHERE ${where}))`;
  if (expression.functionKey === "CONCAT") calculation = "CONCAT(c.customer_name, ' - ', c.region)";
  if (expression.functionKey === "UPPER") calculation = "UPPER(c.customer_name)";
  if (expression.functionKey === "LOWER") calculation = "LOWER(c.customer_name)";
  if (expression.functionKey === "TRIM") calculation = "TRIM(c.customer_name)";
  if (expression.functionKey === "COALESCE") calculation = "COALESCE(c.collector, 'Unassigned')";
  if (expression.functionKey === "EOMONTH") calculation = "(DATE_TRUNC('month', i.due_date) + INTERVAL '1 month - 1 day')::date";

  const alias = expression.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `SELECT\n  c.customer_number,\n  c.customer_name,\n  ${calculation} AS ${alias}\nFROM customer c\nLEFT JOIN invoice i\n  ON i.customer_number = c.customer_number\nGROUP BY\n  c.customer_number, c.customer_name, c.credit_limit;`;
}

export function sqlParameters(expression: Expression) {
  return expression.conditions
    .map((condition, index) => ({ condition, name: `p${index + 1}` }))
    .filter(({ condition }) => condition.operator !== "is_blank")
    .map(({ condition, name }) => ({ name, value: condition.value }));
}
