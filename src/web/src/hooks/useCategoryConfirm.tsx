import { useCallback, useRef, useState } from 'react';
import { needAPI } from '../services/api';
import type { CategoryCheck } from '../services/api';
import { Button, Modal } from '../components/ui';

type Pending = { check: CategoryCheck; resolve: (categoryId: number | null) => void; chosenId: number };

/**
 * Before a listing is saved: if its words point to a different category group than the chosen
 * one ("kiralık ev" under computer parts), offer the suggested category. Resolves with the category
 * to use, or null when the person closed the dialog to keep editing.
 */
export const useCategoryConfirm = () => {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const confirmCategory = useCallback(
    async (title: string, description: string, categoryId: number): Promise<number | null> => {
      let check: CategoryCheck;
      try {
        check = await needAPI.checkCategory({ title, description, categoryId });
      } catch {
        return categoryId; // The server checks again when the listing is saved
      }
      if (check.matches || !check.suggestedCategoryId) return categoryId;

      return new Promise((resolve) => {
        const next = { check, resolve, chosenId: categoryId };
        pendingRef.current = next;
        setPending(next);
      });
    },
    []
  );

  const finish = (categoryId: number | null) => {
    pendingRef.current?.resolve(categoryId);
    pendingRef.current = null;
    setPending(null);
  };

  const suggestion = pending?.check;
  const suggestedLabel = suggestion
    ? suggestion.suggestedParentName
      ? `${suggestion.suggestedParentName} › ${suggestion.suggestedCategoryName}`
      : suggestion.suggestedCategoryName
    : '';

  const dialog = (
    <Modal
      isOpen={pending !== null}
      onClose={() => finish(null)}
      title="Kategori ilanınıza uymuyor gibi"
      description={
        <>
          Yazdıklarınız <strong className="text-text">{suggestedLabel}</strong> kategorisine daha uygun
          görünüyor. Doğru kategorideki satıcılar ilanınızı daha kolay bulur.
        </>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => pending && finish(pending.chosenId)}>
            Kategorimi Koru
          </Button>
          <Button onClick={() => finish(suggestion?.suggestedCategoryId ?? null)}>
            {suggestion?.suggestedCategoryName} Kategorisine Taşı
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">
        Kategorinizi korursanız ilanınız yayına girmeden önce kısa bir incelemeden geçer.
      </p>
    </Modal>
  );

  return { confirmCategory, categoryDialog: dialog };
};
