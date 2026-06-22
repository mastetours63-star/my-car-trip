import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Expense } from "@/types";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/constants/categories";
import { formatCurrency, formatDate, formatTime } from "@/utils/settlement";

interface Props {
  expense: Expense;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function ExpenseItem({ expense, index, onEdit, onDelete }: Props) {
  const colors = useColors();
  const color = CATEGORY_COLORS[expense.category] ?? "#94A3B8";
  const icon = CATEGORY_ICONS[expense.category] ?? "ellipsis-horizontal";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={color}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.category, { color: colors.foreground }]}>
            {expense.category}
          </Text>
          <Text style={[styles.amount, { color: colors.primary }]}>
            {formatCurrency(expense.amount)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={11} color={colors.mutedForeground} />
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {formatDate(expense.date)} {formatTime(expense.time)}
          </Text>
          {!!expense.location && (
            <>
              <Text style={[styles.sep, { color: colors.border }]}>·</Text>
              <Ionicons name="location-outline" size={11} color={colors.mutedForeground} />
              <Text
                style={[styles.meta, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {expense.location}
              </Text>
            </>
          )}
        </View>

        {!!expense.description && (
          <Text
            style={[styles.desc, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {expense.description}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <Text style={[styles.serial, { color: colors.mutedForeground }]}>
          #{index + 1}
        </Text>
        <TouchableOpacity
          onPress={onEdit}
          style={[styles.actionBtn, { backgroundColor: colors.muted }]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons name="pencil" size={12} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={[styles.actionBtn, { backgroundColor: colors.destructive + "15" }]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons name="trash" size={12} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  category: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  sep: {
    fontSize: 11,
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  actions: {
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  serial: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
});
