import { z } from "zod";

export const REPORT_SECTIONS = [
  ["executive_summary", "Executive Summary"],
  ["deviation_description", "Deviation Description"],
  ["chronology", "Event Chronology"],
  ["specifications", "Applicable Specifications and Observed Results"],
  ["containment", "Immediate Containment Measures"],
  ["methodology", "Investigation Methodology"],
  ["evidence_reviewed", "Evidence Reviewed"],
  ["potential_root_causes", "Potential Root Causes"],
  ["root_cause_rationale", "Root-Cause Rationale and Supporting Evidence"],
  ["alternative_hypotheses", "Alternative Hypotheses and Unresolved Questions"],
  ["impact_assessment", "Product-Quality and Impact Assessment"],
  ["risk_assessment", "Risk Assessment"],
  ["corrective_actions", "Corrective Actions"],
  ["preventive_actions", "Preventive Actions"],
  ["capa_ownership", "CAPA Ownership and Proposed Due Dates"],
  ["effectiveness_plan", "Effectiveness-Verification Plan"],
  ["conclusion", "Conclusion"],
  ["references", "Supporting Evidence and References"],
] as const;

export const reportContentSchema = z.object({
  sections: z
    .array(z.object({ key: z.string(), title: z.string(), body: z.string() }))
    .min(1),
});
export type ReportContent = z.infer<typeof reportContentSchema>;

export const TEMPLATE_VERSION = "inv-report-v1";
export const REQUIRED_FIELDS = ["chronology", "evidence", "findings", "hypotheses"] as const;
