import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { useColors } from "@/hooks/useColors";
import { useDatabase } from "@/context/DatabaseContext";
import { CircularChart } from "@/components/CircularChart";
import { EmptyState } from "@/components/EmptyState";
import { CATEGORY_COLORS } from "@/constants/categories";
import {
  calculateSettlement,
  getCategoryBreakdown,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/utils/settlement";
import { generateTripStatementHTML } from "@/utils/pdf";
import type { Member, Expense } from "@/types";

export default function StatementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();

  const trip = db.trips.find((t) => t.id === id);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [m, e] = await Promise.all([
      db.getMembersForTrip(id),
      db.getExpensesForTrip(id),
    ]);
    setMembers(m);
    setExpenses(e);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSharePDF() {
    if (!trip) return;
    setGenerating(true);
    try {
      const settlements = calculateSettlement(members, totalExpenses);
      const html = generateTripStatementHTML(trip, members, expenses, settlements);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (Platform.OS === "web") {
        Alert.alert("PDF Generated", "Open the generated PDF in your browser.");
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${trip.name} - Trip Statement`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `PDF saved to: ${uri}`);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePrint() {
    if (!trip) return;
    try {
      const settlements = calculateSettlement(members, totalExpenses);
      const html = generateTripStatementHTML(trip, members, expenses, settlements);
      await Print.printAsync({ html });
    } catch {
      Alert.alert("Error", "Failed to open print dialog.");
    }
  }

  if (!trip) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <EmptyState icon="alert-circle-outline" title="Trip not found" />
      </View>
    );
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalKitty = members.reduce((s, m) => s + m.advanceAmount, 0);
  const remaining = trip.totalBudget - totalExpenses;
  const kittyBalance = totalKitty - totalExpenses;
  const settlements = calculateSettlement(members, totalExpenses);
  const breakdown = getCategoryBreakdown(expenses);
  const serialNo = (parseInt(trip.id.slice(-4), 36) % 9999) + 1;
  const webBotPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 20 : 8),
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Trip Statement</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            #{String(serialNo).padStart(4, "0")}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={handlePrint}
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="print-outline" size={18} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSharePDF}
            disabled={generating}
            style={[styles.shareBtn, { backgroundColor: colors.primary }]}
          >
            {generating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 + webBotPad }]}
        >
          {/* Trip Info Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.tripInfoRow}>
              <View style={[styles.tripIconWrap, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name="car-sport" size={22} color={colors.primary} />
              </View>
              <View style={styles.tripInfoText}>
                <Text style={[styles.tripName, { color: colors.foreground }]}>{trip.name}</Text>
                <Text style={[styles.tripDates, { color: colors.mutedForeground }]}>
                  {formatDate(trip.departureDate)} → {formatDate(trip.returnDate)}
                </Text>
              </View>
              <View style={[styles.serialBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.serialText}>#{String(serialNo).padStart(4, "0")}</Text>
              </View>
            </View>
          </View>

          {/* Summary Grid */}
          <View style={styles.summaryGrid}>
            <SummaryCard label="Budget" value={formatCurrency(trip.totalBudget)} color={colors.foreground} bg={colors.card} border={colors.border} />
            <SummaryCard label="Total Spent" value={formatCurrency(totalExpenses)} color={colors.destructive} bg={colors.card} border={colors.border} />
            <SummaryCard
              label={remaining >= 0 ? "Remaining" : "Over Budget"}
              value={formatCurrency(Math.abs(remaining))}
              color={remaining >= 0 ? colors.success : colors.destructive}
              bg={colors.card}
              border={colors.border}
            />
            <SummaryCard
              label="Kitty Balance"
              value={formatCurrency(Math.abs(kittyBalance))}
              color={kittyBalance >= 0 ? colors.success : colors.destructive}
              bg={colors.card}
              border={colors.border}
            />
          </View>

          {/* Members Table */}
          {members.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Members & Contributions</Text>
              <View style={[styles.tableHeader, { backgroundColor: colors.muted }]}>
                <Text style={[styles.thCell, { color: colors.mutedForeground, flex: 2 }]}>Member</Text>
                <Text style={[styles.thCell, { color: colors.mutedForeground, textAlign: "right" }]}>Advance</Text>
                <Text style={[styles.thCell, { color: colors.mutedForeground, textAlign: "right" }]}>Fair Share</Text>
                <Text style={[styles.thCell, { color: colors.mutedForeground, textAlign: "right" }]}>Balance</Text>
              </View>
              {members.map((m, i) => {
                const fairShare = members.length > 0 ? totalExpenses / members.length : 0;
                const bal = m.advanceAmount - fairShare;
                return (
                  <View
                    key={m.id}
                    style={[styles.tableRow, { borderBottomColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "40" }]}
                  >
                    <Text style={[styles.tdCell, { color: colors.foreground, flex: 2 }]} numberOfLines={1}>{m.name}</Text>
                    <Text style={[styles.tdCell, { color: colors.foreground, textAlign: "right" }]}>{formatCurrency(m.advanceAmount)}</Text>
                    <Text style={[styles.tdCell, { color: colors.mutedForeground, textAlign: "right" }]}>{formatCurrency(fairShare)}</Text>
                    <Text style={[styles.tdCell, { color: bal >= 0 ? colors.success : colors.destructive, textAlign: "right", fontFamily: "Inter_700Bold" }]}>
                      {bal >= 0 ? "+" : ""}{formatCurrency(bal)}
                    </Text>
                  </View>
                );
              })}
              <View style={[styles.tableRow, { borderBottomColor: "transparent" }]}>
                <Text style={[styles.tdCell, { color: colors.foreground, flex: 2, fontFamily: "Inter_700Bold" }]}>Total Kitty</Text>
                <Text style={[styles.tdCell, { color: colors.success, textAlign: "right", fontFamily: "Inter_700Bold" }]}>{formatCurrency(totalKitty)}</Text>
                <Text style={[styles.tdCell, { textAlign: "right" }]} />
                <Text style={[styles.tdCell, { textAlign: "right" }]} />
              </View>
            </View>
          )}

          {/* Expenses Table */}
          {expenses.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                All Expenses ({expenses.length})
              </Text>
              {expenses.map((e, i) => (
                <View
                  key={e.id}
                  style={[
                    styles.expenseRow,
                    { borderBottomColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "40" },
                  ]}
                >
                  <View style={styles.expenseLeft}>
                    <Text style={[styles.expSerial, { color: colors.mutedForeground }]}>#{i + 1}</Text>
                    <View style={[styles.expCatDot, { backgroundColor: CATEGORY_COLORS[e.category] ?? "#94A3B8" }]} />
                    <View style={styles.expDetails}>
                      <Text style={[styles.expCategory, { color: colors.foreground }]}>{e.category}</Text>
                      <Text style={[styles.expMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {formatDate(e.date)} {formatTime(e.time)}
                        {e.location ? ` · ${e.location}` : ""}
                      </Text>
                      {!!e.description && (
                        <Text style={[styles.expDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {e.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.expAmount, { color: colors.primary }]}>
                    {formatCurrency(e.amount)}
                  </Text>
                </View>
              ))}
              <View style={styles.expenseTotalRow}>
                <Text style={[styles.expTotalLabel, { color: colors.foreground }]}>Total</Text>
                <Text style={[styles.expTotalVal, { color: colors.destructive }]}>
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>
            </View>
          )}

          {/* Category Breakdown */}
          {breakdown.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category Breakdown</Text>
              <CircularChart data={breakdown} size={160} />
            </View>
          )}

          {/* Settlement */}
          {settlements.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Settlement</Text>
              <Text style={[styles.settlementSubtitle, { color: colors.mutedForeground }]}>
                Who pays whom to settle the trip
              </Text>
              {settlements.map((s, i) => (
                <View
                  key={i}
                  style={[styles.settlementRow, { borderBottomColor: colors.border }]}
                >
                  <View style={[styles.settlePerson, { backgroundColor: colors.destructive + "15" }]}>
                    <Ionicons name="person" size={14} color={colors.destructive} />
                    <Text style={[styles.settlePersonText, { color: colors.destructive }]} numberOfLines={1}>
                      {s.from}
                    </Text>
                  </View>
                  <View style={styles.settleArrow}>
                    <Ionicons name="arrow-forward" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.settleAmount, { color: colors.foreground }]}>
                      {formatCurrency(s.amount)}
                    </Text>
                  </View>
                  <View style={[styles.settlePerson, { backgroundColor: colors.success + "15" }]}>
                    <Ionicons name="person" size={14} color={colors.success} />
                    <Text style={[styles.settlePersonText, { color: colors.success }]} numberOfLines={1}>
                      {s.to}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {expenses.length === 0 && members.length === 0 && (
            <EmptyState
              icon="document-text-outline"
              title="No data yet"
              subtitle="Add members and expenses to generate a statement"
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SummaryCard({
  label,
  value,
  color,
  bg,
  border,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <View style={[sStyles.card, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[sStyles.label, { color: "#94A3B8" }]}>{label}</Text>
      <Text style={[sStyles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const sStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: "45%",
  },
  label: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.3 },
  value: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerFlex: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  actionBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 10 },
  shareBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  tripInfoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tripIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tripInfoText: { flex: 1 },
  tripName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  tripDates: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  serialBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  serialText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  tableHeader: { flexDirection: "row", borderRadius: 8, padding: 8, marginBottom: 4 },
  thCell: { flex: 1, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1 },
  tdCell: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  expenseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, gap: 8 },
  expenseLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  expSerial: { fontSize: 11, fontFamily: "Inter_400Regular", width: 24, textAlign: "right", marginTop: 2 },
  expCatDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  expDetails: { flex: 1 },
  expCategory: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  expMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  expDesc: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic", marginTop: 1 },
  expAmount: { fontSize: 14, fontFamily: "Inter_700Bold", flexShrink: 0 },
  expenseTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, marginTop: 4 },
  expTotalLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  expTotalVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  settlementSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, marginTop: -6 },
  settlementRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  settlePerson: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flex: 1 },
  settlePersonText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  settleArrow: { alignItems: "center", paddingHorizontal: 4 },
  settleAmount: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 2 },
});
