import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/utils/settlement";

interface Props {
  totalBudget: number;
  totalExpenses: number;
  totalKitty: number;
}

export function BudgetProgress({ totalBudget, totalExpenses, totalKitty }: Props) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  const pct = totalBudget > 0 ? Math.min(totalExpenses / totalBudget, 1) : 0;
  const remaining = totalBudget - totalExpenses;
  const kittyBalance = totalKitty - totalExpenses;
  const overBudget = remaining < 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const barColor = overBudget
    ? colors.destructive
    : pct > 0.8
    ? colors.warning
    : colors.success;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Budget Usage</Text>
        <Text style={[styles.pctText, { color: barColor }]}>
          {Math.round(pct * 100)}%
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.statsRow}>
        <Stat label="Budget" value={formatCurrency(totalBudget)} color={colors.foreground} textColor={colors.mutedForeground} />
        <Stat label="Spent" value={formatCurrency(totalExpenses)} color={colors.destructive} textColor={colors.mutedForeground} />
        <Stat label="Remaining" value={formatCurrency(Math.abs(remaining))} color={overBudget ? colors.destructive : colors.success} textColor={colors.mutedForeground} prefix={overBudget ? "-" : ""} />
        <Stat label="Kitty Bal." value={formatCurrency(Math.abs(kittyBalance))} color={kittyBalance >= 0 ? colors.success : colors.destructive} textColor={colors.mutedForeground} prefix={kittyBalance < 0 ? "-" : ""} />
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
  textColor,
  prefix = "",
}: {
  label: string;
  value: string;
  color: string;
  textColor: string;
  prefix?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {prefix}{value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pctText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
});
