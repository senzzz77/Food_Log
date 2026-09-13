import React from 'react';
import { View, Text } from '@tarojs/components';
import type { DiarySummary } from '@/types/domain';
import { formatNumber } from '@/lib/format';
import styles from './index.module.scss';

interface SummaryCardProps {
  summary: DiarySummary;
  targetCalories?: number | null;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ summary, targetCalories }) => {
  const target = targetCalories ?? 0;
  const percent = target > 0 ? Math.min(100, Math.round((summary.calories / target) * 100)) : 0;

  return (
    <View className={styles.card}>
      <View className={styles.header}>
        <Text className={styles.label}>今日已摄入</Text>
        {target > 0 ? <Text className={styles.target}>目标 {Math.round(target)} 千卡</Text> : null}
      </View>

      <View className={styles.calorieRow}>
        <Text className={styles.calorieValue}>{formatNumber(summary.calories)}</Text>
        <Text className={styles.calorieUnit}>千卡</Text>
      </View>

      {target > 0 ? (
        <View className={styles.progressWrap}>
          <View className={styles.progressBar} style={{ width: `${percent}%` }} />
        </View>
      ) : null}

      <View className={styles.macros}>
        <View className={styles.macroItem}>
          <Text className={styles.macroValue}>{formatNumber(summary.protein)}g</Text>
          <Text className={styles.macroLabel}>蛋白质</Text>
        </View>
        <View className={styles.macroItem}>
          <Text className={styles.macroValue}>{formatNumber(summary.carbs)}g</Text>
          <Text className={styles.macroLabel}>碳水</Text>
        </View>
        <View className={styles.macroItem}>
          <Text className={styles.macroValue}>{formatNumber(summary.fat)}g</Text>
          <Text className={styles.macroLabel}>脂肪</Text>
        </View>
      </View>
    </View>
  );
};

export default SummaryCard;
