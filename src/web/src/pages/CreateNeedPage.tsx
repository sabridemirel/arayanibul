import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useCategoryConfirm } from '../hooks/useCategoryConfirm';
import { needAPI } from '../services/api';
import type { CreateNeedRequest, Need } from '../services/api';
import { ErrorMessage } from '../components/ui';
import { Header, Footer } from '../components/layout';
import NeedForm from '../components/need/NeedForm';
import QuickNeedComposer from '../components/need/QuickNeedComposer';
import { clearPendingNeedDraft, loadPendingNeedDraft, savePendingNeedDraft } from '../utils/pendingNeedDraft';
import { composeDescription, emptyNeedFormValues, URGENCY_TO_API } from '../components/need/needFormTypes';
import type { NeedFormExtras, NeedFormSubmitData, NeedFormValues } from '../components/need/needFormTypes';

/** What the form opens with: a sentence's suggestions (quick), nothing (detailed) or a saved draft. */
interface FormSeed extends NeedFormExtras {
  values: NeedFormValues;
  detailsOpen: boolean;
  /** Changes on every new seed so the form starts over */
  key: number;
}

const CreateNeedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isGuest } = useAuth();
  const { confirmCategory, categoryDialog } = useCategoryConfirm();
  const canPublish = isAuthenticated && !isGuest && Boolean(user);

  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // A listing written before signing in comes back here after login / registration.
  const [seed, setSeed] = useState<FormSeed | null>(() => {
    const restored = loadPendingNeedDraft();
    return restored ? { ...restored, detailsOpen: false, key: 1 } : null;
  });
  useEffect(() => {
    clearPendingNeedDraft();
  }, []);

  const openForm = (values: NeedFormValues, extras: NeedFormExtras, detailsOpen: boolean) => {
    setSubmitError(null);
    setSeed((current) => ({ values, ...extras, detailsOpen, key: (current?.key ?? 0) + 1 }));
    window.scrollTo({ top: 0 });
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

  const handleSubmit = async ({ values, newImages }: NeedFormSubmitData) => {
    setSubmitError(null);

    if (!canPublish) {
      // Keep what was written for after signing up; photos are added then.
      savePendingNeedDraft({ values, questions: seed?.questions ?? [], product: seed?.product ?? null });
      navigate('/register', { state: { guestNotice: true, pendingNeed: true } });
      return;
    }

    const description = composeDescription(values);
    setIsLoading(true);
    const categoryId = await confirmCategory(values.title.trim(), description, values.categoryId!);
    if (categoryId === null) {
      setIsLoading(false);
      return;
    }

    try {
      const request: CreateNeedRequest = {
        title: values.title.trim(),
        description,
        categoryId,
        urgency: URGENCY_TO_API[values.urgency],
      };
      if (values.isFixedPrice) {
        request.isFixedPrice = true;
        request.maxBudget = Number(values.price);
      }
      if (values.address.trim()) request.address = values.address.trim();
      if (values.expiryDate) request.expiresAt = new Date(`${values.expiryDate}T23:59:59`).toISOString();

      const created = await needAPI.createNeed(request);

      // Photos are uploaded after the listing exists; a failed upload must not lose the listing.
      let imageWarning = '';
      if (newImages.length > 0) {
        try {
          await needAPI.uploadNeedImages(created.id, newImages);
        } catch (uploadErr) {
          console.error('Need image upload error:', uploadErr);
          imageWarning = ' Fotoğraflar yüklenemedi; ilanınızı düzenleyerek tekrar ekleyebilirsiniz.';
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
      {categoryDialog}
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-text">İlan Ver</h1>
            <p className="mt-2 text-text-secondary">
              Aradığınızı yazın, satıcılar size teklif getirsin. İlan vermek ücretsiz.
            </p>
          </div>

          {submitError && (
            <ErrorMessage message={submitError} onDismiss={() => setSubmitError(null)} className="mb-6" />
          )}

          {seed === null ? (
            <QuickNeedComposer
              initialText={searchParams.get('q') ?? ''}
              onReady={(values, extras) => openForm(values, extras, false)}
              onUseDetailedForm={() => openForm(emptyNeedFormValues(), { questions: [], product: null }, true)}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSeed(null)}
                className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                Baştan yaz
              </button>
              <NeedForm
                key={seed.key}
                initialValues={seed.values}
                questions={seed.questions}
                product={seed.product}
                detailsOpen={seed.detailsOpen}
                canAddPhotos={canPublish}
                submitLabel="İlanı Yayınla"
                isSubmitting={isLoading}
                onSubmit={handleSubmit}
                notice={
                  <p className="mb-3 flex items-center justify-center gap-2 text-sm text-text-secondary">
                    <InformationCircleIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
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
