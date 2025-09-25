import React, { useMemo } from 'react';
import { FlatList, FlatListProps, ListRenderItem } from 'react-native';

interface VirtualizedListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: ListRenderItem<T>;
  itemHeight?: number;
  estimatedItemSize?: number;
  windowSize?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  initialNumToRender?: number;
  removeClippedSubviews?: boolean;
}

export function VirtualizedList<T>({
  data,
  renderItem,
  itemHeight,
  estimatedItemSize = 100,
  windowSize = 10,
  maxToRenderPerBatch = 10,
  updateCellsBatchingPeriod = 50,
  initialNumToRender = 10,
  removeClippedSubviews = true,
  ...props
}: VirtualizedListProps<T>) {
  
  const keyExtractor = useMemo(() => {
    return (item: T, index: number) => {
      // Try to use id if available, otherwise use index
      if (typeof item === 'object' && item !== null && 'id' in item) {
        return String((item as any).id);
      }
      return String(index);
    };
  }, []);

  const getItemLayout = useMemo(() => {
    if (itemHeight) {
      return (data: any, index: number) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      });
    }
    return undefined;
  }, [itemHeight]);

  const optimizedRenderItem: ListRenderItem<T> = useMemo(() => {
    return ({ item, index }) => {
      return renderItem({ item, index, separators: {} as any });
    };
  }, [renderItem]);

  return (
    <FlatList
      data={data}
      renderItem={optimizedRenderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      windowSize={windowSize}
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      initialNumToRender={initialNumToRender}
      removeClippedSubviews={removeClippedSubviews}
      // Performance optimizations
      disableIntervalMomentum={true}
      scrollEventThrottle={16}
      {...props}
    />
  );
}