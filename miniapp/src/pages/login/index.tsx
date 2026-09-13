import React, { useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { loginUser, registerUser } from '@/services/api';
import { useAppStore } from '@/store/app-store';
import { getErrorMessage } from '@/utils/error';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setSession = useAppStore((state) => state.setSession);

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError('请填写用户名和密码。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const session = mode === 'login' ? await loginUser(username.trim(), password) : await registerUser(username.trim(), password);
      console.log(`[Auth] ${mode === 'login' ? '登录' : '注册'}成功`);
      setSession(session);
      Taro.switchTab({ url: '/pages/home/index' });
    } catch (err) {
      const message = getErrorMessage(err, '操作失败，请稍后重试。');
      console.error('[Auth] 提交失败：', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={styles.container}>
      <View className={styles.brand}>
        <Text className={styles.logo}>🥗</Text>
        <Text className={styles.title}>饮食计划</Text>
        <Text className={styles.subtitle}>拍照识别食物，轻松记录每一餐</Text>
      </View>

      <View className={styles.card}>
        <View className={styles.tabs}>
          <View className={classnames(styles.tab, mode === 'login' && styles.tabActive)} onClick={() => setMode('login')}>
            <Text className={classnames(styles.tabText, mode === 'login' && styles.tabTextActive)}>登录</Text>
          </View>
          <View className={classnames(styles.tab, mode === 'register' && styles.tabActive)} onClick={() => setMode('register')}>
            <Text className={classnames(styles.tabText, mode === 'register' && styles.tabTextActive)}>注册</Text>
          </View>
        </View>

        <View className={styles.field}>
          <Text className={styles.label}>用户名</Text>
          <Input
            className={styles.input}
            value={username}
            placeholder='请输入用户名'
            onInput={(e) => setUsername(e.detail.value)}
          />
        </View>

        <View className={styles.field}>
          <Text className={styles.label}>密码</Text>
          <Input
            className={styles.input}
            value={password}
            password
            placeholder='请输入密码'
            onInput={(e) => setPassword(e.detail.value)}
          />
        </View>

        {error ? <Text className={styles.error}>{error}</Text> : null}

        <Button
          className={classnames(styles.submit, loading && styles.submitDisabled)}
          onClick={handleSubmit}
          disabled={loading}
        >
          <Text className={styles.submitText}>{loading ? '请稍候...' : mode === 'login' ? '登录' : '注册并登录'}</Text>
        </Button>
      </View>
    </View>
  );
};

export default LoginPage;
