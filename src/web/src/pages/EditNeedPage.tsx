import React, { useState, useEffect, useCallback } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, InformationCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, getApiErrorStatus } from '../services/api';
import type { Need, UpdateNeedRequest } from '../services/api';
import { Button, Card, ErrorMessage, Loading } from '../components/ui';
import { Header, Footer } from '../components/layout';
import NeedForm from '../components/need/NeedForm';
import NeedModerationNotice from '../components/NeedModerationNotice';
import { URGENCY_TO_API } from '../components/need/needFormTypes';
import type { NeedFormSubmitData, NeedFormValues } from '../components/need/needFormTypes';
import { isNeedEditable } from '../services/moderation';

const toFormValues = (need: Need): NeedFormValues => ({
  title: need.title ?? '',
  description: need.description ?? '',
  categoryId: need.categoryId ?? null,
  minBudget: need.minBudget != null ? String(Math.round(need.minBudget)) : '',
  maxBudget: need.maxBudget != null ? String(Math.round(need.maxBudget)) : '',
  isFixedPrice: Boolean(need.isFixedPrice),
  address: need.address ?? '',
  urgency: need.urgency ?? 'Normal',
  expiryDate: need.expiresAt ? need.expiresAt.split('T')[0] : '',
});

/** Only the fields the user actually changed, so detail-only edits do not look like content edits */
const buildUpdateRequest = (initial: NeedFormValues, values: NeedFormValues): UpdateNeedRequest => {
  const request: UpdateNeedRequest = {};
  const title = values.title.trim();
  const description = values.description.trim();
  const address = values.address.trim();

  if (title !== initial.title.trim()) request.title = title;
  if (description !== initial.description.trim()) request.description = description;
  if (values.categoryId && values.categoryId !== initial.categoryId) request.categoryId = values.categoryId;
  if (values.isFixedPrice !== initial.isFixedPrice) request.isFixedPrice = values.isFixedPrice;
  if (!values.isFixedPrice && values.minBudget !== initial.minBudget && values.minBudget) {
    request.minBudget = Number(values.minBudget);
  }
  if (values.maxBudget !== initial.maxBudget && values.maxBudget) request.maxBudget = Number(values.maxBudget);
  if (address !== initial.address.trim()) request.address = address;
  if (values.urgency !== initial.urgency) request.urgency = URGENCY_TO_API[values.urgency];
  if (values.expiryDate && values.expiryDate !== initial.expiryDate) {
    request.expiresAt = new Date(`${values.expiryDate}T23:59:59`).toISOString();
  }
  return request;
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (getApiErrorStatus(err) === 401) return 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.';
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
};

const EditNeedPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const needId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [need, setNeed] = useState<Need | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadNeed = useCallback(async () => {
    if (!needId) {
      setLoadError('İlan bulunamadı.');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setLoadError(null);
      setNeed(await needAPI.getNeedById(needId));
    } catch (err) {
      setLoadError(
        getApiErrorStatus(err) === 404
          ? 'İlan bulunamadı.'
          : 'İlan yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [needId]);

  useEffect(() => {
    loadNeed();
  }, [loadNeed]);

  const handleSubmit = async ({ values, newImages, keptImages, removedImageIds }: NeedFormSubmitData) => {
    if (!need) return;
    setSubmitError(null);
    setIsSaving(true);

    let detailsSaved = false;
    try {
      const request = buildUpdateRequest(toFormValues(need), values);
      if (Object.keys(request).length > 0) {
        await needAPI.updateNeed(need.id, request);
      }
      detailsSaved = true;

      for (const imageId of removedImageIds) {
        await needAPI.deleteNeedImage(need.id, imageId);
      }

      if (newImages.length > 0) {
        const uploadedUrls = await needAPI.uploadNeedImages(need.id, newImages);
        if (keptImages.length > 0) {
          // Pin the final, ordered image list (kept + new) so it is right whether the upload appends or replaces
          await needAPI.updateNeed(need.id, {
            imageUrls: [...keptImages.map(image => image.imageUrl), ...uploadedUrls],
          });
        }
      }

      const updated = await needAPI.getNeedById(need.id);
      navigate('/my-needs', {
        state: {
          flash: updated.status === 'PendingReview'
            ? 'İlanınız güncellendi ve yeniden incelemeye gönderildi.'
            : 'İlanınız güncellendi.',
        },
      });
    } catch (err) {
      console.error('Need update error:', err);
      setSubmitError(
        detailsSaved
          ? getErrorMessage(err, 'İlan bilgileri kaydedildi ancak görseller güncellenemedi. Görselleri kontrol edip tekrar deneyin.')
          : getErrorMessage(err, 'İlan kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.')
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Saved parts (details, deleted images) must show up in the form before another attempt
      if (detailsSaved) {
        await loadNeed();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="py-16 flex items-center justify-center">
          <Loading size="lg" text="İlan yükleniyor..." />
        </div>
      );
    }

    if (loadError || !need) {
      return (
        <Card className="text-center py-10">
          <p className="text-text mb-4">{loadError || 'İlan bulunamadı.'}</p>
          <Button variant="outline" onClick={() => navigate('/my-needs')}>
            İlanlarıma Dön
          </Button>
        </Card>
      );
    }

    if (!user || user.id !== need.userId) {
      return <Navigate to={`/needs/${need.id}`} replace />;
    }

    if (!isNeedEditable(need.status)) {
      return (
        <Card className="text-center py-10">
          <LockClosedIcon className="h-10 w-10 text-text-secondary mx-auto mb-3" />
          <p className="text-text font-medium">Bu ilan artık düzenlenemez.</p>
          <p className="mt-1 text-sm text-text-secondary">
            Yalnızca aktif, incelemede veya yayınlanmamış ilanlar düzenlenebilir.
          </p>
          <div className="mt-5">
            <Link to={`/needs/${need.id}`} className="text-primary font-medium hover:underline">
              İlana Dön
            </Link>
          </div>
        </Card>
      );
    }

    const isRejected = need.status === 'Rejected';
    const noticeText = need.status === 'Active'
      ? 'Başlık, açıklama, kategori veya görsel değişikliği ilanınızı yeniden incelemeye gönderir.'
      : isRejected
        ? 'İlanınızın yeniden incelenmesi için başlık, açıklama, kategori veya görselleri kurallara uygun şekilde düzenleyin.'
        : null;

    return (
      <>
        {(isRejected || need.status === 'PendingReview') && (
          <NeedModerationNotice need={need} compact className="mb-6" />
        )}

        {submitError && (
          <ErrorMessage
            message={submitError}
            onDismiss={() => setSubmitError(null)}
            className="mb-6"
          />
        )}

        <NeedForm
          // Remount with fresh values after a partial save reloads the need
          key={`${need.id}-${need.updatedAt}`}
          initialValues={toFormValues(need)}
          existingImages={need.images ?? []}
          submitLabel={isRejected ? 'Düzenle ve Tekrar Gönder' : 'Değişiklikleri Kaydet'}
          isSubmitting={isSaving}
          onSubmit={handleSubmit}
          notice={noticeText && (
            <p className="flex items-start justify-center gap-2 text-sm text-text-secondary mb-3 text-center">
              <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {noticeText}
            </p>
          )}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to={needId ? `/needs/${needId}` : '/my-needs'}
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            İlana Dön
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-text">İlanı Düzenle</h1>
            <p className="mt-2 text-text-secondary">
              İlanınızın bilgilerini güncelleyin.
            </p>
          </div>

          {renderBody()}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EditNeedPage;
