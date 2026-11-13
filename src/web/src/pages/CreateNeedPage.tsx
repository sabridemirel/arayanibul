import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { needAPI } from '../services/api';
import type { CreateNeedRequest } from '../services/api';
import { ErrorMessage } from '../components/ui';
import { Header, Footer } from '../components/layout';
import NeedForm from '../components/need/NeedForm';
import { URGENCY_TO_API } from '../components/need/needFormTypes';
import type { NeedFormSubmitData, NeedFormValues } from '../components/need/needFormTypes';

const CreateNeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Default expiry date: 30 days from now
  const initialValues = useMemo<NeedFormValues>(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    return {
      title: '',
      description: '',
      categoryId: null,
      minBudget: '',
      maxBudget: '',
      address: '',
      urgency: 'Normal',
      expiryDate: defaultDate.toISOString().split('T')[0],
    };
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/create-need' } });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async ({ values, newImages }: NeedFormSubmitData) => {
    setSubmitError(null);

    if (!user) {
      setSubmitError('Giriş yapmanız gerekiyor');
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

      if (values.minBudget) {
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

      // New needs start in review and are not public yet: show them in the owner's list
      navigate('/my-needs', {
        state: { flash: `İlanınız alındı. İncelendikten sonra yayınlanacak.${imageWarning}` }
      });
    } catch (err: unknown) {
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
              Ne aradığınızı detaylı bir şekilde açıklayın, satıcıların tekliflerini alın.
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

          <NeedForm
            initialValues={initialValues}
            submitLabel="İlan Ver"
            isSubmitting={isLoading}
            onSubmit={handleSubmit}
            notice={
              <p className="flex items-center justify-center gap-2 text-sm text-text-secondary mb-3">
                <InformationCircleIcon className="h-4 w-4 flex-shrink-0" />
                İlanlar yayınlanmadan önce incelenir.
              </p>
            }
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateNeedPage;
