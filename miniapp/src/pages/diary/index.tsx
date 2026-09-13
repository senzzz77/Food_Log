import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { deleteEntry, getDiary } from '@/services/api';
import { MEAL_TYPES } from '@/lib/constants';
import { todayStr } from '@/lib/format';
import { useAppStore } from '@/store/app-store';
import { getErrorMessage } from '@/utils/error';
import SummaryCard from '@/components/SummaryCard';
import MealEntryItem from '@/components/MealEntryItem';
import EmptyState from '@/components/EmptyState';
import type { DiarySummary, MealEntry } from '@/types/domain';

function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const DiaryPage: React.FC = () => {
  const authToken = useAppStore((state) => state.authToken);
  const activeProfileId = useAppStore((state) => state.activeProfileId);

  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [summary, setSummary] = useState<DiarySummary>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loaded, setLoaded] = useState(false);

  const load = async (targetDate: string) => {
    if (!authToken || !activeProfileId) return;
    try {
      const diary = await getDiary(activeProfileId, targetDate);
      setEntries(diary.entries);
      setSummary(diary.summary);
    } catch (err) {
      console.error('[Diary] 加载日记失败：', getErrorMessage(err));
    } finally {
      setLoaded(true);
    }
  };

  useDidShow(() => {
    if (!authToken) {
      Taro.reLaunch({ url: '/pages/login/index' });
      return;
    }
    if (!activeProfileId) {
      Taro.navigateTo({ url: '/pages/profiles/index' });
      return;
    }
    load(date);
  });

  const handleShift = (delta: number) => {
    const next = shiftDate(date, delta);
    setDate(next);
    setLoaded(false);
    load(next);
  };

  const handleDelete = async (entryId: string) => {
    if (!activeProfileId) return;
    try {
      await deleteEntry(activeProfileId, entryId);
      Taro.showToast({ title: '已删除', icon: 'success' });
      load(date);
    } catch (err) {
      console.error('[Diary] 删除记录失败：', getErrorMessage(err));
      Taro.showToast({ title: '删除失败', icon: 'none' });
    }
  };

  return (
    <View className={styles.container}>
      <View className={styles.dateBar}>
        <Text className={styles.arrow} onClick={() => handleShift(-1)}>‹</Text>
        <Text className={styles.dateText}>{date}</Text>
        <Text className={styles.arrow} onClick={() => handleShift(1)}>›</Text>
      </View>

      {date !== todayStr() ? (
        <Text className={styles.todayBtn} onClick={() => handleShift(0)}>
          回到今天
        </Text>
      ) : null}

      <SummaryCard summary={summary} />

      <Text className={styles.sectionTitle}>当日记录</Text>

      {loaded && entries.length === 0 ? (
        <EmptyState title='这一天没有记录' desc='切换日期查看其他天的饮食' />
      ) : (
        MEAL_TYPES.map((meal) => {
          const mealEntries = entries.filter((entry) => entry.mealType === meal.value);
          if (mealEntries.length === 0) return null;
          return (
            <View key={meal.value} className={styles.mealSection}>
              <View className={styles.mealHeader}>
                <Text className={styles.mealLabel}>{meal.label}</Text>
                <Text className={styles.mealCount}>{mealEntries.length} 项</Text>
              </View>
              <View className={styles.entryList}>
                {mealEntries.map((entry) => (
                  <MealEntryItem key={entry.id} entry={entry} onDelete={handleDelete} />
                ))}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

export default DiaryPage;
