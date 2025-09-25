import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

interface PerformanceMetrics {
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const startTime = useRef<number>(Date.now());
  const interactionStartTime = useRef<number | null>(null);

  useEffect(() => {
    // Mark the start of interaction
    interactionStartTime.current = Date.now();

    // Measure when interactions are complete
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      const interactionTime = interactionStartTime.current 
        ? Date.now() - interactionStartTime.current 
        : 0;

      const renderTime = Date.now() - startTime.current;

      const newMetrics: PerformanceMetrics = {
        renderTime,
        interactionTime,
      };

      // Add memory usage if available (development only)
      if (__DEV__ && (global as any).performance?.memory) {
        newMetrics.memoryUsage = (global as any).performance.memory.usedJSHeapSize;
      }

      setMetrics(newMetrics);

      // Log performance metrics in development
      if (__DEV__) {
        console.log(`[Performance] ${componentName}:`, {
          renderTime: `${renderTime}ms`,
          interactionTime: `${interactionTime}ms`,
          memoryUsage: newMetrics.memoryUsage 
            ? `${Math.round(newMetrics.memoryUsage / 1024 / 1024)}MB` 
            : 'N/A'
        });
      }
    });

    return () => {
      interactionPromise.cancel();
    };
  }, [componentName]);

  const measureOperation = async <T>(
    operationName: string, 
    operation: () => Promise<T>
  ): Promise<T> => {
    const operationStart = Date.now();
    
    try {
      const result = await operation();
      const operationTime = Date.now() - operationStart;
      
      if (__DEV__) {
        console.log(`[Performance] ${componentName}.${operationName}: ${operationTime}ms`);
      }
      
      return result;
    } catch (error) {
      const operationTime = Date.now() - operationStart;
      
      if (__DEV__) {
        console.log(`[Performance] ${componentName}.${operationName} (failed): ${operationTime}ms`);
      }
      
      throw error;
    }
  };

  return {
    metrics,
    measureOperation,
  };
};