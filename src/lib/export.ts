import type { ReportContent } from "./report-schema";

export type ExportReport = {
  code: string; version: number; status: string; created_at: string; model: string | null;
  content_hash: string | null; reviewed_at: string | null; reviewer: string; author: string;
  deviation: { code: string; title: string; product: string; batch: string };
  content: ReportContent;
};

const statusLabel = (s: string) => (s === "approved" ? "APPROVED" : s === "draft_ai" ? "DRAFT — AI GENERATED" : `DRAFT (${s.replace(/_/g, " ").toUpperCase()})`);

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function meta(r: ExportReport): [string, string][] {
  return [
    ["Report", `${r.code} v${r.version}`], ["Status", statusLabel(r.status)], ["Deviation", `${r.deviation.code} — ${r.deviation.title}`],
    ["Product / Batch", `${r.deviation.product} / ${r.deviation.batch}`], ["Prepared by", r.author], ["Created", new Date(r.created_at).toISOString()],
    ["AI model", r.model ?? "—"], ["Content SHA-256", r.content_hash ?? "—"],
    ["Reviewed by", r.reviewer], ["Approval date", r.reviewed_at && r.status === "approved" ? new Date(r.reviewed_at).toISOString() : "Not approved"],
    ["Exported", new Date().toISOString()],
  ];
}

export async function exportDocx(r: ExportReport) {
  const d = await import("docx");
  const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType, Footer, Header, PageNumber, AlignmentType } = d;
  const cell = (t: string, bold = false) => new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: t, bold })] })] });
  const body: InstanceType<typeof Paragraph | typeof Table>[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, text: "Deviation Investigation Report" }),
    new Paragraph({ children: [new TextRun({ text: statusLabel(r.status), bold: true, color: r.status === "approved" ? "16845B" : "C2413B" })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: meta(r).map(([k, v]) => new TableRow({ children: [cell(k, true), cell(v)] })) }),
  ];
  r.content.sections.forEach((s, i) => {
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: `${i + 1}. ${s.title}`, spacing: { before: 300 } }));
    s.body.split("\n").forEach((line) => body.push(new Paragraph({ text: line.replace(/^- /, "• ") })));
  });
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Review and Approval", spacing: { before: 300 } }));
  body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [["Prepared by", r.author], ["QA Reviewer", r.reviewer], ["Decision", statusLabel(r.status)]].map(([k, v]) => new TableRow({ children: [cell(k, true), cell(v)] })) }));
  const doc = new Document({
    sections: [{
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: `PharmaSense · ${r.code} v${r.version} · ${statusLabel(r.status)}`, size: 16, color: "64748B" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ size: 16, children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES, `  ·  Generated ${new Date().toISOString()}`] })] })] }) },
      children: body,
    }],
  });
  download(await Packer.toBlob(doc), `${r.code}-v${r.version}.docx`);
}

export async function exportPdf(r: ExportReport) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 50;
  let y = M;
  const ensure = (h: number) => { if (y + h > H - M) { pdf.addPage(); y = M; } };
  const text = (t: string, size = 10, bold = false, color: [number, number, number] = [23, 43, 77]) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size); pdf.setTextColor(...color);
    for (const line of pdf.splitTextToSize(t, W - 2 * M)) { ensure(size * 1.4); pdf.text(line, M, y); y += size * 1.4; }
  };
  text("Deviation Investigation Report", 18, true);
  text(statusLabel(r.status), 11, true, r.status === "approved" ? [22, 132, 91] : [194, 65, 59]);
  y += 6;
  meta(r).forEach(([k, v]) => text(`${k}: ${v}`, 9));
  r.content.sections.forEach((s, i) => { y += 10; text(`${i + 1}. ${s.title}`, 12, true); text(s.body, 10); });
  y += 10; text("Review and Approval", 12, true);
  text(`Prepared by: ${r.author}\nQA Reviewer: ${r.reviewer}\nDecision: ${statusLabel(r.status)}`, 10);
  const n = pdf.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139);
    pdf.text(`PharmaSense · ${r.code} v${r.version} · ${statusLabel(r.status)}`, M, 30);
    pdf.text(`Page ${i} of ${n} · Generated ${new Date().toISOString()}`, M, H - 25);
  }
  download(pdf.output("blob"), `${r.code}-v${r.version}.pdf`);
}
