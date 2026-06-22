import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Member } from "@/types";
import { formatCurrency } from "@/utils/settlement";

interface Props {
  member: Member;
  index: number;
  totalExpenses: number;
  memberCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

const AVATAR_COLORS = [
  "#F97316", "#8B5CF6", "#0EA5E9", "#10B981",
  "#F59E0B", "#EC4899", "#6366F1", "#14B8A6",
];

export function MemberCard({ member, index, totalExpenses, memberCount, onEdit, onDelete }: Props) {
  const colors = useColors();
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const fairShare = memberCount > 0 ? totalExpenses / memberCount : 0;
  const balance = member.advanceAmount - fairShare;
  const isPositive = balance >= 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor + "25" }]}>
        <Text style={[styles.avatarText, { color: avatarColor }]}>
          {member.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {member.name}
        </Text>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Advance: </Text>
          <Text style={[styles.advance, { color: colors.primary }]}>
            {formatCurrency(member.advanceAmount)}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text
          style={[
            styles.balance,
            { color: isPositive ? colors.success : colors.destructive },
          ]}
        >
          {isPositive ? "+" : ""}{formatCurrency(balance)}
        </Text>
        <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
          {isPositive ? "owed back" : "owes"}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onEdit}
          style={[styles.btn, { backgroundColor: colors.muted }]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons name="pencil" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={[styles.btn, { backgroundColor: colors.destructive + "15" }]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons name="trash" size={13} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  advance: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  right: {
    alignItems: "flex-end",
  },
  balance: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  balanceLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    gap: 6,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
