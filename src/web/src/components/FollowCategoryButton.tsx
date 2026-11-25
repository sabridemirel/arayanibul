import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellAlertIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { categoryAPI } from '../services/api';
import type { CategoryFollows } from '../services/api';

interface FollowCategoryButtonProps {
  categoryId: number;
  categoryName: string;
}

/** One-tap follow for the category being browsed: new listings in it are then announced to the user. */
const FollowCategoryButton: React.FC<FollowCategoryButtonProps> = ({ categoryId, categoryName }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isGuest } = useAuth();
  const isMember = isAuthenticated && !isGuest;

  const [follows, setFollows] = useState<CategoryFollows | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isMember) return;
    let cancelled = false;
    categoryAPI
      .getFollows()
      .then((result) => {
        if (!cancelled) setFollows(result);
      })
      .catch(() => {
        // The button then behaves as "not following"; saving will report a real failure.
      });
    return () => {
      cancelled = true;
    };
  }, [isMember]);

  const isFollowing = follows?.categoryIds.includes(categoryId) ?? false;

  const toggle = async () => {
    if (!isMember) {
      navigate('/register', { state: { guestNotice: true } });
      return;
    }

    const current = follows ?? { categoryIds: [], emailEnabled: true };
    const categoryIds = isFollowing
      ? current.categoryIds.filter((id) => id !== categoryId)
      : [...current.categoryIds, categoryId];

    setIsSaving(true);
    setMessage(null);
    try {
      const result = await categoryAPI.setFollows(categoryIds, current.emailEnabled);
      setFollows(result);
      setMessage(
        result.categoryIds.includes(categoryId)
          ? `${categoryName} kategorisinde yeni ilan yayınlandığında size haber vereceğiz.`
          : `${categoryName} kategorisi için bildirimler kapatıldı.`
      );
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(apiMessage || 'Tercihiniz kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  const Icon = isFollowing ? BellSlashIcon : BellAlertIcon;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={isSaving}
        aria-pressed={isFollowing}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 ${
          isFollowing
            ? 'border-border bg-surface text-text hover:border-primary'
            : 'border-primary bg-primary text-white hover:bg-primary-dark'
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        {isFollowing ? 'Takibi Bırak' : 'Yeni İlanlardan Haberdar Ol'}
      </button>
      {message && (
        <p role="status" className="text-sm text-text-secondary">
          {message}
        </p>
      )}
    </div>
  );
};

export default FollowCategoryButton;
