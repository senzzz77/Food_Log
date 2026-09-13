import React, { useEffect, useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { addEntry, recognizeFoods, recognizeNutritionFacts, saveMyFood } from '@/services/api';
import { MEAL_TYPES } from '@/lib/constants';
import { caloriesForGrams, macroForGrams, round, todayStr } from '@/lib/format';
import { useAppStore } from '@/store/app-store';
import { useCameraStore } from '@/store/camera-store';
import { getErrorMessage } from '@/utils/error';
import EmptyState from '@/components/EmptyState';
import type { MealType, NutritionPer100g } from '@/types/domain';

interface RecognitionItem {
  name: string;
  matched: boolean;
  per100g: NutritionPer100g;
  editing: boolean;
  grams: number;
}

const EMPTY_NUTRITION: NutritionPer100g = { caloriesPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 };

const CameraResultPage: React.FC = () => {
  const activeProfileId = useAppStore((state) => state.activeProfileId);
  const pendingImageBase64 = useCameraStore((state) => state.pendingImageBase64);
  const pendingMimeType = useCameraStore((state) => state.pendingMimeType);
  const clearPendingImage = useCameraStore((state) => state.clearPendingImage);

  const [items, setItems] = useState<RecognitionItem[]>([]);
  const [mode, setMode] = useState<'food' | 'nutrition'>('food');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savingFood, setSavingFood] = useState<string | null>(null);
  const [savedFoods, setSavedFoods] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!pendingImageBase64) return;
    setLoading(true);
    setError('');
    setItems([]);
    const recognize = mode === 'nutrition' ? recognizeNutritionFacts : recognizeFoods;
    recognize(pendingImageBase64, pendingMimeType ?? 'image/jpeg')
      .then(({ items: recognized }) => {
        const mapped: RecognitionItem[] = recognized.map((item) => {
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
        if (mapped.length === 0) {
          setError(mode === 'nutrition' ? '未能识别出营养成分表，请拍清营养标签后重试。' : '未能识别出食物，请换一张更清晰的照片重试。');
        }
      })
      .catch((err) => {
        const message = getErrorMessage(err, '识别失败，请重试。');
        console.error('[CameraResult] 识别失败：', message);
        setError(message);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const updateItem = (index: number, patch: Partial<RecognitionItem>) => {
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

  const handleSaveFood = async (item: RecognitionItem) => {
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
      console.error('[CameraResult] 存入食物库失败：', getErrorMessage(err));
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
            source: 'photo',
            name: item.name,
            grams: item.grams,
            calories: caloriesForGrams(item.per100g.caloriesPer100g, item.grams),
            protein: macroForGrams(item.per100g.proteinPer100g, item.grams),
            carbs: macroForGrams(item.per100g.carbsPer100g, item.grams),
            fat: macroForGrams(item.per100g.fatPer100g, item.grams),
          }),
        ),
      );
      console.log('[CameraResult] 记录成功，共', valid.length, '条');
      clearPendingImage();
      Taro.showToast({ title: '已记录', icon: 'success' });
      setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 600);
    } catch (err) {
      const message = getErrorMessage(err, '记录失败');
      console.error('[CameraResult] 记录失败：', message);
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!pendingImageBase64) {
    return (
      <View className={styles.container}>
        <EmptyState title='没有待识别的图片' desc='请从首页点击「拍照记录」重新选择图片' />
      </View>
    );
  }

  return (
    <View className={styles.container}>
      <View className={styles.modeTabs}>
        <View
          className={classnames(styles.modeTab, mode === 'food' && styles.modeTabActive)}
          onClick={() => setMode('food')}
        >
          <Text className={classnames(styles.modeTabText, mode === 'food' && styles.modeTabTextActive)}>识别食物</Text>
        </View>
        <View
          className={classnames(styles.modeTab, mode === 'nutrition' && styles.modeTabActive)}
          onClick={() => setMode('nutrition')}
        >
          <Text className={classnames(styles.modeTabText, mode === 'nutrition' && styles.modeTabTextActive)}>营养成分表</Text>
        </View>
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

      {loading ? <EmptyState icon='⏳' title='正在识别食物...' /> : null}

      {error ? <Text className={styles.errorText}>{error}</Text> : null}

      {!loading && items.length > 0 ? (
        items.map((item, index) => (
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
              <Text className={styles.gramsLabel}>{mode === 'nutrition' ? '净含量' : '克重'}</Text>
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
        ))
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <Button className={classnames(styles.submitBtn, submitting && styles.submitBtnDisabled)} onClick={handleSubmit} disabled={submitting}>
          <Text className={styles.submitText}>{submitting ? '记录中...' : '记录这一餐'}</Text>
        </Button>
      ) : null}
    </View>
  );
};

export default CameraResultPage;
