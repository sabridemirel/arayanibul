import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, SectionList, Switch, StyleSheet, Alert } from 'react-native';
import { categoryAPI } from '../services/api';
import { Category } from '../types';
import Loading from '../components/ui/Loading';
import { colors, spacing, borderRadius } from '../theme';

interface Row {
  id: number;
  label: string;
  /** The "whole category" row of a main category */
  isRoot: boolean;
  rootId: number;
}

/**
 * Lets a seller pick the categories they want to hear about: every new listing in a followed
 * category creates a notification and, if enabled, an e-mail. Following a main category covers
 * all of its subcategories. Changes are saved as they are made.
 */
const CategoryFollowsScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [followed, setFollowed] = useState<Set<number>>(new Set());
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  // Saves are sent one after another so a quick second tap cannot be overwritten by the first reply
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    Promise.all([categoryAPI.getCategories(), categoryAPI.getFollows()])
      .then(([allCategories, follows]) => {
        setCategories(allCategories.filter((category) => category.isActive));
        setFollowed(new Set(follows.categoryIds));
        setEmailEnabled(follows.emailEnabled);
      })
      .catch(() => {
        Alert.alert('Yüklenemedi', 'Kategoriler yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const sections = useMemo(() => {
    const roots = categories
      .filter((category) => !category.parentCategoryId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return roots.map((root) => {
      const name = root.nameTr || root.name;
      const children = categories
        .filter((category) => category.parentCategoryId === root.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const rows: Row[] = [
        { id: root.id, label: `Tüm ${name}`, isRoot: true, rootId: root.id },
        ...children.map((child) => ({
          id: child.id,
          label: child.nameTr || child.name,
          isRoot: false,
          rootId: root.id,
        })),
      ];
      return { title: name, data: rows };
    });
  }, [categories]);

  const save = (nextFollowed: Set<number>, nextEmailEnabled: boolean) => {
    const previousFollowed = followed;
    const previousEmailEnabled = emailEnabled;
    setFollowed(nextFollowed);
    setEmailEnabled(nextEmailEnabled);

    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await categoryAPI.setFollows([...nextFollowed], nextEmailEnabled);
      } catch (err: any) {
        setFollowed(previousFollowed);
        setEmailEnabled(previousEmailEnabled);
        Alert.alert(
          'Kaydedilemedi',
          err.response?.data?.message || 'Tercihiniz kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
        );
      }
    });
  };

  const toggle = (categoryId: number) => {
    const next = new Set(followed);
    if (next.has(categoryId)) next.delete(categoryId);
    else next.add(categoryId);
    save(next, emailEnabled);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Loading text="Kategoriler yükleniyor..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.id.toString()}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.intro}>
              Satış yaptığınız kategorileri seçin; o kategoride yeni bir ilan yayınlandığında size haber
              verelim. Teklif vermek ücretsizdir.
            </Text>
            <View style={[styles.row, styles.emailRow]}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>E-postayla da bildir</Text>
                <Text style={styles.rowHint}>Günde en fazla 5 e-posta gönderilir.</Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={(value) => save(followed, value)}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel="Yeni ilanları e-postayla da bildir"
              />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => {
          const rootFollowed = followed.has(item.rootId);
          // The whole category already covers each of its subcategories
          const impliedByRoot = !item.isRoot && rootFollowed;
          return (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, styles.rowText, item.isRoot && styles.rootLabel]}>{item.label}</Text>
              <Switch
                value={impliedByRoot || followed.has(item.id)}
                disabled={impliedByRoot}
                onValueChange={() => toggle(item.id)}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel={`${item.label} kategorisini takip et`}
              />
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.xl },
  intro: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, padding: spacing.md },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emailRow: {
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
  },
  rowText: { flex: 1, paddingRight: spacing.md },
  rowLabel: { fontSize: 16, color: colors.text },
  rootLabel: { fontWeight: '600' },
  rowHint: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});

export default CategoryFollowsScreen;
