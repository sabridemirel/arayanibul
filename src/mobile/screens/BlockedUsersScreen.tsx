import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { blockAPI, BlockedUser } from '../services/api';
import Loading from '../components/ui/Loading';
import ErrorMessage from '../components/ui/ErrorMessage';
import { colors, spacing, typography, borderRadius } from '../theme';

const BlockedUsersScreen: React.FC = () => {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setUsers(await blockAPI.getBlockedUsers());
    } catch (err) {
      console.warn('Error loading blocked users:', err);
      setError('Engellenen kullanıcılar yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unblock = async (item: BlockedUser) => {
    try {
      setBusyId(item.userId);
      const res = await blockAPI.unblockUser(item.userId);
      setUsers(prev => prev.filter(u => u.userId !== item.userId));
      if (res?.message) Alert.alert('Engel Kaldırıldı', res.message);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      Alert.alert(
        'Hata',
        typeof message === 'string' && message
          ? message
          : 'Engel kaldırılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmUnblock = (item: BlockedUser) => {
    Alert.alert('Engeli Kaldır', `${item.fullName} adlı kullanıcının engelini kaldırmak istiyor musunuz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Engeli Kaldır', onPress: () => unblock(item) },
    ]);
  };

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.row}>
      <MaterialIcons name="person-off" size={24} color={colors.textSecondary} />
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
        {item.blockedAt ? (
          <Text style={styles.meta}>
            {new Date(item.blockedAt).toLocaleDateString('tr-TR')} tarihinde engellendi
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={() => confirmUnblock(item)}
        disabled={busyId === item.userId}
        style={[styles.unblockButton, busyId === item.userId && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`${item.fullName} engelini kaldır`}
      >
        <Text style={styles.unblockText}>Engeli Kaldır</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return <Loading text="Yükleniyor..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error} onRetry={() => load()} showRetry />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={users}
      keyExtractor={item => item.userId}
      renderItem={renderItem}
      contentContainerStyle={users.length === 0 ? styles.emptyContent : styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialIcons name="block" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Engellediğiniz kullanıcı yok.</Text>
          <Text style={styles.emptyText}>
            Bir kullanıcıyı mesajlaşma ekranındaki menüden engelleyebilirsiniz.
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginLeft: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  unblockText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default BlockedUsersScreen;
