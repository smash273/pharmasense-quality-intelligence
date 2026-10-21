import { supabase } from "@/integrations/supabase/client";

const base = { is_demo: true, department: "Manufacturing" };

export async function seedDemo() {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user!.id;
  const rows = [
    { ...base, title: "[DEMO] Tablet hardness below specification", product: "Demo-Paracetamol 500 mg", batch: "DEMO-B001", stage: "Compression", equipment: "PRESS-DEMO-01", category: "Process parameters", severity: "medium", expected_condition: "Hardness 80–120 N", observed_condition: "Hardness 68 N in 3 of 20 tablets", units: "N", observed_value: 68, spec_min: 80, spec_max: 120, description: "Synthetic demo: in-process check found low tablet hardness.", containment: "Batch placed on hold.", owner_id: me },
    { ...base, title: "[DEMO] OOS dissolution result", product: "Demo-Metformin 850 mg", batch: "DEMO-B002", stage: "QC release", equipment: "DISSO-DEMO-02", category: "Laboratory", severity: "high", oos_oot: "OOS", expected_condition: "Q ≥ 80% at 30 min", observed_condition: "Q = 72% at 30 min", units: "%", observed_value: 72, spec_min: 80, description: "Synthetic demo: dissolution OOS at release testing.", containment: "Batch quarantined; Phase I lab investigation started.", owner_id: me },
    { ...base, title: "[DEMO] Balance calibration overdue", product: "Demo-Paracetamol 500 mg", batch: "DEMO-B003", stage: "Dispensing", equipment: "BAL-DEMO-07", category: "Equipment", severity: "low", description: "Synthetic demo: balance used 2 days past calibration due date.", containment: "Balance tagged out of service.", owner_id: me },
    { ...base, title: "[DEMO] Cold room temperature excursion", product: "Demo-Insulin analog", batch: "DEMO-B004", stage: "Storage", equipment: "COLD-DEMO-01", category: "Environment", severity: "critical", expected_condition: "2–8 °C", observed_condition: "11.4 °C for 95 minutes", units: "°C", observed_value: 11.4, spec_min: 2, spec_max: 8, description: "Synthetic demo: temperature excursion after door left ajar.", containment: "Product segregated; stability assessment requested.", owner_id: me },
  ];
  const { data, error } = await supabase.from("deviations").insert(rows).select("id");
  if (error) throw error;
  await supabase.from("investigations").update({ chronology: "Synthetic demo chronology: event detected during routine check; supervisor notified within 15 minutes.", evidence: "Synthetic demo: equipment logs, batch record pages.", findings: "Synthetic demo finding.", hypotheses: "Hypothesis 1: synthetic demo hypothesis." }).eq("deviation_id", data[3].id);
  const past = new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  const { error: e2 } = await supabase.from("capas").insert([
    { is_demo: true, deviation_id: data[2].id, kind: "corrective", problem: "[DEMO] Balance used past calibration", action: "Recalibrate BAL-DEMO-07 and assess impacted weighings", owner_id: me, due_date: past, status: "in_progress" },
    { is_demo: true, deviation_id: data[3].id, kind: "preventive", problem: "[DEMO] Cold room door left ajar", action: "Install door-ajar alarm", owner_id: me, due_date: soon, status: "assigned" },
  ]);
  if (e2) throw e2;
}

export async function removeDemo() {
  await supabase.from("capas").delete().eq("is_demo", true);
  const { error } = await supabase.from("deviations").delete().eq("is_demo", true);
  if (error) throw error;
}
