import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ExpenseCategory } from "@/constants/categories";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/constants/categories";

interface Props {
  category: ExpenseCategory;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "md" }: Props) {
  const color = CATEGORY_COLORS[category] ?? "#94A3B8";
  const icon = CATEGORY_ICONS[category] ?? "ellipsis-horizontal";
  const small = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + "20",
          borderColor: color + "40",
          paddingHorizontal: small ? 6 : 10,
          paddingVertical: small ? 3 : 5,
          gap: small ? 4 : 6,
        },
      ]}
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={small ? 11 : 13}
        color={color}
      />
      <Text
        style={[
          styles.text,
          { color, fontSize: small ? 10 : 12 },
        ]}
      >
        {category}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
  },
});
