import { useRef, useCallback } from 'react';

/**
 * Hook que previene múltiples ejecuciones de una acción en un período de tiempo
 * Solo ejecuta la acción en el primer click, ignora clicks subsecuentes por el período especificado
 */
export function useThrottledAction(action, delay = 2000) {
  const isThrottled = useRef(false);
  const timeoutRef = useRef(null);

  const throttledAction = useCallback(async (...args) => {
    // Si está en throttling, ignorar este click
    if (isThrottled.current) {
      console.log('⏸️ Action throttled, ignoring click');
      return;
    }

    // Marcar como throttled
    isThrottled.current = true;
    console.log('🚀 Executing throttled action');

    try {
      // Ejecutar la acción
      await action(...args);
    } catch (error) {
      console.error('❌ Throttled action failed:', error);
    } finally {
      // Limpiar el throttling después del delay
      timeoutRef.current = setTimeout(() => {
        isThrottled.current = false;
        console.log('✅ Throttling cleared, ready for next action');
      }, delay);
    }
  }, [action, delay]);

  // Cleanup en unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      isThrottled.current = false;
    }
  }, []);

  return [throttledAction, cleanup];
}