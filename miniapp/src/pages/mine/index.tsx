import React, { useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { listProfiles } from '@/services/api';
import { useAppStore } from '@/store/app-store';
import { getErrorMessage } from '@/utils/error';
import type { Profile } from '@/types/domain';

const MinePage: React.FC = () => {
  const authToken = useAppStore((state) => state.authToken);
  const user = useAppStore((state) => state.user);
  const activeProfileId = useAppStore((state) => state.activeProfileId);
  const logout = useAppStore((state) => state.logout);

  const [profiles, setProfiles] = useState<Profile[]>([]);

  const loadProfiles = async () => {
    if (!authToken) return;
    try {
      const { profiles: list } = await listProfiles();
      setProfiles(list);
    } catch (err) {
      console.error('[Mine] 加载档案失败：', getErrorMessage(err));
    }
  };

  useDidShow(() => {
    if (!authToken) {
      Taro.reLaunch({ url: '/pages/login/index' });
      return;
    }
    loadProfiles();
  });

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  const handleLogout = () => {
    logout();
    Taro.reLaunch({ url: '/pages/login/index' });
  };

  const handleSwitchProfile = () => {
    Taro.navigateTo({ url: '/pages/profiles/index' });
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <View className={styles.avatar}>
          <Text className={styles.avatarText}>👤</Text>
        </View>
        <View className={styles.userInfo}>
          <Text className={styles.username}>{user?.username ?? '未登录'}</Text>
          <Text className={styles.userHint}>坚持记录，吃得更健康</Text>
        </View>
      </View>

      <View className={styles.card} onClick={handleSwitchProfile}>
        <Text className={styles.cardTitle}>当前档案</Text>
        <View className={styles.row}>
          <View className={styles.rowLeft}>
            {activeProfile ? <View className={styles.accentDot} style={{ backgroundColor: activeProfile.accent }} /> : null}
            <Text className={styles.rowLabel}>{activeProfile ? activeProfile.displayName : '未选择档案'}</Text>
          </View>
          <Text className={styles.arrow}>›</Text>
        </View>
      </View>

      <View className={styles.card}>
        <Text className={styles.cardTitle}>关于</Text>
        <View className={styles.row}>
          <Text className={styles.rowLabel}>饮食计划小程序</Text>
          <Text className={styles.rowValue}>v1.0.0</Text>
        </View>
      </View>

      <Button className={styles.logoutBtn} onClick={handleLogout}>
        <Text className={styles.logoutText}>退出登录</Text>
      </Button>
    </View>
  );
};

export default MinePage;
