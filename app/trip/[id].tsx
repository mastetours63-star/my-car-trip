import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { useDatabase } from "@/context/DatabaseContext";
import { BudgetProgress } from "@/components/BudgetProgress";
import { ExpenseItem } from "@/components/ExpenseItem";
import { MemberCard } from "@/components/MemberCard";
import { EmptyState } from "@/components/EmptyState";
import { DatePickerModal } from "@/components/DatePickerModal";
import { EXPENSE_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from "@/constants/categories";
import type { ExpenseCategory } from "@/constants/categories";
import type { Trip, Member, Expense } from "@/types";
import { formatCurrency, formatDate, formatTime } from "@/utils/settlement";

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();

  const trip = db.trips.find((t) => t.id === id);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [showEditTrip, setShowEditTrip] = useState(false);

  // Sections expand
  const [membersExpanded, setMembersExpanded] = useState(true);
  const [expensesExpanded, setExpensesExpanded] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;
    const [m, e] = await Promise.all([
      db.getMembersForTrip(id),
      db.getExpensesForTrip(id),
    ]);
    setMembers(m);
    setExpenses(e);
    setLoading(false);
  }, [id, db]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!trip) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <EmptyState icon="alert-circle-outline" title="Trip not found" />
      </View>
    );
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalKitty = members.reduce((s, m) => s + m.advanceAmount, 0);

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
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {trip.name}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {formatDate(trip.departureDate)} → {formatDate(trip.returnDate)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/statement/${trip.id}`)}
            style={[styles.headerActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowEditTrip(true)}
            style={[styles.headerActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="pencil" size={18} color={colors.foreground} />
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
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 90 + webBotPad },
          ]}
        >
          {/* Budget Progress */}
          <BudgetProgress
            totalBudget={trip.totalBudget}
            totalExpenses={totalExpenses}
            totalKitty={totalKitty}
          />

          {/* Members Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setMembersExpanded((v) => !v)}
            >
              <View style={styles.sectionLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "20" }]}>
                  <Ionicons name="people" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Trip Kitty
                </Text>
                <View style={[styles.countBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.countText, { color: colors.primary }]}>
                    {members.length}
                  </Text>
                </View>
              </View>
              <View style={styles.sectionRight}>
                <Text style={[styles.sectionStat, { color: colors.success }]}>
                  {formatCurrency(totalKitty)}
                </Text>
                <Ionicons
                  name={membersExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </View>
            </TouchableOpacity>

            {membersExpanded && (
              <>
                {members.length === 0 ? (
                  <EmptyState
                    icon="person-add-outline"
                    title="No members yet"
                    subtitle="Add trip members and their advance contributions"
                  />
                ) : (
                  members.map((m, i) => (
                    <Animated.View key={m.id} entering={FadeInDown.delay(i * 50)}>
                      <MemberCard
                        member={m}
                        index={i}
                        totalExpenses={totalExpenses}
                        memberCount={members.length}
                        onEdit={() => setEditMember(m)}
                        onDelete={() => handleDeleteMember(m)}
                      />
                    </Animated.View>
                  ))
                )}
                <TouchableOpacity
                  onPress={() => setShowMemberForm(true)}
                  style={[styles.addBtn, { borderColor: colors.primary + "40", backgroundColor: colors.primary + "10" }]}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={[styles.addBtnText, { color: colors.primary }]}>
                    Add Member
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Expenses Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpensesExpanded((v) => !v)}
            >
              <View style={styles.sectionLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.info + "20" }]}>
                  <Ionicons name="receipt" size={16} color={colors.info} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Expenses
                </Text>
                <View style={[styles.countBadge, { backgroundColor: colors.info + "20" }]}>
                  <Text style={[styles.countText, { color: colors.info }]}>
                    {expenses.length}
                  </Text>
                </View>
              </View>
              <View style={styles.sectionRight}>
                <Text style={[styles.sectionStat, { color: colors.destructive }]}>
                  {formatCurrency(totalExpenses)}
                </Text>
                <Ionicons
                  name={expensesExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </View>
            </TouchableOpacity>

            {expensesExpanded && (
              <>
                {expenses.length === 0 ? (
                  <EmptyState
                    icon="receipt-outline"
                    title="No expenses yet"
                    subtitle="Track fuel, food, tolls, and more"
                  />
                ) : (
                  expenses.map((e, i) => (
                    <Animated.View key={e.id} entering={FadeInDown.delay(i * 40)}>
                      <ExpenseItem
                        expense={e}
                        index={i}
                        onEdit={() => setEditExpense(e)}
                        onDelete={() => handleDeleteExpense(e)}
                      />
                    </Animated.View>
                  ))
                )}
                <TouchableOpacity
                  onPress={() => setShowExpenseForm(true)}
                  style={[styles.addBtn, { borderColor: colors.info + "40", backgroundColor: colors.info + "10" }]}
                >
                  <Ionicons name="add" size={18} color={colors.info} />
                  <Text style={[styles.addBtnText, { color: colors.info }]}>
                    Add Expense
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <View
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 20 + webBotPad,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEditExpense(null);
            setShowExpenseForm(true);
          }}
          style={styles.fabInner}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <ExpenseFormModal
        visible={showExpenseForm || !!editExpense}
        tripId={trip.id}
        initialData={editExpense}
        onSave={async (data) => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (editExpense) {
            await db.updateExpense(editExpense.id, data);
            setEditExpense(null);
          } else {
            await db.addExpense({ ...data, tripId: trip.id });
            setShowExpenseForm(false);
          }
          await reload();
        }}
        onCancel={() => {
          setShowExpenseForm(false);
          setEditExpense(null);
        }}
        colors={colors}
      />

      <MemberFormModal
        visible={showMemberForm || !!editMember}
        initialData={editMember}
        onSave={async (name, amount) => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (editMember) {
            await db.updateMember(editMember.id, { name, advanceAmount: amount });
            setEditMember(null);
          } else {
            await db.addMember({ tripId: trip.id, name, advanceAmount: amount });
            setShowMemberForm(false);
          }
          await reload();
        }}
        onCancel={() => {
          setShowMemberForm(false);
          setEditMember(null);
        }}
        colors={colors}
      />

      <EditTripModal
        visible={showEditTrip}
        trip={trip}
        onSave={async (data) => {
          await db.updateTrip(trip.id, data);
          setShowEditTrip(false);
          await db.reloadTrips();
        }}
        onCancel={() => setShowEditTrip(false)}
        colors={colors}
      />
    </View>
  );

  async function handleDeleteMember(m: Member) {
    Alert.alert("Delete Member", `Remove "${m.name}" from the trip?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await db.deleteMember(m.id);
          await reload();
        },
      },
    ]);
  }

  async function handleDeleteExpense(e: Expense) {
    Alert.alert("Delete Expense", `Delete this ${e.category} expense of ${formatCurrency(e.amount)}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await db.deleteExpense(e.id);
          await reload();
        },
      },
    ]);
  }
}

// ─── Expense Form Modal ────────────────────────────────────────────────────────

interface ExpenseFormData {
  category: ExpenseCategory;
  amount: number;
  date: string;
  time: string;
  location: string;
  description: string;
}

function ExpenseFormModal({
  visible,
  tripId,
  initialData,
  onSave,
  onCancel,
  colors,
}: {
  visible: boolean;
  tripId: string;
  initialData: Expense | null;
  onSave: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<ExpenseCategory>("Fuel");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [datePicker, setDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setCategory(initialData.category as ExpenseCategory);
        setAmount(String(initialData.amount));
        setDate(new Date(`${initialData.date}T${initialData.time || "00:00"}`));
        setLocation(initialData.location);
        setDescription(initialData.description);
      } else {
        setCategory("Fuel");
        setAmount("");
        setDate(new Date());
        setLocation("");
        setDescription("");
      }
    }
  }, [visible, initialData]);

  async function getGPS() {
    if (Platform.OS === "web") {
      if (navigator.geolocation) {
        setLoadingGPS(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
            setLoadingGPS(false);
          },
          () => setLoadingGPS(false)
        );
      }
      return;
    }
    setLoadingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required to get GPS coordinates.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
    } catch {
      Alert.alert("Error", "Could not get location. Please enter manually.");
    } finally {
      setLoadingGPS(false);
    }
  }

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        category,
        amount: parsed,
        date: date.toISOString().split("T")[0],
        time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
        location: location.trim(),
        description: description.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={mStyles.overlay}>
            <View
              style={[
                mStyles.sheet,
                { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
              ]}
            >
              <View style={[mStyles.handle, { backgroundColor: colors.muted }]} />
              <View style={mStyles.modalHeader}>
                <Text style={[mStyles.modalTitle, { color: colors.foreground }]}>
                  {initialData ? "Edit Expense" : "Add Expense"}
                </Text>
                <TouchableOpacity onPress={onCancel}>
                  <Ionicons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Category Picker */}
                <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground }]}>CATEGORY</Text>
                <View style={mStyles.categoryGrid}>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const selected = cat === category;
                    const catColor = CATEGORY_COLORS[cat];
                    const icon = CATEGORY_ICONS[cat];
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={[
                          mStyles.catBtn,
                          {
                            backgroundColor: selected ? catColor + "25" : colors.background,
                            borderColor: selected ? catColor : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={icon as keyof typeof Ionicons.glyphMap}
                          size={18}
                          color={selected ? catColor : colors.mutedForeground}
                        />
                        <Text
                          style={[
                            mStyles.catText,
                            { color: selected ? catColor : colors.mutedForeground },
                          ]}
                          numberOfLines={1}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Amount */}
                <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
                  AMOUNT
                </Text>
                <View
                  style={[
                    mStyles.inputWithIcon,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Text style={[mStyles.currencySymbol, { color: colors.mutedForeground }]}>₹</Text>
                  <TextInput
                    style={[mStyles.inputInner, { color: colors.foreground }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    value={amount}
                    onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                </View>

                {/* Date & Time */}
                <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
                  DATE & TIME
                </Text>
                <TouchableOpacity
                  onPress={() => setDatePicker(true)}
                  style={[
                    mStyles.dateRow,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={[mStyles.dateText, { color: colors.foreground }]}>
                    {formatDate(date.toISOString().split("T")[0])}
                  </Text>
                  <View style={[mStyles.timePill, { backgroundColor: colors.muted }]}>
                    <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                    <Text style={[mStyles.timeText, { color: colors.foreground }]}>
                      {formatTime(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Location */}
                <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
                  LOCATION (OPTIONAL)
                </Text>
                <View
                  style={[
                    mStyles.inputWithIcon,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[mStyles.inputInner, { color: colors.foreground, flex: 1 }]}
                    placeholder="Enter location or use GPS"
                    placeholderTextColor={colors.mutedForeground}
                    value={location}
                    onChangeText={setLocation}
                    returnKeyType="next"
                  />
                  <TouchableOpacity onPress={getGPS} disabled={loadingGPS} style={mStyles.gpsBtn}>
                    {loadingGPS ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="locate" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
                  DESCRIPTION (OPTIONAL)
                </Text>
                <TextInput
                  style={[
                    mStyles.textArea,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                  ]}
                  placeholder="Add a note..."
                  placeholderTextColor={colors.mutedForeground}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={[
                    mStyles.saveBtn,
                    { backgroundColor: saving ? colors.muted : colors.primary },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={mStyles.saveBtnText}>
                      {initialData ? "Save Changes" : "Add Expense"}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {datePicker && (
        <DatePickerModal
          visible
          value={date}
          mode="datetime"
          title="Expense Date & Time"
          onConfirm={(d) => { setDate(d); setDatePicker(false); }}
          onCancel={() => setDatePicker(false)}
        />
      )}
    </>
  );
}

// ─── Member Form Modal ─────────────────────────────────────────────────────────

function MemberFormModal({
  visible,
  initialData,
  onSave,
  onCancel,
  colors,
}: {
  visible: boolean;
  initialData: Member | null;
  onSave: (name: string, amount: number) => Promise<void>;
  onCancel: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? "");
      setAmount(initialData ? String(initialData.advanceAmount) : "");
    }
  }, [visible, initialData]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a member name.");
      return;
    }
    setSaving(true);
    try {
      await onSave(name.trim(), parseFloat(amount) || 0);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={mStyles.overlay}>
          <View
            style={[
              mStyles.sheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[mStyles.handle, { backgroundColor: colors.muted }]} />
            <View style={mStyles.modalHeader}>
              <Text style={[mStyles.modalTitle, { color: colors.foreground }]}>
                {initialData ? "Edit Member" : "Add Member"}
              </Text>
              <TouchableOpacity onPress={onCancel}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground }]}>
              MEMBER NAME
            </Text>
            <TextInput
              style={[
                mStyles.input,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="e.g. Rahul"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              autoFocus
            />

            <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>
              ADVANCE AMOUNT (KITTY CONTRIBUTION)
            </Text>
            <View
              style={[
                mStyles.inputWithIcon,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Text style={[mStyles.currencySymbol, { color: colors.mutedForeground }]}>₹</Text>
              <TextInput
                style={[mStyles.inputInner, { color: colors.foreground }]}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[
                mStyles.saveBtn,
                { backgroundColor: saving ? colors.muted : colors.primary, marginTop: 24 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={mStyles.saveBtnText}>
                  {initialData ? "Save Changes" : "Add Member"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Edit Trip Modal ───────────────────────────────────────────────────────────

function EditTripModal({
  visible,
  trip,
  onSave,
  onCancel,
  colors,
}: {
  visible: boolean;
  trip: Trip;
  onSave: (data: { name: string; departureDate: string; returnDate: string; totalBudget: number }) => Promise<void>;
  onCancel: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(trip.name);
  const [departure, setDeparture] = useState(new Date(trip.departureDate));
  const [returnDate, setReturnDate] = useState(new Date(trip.returnDate));
  const [budget, setBudget] = useState(String(trip.totalBudget));
  const [saving, setSaving] = useState(false);
  const [datePicker, setDatePicker] = useState<"departure" | "return" | null>(null);

  useEffect(() => {
    if (visible) {
      setName(trip.name);
      setDeparture(new Date(trip.departureDate));
      setReturnDate(new Date(trip.returnDate));
      setBudget(String(trip.totalBudget));
    }
  }, [visible, trip]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert("Error", "Please enter a trip name."); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        departureDate: departure.toISOString().split("T")[0],
        returnDate: returnDate.toISOString().split("T")[0],
        totalBudget: parseFloat(budget) || 0,
      });
    } finally { setSaving(false); }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={mStyles.overlay}>
            <View style={[mStyles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
              <View style={[mStyles.handle, { backgroundColor: colors.muted }]} />
              <View style={mStyles.modalHeader}>
                <Text style={[mStyles.modalTitle, { color: colors.foreground }]}>Edit Trip</Text>
                <TouchableOpacity onPress={onCancel}>
                  <Ionicons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground }]}>TRIP NAME</Text>
                <TextInput
                  style={[mStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={name} onChangeText={setName}
                  placeholderTextColor={colors.mutedForeground}
                />

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>DEPARTURE</Text>
                    <TouchableOpacity
                      onPress={() => setDatePicker("departure")}
                      style={[mStyles.dateRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                      <Text style={[{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" }]}>
                        {formatDate(departure.toISOString().split("T")[0])}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>RETURN</Text>
                    <TouchableOpacity
                      onPress={() => setDatePicker("return")}
                      style={[mStyles.dateRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                      <Text style={[{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" }]}>
                        {formatDate(returnDate.toISOString().split("T")[0])}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[mStyles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>TOTAL BUDGET</Text>
                <View style={[mStyles.inputWithIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[mStyles.currencySymbol, { color: colors.mutedForeground }]}>₹</Text>
                  <TextInput
                    style={[mStyles.inputInner, { color: colors.foreground }]}
                    value={budget}
                    onChangeText={(v) => setBudget(v.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSave} disabled={saving}
                  style={[mStyles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary, marginTop: 24 }]}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={mStyles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {datePicker && (
        <DatePickerModal
          visible
          value={datePicker === "departure" ? departure : returnDate}
          mode="date"
          minimumDate={datePicker === "return" ? departure : undefined}
          title={datePicker === "departure" ? "Departure Date" : "Return Date"}
          onConfirm={(d) => {
            if (datePicker === "departure") setDeparture(d);
            else setReturnDate(d);
            setDatePicker(null);
          }}
          onCancel={() => setDatePicker(null)}
        />
      )}
    </>
  );
}

// ─── Shared Styles ─────────────────────────────────────────────────────────────

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "92%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 4 },
  inputWithIcon: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginBottom: 4 },
  currencySymbol: { fontSize: 16, fontFamily: "Inter_500Medium", marginRight: 4 },
  inputInner: { flex: 1, padding: 14, paddingLeft: 2, fontSize: 15, fontFamily: "Inter_400Regular" },
  gpsBtn: { padding: 12 },
  dateRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginBottom: 4 },
  dateText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  timePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  timeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  textArea: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80, marginBottom: 4 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  catBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, minWidth: "30%", flex: 0 },
  catText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  saveBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 8 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
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
    gap: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerActionBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  content: { padding: 16, gap: 16 },
  section: {
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionStat: { fontSize: 14, fontFamily: "Inter_700Bold" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabInner: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
});
