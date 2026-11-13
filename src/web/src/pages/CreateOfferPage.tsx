import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, CurrencyDollarIcon, ChatBubbleLeftRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { needAPI, offerAPI, type Need, type CreateOfferRequest } from '../services/api';
import { useForm } from '../hooks/useForm';
import { Button, Input, Card, Loading, ErrorMessage, Badge } from '../components/ui';

interface CreateOfferFormValues {
  price: string;
  description: string;
  deliveryDays: string;
}

const CreateOfferPage: React.FC = () => {
  const { needId } = useParams<{ needId: string }>();
  const navigate = useNavigate();

  const [need, setNeed] = useState<Need | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load need details
  useEffect(() => {
    const loadNeed = async () => {
      if (!needId) {
        setError('İhtiyaç ID bulunamadı');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const needData = await needAPI.getNeedById(parseInt(needId));
        setNeed(needData);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'İhtiyaç detayları yüklenirken hata oluştu';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadNeed();
  }, [needId]);

  const validate = (values: CreateOfferFormValues) => {
    const errors: Partial<Record<keyof CreateOfferFormValues, string>> = {};

    // Price validation
    const priceNum = parseFloat(values.price);
    if (!values.price.trim()) {
      errors.price = 'Teklif tutarı gereklidir';
    } else if (isNaN(priceNum) || priceNum <= 0) {
      errors.price = 'Geçerli bir tutar giriniz';
    } else if (need?.maxBudget && priceNum > need.maxBudget) {
      errors.price = `Maksimum bütçe ${need.maxBudget.toLocaleString('tr-TR')} TL`;
    }

    // Description validation
    if (!values.description.trim()) {
      errors.description = 'Mesaj gereklidir';
    } else if (values.description.trim().length < 20) {
      errors.description = 'Mesaj en az 20 karakter olmalıdır';
    }

    // Delivery days validation
    const deliveryNum = parseInt(values.deliveryDays);
    if (!values.deliveryDays.trim()) {
      errors.deliveryDays = 'Teslimat süresi gereklidir';
    } else if (isNaN(deliveryNum) || deliveryNum <= 0) {
      errors.deliveryDays = 'Geçerli bir teslimat süresi giriniz';
    } else if (deliveryNum > 365) {
      errors.deliveryDays = 'Teslimat süresi 365 günden fazla olamaz';
    }

    return errors;
  };

  const { values, errors: formErrors, isSubmitting, handleChange, handleBlur, handleSubmit, touched } = useForm<CreateOfferFormValues>({
    initialValues: {
      price: '',
      description: '',
      deliveryDays: '',
    },
    validate,
    onSubmit: async (formValues) => {
      if (!needId) return;

      try {
        setSubmitError(null);
        const offerData: CreateOfferRequest = {
          needId: parseInt(needId),
          price: parseFloat(formValues.price),
          description: formValues.description.trim(),
          deliveryDays: parseInt(formValues.deliveryDays),
        };

        await offerAPI.createOffer(offerData);
        setSubmitSuccess(true);

        // Redirect after 2 seconds
        setTimeout(() => {
          navigate(`/needs/${needId}`);
        }, 2000);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Teklif gönderilirken hata oluştu';
        setSubmitError(errorMessage);
      }
    },
  });

  const formatBudget = (minBudget?: number, maxBudget?: number, currency = 'TRY') => {
    const currencySymbol = currency === 'TRY' ? 'TL' : currency;
    if (!minBudget && !maxBudget) return 'Bütçe belirtilmemiş';
    if (minBudget && maxBudget) {
      return `${minBudget.toLocaleString('tr-TR')} - ${maxBudget.toLocaleString('tr-TR')} ${currencySymbol}`;
    }
    if (minBudget) {
      return `${minBudget.toLocaleString('tr-TR')} ${currencySymbol} ve üzeri`;
    }
    if (maxBudget) {
      return `${maxBudget.toLocaleString('tr-TR')} ${currencySymbol} ve altı`;
    }
    return '';
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return <Badge variant="error">Acil</Badge>;
      case 'Normal':
        return <Badge variant="info">Normal</Badge>;
      case 'Flexible':
        return <Badge variant="success">Esnek</Badge>;
      default:
        return <Badge variant="default">{urgency}</Badge>;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loading size="lg" text="İhtiyaç detayları yükleniyor..." />
      </div>
    );
  }

  // Error state
  if (error || !need) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-primary transition-colors mb-6"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Geri Dön</span>
          </Link>
          <Card padding="lg">
            <ErrorMessage message={error || 'İhtiyaç bulunamadı'} />
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-xl w-full">
          <Card padding="lg" className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircleIcon className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Teklif Gönderildi!</h2>
            <p className="text-text-secondary mb-4">
              Teklifiniz başarıyla gönderildi. Alıcı tarafından incelenecektir.
            </p>
            <p className="text-sm text-text-secondary">
              İhtiyaç sayfasına yönlendiriliyorsunuz...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/needs/${needId}`}
            className="inline-flex items-center gap-2 text-text-secondary hover:text-primary transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Geri Dön</span>
          </Link>
          <h1 className="text-2xl font-bold text-text">Teklif Ver</h1>
          <p className="text-text-secondary mt-1">
            Bu ihtiyaç için teklifinizi oluşturun
          </p>
        </div>

        {/* Need Summary */}
        <Card padding="lg" className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-lg font-semibold text-text flex-1">{need.title}</h2>
            {getUrgencyBadge(need.urgency)}
          </div>

          <p className="text-text-secondary text-sm mb-4 line-clamp-2">
            {need.description}
          </p>

          <div className="flex flex-wrap gap-4 text-sm">
            {need.category && (
              <div className="flex items-center gap-1 text-text-secondary">
                <span className="font-medium">Kategori:</span>
                <span>{need.category.nameTr || need.category.name}</span>
              </div>
            )}
            {(need.minBudget || need.maxBudget) && (
              <div className="flex items-center gap-1 text-text-secondary">
                <span className="font-medium">Bütçe:</span>
                <span className="text-primary font-semibold">
                  {formatBudget(need.minBudget, need.maxBudget, need.currency)}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Offer Form */}
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-6">Teklif Detayları</h3>

          {submitError && (
            <ErrorMessage
              message={submitError}
              onDismiss={() => setSubmitError(null)}
              className="mb-4"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Price Input */}
            <div>
              <Input
                label="Teklif Tutarı *"
                type="number"
                name="price"
                placeholder="0"
                value={values.price}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.price ? formErrors.price : undefined}
                leftIcon={<CurrencyDollarIcon className="h-5 w-5" />}
                min="0"
                step="0.01"
              />
              {need.maxBudget && !formErrors.price && (
                <p className="mt-1 text-xs text-text-secondary">
                  Maksimum bütçe: {need.maxBudget.toLocaleString('tr-TR')} TL
                </p>
              )}
            </div>

            {/* Delivery Days Input */}
            <div>
              <Input
                label="Teslimat Süresi (Gun) *"
                type="number"
                name="deliveryDays"
                placeholder="Örneğin: 7"
                value={values.deliveryDays}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.deliveryDays ? formErrors.deliveryDays : undefined}
                min="1"
                max="365"
              />
              <p className="mt-1 text-xs text-text-secondary">
                Teklif edilen ürün/hizmeti kaç gün içinde teslim edebilirsiniz?
              </p>
            </div>

            {/* Description Textarea */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text mb-1">
                Mesajınız *
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none text-text-secondary">
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                </div>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Teklifinizi detaylı olarak açıklayın..."
                  value={values.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={1000}
                  className={`
                    block w-full pl-10 pr-4 py-2.5 rounded-lg border bg-surface text-text
                    placeholder:text-text-secondary
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    transition-colors duration-200 resize-none
                    ${touched.description && formErrors.description
                      ? 'border-error focus:border-error focus:ring-error/20'
                      : 'border-border focus:border-primary focus:ring-primary/20'
                    }
                  `}
                />
              </div>
              <div className="flex justify-between mt-1">
                {touched.description && formErrors.description ? (
                  <p className="text-sm text-error">{formErrors.description}</p>
                ) : (
                  <p className="text-xs text-text-secondary">En az 20 karakter</p>
                )}
                <p className="text-xs text-text-secondary">
                  {values.description.length}/1000
                </p>
              </div>
            </div>

            {/* Important Info */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-primary mb-2">Önemli Bilgiler</h4>
              <ul className="text-xs text-text-secondary space-y-1">
                <li>- Teklifiniz gönderildikten sonra alıcı tarafından görüntülenecektir</li>
                <li>- Teklif kabul edildiğinde mesajlaşma başlayacaktır</li>
                <li>- Teklif fiyatınız ve teslimat süreniz bağlayıcıdır</li>
                <li>- Uygunsuz teklifler sistem tarafından kaldırılabilir</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
            >
              Teklif Ver
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateOfferPage;
