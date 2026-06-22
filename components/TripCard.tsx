import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { Trip } from "@/types";
import { formatCurrency, formatDate } from "@/utils/settlement";

interface Props {
  trip: Trip;
  memberCount: number;
  totalExpenses: number;
  onPress: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export function TripCard({ trip, memberCount, totalExpenses, onPress, onDelete, onEdit }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pct = trip.totalBudget > 0 ? Math.min(totalExpenses / trip.totalBudget, 1) : 0;
  const remaining = trip.totalBudget - totalExpenses;
  const overBudget = remaining < 0;
  const barColor = overBudget ? colors.destructive : pct > 0.8 ? colors.warning : colors.success;

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            ...(Platform.OS !== "web"
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }
              : {}),
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="car-sport" size={20} color={colors.primary} />
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onEdit}
              style={[styles.actionBtn, { backgroundColor: colors.muted }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              style={[styles.actionBtn, { backgroundColor: colors.destructive + "15" }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash" size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {trip.name}
        </Text>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            {formatDate(trip.departureDate)} → {formatDate(trip.returnDate)}
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: colors.muted, marginVertical: 10 }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: barColor, width: `${Math.round(pct * 100)}%` as unknown as number },
            ]}
          />
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: colors.destructive }]}>
              {formatCurrency(totalExpenses)}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Spent</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: overBudget ? colors.destructive : colors.success }]}>
              {formatCurrency(Math.abs(remaining))}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
              {overBudget ? "Over" : "Left"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>
              {memberCount}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Members</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  statLbl: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8F0",
  },
});
