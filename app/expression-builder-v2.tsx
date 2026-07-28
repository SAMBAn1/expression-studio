"use client";

import {
  ArrowLeft,
  ArrowRight,
  Asterisk,
  BarChart3,
  Braces,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Columns3,
  Database,
  FileSpreadsheet,
  Filter,
  FlaskConical,
  FunctionSquare,
  Info,
  ListFilter,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  type Condition,
  type ConditionGroup,
  type Customer,
  type Expression,
  type FunctionKey,
  type Invoice,
  type Level,
  type Operator,
  evaluateExpression,
  fieldCatalog,
  formatResult,
  functionCatalog,
  getConditionGroups,
  getExpressionSourceFields,
  inferResultType,
  isConditionalFunction,
  isSameLevelMathFunction,
  matchesExpressionConditions,
  sourceFieldsForFunction,
  sqlParameters,
  toExcelFormula,
  toSql,
} from "./expression-data";

type BuilderProps = {
  expression: Expression;
  setExpression: (updater: (current: Expression) => Expression) => void;
  customers: Customer[];
  invoices: Invoice[];
  onShowGuide: () => void;
  onShowFunctions: () => void;
  onOpenSimulation: () => void;
  onBackToLibrary: () => void;
  onSaveDraft: () => void;
  onToast: (message: string) => void;
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

const conditionFields = fieldCatalog.filter((field) => field.entity === "Invoice");
const resultTypeLabels = { amount: "Amount", number: "Number", text: "Text", date: "Date" } as const;

function operatorLabel(fieldKey: string, operator: Operator) {
  const kind = fieldCatalog.find((field) => field.key === fieldKey)?.kind;
  if (kind === "date" && operator === "equals") return "is on";
  if (kind === "date" && operator === "not_equals") return "is not on";
  return operatorLabels[operator];
}

function sourceSelection(functionKey: FunctionKey, level: Level, current: string[] = []) {
  const candidates = sourceFieldsForFunction(functionKey, level);
  const compatible = current.filter((key) => candidates.some((field) => field.key === key));
  if (!isSameLevelMathFunction(functionKey)) {
    return compatible.length ? compatible.slice(0, 1) : candidates.slice(0, 1).map((field) => field.key);
  }
  const minimum = ["ROUND", "ABS"].includes(functionKey) ? 1 : 2;
  const selected = [...compatible];
  for (const candidate of candidates) {
    if (selected.length >= minimum) break;
    if (!selected.includes(candidate.key)) selected.push(candidate.key);
  }
  return selected.slice(0, 5);
}

function IconButton({
  label,
  children,
  disabled,
  onClick,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className="icon-button" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function suggestedName(functionKey: FunctionKey, level: Level) {
  const names: Partial<Record<FunctionKey, string>> = {
    SUMIFS: "Total matching invoice amount",
    COUNTIFS: "Matching invoice count",
    AVERAGEIFS: "Average matching invoice amount",
    SUM: `Combined ${level} value`,
    AVERAGE: `Average ${level} value`,
    DIFFERENCE: level === "invoice" ? "Applied invoice amount" : "Customer value difference",
    PRODUCT: `Calculated ${level} product`,
    PERCENT: `${level === "customer" ? "Customer" : "Invoice"} percentage`,
  };
  return names[functionKey] ?? `${functionCatalog.find((item) => item.key === functionKey)?.label ?? "Calculated"} field`;
}

function isSuggestedName(name: string) {
  return name === "Untitled calculated field"
    || ["Open invoice amount", "Open invoice count", "Average open invoice amount"].includes(name)
    || functionCatalog.some((item) => suggestedName(item.key, "customer") === name || suggestedName(item.key, "invoice") === name);
}

export default function ExpressionBuilderV2({
  expression,
  setExpression,
  customers,
  invoices,
  onShowGuide,
  onShowFunctions,
  onOpenSimulation,
  onBackToLibrary,
  onSaveDraft,
  onToast,
}: BuilderProps) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(Boolean(expression.description));
  const conditionGroups = getConditionGroups(expression);
  const selectedFunction = functionCatalog.find((item) => item.key === expression.functionKey)!;
  const availableSourceFields = sourceFieldsForFunction(expression.functionKey, expression.level);
  const sourceFieldKeys = getExpressionSourceFields(expression);
  const resultType = inferResultType(expression);
  const conditionalFunction = isConditionalFunction(expression.functionKey);
  const sameLevelMath = isSameLevelMathFunction(expression.functionKey);
  const incompatible = conditionalFunction && expression.level === "invoice";
  const addableMath = ["SUM", "AVERAGE", "PRODUCT", "MIN", "MAX"].includes(expression.functionKey);
  const minimumOperands = ["ROUND", "ABS"].includes(expression.functionKey) ? 1 : 2;
  const hasFilters = conditionGroups.some((group) => group.conditions.length > 0);
  const hasIncompleteRules = conditionalFunction && hasFilters && conditionGroups.some((group) =>
    group.conditions.some((condition) =>
      condition.operator !== "is_blank" && (!condition.value.trim() || (condition.operator === "between" && !condition.secondValue?.trim())),
    ),
  );
  const ready = !incompatible && !hasIncompleteRules && Boolean(expression.name.trim());

  const customerSimulation = customers.slice(0, 4).map((customer) => ({
    customer,
    matched: invoices.filter((invoice) =>
      invoice.customerNumber === customer.customerNumber && matchesExpressionConditions(expression, customer, invoice),
    ).length,
    result: evaluateExpression(expression, customer, invoices),
  }));
  const invoiceSimulation = invoices.slice(0, 4).map((invoice) => {
    const customer = customers.find((item) => item.customerNumber === invoice.customerNumber) ?? customers[0];
    return customer ? { invoice, customer, result: evaluateExpression(expression, customer, invoices, invoice) } : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const matchingInvoiceCount = invoices.filter((invoice) => {
    const customer = customers.find((item) => item.customerNumber === invoice.customerNumber);
    return customer ? matchesExpressionConditions(expression, customer, invoice) : false;
  }).length;

  const outcomeOptions: Array<{
    key: FunctionKey;
    title: string;
    description: string;
    icon: ReactNode;
    tone: "blue" | "green" | "coral" | "amber";
    recommended?: boolean;
  }> = expression.level === "customer"
    ? [
        { key: "SUMIFS", title: "Total invoice value", description: "Add one value across matching invoices", icon: <Calculator size={17} />, tone: "green", recommended: true },
        { key: "COUNTIFS", title: "Number of invoices", description: "Count the invoices that match your rules", icon: <ListFilter size={17} />, tone: "blue" },
        { key: "AVERAGEIFS", title: "Average invoice value", description: "Average one value across matching invoices", icon: <BarChart3 size={17} />, tone: "coral" },
        { key: "SUM", title: "Combine customer values", description: "Add fields already stored on each customer", icon: <Columns3 size={17} />, tone: "amber" },
      ]
    : [
        { key: "DIFFERENCE", title: "Difference between fields", description: "Subtract one invoice value from another", icon: <Calculator size={17} />, tone: "green", recommended: true },
        { key: "SUM", title: "Add invoice fields", description: "Combine two or more values on each invoice", icon: <Plus size={17} />, tone: "blue" },
        { key: "PRODUCT", title: "Multiply invoice fields", description: "Multiply values stored on the same invoice", icon: <Asterisk size={17} />, tone: "coral" },
        { key: "PERCENT", title: "Percentage of a value", description: "Compare one invoice value with another", icon: <BarChart3 size={17} />, tone: "amber" },
      ];
  const commonOutcomeSelected = outcomeOptions.some((outcome) => outcome.key === expression.functionKey);
  const calculationVerb: Partial<Record<FunctionKey, string>> = {
    SUMIFS: "Total",
    AVERAGEIFS: "Average",
    COUNTIFS: "Count",
  };

  function setConditionGroups(groups: ConditionGroup[]) {
    setExpression((current) => ({
      ...current,
      conditionGroups: groups,
      conditions: groups.flatMap((group) => group.conditions),
    }));
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

  function selectOutcome(functionKey: FunctionKey) {
    setExpression((current) => {
      const currentSources = getExpressionSourceFields(current);
      const sources = functionKey === "DIFFERENCE" && current.level === "invoice"
        ? ["invoice.invoiceAmount", "invoice.openAmount"]
        : functionKey === "PERCENT" && current.level === "invoice"
          ? ["invoice.openAmount", "invoice.invoiceAmount"]
          : sourceSelection(functionKey, current.level, currentSources);
      return {
        ...current,
        name: isSuggestedName(current.name) ? suggestedName(functionKey, current.level) : current.name,
        description: isSuggestedName(current.name) ? "" : current.description,
        functionKey,
        sourceField: sources[0] ?? "",
        sourceFields: sources,
      };
    });
  }

  function changeLevel(level: Level) {
    if (level === expression.level) return;
    const switchesFromAggregate = level === "invoice" && conditionalFunction;
    setExpression((current) => {
      const functionKey = switchesFromAggregate ? "DIFFERENCE" : current.functionKey;
      const sources = functionKey === "DIFFERENCE" && level === "invoice"
        ? ["invoice.invoiceAmount", "invoice.openAmount"]
        : sourceSelection(functionKey, level, getExpressionSourceFields(current));
      return {
        ...current,
        level,
        functionKey,
        sourceField: sources[0] ?? "",
        sourceFields: sources,
        name: isSuggestedName(current.name) ? suggestedName(functionKey, level) : current.name,
      };
    });
    if (switchesFromAggregate) onToast("Invoice calculations run once per invoice, so Difference was selected.");
  }

  function setFilterMode(filtered: boolean) {
    if (!filtered) {
      setConditionGroups([{ id: `group-${Date.now()}`, conditions: [] }]);
      return;
    }
    if (hasFilters) return;
    const condition: Condition = {
      id: `condition-${Date.now()}`,
      field: "invoice.status",
      operator: "equals",
      value: "Open",
    };
    setConditionGroups([{ id: `group-${Date.now()}`, conditions: [condition] }]);
  }

  function applyRecipe(recipe: "sum" | "count" | "average" | "difference") {
    const condition: Condition = {
      id: `condition-${Date.now()}`,
      field: "invoice.status",
      operator: "equals",
      value: "Open",
    };
    const group = { id: `group-${Date.now()}`, conditions: [condition] };
    const patches: Record<typeof recipe, Partial<Expression>> = {
      sum: {
        name: "Open invoice amount",
        description: "Total open amount across open invoices.",
        level: "customer",
        functionKey: "SUMIFS",
        sourceField: "invoice.openAmount",
        sourceFields: ["invoice.openAmount"],
        conditions: [condition],
        conditionGroups: [group],
      },
      count: {
        name: "Open invoice count",
        description: "Number of open invoices for each customer.",
        level: "customer",
        functionKey: "COUNTIFS",
        sourceField: "",
        sourceFields: [],
        conditions: [condition],
        conditionGroups: [group],
      },
      average: {
        name: "Average open invoice amount",
        description: "Average open amount across open invoices.",
        level: "customer",
        functionKey: "AVERAGEIFS",
        sourceField: "invoice.openAmount",
        sourceFields: ["invoice.openAmount"],
        conditions: [condition],
        conditionGroups: [group],
      },
      difference: {
        name: "Applied invoice amount",
        description: "Invoice amount minus the current open amount.",
        level: "invoice",
        functionKey: "DIFFERENCE",
        sourceField: "invoice.invoiceAmount",
        sourceFields: ["invoice.invoiceAmount", "invoice.openAmount"],
        conditions: [],
        conditionGroups: [],
      },
    };
    setExpression((current) => ({ ...current, ...patches[recipe] }));
    setDescriptionOpen(true);
    onToast("Starting point loaded. The live sample has been recalculated.");
  }

  return (
    <section className="builder-page page-enter">
      <button className="back-link" onClick={onBackToLibrary}><ArrowLeft size={16} /> All calculated fields</button>
      <header className="page-title-row">
        <div>
          <div className="title-kicker"><span className="live-dot" /> Draft calculation</div>
          <h1>{expression.name === "Untitled calculated field" ? "Create a calculated field" : expression.name}</h1>
          <p>Turn customer and invoice data into a reusable value for your collections team.</p>
        </div>
        <div className="page-actions">
          <button className="text-button" onClick={onShowGuide}><CircleHelp size={17} /> How to</button>
          <button className="secondary-button" onClick={onSaveDraft}><Save size={16} /> Save draft</button>
          <button className="primary-button" onClick={onOpenSimulation} disabled={!ready}><FlaskConical size={16} /> Test with {expression.level === "customer" ? "customers" : "invoices"}</button>
        </div>
      </header>

      <div className="builder-layout simplified-layout">
        <div className="builder-main">
          <section className="builder-surface guided-builder">
            <div className="journey-progress" aria-label="Calculated field setup">
              <span className="complete"><Check size={13} /> Outcome</span>
              <i />
              <span className={!incompatible && !hasIncompleteRules ? "complete" : ""}><Check size={13} /> Records</span>
              <i />
              <span className={expression.name.trim() ? "complete" : ""}><Check size={13} /> Name & test</span>
              <b className={ready ? "validation-state" : "validation-state needs-attention"}>{ready ? <ShieldCheck size={15} /> : <Info size={15} />} {ready ? "Ready to test" : hasIncompleteRules ? "Complete the rule" : "Needs attention"}</b>
            </div>

            <div className="starter-band">
              <span><Sparkles size={16} /><strong>Common AR starting points</strong></span>
              <div>
                <button onClick={() => applyRecipe("sum")}>Open amount</button>
                <button onClick={() => applyRecipe("count")}>Open invoice count</button>
                <button onClick={() => applyRecipe("average")}>Average invoice</button>
                <button onClick={() => applyRecipe("difference")}>Applied amount</button>
              </div>
            </div>

            <div className="guided-content">
              <section className="journey-section">
                <div className="journey-index">1</div>
                <div className="journey-body">
                  <header className="journey-heading">
                    <div><span>Outcome</span><h2>Where should the value appear?</h2></div>
                    <small>One calculated value per record</small>
                  </header>
                  <div className="scope-choice" role="radiogroup" aria-label="Calculated field level">
                    <button className={expression.level === "customer" ? "selected" : ""} onClick={() => changeLevel("customer")} role="radio" aria-checked={expression.level === "customer"}>
                      <span className="scope-icon"><Users size={18} /></span>
                      <span><strong>On each customer</strong><small>Use customer fields and the invoices beneath them</small></span>
                      {expression.level === "customer" && <CircleCheck size={18} />}
                    </button>
                    <button className={expression.level === "invoice" ? "selected" : ""} onClick={() => changeLevel("invoice")} role="radio" aria-checked={expression.level === "invoice"}>
                      <span className="scope-icon invoice"><FileSpreadsheet size={18} /></span>
                      <span><strong>On each invoice</strong><small>Calculate from fields on that invoice row</small></span>
                      {expression.level === "invoice" && <CircleCheck size={18} />}
                    </button>
                  </div>

                  <div className="outcome-heading"><strong>What should it calculate?</strong><small>Choose the closest business outcome.</small></div>
                  <div className="outcome-grid">
                    {outcomeOptions.map((outcome) => (
                      <button key={outcome.key} className={expression.functionKey === outcome.key ? "outcome-option selected" : "outcome-option"} onClick={() => selectOutcome(outcome.key)}>
                        <span className={`outcome-icon ${outcome.tone}`}>{outcome.icon}</span>
                        <span><strong>{outcome.title}</strong><small>{outcome.description}</small></span>
                        {outcome.recommended && <em>Common</em>}
                        {expression.functionKey === outcome.key && <CircleCheck className="outcome-check" size={18} />}
                      </button>
                    ))}
                    <button className={!commonOutcomeSelected ? "outcome-option selected more-outcomes" : "outcome-option more-outcomes"} onClick={onShowFunctions}>
                      <span className="outcome-icon neutral"><FunctionSquare size={17} /></span>
                      <span><strong>{!commonOutcomeSelected ? selectedFunction.label : "More calculations"}</strong><small>{!commonOutcomeSelected ? "Selected from the full catalog" : "Dates, text, logic, and more"}</small></span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="journey-section">
                <div className="journey-index">2</div>
                <div className="journey-body">
                  <header className="journey-heading">
                    <div><span>Calculation</span><h2>Define the value</h2></div>
                    <small>{selectedFunction.label}</small>
                  </header>

                  {incompatible ? (
                    <div className="grain-warning"><Info size={18} /><span><strong>Choose Customer for this outcome</strong>Totals, counts, and averages need the invoice rows beneath a customer.</span></div>
                  ) : conditionalFunction ? (
                    <>
                      <div className="plain-calculation">
                        <span className="calculation-action">{calculationVerb[expression.functionKey]}</span>
                        {expression.functionKey === "COUNTIFS" ? (
                          <span className="calculation-object"><ListFilter size={16} /> Invoice records</span>
                        ) : (
                          <label className="calculation-field">
                            <Database size={16} />
                            <select aria-label="Invoice value to calculate" value={expression.sourceField} onChange={(event) => setExpression((current) => ({ ...current, sourceField: event.target.value, sourceFields: [event.target.value] }))}>
                              {availableSourceFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                            </select>
                            <ChevronDown size={15} />
                          </label>
                        )}
                        <span className="calculation-tail">across invoices for each customer</span>
                      </div>

                      <div className="filter-mode-row">
                        <div><strong>Invoices to include</strong><small>Use every invoice, or narrow the result with business rules.</small></div>
                        <div className="segmented-control" aria-label="Invoice filter mode">
                          <button className={!hasFilters ? "active" : ""} onClick={() => setFilterMode(false)}>All invoices</button>
                          <button className={hasFilters ? "active" : ""} onClick={() => setFilterMode(true)}><Filter size={14} /> Matching invoices</button>
                        </div>
                      </div>

                      {hasFilters && (
                        <div className="simple-condition-groups">
                          {conditionGroups.map((group, groupIndex) => (
                            <div key={group.id}>
                              {groupIndex > 0 && <div className="or-divider"><span>OR</span></div>}
                              <section className="simple-condition-group">
                                <header>
                                  <span><strong>{groupIndex === 0 ? "Match all of these rules" : "Or match all of these rules"}</strong><small>Every rule in this set must be true.</small></span>
                                  {conditionGroups.length > 1 && <IconButton label={`Remove rule set ${groupIndex + 1}`} onClick={() => setConditionGroups(conditionGroups.filter((item) => item.id !== group.id))}><X size={15} /></IconButton>}
                                </header>
                                <div className="simple-condition-list">
                                  {group.conditions.map((condition) => {
                                    const field = fieldCatalog.find((item) => item.key === condition.field) ?? conditionFields[0];
                                    const operators = operatorsByKind[field.kind];
                                    const inputType = field.kind === "date" ? "date" : field.kind === "amount" || field.kind === "number" ? "number" : "text";
                                    return (
                                      <div className={`simple-condition-row ${condition.operator === "between" ? "has-range" : ""}`} key={condition.id}>
                                        <label className="simple-select"><span>Invoice field</span><select value={condition.field} onChange={(event) => {
                                          const nextField = fieldCatalog.find((item) => item.key === event.target.value) ?? conditionFields[0];
                                          updateCondition(group.id, condition.id, { field: event.target.value, operator: operatorsByKind[nextField.kind][0], value: "", secondValue: "" });
                                        }}>{conditionFields.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><ChevronDown size={14} /></label>
                                        <label className="simple-select"><span>Rule</span><select value={condition.operator} onChange={(event) => updateCondition(group.id, condition.id, { operator: event.target.value as Operator, secondValue: "" })}>{operators.map((operator) => <option key={operator} value={operator}>{operatorLabel(condition.field, operator)}</option>)}</select><ChevronDown size={14} /></label>
                                        {condition.operator !== "is_blank" && (
                                          <div className="simple-condition-values">
                                            <label><span>Value</span><input type={inputType} value={condition.value} placeholder={condition.operator === "in" || condition.operator === "not_in" ? "RV, DZ" : "Enter value"} onChange={(event) => updateCondition(group.id, condition.id, { value: event.target.value })} /></label>
                                            {condition.operator === "between" && <label><span>End value</span><input type={inputType} value={condition.secondValue ?? ""} onChange={(event) => updateCondition(group.id, condition.id, { secondValue: event.target.value })} /></label>}
                                          </div>
                                        )}
                                        <IconButton label="Remove rule" disabled={group.conditions.length === 1} onClick={() => setConditionGroups(conditionGroups.map((item) => item.id === group.id ? { ...item, conditions: item.conditions.filter((rule) => rule.id !== condition.id) } : item))}><X size={16} /></IconButton>
                                      </div>
                                    );
                                  })}
                                </div>
                                <button className="add-condition" onClick={() => setConditionGroups(conditionGroups.map((item) => item.id === group.id ? { ...item, conditions: [...item.conditions, { id: `condition-${Date.now()}`, field: "invoice.documentType", operator: "equals", value: "" }] } : item))}><Plus size={14} /> Add another rule</button>
                              </section>
                            </div>
                          ))}
                          <button className="add-alternative" onClick={() => setConditionGroups([...conditionGroups, { id: `group-${Date.now()}`, conditions: [{ id: `condition-${Date.now()}`, field: "invoice.documentType", operator: "equals", value: "" }] }])}><Plus size={15} /> Add an alternative rule set <span>OR</span></button>
                        </div>
                      )}
                    </>
                  ) : sameLevelMath ? (
                    <div className="operand-editor simplified-operands">
                      <header>
                        <span><strong>{selectedFunction.label} on each {expression.level}</strong><small>Only fields from the same {expression.level} record are shown.</small></span>
                        {addableMath && sourceFieldKeys.length < 5 && <button className="add-condition" onClick={() => {
                          const next = availableSourceFields.find((field) => !sourceFieldKeys.includes(field.key));
                          if (next) setExpression((current) => ({ ...current, sourceFields: [...sourceFieldKeys, next.key] }));
                        }}><Plus size={14} /> Add field</button>}
                      </header>
                      <div className="operand-list">
                        {sourceFieldKeys.map((key, index) => (
                          <div className="operand-row" key={`${key}-${index}`}>
                            <span>{expression.functionKey === "DIFFERENCE" ? (index === 0 ? "Start with" : "Subtract") : expression.functionKey === "PERCENT" ? (index === 0 ? "Part" : "Total") : `Value ${index + 1}`}</span>
                            <label className="inline-select field-token"><Database size={15} /><select aria-label={`Value ${index + 1}`} value={key} onChange={(event) => setOperand(index, event.target.value)}>{availableSourceFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label>
                            {sourceFieldKeys.length > minimumOperands && <IconButton label={`Remove value ${index + 1}`} onClick={() => {
                              const next = sourceFieldKeys.filter((_, sourceIndex) => sourceIndex !== index);
                              setExpression((current) => ({ ...current, sourceField: next[0], sourceFields: next }));
                            }}><X size={15} /></IconButton>}
                          </div>
                        ))}
                      </div>
                      <div className="grain-note"><CircleCheck size={15} /><span>One result will be calculated independently on every {expression.level}.</span></div>
                    </div>
                  ) : (
                    <div className="advanced-calculation">
                      <span className="outcome-icon neutral"><FunctionSquare size={17} /></span>
                      <span><strong>{selectedFunction.label}</strong><small>{selectedFunction.description}</small></span>
                      {availableSourceFields.length > 0 && (
                        <label className="calculation-field">
                          <Database size={16} />
                          <select aria-label="Source field" value={expression.sourceField} onChange={(event) => setExpression((current) => ({ ...current, sourceField: event.target.value, sourceFields: [event.target.value] }))}>
                            {availableSourceFields.map((field) => <option key={field.key} value={field.key}>{field.entity} / {field.label}</option>)}
                          </select>
                          <ChevronDown size={15} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section className="journey-section final-journey-section">
                <div className="journey-index">3</div>
                <div className="journey-body">
                  <header className="journey-heading">
                    <div><span>Field</span><h2>Name the result</h2></div>
                    <span className={`output-pill output-${resultType}`}><Sparkles size={12} /> {resultTypeLabels[resultType]} detected</span>
                  </header>
                  <div className="field-finish-row">
                    <label className="field-control grow"><span>Calculated field name</span><input value={expression.name} onChange={(event) => setExpression((current) => ({ ...current, name: event.target.value }))} placeholder="For example, Open invoice amount" /></label>
                    <div className="ready-summary"><CircleCheck size={18} /><span><strong>{ready ? "Ready for a sample run" : "Complete the setup"}</strong><small>{ready ? "Results update instantly on the right." : "Add a name and complete every rule."}</small></span></div>
                  </div>
                  {!descriptionOpen && !expression.description ? (
                    <button className="add-description-button" onClick={() => setDescriptionOpen(true)}><Plus size={14} /> Add an optional description</button>
                  ) : (
                    <label className="field-control description-control"><span>Description (optional)</span><input value={expression.description} onChange={(event) => setExpression((current) => ({ ...current, description: event.target.value }))} placeholder="What business question does this field answer?" /></label>
                  )}
                </div>
              </section>
            </div>
          </section>

          <section className="technical-section">
            <button className="technical-heading" onClick={() => setTechnicalOpen((current) => !current)} aria-expanded={technicalOpen}>
              <span className="technical-icon"><Braces size={17} /></span>
              <span><strong>Technical details</strong><small>{selectedFunction.label} / {resultTypeLabels[resultType]} output / governed SQL</small></span>
              <ChevronDown className={technicalOpen ? "" : "collapsed"} size={18} />
            </button>
            {technicalOpen && (
              <div className="technical-content">
                <section className="technical-formula">
                  <header><span>Spreadsheet equivalent</span><small>Read-only reference</small></header>
                  <div><span className="fx-mark">fx</span><code>{toExcelFormula(expression)}</code></div>
                </section>
                <section className="technical-sql">
                  <header><span><Database size={15} /> Generated SQL</span><small>Parameterized / read-only / PostgreSQL</small></header>
                  <pre>{toSql(expression)}</pre>
                  {sqlParameters(expression).length > 0 && <div className="parameter-strip"><span>Parameters</span>{sqlParameters(expression).map((parameter) => <code key={parameter.name}>:{parameter.name} = {parameter.value || "(blank)"}</code>)}</div>}
                </section>
              </div>
            )}
          </section>
        </div>

        <aside className="live-preview simplified-preview">
          <header><div><span className="eyebrow">Live sample</span><h2>What collectors will see</h2></div><span className="sample-badge"><span className="live-dot" /> Live</span></header>
          <div className="preview-summary">
            <span>One {resultTypeLabels[resultType].toLowerCase()} on every {expression.level}</span>
            <strong>{expression.name || "Untitled calculated field"}</strong>
          </div>

          {expression.level === "customer" && customerSimulation[0] && (
            <div className="preview-spotlight">
              <span className="customer-avatar">{customerSimulation[0].customer.customerName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
              <span><small>{customerSimulation[0].customer.customerName}</small><strong>{formatResult(customerSimulation[0].result, resultType)}</strong><b>{conditionalFunction ? `${customerSimulation[0].matched} matching invoice${customerSimulation[0].matched === 1 ? "" : "s"}` : customerSimulation[0].customer.customerNumber}</b></span>
            </div>
          )}
          {expression.level === "invoice" && invoiceSimulation[0] && (
            <div className="preview-spotlight">
              <span className="customer-avatar">{invoiceSimulation[0].invoice.documentType}</span>
              <span><small>{invoiceSimulation[0].invoice.invoiceNumber}</small><strong>{formatResult(invoiceSimulation[0].result, resultType)}</strong><b>{invoiceSimulation[0].invoice.customerName}</b></span>
            </div>
          )}

          <div className="preview-results compact-results">
            {expression.level === "customer" ? customerSimulation.slice(1).map(({ customer, matched, result }, index) => (
              <div className="preview-result" key={customer.customerNumber} style={{ animationDelay: `${index * 45}ms` }}><span className="tiny-avatar">{customer.customerName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{customer.customerName}</strong><small>{conditionalFunction ? `${matched} matching invoice${matched === 1 ? "" : "s"}` : customer.customerNumber}</small></span><b>{formatResult(result, resultType)}</b></div>
            )) : invoiceSimulation.slice(1).map(({ invoice, result }, index) => (
              <div className="preview-result" key={invoice.invoiceNumber} style={{ animationDelay: `${index * 45}ms` }}><span className="tiny-avatar">{invoice.documentType}</span><span><strong>{invoice.invoiceNumber}</strong><small>{invoice.customerName}</small></span><b>{formatResult(result, resultType)}</b></div>
            ))}
          </div>

          {conditionalFunction && !incompatible && (
            <div className="match-insight"><Filter size={17} /><span><strong>{hasFilters ? `${matchingInvoiceCount} of ${invoices.length}` : `All ${invoices.length}`}</strong> invoices are included in this sample.</span></div>
          )}
          <div className="preview-trust"><ShieldCheck size={16} /><span>Output type and SQL are generated automatically.</span></div>
          <button className="full-width-button preview-test-button" onClick={onOpenSimulation} disabled={!ready}>Test with selected {expression.level === "customer" ? "customers" : "invoices"} <ArrowRight size={16} /></button>
        </aside>
      </div>
    </section>
  );
}
