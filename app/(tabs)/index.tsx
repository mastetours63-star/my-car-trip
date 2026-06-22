import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { useDatabase } from "@/context/DatabaseContext";
import { TripCard } from "@/components/TripCard";
import { EmptyState } from "@/components/EmptyState";
import { DatePickerModal } from "@/components/DatePickerModal";
import { formatCurrency, formatDate } from "@/utils/settlement";
import type { Trip, Member, Expense } from "@/types";

interface TripSummary {
  memberCount: number;
  totalExpenses: number;
}

interface TripForm {
  name: string;
  departureDate: Date;
  returnDate: Date;
  totalBudget: string;
}

function defaultForm(): TripForm {
  const now = new Date();
  const later = new Date(now);
  later.setDate(later.getDate() + 3);
  return { name: "", departureDate: now, returnDate: later, totalBudget: "" };
}

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();

  const [summaries, setSummaries] = useState<Record<string, TripSummary>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [form, setForm] = useState<TripForm>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [datePicker, setDatePicker] = useState<{
    field: "departureDate" | "returnDate";
  } | null>(null);

  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const loadSummaries = useCallback(async () => {
    const map: Record<string, TripSummary> = {};
    for (const trip of db.trips) {
      const [members, expenses] = await Promise.all([
        db.getMembersForTrip(trip.id),
        db.getExpensesForTrip(trip.id),
      ]);
      map[trip.id] = {
        memberCount: members.length,
        totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      };
    }
    setSummaries(map);
  }, [db.trips]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  function openCreate() {
    setForm(defaultForm());
    setShowCreate(true);
  }

  function openEdit(trip: Trip) {
    setForm({
      name: trip.name,
      departureDate: new Date(trip.departureDate),
      returnDate: new Date(trip.returnDate),
      totalBudget: String(trip.totalBudget),
    });
    setEditTrip(trip);
  }

  function validateForm(): boolean {
    if (!form.name.trim()) {
      Alert.alert("Error", "Please enter a trip name.");
      return false;
    }
    const budget = parseFloat(form.totalBudget);
    if (isNaN(budget) || budget < 0) {
      Alert.alert("Error", "Please enter a valid budget amount.");
      return false;
    }
    if (form.returnDate < form.departureDate) {
      Alert.alert("Error", "Return date cannot be before departure date.");
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const data = {
        name: form.name.trim(),
        departureDate: form.departureDate.toISOString().split("T")[0],
        returnDate: form.returnDate.toISOString().split("T")[0],
        totalBudget: parseFloat(form.totalBudget) || 0,
      };
      if (editTrip) {
        await db.updateTrip(editTrip.id, data);
        setEditTrip(null);
      } else {
        const trip = await db.createTrip(data);
        setShowCreate(false);
        await loadSummaries();
        router.push(`/trip/${trip.id}`);
        return;
      }
      await loadSummaries();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(trip: Trip) {
    Alert.alert(
      "Delete Trip",
      `Are you sure you want to delete "${trip.name}" and all its data?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await db.deleteTrip(trip.id);
          },
        },
      ]
    );
  }

  const webTopPad = Platform.OS === "web" ? 67 : 0;
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
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            My Car Trip
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {db.trips.length} {db.trips.length === 1 ? "trip" : "trips"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={openCreate}
          style={[styles.headerBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Trips List */}
      {!db.isReady ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={db.trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={[
            styles.list,
            db.trips.length === 0 && styles.listEmpty,
            { paddingBottom: insets.bottom + 80 + webBotPad },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={db.trips.length > 0}
          ListEmptyComponent={
            <EmptyState
              icon="car-sport-outline"
              title="No trips yet"
              subtitle="Tap the + button to plan your first road trip"
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
              <TripCard
                trip={item}
                memberCount={summaries[item.id]?.memberCount ?? 0}
                totalExpenses={summaries[item.id]?.totalExpenses ?? 0}
                onPress={() => router.push(`/trip/${item.id}`)}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            </Animated.View>
          )}
        />
      )}

      {/* FAB */}
      {db.trips.length > 0 && (
        <Animated.View
          style={[
            styles.fab,
            fabStyle,
            { backgroundColor: colors.primary, bottom: insets.bottom + 20 + webBotPad },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              fabScale.value = withSpring(0.9, { damping: 10 }, () => {
                fabScale.value = withSpring(1);
              });
              openCreate();
            }}
            style={styles.fabInner}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Create / Edit Trip Modal */}
      <TripFormModal
        visible={showCreate || !!editTrip}
        form={form}
        setForm={setForm}
        isEdit={!!editTrip}
        saving={saving}
        datePicker={datePicker}
        setDatePicker={setDatePicker}
        onSave={handleSave}
        onCancel={() => {
          setShowCreate(false);
          setEditTrip(null);
        }}
        colors={colors}
      />
    </View>
  );
}

function TripFormModal({
  visible,
  form,
  setForm,
  isEdit,
  saving,
  datePicker,
  setDatePicker,
  onSave,
  onCancel,
  colors,
}: {
  visible: boolean;
  form: TripForm;
  setForm: React.Dispatch<React.SetStateAction<TripForm>>;
  isEdit: boolean;
  saving: boolean;
  datePicker: { field: "departureDate" | "returnDate" } | null;
  setDatePicker: (v: { field: "departureDate" | "returnDate" } | null) => void;
  onSave: () => void;
  onCancel: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: colors.card,
                  paddingBottom: insets.bottom + 16,
                },
              ]}
            >
              <View style={[styles.modalHandle, { backgroundColor: colors.muted }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {isEdit ? "Edit Trip" : "New Trip"}
                </Text>
                <TouchableOpacity onPress={onCancel}>
                  <Ionicons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.formSection}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    TRIP NAME
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="e.g. Goa Road Trip 2025"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.name}
                    onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formSection, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                      DEPARTURE
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dateBtn,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                      onPress={() => setDatePicker({ field: "departureDate" })}
                    >
                      <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                      <Text style={[styles.dateBtnText, { color: colors.foreground }]}>
                        {formatDate(form.departureDate.toISOString().split("T")[0])}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.formSection, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                      RETURN
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dateBtn,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                      onPress={() => setDatePicker({ field: "returnDate" })}
                    >
                      <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                      <Text style={[styles.dateBtnText, { color: colors.foreground }]}>
                        {formatDate(form.returnDate.toISOString().split("T")[0])}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    TOTAL BUDGET
                  </Text>
                  <View
                    style={[
                      styles.inputWithIcon,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>
                      ₹
                    </Text>
                    <TextInput
                      style={[styles.inputInner, { color: colors.foreground }]}
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.totalBudget}
                      onChangeText={(v) =>
                        setForm((f) => ({ ...f, totalBudget: v.replace(/[^0-9.]/g, "") }))
                      }
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onSave}
                  disabled={saving}
                  style={[
                    styles.saveBtn,
                    { backgroundColor: saving ? colors.muted : colors.primary },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {isEdit ? "Save Changes" : "Create Trip"}
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
          value={form[datePicker.field]}
          mode="date"
          minimumDate={
            datePicker.field === "returnDate" ? form.departureDate : undefined
          }
          title={datePicker.field === "departureDate" ? "Departure Date" : "Return Date"}
          onConfirm={(date) => {
            setForm((f) => ({ ...f, [datePicker.field]: date }));
            setDatePicker(null);
          }}
          onCancel={() => setDatePicker(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerFlex: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 16,
  },
  listEmpty: {
    flex: 1,
    justifyContent: "center",
  },
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
  fabInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  formSection: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    marginRight: 4,
  },
  inputInner: {
    flex: 1,
    padding: 14,
    paddingLeft: 2,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  dateBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
