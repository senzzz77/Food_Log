import React, { useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { createProfile, listProfiles } from '@/services/api';
import { PROFILE_ACCENTS } from '@/lib/constants';
import { useAppStore } from '@/store/app-store';
import type { Profile } from '@/types/domain';
import { getErrorMessage } from '@/utils/error';
import EmptyState from '@/components/EmptyState';

const ProfilesPage: React.FC = () => {
  const authToken = useAppStore((state) => state.authToken);
  const activeProfileId = useAppStore((state) => state.activeProfileId);
  const setActiveProfile = useAppStore((state) => state.setActiveProfile);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAccent, setNewAccent] = useState(PROFILE_ACCENTS[0]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const { profiles: list } = await listProfiles();
      setProfiles(list);
    } catch (err) {
      console.error('[Profiles] 加载档案失败：', getErrorMessage(err));
      Taro.showToast({ title: '档案加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    load();
  });

  const handleSelect = (profileId: string) => {
    setActiveProfile(profileId);
    Taro.switchTab({ url: '/pages/home/index' });
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      Taro.showToast({ title: '请填写档案名称', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      const { profile } = await createProfile({ displayName: name, accent: newAccent });
      console.log('[Profiles] 创建档案成功');
      setProfiles((prev) => [profile, ...prev]);
      setNewName('');
      setCreating(false);
      setActiveProfile(profile.id);
      Taro.switchTab({ url: '/pages/home/index' });
    } catch (err) {
      const message = getErrorMessage(err, '创建失败');
      console.error('[Profiles] 创建档案失败：', message);
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className={styles.container}>
      {!loading && profiles.length === 0 && !creating ? (
        <View className={styles.empty}>
          <EmptyState title='还没有档案' desc='创建一个档案，开始记录你的饮食' />
        </View>
      ) : (
        <View>
          <Text className={styles.sectionTitle}>我的档案</Text>
          {profiles.map((profile) => (
            <View key={profile.id} className={styles.profileItem} onClick={() => handleSelect(profile.id)}>
              <View className={styles.accentDot} style={{ backgroundColor: profile.accent }} />
              <Text className={styles.name}>{profile.displayName}</Text>
              {profile.id === activeProfileId ? <Text className={styles.activeBadge}>当前</Text> : null}
            </View>
          ))}
        </View>
      )}

      {creating ? (
        <View className={styles.card}>
          <Input
            className={styles.input}
            value={newName}
            placeholder='档案名称（如：我 / 妈妈）'
            onInput={(e) => setNewName(e.detail.value)}
          />
          <View className={styles.accents}>
            {PROFILE_ACCENTS.map((accent) => (
              <View
                key={accent}
                className={classnames(styles.accentOption, newAccent === accent && styles.accentSelected)}
                style={{ backgroundColor: accent }}
                onClick={() => setNewAccent(accent)}
              />
            ))}
          </View>
          <Button className={styles.createBtn} onClick={handleCreate} disabled={submitting}>
            <Text className={styles.createBtnText}>{submitting ? '创建中...' : '创建并选择'}</Text>
          </Button>
        </View>
      ) : (
        <Button className={styles.createBtn} onClick={() => setCreating(true)}>
          <Text className={styles.createBtnText}>新建档案</Text>
        </Button>
      )}
    </View>
  );
};

export default ProfilesPage;
