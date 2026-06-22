import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface Props {
  visible: boolean;
  value: Date;
  mode: "date" | "datetime";
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  title?: string;
}

export function DatePickerModal({
  visible,
  value,
  mode,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
  title = "Select Date",
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(m => m + 1);
  }

  function isDayDisabled(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (minimumDate && d < new Date(minimumDate.toDateString())) return true;
    if (maximumDate && d > new Date(maximumDate.toDateString())) return true;
    return false;
  }

  function isSelected(day: number) {
    return day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;
  }

  function isToday(day: number) {
    const today = new Date();
    return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  }

  function selectDay(day: number) {
    if (isDayDisabled(day)) return;
    setSelectedDay(day);
    setSelectedMonth(viewMonth);
    setSelectedYear(viewYear);
  }

  function handleConfirm() {
    const d = new Date(selectedYear, selectedMonth, selectedDay, hour, minute);
    onConfirm(d);
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7).concat(Array(7).fill(null)).slice(0, 7));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

          {/* Month Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { backgroundColor: colors.muted }]}>
              <Ionicons name="chevron-back" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.monthYear, { color: colors.foreground }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { backgroundColor: colors.muted }]}>
              <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Day Names */}
          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map((d) => (
              <Text key={d} style={[styles.dayName, { color: colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          {rows.map((row, ri) => (
            <View key={ri} style={styles.calRow}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={styles.calCell} />;
                const selected = isSelected(day);
                const today = isToday(day);
                const disabled = isDayDisabled(day);
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[
                      styles.calCell,
                      selected && { backgroundColor: colors.primary, borderRadius: 10 },
                      !selected && today && { backgroundColor: colors.primary + "20", borderRadius: 10 },
                    ]}
                    onPress={() => selectDay(day)}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        styles.calDay,
                        { color: selected ? "#fff" : disabled ? colors.mutedForeground : today ? colors.primary : colors.foreground },
                        selected && { fontFamily: "Inter_700Bold" },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Time Picker (only in datetime mode) */}
          {mode === "datetime" && (
            <View style={[styles.timeSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>TIME</Text>
              <View style={styles.timeRow}>
                <TimeSpinner
                  value={hour}
                  min={0}
                  max={23}
                  onChange={setHour}
                  format={(v) => String(v % 12 || 12).padStart(2, "0")}
                  colors={colors}
                />
                <Text style={[styles.colon, { color: colors.foreground }]}>:</Text>
                <TimeSpinner
                  value={minute}
                  min={0}
                  max={59}
                  onChange={setMinute}
                  format={(v) => String(v).padStart(2, "0")}
                  colors={colors}
                />
                <View style={[styles.ampmWrap, { backgroundColor: colors.muted, borderRadius: 10 }]}>
                  <TouchableOpacity
                    onPress={() => setHour(h => h >= 12 ? h - 12 : h)}
                    style={[styles.ampmBtn, hour < 12 && { backgroundColor: colors.primary, borderRadius: 8 }]}
                  >
                    <Text style={[styles.ampmText, { color: hour < 12 ? "#fff" : colors.mutedForeground }]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setHour(h => h < 12 ? h + 12 : h)}
                    style={[styles.ampmBtn, hour >= 12 && { backgroundColor: colors.primary, borderRadius: 8 }]}
                  >
                    <Text style={[styles.ampmText, { color: hour >= 12 ? "#fff" : colors.mutedForeground }]}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.cancelBtn, { backgroundColor: colors.muted }]}
            >
              <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TimeSpinner({
  value,
  min,
  max,
  onChange,
  format,
  colors,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.spinner}>
      <TouchableOpacity
        onPress={() => onChange(value >= max ? min : value + 1)}
        style={[styles.spinBtn, { backgroundColor: colors.muted }]}
      >
        <Ionicons name="chevron-up" size={16} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={[styles.spinVal, { color: colors.foreground }]}>{format(value)}</Text>
      <TouchableOpacity
        onPress={() => onChange(value <= min ? max : value - 1)}
        style={[styles.spinBtn, { backgroundColor: colors.muted }]}
      >
        <Ionicons name="chevron-down" size={16} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 16,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  monthYear: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  dayNamesRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayName: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  calRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  calCell: {
    flex: 1,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  calDay: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  timeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  spinner: {
    alignItems: "center",
    gap: 4,
  },
  spinBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  spinVal: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    minWidth: 44,
    textAlign: "center",
  },
  colon: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  ampmWrap: {
    padding: 3,
    marginLeft: 8,
  },
  ampmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ampmText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
