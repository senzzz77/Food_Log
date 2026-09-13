import React, { useState } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { addEntry, deleteEntry, getDiary, listMyFoods, loadBodyProfile, updateEntry } from '@/services/api';
import { calculateMetabolism } from '@/lib/calculations';
import { MEAL_TYPES } from '@/lib/constants';
import { todayStr, round } from '@/lib/format';
import { useAppStore } from '@/store/app-store';
import { useCameraStore } from '@/store/camera-store';
import { chooseImageAsBase64 } from '@/utils/image';
import { getErrorMessage } from '@/utils/error';
import SummaryCard from '@/components/SummaryCard';
import MealEntryItem from '@/components/MealEntryItem';
import EmptyState from '@/components/EmptyState';
import type { DiarySummary, MealEntry, MealType, MyFood } from '@/types/domain';

interface EditForm {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const HomePage: React.FC = () => {
  const authToken = useAppStore((state) => state.authToken);
  const activeProfileId = useAppStore((state) => state.activeProfileId);
  const setPendingImage = useCameraStore((state) => state.setPendingImage);

  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [summary, setSummary] = useState<DiarySummary>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [targetCalories, setTargetCalories] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [picking, setPicking] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [saving, setSaving] = useState(false);
  const [foodLibOpen, setFoodLibOpen] = useState(false);
  const [myFoods, setMyFoods] = useState<MyFood[]>([]);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [selectedFood, setSelectedFood] = useState<MyFood | null>(null);
  const [foodGrams, setFoodGrams] = useState(100);
  const [foodMealType, setFoodMealType] = useState<MealType>('lunch');
  const [addingFood, setAddingFood] = useState(false);

  const load = async () => {
    if (!authToken || !activeProfileId) return;
    try {
      const [diary, bodyRes] = await Promise.all([
        getDiary(activeProfileId, todayStr()),
        loadBodyProfile(activeProfileId),
      ]);
      setEntries(diary.entries);
      setSummary(diary.summary);
      if (bodyRes.body) {
        setTargetCalories(calculateMetabolism(bodyRes.body).targetCalories.midpoint);
      } else {
        setTargetCalories(null);
      }
    } catch (err) {
      console.error('[Home] 加载今日数据失败：', getErrorMessage(err));
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
    load();
  });

  const handlePhoto = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await chooseImageAsBase64();
      if (!result) {
        Taro.showToast({ title: '未选择图片', icon: 'none' });
        return;
      }
      setPendingImage(result.base64, result.mimeType);
      Taro.navigateTo({ url: '/pages/camera-result/index' });
    } catch (err) {
      console.error('[Home] 选择图片失败：', getErrorMessage(err));
      Taro.showToast({ title: '无法读取图片，请重试', icon: 'none' });
    } finally {
      setPicking(false);
    }
  };

  const handleText = () => {
    Taro.navigateTo({ url: '/pages/text-record/index' });
  };

  const openFoodLibrary = async () => {
    setFoodLibOpen(true);
    setSelectedFood(null);
    setFoodGrams(100);
    setFoodMealType('lunch');
    setLoadingFoods(true);
    try {
      const { foods } = await listMyFoods();
      setMyFoods(foods);
    } catch (err) {
      console.error('[Home] 加载食物库失败：', getErrorMessage(err));
      Taro.showToast({ title: getErrorMessage(err, '加载食物库失败'), icon: 'none' });
    } finally {
      setLoadingFoods(false);
    }
  };

  const handleAddFood = async () => {
    if (!activeProfileId || !selectedFood) return;
    if (foodGrams <= 0) {
      Taro.showToast({ title: '请填写食用量', icon: 'none' });
      return;
    }
    setAddingFood(true);
    try {
      await addEntry(activeProfileId, {
        date: todayStr(),
        mealType: foodMealType,
        source: 'manual',
        name: selectedFood.name,
        grams: foodGrams,
        calories: round((selectedFood.caloriesPer100g * foodGrams) / 100),
        protein: round((selectedFood.proteinPer100g * foodGrams) / 100),
        carbs: round((selectedFood.carbsPer100g * foodGrams) / 100),
        fat: round((selectedFood.fatPer100g * foodGrams) / 100),
      });
      Taro.showToast({ title: '已记录', icon: 'success' });
      setFoodLibOpen(false);
      setSelectedFood(null);
      load();
    } catch (err) {
      console.error('[Home] 从食物库添加失败：', getErrorMessage(err));
      Taro.showToast({ title: getErrorMessage(err, '添加失败'), icon: 'none' });
    } finally {
      setAddingFood(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!activeProfileId) return;
    try {
      await deleteEntry(activeProfileId, entryId);
      Taro.showToast({ title: '已删除', icon: 'success' });
      load();
    } catch (err) {
      console.error('[Home] 删除记录失败：', getErrorMessage(err));
      Taro.showToast({ title: '删除失败', icon: 'none' });
    }
  };

  const handleEdit = (entry: MealEntry) => {
    setEditingEntry(entry);
    setEditForm({
      name: entry.name,
      grams: entry.grams,
      calories: round(entry.calories),
      protein: round(entry.protein),
      carbs: round(entry.carbs),
      fat: round(entry.fat),
    });
  };

  const handleEditGrams = (value: number) => {
    if (!editingEntry || value <= 0) {
      setEditForm((prev) => ({ ...prev, grams: value }));
      return;
    }
    const ratio = value / editingEntry.grams;
    setEditForm((prev) => ({
      ...prev,
      grams: value,
      calories: round(editingEntry.calories * ratio),
      protein: round(editingEntry.protein * ratio),
      carbs: round(editingEntry.carbs * ratio),
      fat: round(editingEntry.fat * ratio),
    }));
  };

  const handleSave = async () => {
    if (!activeProfileId || !editingEntry) return;
    const name = editForm.name.trim();
    if (!name) {
      Taro.showToast({ title: '请填写食物名称', icon: 'none' });
      return;
    }
    if (editForm.grams <= 0) {
      Taro.showToast({ title: '克重需大于 0', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      await updateEntry(activeProfileId, editingEntry.id, {
        name,
        grams: editForm.grams,
        calories: editForm.calories,
        protein: editForm.protein,
        carbs: editForm.carbs,
        fat: editForm.fat,
      });
      Taro.showToast({ title: '已保存', icon: 'success' });
      setEditingEntry(null);
      load();
    } catch (err) {
      console.error('[Home] 修改记录失败：', getErrorMessage(err));
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className={styles.container}>
      <SummaryCard summary={summary} targetCalories={targetCalories} />

      <View className={styles.actionRow}>
        <View className={styles.actionBtn} onClick={handlePhoto}>
          <Text className={styles.actionIcon}>📷</Text>
          <Text className={styles.actionLabel}>拍照记录</Text>
        </View>
        <View className={styles.actionBtn} onClick={handleText}>
          <Text className={styles.actionIcon}>✍️</Text>
          <Text className={styles.actionLabel}>文字记录</Text>
        </View>
        <View className={styles.actionBtn} onClick={openFoodLibrary}>
          <Text className={styles.actionIcon}>🥗</Text>
          <Text className={styles.actionLabel}>食物库</Text>
        </View>
      </View>

      <Text className={styles.sectionTitle}>今日记录</Text>

      {loaded && entries.length === 0 ? (
        <EmptyState title='今天还没有记录' desc='点击上方「拍照记录」或「文字记录」，识别食物并记录一餐' />
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
                  <MealEntryItem key={entry.id} entry={entry} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
              </View>
            </View>
          );
        })
      )}

      {editingEntry ? (
        <View className={styles.modalMask} onClick={() => setEditingEntry(null)}>
          <View className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>修改记录</Text>

            <View className={styles.formField}>
              <Text className={styles.formLabel}>名称</Text>
              <Input
                className={styles.formInput}
                value={editForm.name}
                onInput={(e) => setEditForm((prev) => ({ ...prev, name: e.detail.value }))}
              />
            </View>

            <View className={styles.formField}>
              <Text className={styles.formLabel}>克重(g)</Text>
              <Input
                className={styles.formInput}
                type='digit'
                value={String(editForm.grams)}
                onInput={(e) => handleEditGrams(Number(e.detail.value) || 0)}
              />
            </View>

            <View className={styles.formField}>
              <Text className={styles.formLabel}>热量(千卡)</Text>
              <Input
                className={styles.formInput}
                type='digit'
                value={String(editForm.calories)}
                onInput={(e) => setEditForm((prev) => ({ ...prev, calories: Number(e.detail.value) || 0 }))}
              />
            </View>

            <View className={styles.formField}>
              <Text className={styles.formLabel}>蛋白质(g)</Text>
              <Input
                className={styles.formInput}
                type='digit'
                value={String(editForm.protein)}
                onInput={(e) => setEditForm((prev) => ({ ...prev, protein: Number(e.detail.value) || 0 }))}
              />
            </View>

            <View className={styles.formField}>
              <Text className={styles.formLabel}>碳水(g)</Text>
              <Input
                className={styles.formInput}
                type='digit'
                value={String(editForm.carbs)}
                onInput={(e) => setEditForm((prev) => ({ ...prev, carbs: Number(e.detail.value) || 0 }))}
              />
            </View>

            <View className={styles.formField}>
              <Text className={styles.formLabel}>脂肪(g)</Text>
              <Input
                className={styles.formInput}
                type='digit'
                value={String(editForm.fat)}
                onInput={(e) => setEditForm((prev) => ({ ...prev, fat: Number(e.detail.value) || 0 }))}
              />
            </View>

            <View className={styles.modalActions}>
              <Button className={styles.modalCancel} onClick={() => setEditingEntry(null)}>
                取消
              </Button>
              <Button className={styles.modalSave} onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {foodLibOpen ? (
        <View className={styles.modalMask} onClick={() => setFoodLibOpen(false)}>
          <View className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>{selectedFood ? selectedFood.name : '我的食物库'}</Text>

            {selectedFood ? (
              <View>
                <Text className={styles.foodNutrition}>
                  每100g · {round(selectedFood.caloriesPer100g)}千卡 · 蛋白 {round(selectedFood.proteinPer100g)}g · 碳水{' '}
                  {round(selectedFood.carbsPer100g)}g · 脂肪 {round(selectedFood.fatPer100g)}g
                </Text>

                <View className={styles.foodMealTabs}>
                  {MEAL_TYPES.map((meal) => (
                    <View
                      key={meal.value}
                      className={classnames(styles.foodMealTab, foodMealType === meal.value && styles.foodMealTabActive)}
                      onClick={() => setFoodMealType(meal.value)}
                    >
                      <Text className={classnames(styles.foodMealTabText, foodMealType === meal.value && styles.foodMealTabTextActive)}>
                        {meal.label}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className={styles.formField}>
                  <Text className={styles.formLabel}>食用量(g)</Text>
                  <Input
                    className={styles.formInput}
                    type='digit'
                    value={String(foodGrams)}
                    onInput={(e) => setFoodGrams(Number(e.detail.value) || 0)}
                  />
                </View>

                <Text className={styles.foodComputed}>
                  约 {round((selectedFood.caloriesPer100g * foodGrams) / 100)} 千卡
                </Text>

                <View className={styles.modalActions}>
                  <Button className={styles.modalCancel} onClick={() => setSelectedFood(null)}>
                    返回
                  </Button>
                  <Button className={styles.modalSave} onClick={handleAddFood} disabled={addingFood}>
                    {addingFood ? '添加中...' : '添加记录'}
                  </Button>
                </View>
              </View>
            ) : loadingFoods ? (
              <EmptyState icon='⏳' title='加载中...' />
            ) : myFoods.length === 0 ? (
              <EmptyState title='食物库还是空的' desc='拍照或文字识别后点击「存入食物库」，即可在这里快速添加' />
            ) : (
              <View className={styles.foodList}>
                {myFoods.map((food) => (
                  <View key={food.id} className={styles.foodItem} onClick={() => setSelectedFood(food)}>
                    <View className={styles.foodItemInfo}>
                      <Text className={styles.foodItemName}>{food.name}</Text>
                      <Text className={styles.foodItemMeta}>每100g · {round(food.caloriesPer100g)}千卡</Text>
                    </View>
                    <Text className={styles.foodItemAdd}>添加</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default HomePage;
