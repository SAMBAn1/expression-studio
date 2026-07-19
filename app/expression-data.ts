export type Level = "customer" | "invoice";
export type ResultType = "amount" | "number" | "text" | "date";
export type FunctionKey =
  | "SUMIFS"
  | "COUNTIFS"
  | "AVERAGEIFS"
  | "SUM"
  | "AVERAGE"
  | "DIFFERENCE"
  | "PRODUCT"
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
  | "greater_or_equal"
  | "less_or_equal"
  | "between"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after"
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
  secondValue?: string;
};

export type ConditionGroup = {
  id: string;
  conditions: Condition[];
};

export type Expression = {
  id: string;
  name: string;
  description: string;
  level: Level;
  resultType: ResultType;
  functionKey: FunctionKey;
  sourceField: string;
  sourceFields?: string[];
  conditions: Condition[];
  conditionGroups?: ConditionGroup[];
};

export type SavedExpression = Expression & {
  status: "Draft" | "Published";
  updatedAt: string;
  usedIn: number;
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
  { key: "SUM", label: "Add fields", category: "Math", description: "Add two or more fields from the same data level.", excelExample: "SUM(value_1, value_2)", sqlPattern: "value_1 + value_2" },
  { key: "AVERAGE", label: "Average fields", category: "Math", description: "Average two or more fields from the same data level.", excelExample: "AVERAGE(value_1, value_2)", sqlPattern: "(value_1 + value_2) / 2" },
  { key: "DIFFERENCE", label: "Difference", category: "Math", description: "Subtract one same-level field from another.", excelExample: "value_1 - value_2", sqlPattern: "value_1 - value_2" },
  { key: "PRODUCT", label: "Product", category: "Math", description: "Multiply two or more fields from the same data level.", excelExample: "PRODUCT(value_1, value_2)", sqlPattern: "value_1 * value_2" },
  { key: "MIN", label: "Minimum", category: "Math", description: "Return the smallest of the selected same-level fields.", excelExample: "MIN(value_1, value_2)", sqlPattern: "LEAST(value_1, value_2)" },
  { key: "MAX", label: "Maximum", category: "Math", description: "Return the largest of the selected same-level fields.", excelExample: "MAX(value_1, value_2)", sqlPattern: "GREATEST(value_1, value_2)" },
  { key: "ROUND", label: "Round", category: "Math", description: "Round a same-level field to a fixed number of decimals.", excelExample: "ROUND(number, digits)", sqlPattern: "ROUND(value, digits)" },
  { key: "ABS", label: "Absolute value", category: "Math", description: "Return a same-level number without its sign.", excelExample: "ABS(number)", sqlPattern: "ABS(value)" },
  { key: "PERCENT", label: "Percentage", category: "Math", description: "Calculate one same-level field as a percentage of another.", excelExample: "part / total * 100", sqlPattern: "part / NULLIF(total, 0) * 100" },
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
  return values as ReferenceValues;
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
  conditionGroups: [{
    id: "group-1",
    conditions: [
      { id: "condition-1", field: "invoice.documentType", operator: "in", value: "RV, DZ" },
      { id: "condition-2", field: "invoice.status", operator: "equals", value: "Open" },
    ],
  }],
};

export const seedExpressions: SavedExpression[] = [
  {
    ...initialExpression,
    status: "Published",
    updatedAt: "Today, 9:42 AM",
    usedIn: 3,
  },
  {
    id: "expr-oldest-invoice-age",
    name: "Oldest invoice age",
    description: "Days since the oldest open invoice became due.",
    level: "customer",
    resultType: "number",
    functionKey: "DAYS",
    sourceField: "invoice.dueDate",
    conditions: [{ id: "condition-age", field: "invoice.status", operator: "equals", value: "Open" }],
    status: "Published",
    updatedAt: "Jul 18, 4:15 PM",
    usedIn: 2,
  },
  {
    id: "expr-collection-priority",
    name: "Collection priority",
    description: "Classifies customers using their open exposure.",
    level: "customer",
    resultType: "text",
    functionKey: "IF",
    sourceField: "invoice.openAmount",
    conditions: [{ id: "condition-priority", field: "invoice.status", operator: "equals", value: "Open" }],
    status: "Draft",
    updatedAt: "Jul 17, 11:08 AM",
    usedIn: 0,
  },
  {
    id: "expr-applied-invoice-amount",
    name: "Applied invoice amount",
    description: "Invoice amount minus the remaining open amount.",
    level: "invoice",
    resultType: "amount",
    functionKey: "DIFFERENCE",
    sourceField: "invoice.invoiceAmount",
    sourceFields: ["invoice.invoiceAmount", "invoice.openAmount"],
    conditions: [],
    status: "Published",
    updatedAt: "Jul 15, 2:31 PM",
    usedIn: 4,
  },
];

export const conditionalFunctionKeys: FunctionKey[] = ["SUMIFS", "COUNTIFS", "AVERAGEIFS"];
export const sameLevelMathFunctionKeys: FunctionKey[] = ["SUM", "AVERAGE", "DIFFERENCE", "PRODUCT", "MIN", "MAX", "ROUND", "ABS", "PERCENT"];

export function isConditionalFunction(functionKey: FunctionKey) {
  return conditionalFunctionKeys.includes(functionKey);
}

export function isSameLevelMathFunction(functionKey: FunctionKey) {
  return sameLevelMathFunctionKeys.includes(functionKey);
}

export function getExpressionSourceFields(expression: Expression) {
  return expression.sourceFields?.length
    ? expression.sourceFields
    : [expression.sourceField].filter(Boolean);
}

export function getConditionGroups(expression: Expression): ConditionGroup[] {
  if (expression.conditionGroups?.length) return expression.conditionGroups;
  return [{ id: "group-1", conditions: expression.conditions ?? [] }];
}

export function sourceFieldsForFunction(functionKey: FunctionKey, level: Level = "customer") {
  if (functionKey === "COUNTIFS") return [];
  if (isConditionalFunction(functionKey)) {
    if (level === "invoice") return [];
    return fieldCatalog.filter((field) => field.entity === "Invoice" && (field.kind === "amount" || field.kind === "number"));
  }
  if (isSameLevelMathFunction(functionKey)) {
    const entity = level === "customer" ? "Customer" : "Invoice";
    return fieldCatalog.filter((field) => field.entity === entity && (field.kind === "amount" || field.kind === "number"));
  }
  if (["DAYS", "EOMONTH"].includes(functionKey)) return fieldCatalog.filter((field) => field.kind === "date");
  if (["CONCAT", "UPPER", "LOWER", "TRIM", "COALESCE"].includes(functionKey)) return fieldCatalog.filter((field) => field.kind === "text");
  return fieldCatalog.filter((field) => field.kind === "amount" || field.kind === "number");
}

export function inferResultType(expression: Expression): ResultType {
  if (["IF", "CONCAT", "UPPER", "LOWER", "TRIM", "COALESCE"].includes(expression.functionKey)) return "text";
  if (expression.functionKey === "EOMONTH") return "date";
  if (["COUNTIFS", "DAYS", "PERCENT", "PRODUCT"].includes(expression.functionKey)) return "number";
  const sourceKinds = getExpressionSourceFields(expression)
    .map((key) => fieldCatalog.find((field) => field.key === key)?.kind)
    .filter(Boolean);
  if (isSameLevelMathFunction(expression.functionKey) && sourceKinds.length) {
    return sourceKinds.every((kind) => kind === "amount") ? "amount" : "number";
  }
  const sourceKind = sourceKinds[0];
  return sourceKind === "amount" ? "amount" : sourceKind === "date" ? "date" : sourceKind === "text" ? "text" : "number";
}

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
  const fieldKind = fieldCatalog.find((field) => field.key === condition.field)?.kind;
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
  if (condition.operator === "greater_or_equal") return Number(raw) >= Number(condition.value);
  if (condition.operator === "less_or_equal") return Number(raw) <= Number(condition.value);
  if (condition.operator === "between") {
    if (fieldKind === "date") return target >= value && target <= String(condition.secondValue ?? "").toLowerCase();
    return Number(raw) >= Number(condition.value) && Number(raw) <= Number(condition.secondValue);
  }
  if (condition.operator === "before") return target < value;
  if (condition.operator === "after") return target > value;
  if (condition.operator === "on_or_before") return target <= value;
  if (condition.operator === "on_or_after") return target >= value;
  return true;
}

export function matchesExpressionConditions(expression: Expression, customer: Customer, invoice?: Invoice) {
  return getConditionGroups(expression).some((group) =>
    group.conditions.every((condition) => matchesCondition(condition, customer, invoice)),
  );
}

export function evaluateExpression(expression: Expression, customer: Customer, invoices: Invoice[], currentInvoice?: Invoice) {
  if (isSameLevelMathFunction(expression.functionKey)) {
    const sourceFields = getExpressionSourceFields(expression);
    const rowInvoice = currentInvoice ?? (expression.level === "invoice" ? invoices.find((invoice) => invoice.customerNumber === customer.customerNumber) : undefined);
    const values = sourceFields.map((field) => Number(getFieldValue(field, customer, rowInvoice) || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    switch (expression.functionKey) {
      case "SUM": return total;
      case "AVERAGE": return values.length ? total / values.length : 0;
      case "DIFFERENCE": return values.slice(1).reduce((result, value) => result - value, values[0] ?? 0);
      case "PRODUCT": return values.length ? values.reduce((result, value) => result * value, 1) : 0;
      case "MIN": return values.length ? Math.min(...values) : 0;
      case "MAX": return values.length ? Math.max(...values) : 0;
      case "ROUND": return Math.round(values[0] ?? 0);
      case "ABS": return Math.abs(values[0] ?? 0);
      case "PERCENT": return values[1] ? ((values[0] ?? 0) / values[1]) * 100 : 0;
    }
  }

  const scoped = invoices.filter((invoice) =>
    invoice.customerNumber === customer.customerNumber &&
    matchesExpressionConditions(expression, customer, invoice),
  );
  const values = scoped.map((invoice) => Number(getFieldValue(expression.sourceField, customer, invoice) || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  switch (expression.functionKey) {
    case "COUNTIFS": return scoped.length;
    case "AVERAGEIFS": return values.length ? total / values.length : 0;
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

function excelValue(condition: Condition, value = condition.value) {
  if (condition.operator === "in" || condition.operator === "not_in") {
    return `{${value.split(",").map((item) => `"${item.trim()}"`).join(",")}}`;
  }
  const kind = fieldCatalog.find((field) => field.key === condition.field)?.kind;
  return kind === "number" || kind === "amount" ? value : `"${value}"`;
}

function excelCriteria(condition: Condition) {
  const label = fieldCatalog.find((field) => field.key === condition.field)?.label ?? condition.field;
  const quotedCriterion = (prefix: string, value: string) => `"${prefix}${value}"`;
  if (condition.operator === "between") {
    return [label, quotedCriterion(">=", condition.value), label, quotedCriterion("<=", condition.secondValue ?? "")];
  }
  if (condition.operator === "not_equals") return [label, quotedCriterion("<>", condition.value)];
  if (condition.operator === "greater_than" || condition.operator === "after") return [label, quotedCriterion(">", condition.value)];
  if (condition.operator === "less_than" || condition.operator === "before") return [label, quotedCriterion("<", condition.value)];
  if (condition.operator === "greater_or_equal" || condition.operator === "on_or_after") return [label, quotedCriterion(">=", condition.value)];
  if (condition.operator === "less_or_equal" || condition.operator === "on_or_before") return [label, quotedCriterion("<=", condition.value)];
  if (condition.operator === "contains") return [label, `"*${condition.value}*"`];
  if (condition.operator === "is_blank") return [label, '""'];
  if (condition.operator === "not_in") {
    return condition.value.split(",").flatMap((item) => [label, quotedCriterion("<>", item.trim())]);
  }
  return [label, excelValue(condition)];
}

export function toExcelFormula(expression: Expression) {
  const sourceFields = getExpressionSourceFields(expression);
  const sourceLabels = sourceFields.map((key) => fieldCatalog.find((field) => field.key === key)?.label ?? key);
  const source = sourceLabels[0] ?? expression.sourceField;
  if (isSameLevelMathFunction(expression.functionKey)) {
    if (expression.functionKey === "SUM") return `=SUM(${sourceLabels.join(", ")})`;
    if (expression.functionKey === "AVERAGE") return `=AVERAGE(${sourceLabels.join(", ")})`;
    if (expression.functionKey === "DIFFERENCE") return `=${sourceLabels.join(" - ")}`;
    if (expression.functionKey === "PRODUCT") return `=PRODUCT(${sourceLabels.join(", ")})`;
    if (expression.functionKey === "PERCENT") return `=${sourceLabels[0]} / ${sourceLabels[1]} * 100`;
    return `=${expression.functionKey}(${sourceLabels.join(", ")})`;
  }

  const criteriaForGroup = (group: ConditionGroup) => group.conditions.flatMap(excelCriteria);
  const groups = getConditionGroups(expression);
  const criteria = criteriaForGroup(groups[0]);
  if (isConditionalFunction(expression.functionKey) && groups.length > 1) {
    const formulas = groups.map((group) => {
      const groupCriteria = criteriaForGroup(group).join(", ");
      if (expression.functionKey === "COUNTIFS") return `COUNTIFS(${groupCriteria})`;
      return `${expression.functionKey}(${source}, ${groupCriteria})`;
    });
    return `=SUM(${formulas.join(", ")})`;
  }
  if (expression.functionKey === "COUNTIFS") return `=COUNTIFS(${criteria.join(", ")})`;
  if (expression.functionKey === "AVERAGEIFS") return `=AVERAGEIFS(${source}, ${criteria.join(", ")})`;
  if (expression.functionKey === "IF") return `=IF(${source}>20%*Credit limit, "Priority", "Standard")`;
  if (expression.functionKey === "DAYS") return "=MAX(DAYS(TODAY(), Due date))";
  if (["CONCAT", "UPPER", "LOWER", "TRIM"].includes(expression.functionKey)) return `=${expression.functionKey}(${source})`;
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
  if (condition.operator === "greater_or_equal" || condition.operator === "on_or_after") return `${field} >= ${param}`;
  if (condition.operator === "less_or_equal" || condition.operator === "on_or_before") return `${field} <= ${param}`;
  if (condition.operator === "before") return `${field} < ${param}`;
  if (condition.operator === "after") return `${field} > ${param}`;
  if (condition.operator === "between") return `${field} BETWEEN ${param} AND ${param}_2`;
  if (condition.operator === "not_equals") return `${field} <> ${param}`;
  if (condition.operator === "is_blank") return `NULLIF(TRIM(${field}), '') IS NULL`;
  return `${field} = ${param}`;
}

export function toSql(expression: Expression) {
  const alias = expression.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "calculated_field";
  if (isSameLevelMathFunction(expression.functionKey)) {
    const fields = getExpressionSourceFields(expression).map((key) => fieldCatalog.find((field) => field.key === key)?.sql ?? key);
    const values = fields.map((field) => `COALESCE(${field}, 0)`);
    let calculation = values.join(" + ");
    if (expression.functionKey === "AVERAGE") calculation = `(${values.join(" + ")}) / ${Math.max(values.length, 1)}.0`;
    if (expression.functionKey === "DIFFERENCE") calculation = values.slice(1).reduce((sql, value) => `${sql} - ${value}`, values[0] ?? "0");
    if (expression.functionKey === "PRODUCT") calculation = values.join(" * ");
    if (expression.functionKey === "MIN") calculation = `LEAST(${values.join(", ")})`;
    if (expression.functionKey === "MAX") calculation = `GREATEST(${values.join(", ")})`;
    if (expression.functionKey === "ROUND") calculation = `ROUND(${values[0] ?? "0"}, 0)`;
    if (expression.functionKey === "ABS") calculation = `ABS(${values[0] ?? "0"})`;
    if (expression.functionKey === "PERCENT") calculation = `ROUND((${values[0] ?? "0"} / NULLIF(${values[1] ?? "0"}, 0)) * 100, 2)`;
    if (expression.level === "invoice") {
      return `SELECT\n  i.invoice_number,\n  i.customer_number,\n  ${calculation} AS ${alias}\nFROM invoice i;`;
    }
    return `SELECT\n  c.customer_number,\n  c.customer_name,\n  ${calculation} AS ${alias}\nFROM customer c;`;
  }

  const source = fieldCatalog.find((field) => field.key === expression.sourceField)?.sql ?? "i.open_amount";
  let parameterIndex = 0;
  const where = getConditionGroups(expression).map((group) => {
    const conditions = group.conditions.map((condition) => conditionSql(condition, ++parameterIndex)).join("\n      AND ") || "1 = 1";
    return `(${conditions})`;
  }).join("\n    OR ");
  let calculation = `SUM(${source}) FILTER (WHERE ${where})`;
  if (expression.functionKey === "COUNTIFS") calculation = `COUNT(*) FILTER (WHERE ${where})`;
  if (expression.functionKey === "AVERAGEIFS") calculation = `AVG(${source}) FILTER (WHERE ${where})`;
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

  return `SELECT\n  c.customer_number,\n  c.customer_name,\n  ${calculation} AS ${alias}\nFROM customer c\nLEFT JOIN invoice i\n  ON i.customer_number = c.customer_number\nGROUP BY\n  c.customer_number, c.customer_name, c.credit_limit;`;
}

export function sqlParameters(expression: Expression) {
  if (isSameLevelMathFunction(expression.functionKey)) return [];
  return getConditionGroups(expression)
    .flatMap((group) => group.conditions)
    .flatMap((condition, index) => {
      if (condition.operator === "is_blank") return [];
      const values = [{ name: `p${index + 1}`, value: condition.value }];
      if (condition.operator === "between") values.push({ name: `p${index + 1}_2`, value: condition.secondValue ?? "" });
      return values;
    });
}
