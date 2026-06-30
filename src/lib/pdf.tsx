import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { BudgetFull, Company } from "./types";
import { budgetTotals, itemTotals, VAT_MODES } from "./calc";

// Formato monetário sem Intl: os espaços especiais do Intl pt-PT
// não existem na codificação WinAnsi das fontes base do PDF.
function fmt(n: number): string {
  const fixed = (Math.round(n * 100) / 100).toFixed(2);
  const [int, dec] = fixed.split(".");
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intFmt},${dec} €`;
}

function qty(n: number): string {
  return String(n % 1 === 0 ? n : n.toFixed(2).replace(".", ","));
}

const BLUE = "#1d4ed8";
const SLATE = "#475569";
const LIGHT = "#f1f5f9";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 56,
    color: "#1e293b",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  logo: { maxHeight: 48, maxWidth: 140, objectFit: "contain", marginBottom: 6 },
  companyName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8, color: SLATE },
  docTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLUE, textAlign: "right" },
  budgetNumber: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  clientBox: {
    backgroundColor: LIGHT,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: { fontSize: 7, color: SLATE, textTransform: "uppercase" },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  chapterHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    color: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 10,
    borderRadius: 2,
  },
  chapterName: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 9 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 3,
    paddingHorizontal: 6,
    color: SLATE,
    fontSize: 7,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 3.5,
    paddingHorizontal: 6,
  },
  cName: { flex: 1, paddingRight: 4 },
  cUn: { width: 26, textAlign: "center" },
  cQty: { width: 38, textAlign: "right" },
  cMoney: { width: 58, textAlign: "right" },
  cMoneyWide: { width: 64, textAlign: "right" },
  totalsBox: { marginTop: 16, alignSelf: "flex-end", width: 240 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
    paddingHorizontal: 8,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: BLUE,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    borderRadius: 2,
    marginTop: 3,
  },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: SLATE,
  },
  internalBadge: {
    backgroundColor: "#b91c1c",
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    alignSelf: "flex-end",
    marginTop: 4,
  },
});

export function BudgetPdf({
  budget,
  company,
  internal,
}: {
  budget: BudgetFull;
  company: Company;
  internal: boolean;
}) {
  const totals = budgetTotals(budget);
  const vat = VAT_MODES[budget.vatMode] ?? VAT_MODES.NORMAL;
  const date = new Date(budget.createdAt + "Z").toLocaleDateString("pt-PT");

  return (
    <Document
      title={`${budget.number}${internal ? " (interno)" : ""}`}
      author={company.name}
    >
      <Page size="A4" style={s.page}>
        {/* Cabeçalho */}
        <View style={s.headerRow}>
          <View style={{ maxWidth: 280 }}>
            {company.logo ? <Image style={s.logo} src={company.logo} /> : null}
            <Text style={s.companyName}>{company.name}</Text>
            {company.nif ? <Text style={s.small}>NIF: {company.nif}</Text> : null}
            {company.address ? <Text style={s.small}>{company.address}</Text> : null}
            <Text style={s.small}>
              {[company.phone, company.email].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
          <View>
            <Text style={s.docTitle}>ORÇAMENTO</Text>
            <Text style={s.budgetNumber}>{budget.number}</Text>
            <Text style={[s.small, { textAlign: "right", marginTop: 4 }]}>
              Data: {date}
            </Text>
            <Text style={[s.small, { textAlign: "right" }]}>
              Validade: {budget.validityDays} dias
            </Text>
            {internal ? <Text style={s.internalBadge}>VERSÃO INTERNA</Text> : null}
          </View>
        </View>

        {/* Cliente */}
        <View style={s.clientBox}>
          <View style={{ maxWidth: 250 }}>
            <Text style={s.label}>Cliente</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {budget.clientName || "—"}
            </Text>
            {budget.clientNif ? <Text style={s.small}>NIF: {budget.clientNif}</Text> : null}
            <Text style={s.small}>
              {[budget.clientPhone, budget.clientEmail].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
          <View style={{ maxWidth: 220 }}>
            <Text style={s.label}>Local da obra</Text>
            <Text>{budget.siteAddress || "—"}</Text>
          </View>
        </View>

        <Text style={s.title}>{budget.title}</Text>

        {budget.laborOnly === 1 ? (
          <Text
            style={{
              fontSize: 8.5,
              backgroundColor: "#fef3c7",
              color: "#92400e",
              padding: 6,
              borderRadius: 3,
              marginBottom: 10,
              marginTop: -4,
            }}
          >
            Orçamento de mão de obra — todo o material é fornecido pelo dono de
            obra / cliente, salvo indicação em contrário nas condições.
          </Text>
        ) : null}

        {/* Capítulos */}
        {budget.chapters
          .filter((ch) => ch.items.length > 0)
          .map((ch, ci) => {
            const chT = totals.byChapter.get(ch.id);
            return (
              <View key={ch.id}>
                <View style={s.chapterHeader} wrap={false}>
                  <Text style={s.chapterName}>
                    {ci + 1}. {ch.name}
                  </Text>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>
                    {fmt(chT?.price ?? 0)}
                  </Text>
                </View>
                <View style={s.tableHead} wrap={false}>
                  <Text style={s.cName}>DESIGNAÇÃO</Text>
                  <Text style={s.cUn}>UN</Text>
                  <Text style={s.cQty}>QTD</Text>
                  {internal ? <Text style={s.cMoney}>CUSTO MAT.</Text> : null}
                  {internal ? <Text style={s.cMoney}>CUSTO MO</Text> : null}
                  <Text style={s.cMoney}>P. UNIT.</Text>
                  <Text style={s.cMoneyWide}>TOTAL</Text>
                </View>
                {ch.items.map((item, ii) => {
                  const t = itemTotals(item, budget);
                  return (
                    <View key={item.id} style={s.row} wrap={false}>
                      <Text style={s.cName}>
                        {ci + 1}.{ii + 1}  {item.name || "(sem designação)"}
                      </Text>
                      <Text style={s.cUn}>{item.unit}</Text>
                      <Text style={s.cQty}>{qty(item.quantity)}</Text>
                      {internal ? <Text style={s.cMoney}>{fmt(t.materialCost)}</Text> : null}
                      {internal ? <Text style={s.cMoney}>{fmt(t.laborCost)}</Text> : null}
                      <Text style={s.cMoney}>{fmt(t.unitPrice)}</Text>
                      <Text style={[s.cMoneyWide, { fontFamily: "Helvetica-Bold" }]}>
                        {fmt(t.price)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}

        {/* Totais */}
        <View style={s.totalsBox} wrap={false}>
          {internal ? (
            <>
              <View style={s.totalsRow}>
                <Text style={s.small}>
                  Custo material{budget.laborOnly === 1 ? " (faturado)" : ""}
                </Text>
                <Text style={s.small}>{fmt(totals.materialCost)}</Text>
              </View>
              {budget.laborOnly === 1 ? (
                <View style={s.totalsRow}>
                  <Text style={s.small}>
                    Material do cliente (estimativa, não faturado)
                  </Text>
                  <Text style={s.small}>{fmt(totals.suppliedMaterial)}</Text>
                </View>
              ) : null}
              <View style={s.totalsRow}>
                <Text style={s.small}>
                  Custo mão de obra ({qty(totals.laborHours)} h × {fmt(budget.laborRate)}/h)
                </Text>
                <Text style={s.small}>{fmt(totals.laborCost)}</Text>
              </View>
              <View style={s.totalsRow}>
                <Text style={[s.small, { fontFamily: "Helvetica-Bold" }]}>
                  Margem (mat. {qty(budget.materialMargin)}% / MO {qty(budget.laborMargin)}%)
                </Text>
                <Text style={[s.small, { fontFamily: "Helvetica-Bold" }]}>
                  {fmt(totals.profit)}
                </Text>
              </View>
            </>
          ) : null}
          {totals.materialFee > 0 ? (
            <View style={s.totalsRow}>
              <Text>Gestão de material fornecido ({qty(budget.materialFeePct)}%)</Text>
              <Text>{fmt(totals.materialFee)}</Text>
            </View>
          ) : null}
          <View style={[s.totalsRow, { borderTopWidth: 0.5, borderTopColor: "#cbd5e1" }]}>
            <Text>Subtotal (s/ IVA)</Text>
            <Text>{fmt(totals.subtotal)}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text>{vat.label}</Text>
            <Text>{fmt(totals.vat)}</Text>
          </View>
          <View style={s.grandTotal}>
            <Text>TOTAL</Text>
            <Text>{fmt(totals.total)}</Text>
          </View>
        </View>

        {vat.pdfNote ? (
          <Text style={[s.small, { marginTop: 8 }]}>{vat.pdfNote}</Text>
        ) : null}

        {/* Notas e condições */}
        {budget.notes ? (
          <View wrap={false}>
            <Text style={s.sectionTitle}>Notas</Text>
            <Text style={s.small}>{budget.notes}</Text>
          </View>
        ) : null}
        {company.conditions ? (
          <View wrap={false}>
            <Text style={s.sectionTitle}>Condições</Text>
            <Text style={s.small}>{company.conditions}</Text>
          </View>
        ) : null}

        {/* Rodapé */}
        <View style={s.footer} fixed>
          <Text>
            {[company.name, company.nif && `NIF ${company.nif}`, company.phone, company.email]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ── Auto de medição / nota de faturação por fase ──────────────────────

export function AutoMedicaoPdf({
  budget,
  company,
  phase,
  emittedAt,
}: {
  budget: BudgetFull;
  company: Company;
  phase: { label: string; mode: string; pct: number; value: number; index: number; total: number };
  emittedAt: string; // data de emissão (dd/mm/aaaa)
}) {
  const vat = VAT_MODES[budget.vatMode] ?? VAT_MODES.NORMAL;
  const valorCIva = phase.value;
  const valorSIva = vat.rate > 0 ? valorCIva / (1 + vat.rate) : valorCIva;
  const iva = valorCIva - valorSIva;
  const docNumber = `${budget.number} · Fase ${phase.index}/${phase.total}`;

  return (
    <Document title={`Auto de medição ${budget.number}`} author={company.name}>
      <Page size="A4" style={s.page}>
        {/* Cabeçalho */}
        <View style={s.headerRow}>
          <View style={{ maxWidth: 280 }}>
            {company.logo ? <Image style={s.logo} src={company.logo} /> : null}
            <Text style={s.companyName}>{company.name}</Text>
            {company.nif ? <Text style={s.small}>NIF: {company.nif}</Text> : null}
            {company.address ? <Text style={s.small}>{company.address}</Text> : null}
            <Text style={s.small}>
              {[company.phone, company.email].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
          <View>
            <Text style={s.docTitle}>AUTO DE MEDIÇÃO</Text>
            <Text style={s.budgetNumber}>{docNumber}</Text>
            <Text style={[s.small, { textAlign: "right", marginTop: 4 }]}>Data: {emittedAt}</Text>
          </View>
        </View>

        {/* Cliente */}
        <View style={s.clientBox}>
          <View style={{ maxWidth: 250 }}>
            <Text style={s.label}>Cliente</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{budget.clientName || "—"}</Text>
            {budget.clientNif ? <Text style={s.small}>NIF: {budget.clientNif}</Text> : null}
            <Text style={s.small}>
              {[budget.clientPhone, budget.clientEmail].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
          <View style={{ maxWidth: 220 }}>
            <Text style={s.label}>Local da obra</Text>
            <Text>{budget.siteAddress || "—"}</Text>
          </View>
        </View>

        <Text style={s.title}>{budget.title}</Text>

        {/* Linha da fase */}
        <View style={s.chapterHeader} wrap={false}>
          <Text style={s.chapterName}>FASE DE FATURAÇÃO</Text>
        </View>
        <View style={[s.row, { paddingVertical: 8 }]} wrap={false}>
          <Text style={s.cName}>
            {phase.label}
            {phase.mode === "PCT" ? `  (${qty(phase.pct)}% do total da obra)` : ""}
          </Text>
          <Text style={[s.cMoneyWide, { fontFamily: "Helvetica-Bold" }]}>{fmt(valorCIva)}</Text>
        </View>

        {/* Totais */}
        <View style={s.totalsBox} wrap={false}>
          <View style={[s.totalsRow, { borderTopWidth: 0.5, borderTopColor: "#cbd5e1" }]}>
            <Text>Valor (s/ IVA)</Text>
            <Text>{fmt(valorSIva)}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text>{vat.label}</Text>
            <Text>{fmt(iva)}</Text>
          </View>
          <View style={s.grandTotal}>
            <Text>TOTAL A FATURAR</Text>
            <Text>{fmt(valorCIva)}</Text>
          </View>
        </View>

        {vat.pdfNote ? <Text style={[s.small, { marginTop: 8 }]}>{vat.pdfNote}</Text> : null}

        <Text style={[s.small, { marginTop: 16 }]}>
          Documento de medição relativo a esta fase da empreitada {budget.number}. Os valores
          referem-se à parcela acima do total contratado. Não substitui fatura/recibo emitido
          por software certificado.
        </Text>

        {company.conditions ? (
          <View wrap={false}>
            <Text style={s.sectionTitle}>Condições</Text>
            <Text style={s.small}>{company.conditions}</Text>
          </View>
        ) : null}

        {/* Rodapé */}
        <View style={s.footer} fixed>
          <Text>
            {[company.name, company.nif && `NIF ${company.nif}`, company.phone, company.email]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
