import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { needAPI } from '../services/api';
import type { CreateNeedRequest, Need } from '../services/api';
import { ErrorMessage } from '../components/ui';
import { Header, Footer } from '../components/layout';
import NeedForm from '../components/need/NeedForm';
import QuickNeedComposer from '../components/need/QuickNeedComposer';
import {
  clearPendingNeedDraft,
  loadPendingNeedDraft,
  savePendingNeedDraft,
} from '../utils/pendingNeedDraft';
import type { PendingNeedDraft } from '../utils/pendingNeedDraft';
import { URGENCY_TO_API } from '../components/need/needFormTypes';
import type { NeedFormSubmitData, NeedFormValues } from '../components/need/needFormTypes';

/** Listing text plus the one-tap answers, one per line ("Durum: İkinci el"). */
const describe = (draft: PendingNeedDraft): string =>
  [draft.description.trim(), ...Object.entries(draft.answers).map(([label, answer]) => `${label}: ${answer}`)]
    .filter(Boolean)
    .join('\n');

const CreateNeedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isGuest } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // A listing written before signing in comes back here after login / registration.
  const [restoredDraft] = useState<PendingNeedDraft | null>(() => loadPendingNeedDraft());
  useEffect(() => {
    clearPendingNeedDraft();
  }, []);

  // 'quick': one sentence, then confirm. 'detailed': the long form (photos, urgency, end date).
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');
  const [detailedSeed, setDetailedSeed] = useState<PendingNeedDraft | null>(null);

  const canPublish = isAuthenticated && !isGuest && Boolean(user);

  // Default expiry date: 30 days from now
  const initialValues = useMemo<NeedFormValues>(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    return {
      title: detailedSeed?.title ?? '',
      description: detailedSeed ? describe(detailedSeed) : '',
      categoryId: detailedSeed?.categoryId ?? null,
      minBudget: detailedSeed?.minBudget ?? '',
      maxBudget: detailedSeed?.maxBudget ?? '',
      isFixedPrice: detailedSeed?.isFixedPrice ?? false,
      address: detailedSeed?.address ?? '',
      urgency: 'Normal',
      expiryDate: defaultDate.toISOString().split('T')[0],
    };
  }, [detailedSeed]);

  /** Sends the visitor to sign up, keeping what they wrote for when they come back. */
  const askToSignIn = (draft: PendingNeedDraft) => {
    savePendingNeedDraft(draft);
    navigate('/register', { state: { guestNotice: true, pendingNeed: true } });
  };

  const goToResult = (created: Need, imageWarning = '') => {
    const flash =
      created.status === 'PendingReview'
        ? `İlanınız alındı. Kısa bir incelemenin ardından yayınlanacak.${imageWarning}`
        : `İlanınız yayında. Teklif geldiğinde size haber vereceğiz.${imageWarning}`;
    navigate('/my-needs', { state: { flash } });
  };

  const showError = (err: unknown) => {
    console.error('Need creation error:', err);
    const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
    let errorMessage = 'İlan kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';

    if (axiosError.response?.status === 401) {
      errorMessage = 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.';
    } else if (axiosError.response?.data?.message) {
      errorMessage = axiosError.response.data.message;
    }

    setSubmitError(errorMessage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickPublish = async (draft: PendingNeedDraft) => {
    setSubmitError(null);
    if (!canPublish) {
      askToSignIn(draft);
      return;
    }

    try {
      setIsLoading(true);
      const requestData: CreateNeedRequest = {
        title: draft.title.trim(),
        description: describe(draft),
        categoryId: draft.categoryId!,
        urgency: URGENCY_TO_API.Normal,
      };
      if (draft.isFixedPrice) requestData.isFixedPrice = true;
      else if (draft.minBudget) requestData.minBudget = Number(draft.minBudget);
      if (draft.maxBudget) requestData.maxBudget = Number(draft.maxBudget);
      if (draft.address.trim()) requestData.address = draft.address.trim();

      goToResult(await needAPI.createNeed(requestData));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async ({ values, newImages }: NeedFormSubmitData) => {
    setSubmitError(null);

    if (!canPublish) {
      askToSignIn({
        text: values.title,
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        minBudget: values.minBudget,
        maxBudget: values.maxBudget,
        isFixedPrice: values.isFixedPrice,
        address: values.address,
        answers: {},
      });
      return;
    }

    try {
      setIsLoading(true);

      const requestData: CreateNeedRequest = {
        title: values.title.trim(),
        description: values.description.trim(),
        categoryId: values.categoryId!,
        urgency: URGENCY_TO_API[values.urgency],
      };

      if (values.isFixedPrice) {
        requestData.isFixedPrice = true;
      } else if (values.minBudget) {
        requestData.minBudget = Number(values.minBudget);
      }

      if (values.maxBudget) {
        requestData.maxBudget = Number(values.maxBudget);
      }

      if (values.address.trim()) {
        requestData.address = values.address.trim();
      }

      const created = await needAPI.createNeed(requestData);

      // Images are uploaded after the need exists; a failed upload must not lose the need itself.
      let imageWarning = '';
      if (newImages.length > 0) {
        try {
          await needAPI.uploadNeedImages(created.id, newImages);
        } catch (uploadErr) {
          console.error('Need image upload error:', uploadErr);
          imageWarning = ' Görseller yüklenemedi; ilanınızı düzenleyerek tekrar ekleyebilirsiniz.';
        }
      }

      goToResult(created, imageWarning);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-text">
              İlan Ver
            </h1>
            <p className="mt-2 text-text-secondary">
              Aradığınızı yazın, satıcılar size teklif getirsin. İlan vermek ücretsiz.
            </p>
          </div>

          {/* Error Message */}
          {submitError && (
            <ErrorMessage
              message={submitError}
              onDismiss={() => setSubmitError(null)}
              className="mb-6"
            />
          )}

          {mode === 'quick' ? (
            <QuickNeedComposer
              initialText={searchParams.get('q') ?? ''}
              initialDraft={restoredDraft}
              isSubmitting={isLoading}
              onPublish={handleQuickPublish}
              onUseDetailedForm={(draft) => {
                setDetailedSeed(draft);
                setMode('detailed');
              }}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMode('quick')}
                className="mb-4 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Hızlı ilana dön
              </button>
              <NeedForm
                key={detailedSeed ? 'seeded' : 'empty'}
                initialValues={initialValues}
                submitLabel="İlanı Yayınla"
                isSubmitting={isLoading}
                onSubmit={handleSubmit}
                notice={
                  <p className="flex items-center justify-center gap-2 text-sm text-text-secondary mb-3">
                    <InformationCircleIcon className="h-4 w-4 flex-shrink-0" />
                    Uygun ilanlar hemen yayınlanır; bazı ilanlar kısa bir incelemeden geçebilir.
                  </p>
                }
              />
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateNeedPage;
