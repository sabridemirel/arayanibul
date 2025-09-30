import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { userAPI, Transaction } from '../services/api';
import { Card, Loading, ErrorMessage } from '../components/ui';
import { colors, spacing, borderRadius, typography } from '../theme';
import { RootStackParamList } from '../types';

type TransactionHistoryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'TransactionHistory'
>;

const TransactionHistoryScreen: React.FC = () => {
  const navigation = useNavigation<TransactionHistoryScreenNavigationProp>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 20;

  useEffect(() => {
    loadTransactions(1);
  }, []);

  const loadTransactions = async (pageNum: number, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const data = await userAPI.getTransactionHistory({
        page: pageNum,
        pageSize: PAGE_SIZE,
      });

      if (append) {
        setTransactions((prev) => [...prev, ...data]);
      } else {
        setTransactions(data);
      }

      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.response?.data?.message || 'İşlemler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions(1);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadTransactions(page + 1, true);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Bugün';
    } else if (diffDays === 1) {
      return 'Dün';
    } else if (diffDays < 7) {
      return `${diffDays} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  const formatAmount = (amount: number, currency: string): string => {
    return `${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed':
        return colors.success;
      case 'Pending':
        return colors.warning;
      case 'Failed':
        return colors.error;
      case 'Refunded':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'Completed':
        return 'Tamamlandı';
      case 'Pending':
        return 'Beklemede';
      case 'Failed':
        return 'Başarısız';
      case 'Refunded':
        return 'İade Edildi';
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
    return type === 'Refund' ? 'keyboard-return' : 'payment';
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('NeedDetail', { needId: item.needId })}
    >
      <Card style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIcon}>
            <MaterialIcons
              name={getTypeIcon(item.type)}
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle} numberOfLines={2}>
              {item.needTitle}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(item.transactionDate)}</Text>
          </View>
        </View>

        <View style={styles.transactionFooter}>
          <View style={styles.amountContainer}>
            <Text style={styles.transactionAmount}>
              {formatAmount(item.amount, item.currency)}
            </Text>
            <Text style={styles.transactionType}>
              {item.type === 'Refund' ? 'İade' : 'Ödeme'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="receipt-long" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>Henüz tamamlanmış işleminiz yok</Text>
      <Text style={styles.emptySubtitle}>
        İşlemleriniz burada görünecektir
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoading}>
        <Loading size="small" />
      </View>
    );
  };

  if (loading) {
    return <Loading text="İşlemler yükleniyor..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => loadTransactions(1)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İşlem Geçmişi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          transactions.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    padding: spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  transactionCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  transactionHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountContainer: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLoading: {
    paddingVertical: spacing.md,
  },
});

export default TransactionHistoryScreen;