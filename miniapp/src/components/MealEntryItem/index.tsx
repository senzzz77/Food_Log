import React from 'react';
import { View, Text } from '@tarojs/components';
import type { MealEntry } from '@/types/domain';
import { formatNumber } from '@/lib/format';
import styles from './index.module.scss';

interface MealEntryItemProps {
  entry: MealEntry;
  onDelete?: (entryId: string) => void;
  onEdit?: (entry: MealEntry) => void;
}

const MealEntryItem: React.FC<MealEntryItemProps> = ({ entry, onDelete, onEdit }) => {
  return (
    <View className={styles.item}>
      <View className={styles.info}>
        <Text className={styles.name}>{entry.name}</Text>
        <Text className={styles.meta}>
          {entry.grams}g · 蛋白 {formatNumber(entry.protein)}g · 碳水 {formatNumber(entry.carbs)}g · 脂肪 {formatNumber(entry.fat)}g
        </Text>
      </View>
      <View className={styles.right}>
        <Text className={styles.calories}>{formatNumber(entry.calories)}</Text>
        <Text className={styles.caloriesUnit}>千卡</Text>
      </View>
      {onEdit ? (
        <View className={styles.edit} onClick={() => onEdit(entry)}>
          <Text className={styles.editText}>✏️</Text>
        </View>
      ) : null}
      {onDelete ? (
        <View className={styles.delete} onClick={() => onDelete(entry.id)}>
          <Text className={styles.deleteText}>🗑️</Text>
        </View>
      ) : null}
    </View>
  );
};

export default MealEntryItem;
