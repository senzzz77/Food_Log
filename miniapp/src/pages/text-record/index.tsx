import React, { useState } from 'react';
import { View, Text, Input, Textarea, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { addEntry, saveMyFood, searchFoods } from '@/services/api';
import { MEAL_TYPES } from '@/lib/constants';
import { caloriesForGrams, macroForGrams, round, todayStr } from '@/lib/format';
import { useAppStore } from '@/store/app-store';
import { getErrorMessage } from '@/utils/error';
import EmptyState from '@/components/EmptyState';
import type { MealType, NutritionPer100g } from '@/types/domain';

interface SearchItem {
  name: string;
  matched: boolean;
  per100g: NutritionPer100g;
  editing: boolean;
  grams: number;
}

const EMPTY_NUTRITION: NutritionPer100g = { caloriesPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 };

const TextRecordPage: React.FC = () => {
  const activeProfileId = useAppStore((state) => state.activeProfileId);

  const [text, setText] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savingFood, setSavingFood] = useState<string | null>(null);
  const [savedFoods, setSavedFoods] = useState<Record<string, boolean>>({});

  const handleSearch = async () => {
    const keyword = text.trim();
    if (!keyword) {
      Taro.showToast({ title: '请先输入食物描述', icon: 'none' });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { items: searched } = await searchFoods(keyword);
      const mapped: SearchItem[] = searched.map((item) => {
        const matched = Boolean(item.food);
        const per100g = item.food
          ? {
              caloriesPer100g: item.food.caloriesPer100g,
              proteinPer100g: item.food.proteinPer100g,
              carbsPer100g: item.food.carbsPer100g,
              fatPer100g: item.food.fatPer100g,
            }
          : item.estimate ?? EMPTY_NUTRITION;
        return { name: item.food?.name ?? item.name, matched, per100g, editing: false, grams: 100 };
      });
      setItems(mapped);
      if (mapped.length === 0) setError('未能识别出食物，请补充更具体的描述后重试。');
    } catch (err) {
      const message = getErrorMessage(err, '搜索失败，请重试。');
      console.error('[TextRecord] 搜索失败：', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<SearchItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const updatePer100g = (index: number, key: keyof NutritionPer100g, value: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, per100g: { ...item.per100g, [key]: value } } : item)),
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveFood = async (item: SearchItem) => {
    if (savingFood || savedFoods[item.name]) return;
    setSavingFood(item.name);
    try {
      await saveMyFood({
        name: item.name,
        caloriesPer100g: round(item.per100g.caloriesPer100g),
        proteinPer100g: round(item.per100g.proteinPer100g),
        carbsPer100g: round(item.per100g.carbsPer100g),
        fatPer100g: round(item.per100g.fatPer100g),
      });
      setSavedFoods((prev) => ({ ...prev, [item.name]: true }));
      Taro.showToast({ title: '已存入我的食物库', icon: 'success' });
    } catch (err) {
      console.error('[TextRecord] 存入食物库失败：', getErrorMessage(err));
      Taro.showToast({ title: getErrorMessage(err, '存入失败'), icon: 'none' });
    } finally {
      setSavingFood(null);
    }
  };

  const handleSubmit = async () => {
    if (!activeProfileId) return;
    const valid = items.filter((item) => item.grams > 0);
    if (valid.length === 0) {
      Taro.showToast({ title: '请填写食物的克重', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      const date = todayStr();
      await Promise.all(
        valid.map((item) =>
          addEntry(activeProfileId, {
            date,
            mealType,
            source: 'text',
            name: item.name,
            grams: item.grams,
            calories: caloriesForGrams(item.per100g.caloriesPer100g, item.grams),
            protein: macroForGrams(item.per100g.proteinPer100g, item.grams),
            carbs: macroForGrams(item.per100g.carbsPer100g, item.grams),
            fat: macroForGrams(item.per100g.fatPer100g, item.grams),
          }),
        ),
      );
      console.log('[TextRecord] 记录成功，共', valid.length, '条');
      Taro.showToast({ title: '已记录', icon: 'success' });
      setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 600);
    } catch (err) {
      const message = getErrorMessage(err, '记录失败');
      console.error('[TextRecord] 记录失败：', message);
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className={styles.container}>
      <View className={styles.inputCard}>
        <Textarea
          className={styles.textarea}
          placeholder='描述你吃了什么，例如：一碗米饭、100克鸡胸肉、一个苹果'
          value={text}
          maxlength={200}
          onInput={(e) => setText(e.detail.value)}
        />
        <Button className={styles.searchBtn} onClick={handleSearch} disabled={loading}>
          <Text className={styles.searchBtnText}>{loading ? '搜索中...' : '搜索食物'}</Text>
        </Button>
      </View>

      <View className={styles.toolbar}>
        <Text className={styles.toolbarLabel}>记录到哪一餐</Text>
        <View className={styles.mealTabs}>
          {MEAL_TYPES.map((meal) => (
            <View
              key={meal.value}
              className={classnames(styles.mealTab, mealType === meal.value && styles.mealTabActive)}
              onClick={() => setMealType(meal.value)}
            >
              <Text className={classnames(styles.mealTabText, mealType === meal.value && styles.mealTabTextActive)}>
                {meal.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {loading ? <EmptyState icon='⏳' title='正在搜索食物...' /> : null}

      {error ? <Text className={styles.errorText}>{error}</Text> : null}

      {!loading && items.length > 0 ? (
        <View>
          <Text className={styles.sectionTitle}>识别结果</Text>
          {items.map((item, index) => (
            <View key={index} className={styles.itemCard}>
              <View className={styles.itemHeader}>
                <Text className={styles.itemName}>{item.name}</Text>
                <Text className={classnames(styles.sourceTag, !item.matched && styles.sourceTagEstimate)}>
                  {item.matched ? '食物库' : 'AI 估算'}
                </Text>
                <View className={styles.saveBtn} onClick={() => handleSaveFood(item)}>
                  <Text className={styles.saveText}>
                    {savedFoods[item.name] ? '已存入' : savingFood === item.name ? '存入中' : '存入食物库'}
                  </Text>
                </View>
                <View className={styles.deleteBtn} onClick={() => removeItem(index)}>
                  <Text className={styles.deleteText}>删除</Text>
                </View>
              </View>

              <Text className={styles.nutrition}>
                每100g · {round(item.per100g.caloriesPer100g)}千卡 · 蛋白 {round(item.per100g.proteinPer100g)}g · 碳水{' '}
                {round(item.per100g.carbsPer100g)}g · 脂肪 {round(item.per100g.fatPer100g)}g
              </Text>

              {item.editing ? (
                <View>
                  {(
                    [
                      ['caloriesPer100g', '热量(千卡)'],
                      ['proteinPer100g', '蛋白质(g)'],
                      ['carbsPer100g', '碳水(g)'],
                      ['fatPer100g', '脂肪(g)'],
                    ] as Array<[keyof NutritionPer100g, string]>
                  ).map(([key, label]) => (
                    <View key={key} className={styles.editField}>
                      <Text className={styles.editLabel}>{label}</Text>
                      <Input
                        className={styles.editInput}
                        type='digit'
                        value={String(item.per100g[key])}
                        onInput={(e) => updatePer100g(index, key, Number(e.detail.value) || 0)}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              <View className={styles.gramsRow}>
                <Text className={styles.gramsLabel}>克重</Text>
                <Input
                  className={styles.gramsInput}
                  type='digit'
                  value={String(item.grams)}
                  onInput={(e) => updateItem(index, { grams: Number(e.detail.value) || 0 })}
                />
                <Text className={styles.gramsUnit}>g</Text>
              </View>

              <View className={styles.computedRow}>
                <Text className={styles.computedMacro}>
                  蛋白 {macroForGrams(item.per100g.proteinPer100g, item.grams)}g · 碳水{' '}
                  {macroForGrams(item.per100g.carbsPer100g, item.grams)}g · 脂肪{' '}
                  {macroForGrams(item.per100g.fatPer100g, item.grams)}g
                </Text>
                <Text className={styles.computedCalories}>≈ {caloriesForGrams(item.per100g.caloriesPer100g, item.grams)} 千卡</Text>
              </View>

              {!item.matched ? (
                <Button className={styles.editToggle} onClick={() => updateItem(index, { editing: !item.editing })}>
                  <Text className={styles.editToggleText}>{item.editing ? '完成' : '编辑数值'}</Text>
                </Button>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <Button className={classnames(styles.submitBtn, submitting && styles.submitBtnDisabled)} onClick={handleSubmit} disabled={submitting}>
          <Text className={styles.submitText}>{submitting ? '记录中...' : '记录这一餐'}</Text>
        </Button>
      ) : null}
    </View>
  );
};

export default TextRecordPage;
