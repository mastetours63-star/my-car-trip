import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_COLORS } from "@/constants/categories";
import { formatCurrency } from "@/utils/settlement";

interface Slice {
  category: string;
  amount: number;
  percentage: number;
}

interface Props {
  data: Slice[];
  size?: number;
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const s = polarToXY(cx, cy, r, startAngle);
  const e = polarToXY(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

export function CircularChart({ data, size = 180 }: Props) {
  const colors = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const innerR = r * 0.5;

  let currentAngle = 0;

  const nonZero = data.filter((d) => d.amount > 0);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {nonZero.map((slice, i) => {
          const sliceAngle = (slice.percentage / 100) * 360;
          const path = slicePath(cx, cy, r, currentAngle, currentAngle + sliceAngle);
          currentAngle += sliceAngle;
          const color = CATEGORY_COLORS[slice.category as keyof typeof CATEGORY_COLORS] ?? "#94A3B8";
          return <Path key={i} d={path} fill={color} />;
        })}
        <Circle cx={cx} cy={cy} r={innerR} fill={colors.card} />
      </Svg>

      <View style={styles.legend}>
        {nonZero.map((slice) => {
          const color = CATEGORY_COLORS[slice.category as keyof typeof CATEGORY_COLORS] ?? "#94A3B8";
          return (
            <View key={slice.category} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={[styles.legendCategory, { color: colors.foreground }]} numberOfLines={1}>
                {slice.category}
              </Text>
              <Text style={[styles.legendValue, { color: colors.mutedForeground }]}>
                {slice.percentage}% · {formatCurrency(slice.amount)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  legend: {
    flex: 1,
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendCategory: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  legendValue: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
