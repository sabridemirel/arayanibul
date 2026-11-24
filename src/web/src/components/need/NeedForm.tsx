import React, { useState, useEffect, useRef } from 'react';
import {
  PhotoIcon,
  XMarkIcon,
  MapPinIcon,
  CalendarIcon,
  TagIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { categoryAPI, resolveMediaUrl } from '../../services/api';
import type { Category, NeedImage } from '../../services/api';
import { Button, Card, Input, Loading, ErrorMessage } from '../ui';
import { prepareImageForUpload, ImageDecodeError } from '../../utils/prepareImage';

import type { NeedFormSubmitData, NeedFormValues, NeedUrgency } from './needFormTypes';

interface FormErrors {
  title?: string;
  description?: string;
  categoryId?: string;
  minBudget?: string;
  maxBudget?: string;
  address?: string;
  expiryDate?: string;
  images?: string;
}

interface NeedFormProps {
  initialValues: NeedFormValues;
  /** Images already attached to the need (edit mode) */
  existingImages?: NeedImage[];
  submitLabel: string;
  /** Shown right above the submit button */
  notice?: React.ReactNode;
  isSubmitting: boolean;
  onSubmit: (data: NeedFormSubmitData) => void;
}

const MAX_IMAGES = 5;

const getUrgencyColor = (urgency: NeedUrgency) => {
  switch (urgency) {
    case 'Urgent':
      return 'bg-red-500';
    case 'Normal':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

const getUrgencyText = (urgency: NeedUrgency) => {
  switch (urgency) {
    case 'Urgent':
      return 'Acil';
    case 'Normal':
      return 'Normal';
    default:
      return 'Esnek';
  }
};

// Format number with thousand separator (Turkish format: 1.000.000)
const formatBudget = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  return Number(numericValue).toLocaleString('tr-TR');
};

// Parse formatted budget string to raw number string
const parseBudget = (formattedValue: string): string => formattedValue.replace(/\./g, '');

const validateTitle = (title: string): string | undefined => {
  if (!title.trim()) return 'Başlık gereklidir';
  if (title.length < 10) return 'Başlık en az 10 karakter olmalıdır';
  if (title.length > 100) return 'Başlık en fazla 100 karakter olabilir';
  return undefined;
};

const validateDescription = (description: string): string | undefined => {
  if (!description.trim()) return 'Açıklama gereklidir';
  if (description.length < 20) return 'Açıklama en az 20 karakter olmalıdır';
  if (description.length > 1000) return 'Açıklama en fazla 1000 karakter olabilir';
  return undefined;
};

const validateExpiryDate = (value: string): string | undefined => {
  if (!value) return undefined;
  const expiryDate = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiryDate < today ? 'Bitiş tarihi geçmiş bir tarih olamaz' : undefined;
};

/**
 * Shared need (ilan) form used by the create and edit pages.
 * Owns field state, validation, the category list and image selection; the page decides what to do on submit.
 */
const NeedForm: React.FC<NeedFormProps> = ({
  initialValues,
  existingImages = [],
  submitLabel,
  notice,
  isSubmitting,
  onSubmit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<NeedFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [keptImages, setKeptImages] = useState<NeedImage[]>(existingImages);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const selectedCategory = categories.find(c => c.id === formData.categoryId) ?? null;
  const totalImageCount = keptImages.length + images.length;

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsCategoriesLoading(true);
        const categoriesData = await categoryAPI.getCategories();
        setCategories(categoriesData.filter(cat => cat.isActive));
      } catch (err) {
        console.error('Kategoriler yüklenirken hata:', err);
        setCategoriesError('Kategoriler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.');
      } finally {
        setIsCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Release object URLs of picked files when leaving the form
  const previewsRef = useRef<string[]>([]);
  previewsRef.current = imagePreviews;
  useEffect(() => () => previewsRef.current.forEach(url => URL.revokeObjectURL(url)), []);

  const validateBudget = (data: NeedFormValues, field: 'minBudget' | 'maxBudget'): string | undefined => {
    const value = data[field];
    if (value && isNaN(Number(value))) return 'Geçerli bir sayı giriniz';
    if (field === 'maxBudget' && data.minBudget && data.maxBudget && Number(data.minBudget) >= Number(data.maxBudget)) {
      return 'Maksimum bütçe minimum bütçeden büyük olmalıdır';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      title: validateTitle(formData.title),
      description: validateDescription(formData.description),
      categoryId: formData.categoryId ? undefined : 'Kategori seçimi gereklidir',
      minBudget: validateBudget(formData, 'minBudget'),
      maxBudget: validateBudget(formData, 'maxBudget'),
      expiryDate: validateExpiryDate(formData.expiryDate),
    };
    (Object.keys(newErrors) as (keyof FormErrors)[]).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate individual field on blur
  const validateField = (field: keyof NeedFormValues) => {
    let message: string | undefined;
    switch (field) {
      case 'title':
        message = validateTitle(formData.title);
        break;
      case 'description':
        message = validateDescription(formData.description);
        break;
      case 'minBudget':
      case 'maxBudget':
        message = validateBudget(formData, field);
        break;
      case 'expiryDate':
        message = validateExpiryDate(formData.expiryDate);
        break;
      case 'categoryId':
        message = formData.categoryId ? undefined : 'Kategori seçimi gereklidir';
        break;
      default:
        return;
    }
    setErrors(prev => {
      const next = { ...prev };
      if (message) next[field as keyof FormErrors] = message;
      else delete next[field as keyof FormErrors];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to top to show validation errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    onSubmit({ values: formData, newImages: images, keptImages, removedImageIds });
  };

  const handleCategorySelect = (category: Category) => {
    setFormData(prev => ({ ...prev, categoryId: category.id }));
    setIsCategoryDropdownOpen(false);
    setErrors(prev => ({ ...prev, categoryId: undefined }));
  };

  const handleInputChange = (field: keyof NeedFormValues, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBudgetChange = (field: 'minBudget' | 'maxBudget', value: string) => {
    handleInputChange(field, parseBudget(value));
  };

  // Image handling: photos are downscaled in the browser before upload (see prepareImageForUpload)
  const handleImageSelect = async (files: FileList | null) => {
    if (!files) return;

    const remaining = MAX_IMAGES - totalImageCount;
    const picked = Array.from(files).filter(file => file.type.startsWith('image/') || file.name.match(/\.(heic|heif)$/i));
    if (picked.length === 0 || remaining <= 0) return;

    setIsPreparingImages(true);
    setErrors(prev => ({ ...prev, images: undefined }));
    const prepared: File[] = [];
    let failed = 0;
    for (const file of picked.slice(0, remaining)) {
      try {
        prepared.push(await prepareImageForUpload(file));
      } catch (err) {
        if (!(err instanceof ImageDecodeError)) console.error('Image preparation failed', err);
        failed += 1;
      }
    }
    setIsPreparingImages(false);

    if (failed > 0) {
      setErrors(prev => ({
        ...prev,
        images:
          failed === 1
            ? 'Bir fotoğraf açılamadı. JPG, PNG veya WebP formatında bir fotoğraf seçin.'
            : `${failed} fotoğraf açılamadı. JPG, PNG veya WebP formatında fotoğraflar seçin.`,
      }));
    }

    setImages(prev => [...prev, ...prepared]);
    setImagePreviews(prev => [...prev, ...prepared.map(file => URL.createObjectURL(file))]);
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (image: NeedImage) => {
    setKeptImages(prev => prev.filter(i => i.id !== image.id));
    setRemovedImageIds(prev => [...prev, image.id]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    void handleImageSelect(e.dataTransfer.files);
  };

  if (isCategoriesLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loading size="lg" text="Kategoriler yükleniyor..." />
      </div>
    );
  }

  const renderRemoveButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
    >
      <XMarkIcon className="h-4 w-4" />
    </button>
  );

  return (
    <form onSubmit={handleSubmit}>
      {categoriesError && (
        <ErrorMessage
          message={categoriesError}
          onDismiss={() => setCategoriesError(null)}
          className="mb-6"
        />
      )}

      {/* Basic Information */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-4">Temel Bilgiler</h2>

        {/* Title */}
        <div className="mb-4">
          <Input
            label="Başlık *"
            placeholder="İhtiyacınızı kısaca özetleyin"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            onBlur={() => validateField('title')}
            error={errors.title}
            maxLength={100}
          />
          <p className="mt-1 text-xs text-text-secondary">
            {formData.title.length}/100 karakter
          </p>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-1">
            Açıklama *
          </label>
          <textarea
            placeholder="İhtiyacınızı detaylı bir şekilde açıklayın"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            onBlur={() => validateField('description')}
            maxLength={1000}
            rows={4}
            className={`
              block w-full px-4 py-2.5 rounded-lg border bg-surface text-text
              placeholder:text-text-secondary
              focus:outline-none focus:ring-2 focus:ring-offset-0
              transition-colors duration-200
              resize-none
              ${errors.description
                ? 'border-error focus:border-error focus:ring-error/20'
                : 'border-border focus:border-primary focus:ring-primary/20'
              }
            `}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-error">{errors.description}</p>
          )}
          <p className="mt-1 text-xs text-text-secondary">
            {formData.description.length}/1000 karakter
          </p>
        </div>

        {/* Category Dropdown */}
        <div className="mb-4 relative">
          <label className="block text-sm font-medium text-text mb-1">
            Kategori *
          </label>
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className={`
              w-full flex items-center justify-between px-4 py-2.5 rounded-lg border bg-surface text-left
              focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors duration-200
              ${errors.categoryId
                ? 'border-error focus:border-error focus:ring-error/20'
                : 'border-border focus:border-primary focus:ring-primary/20'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-text-secondary" />
              <span className={selectedCategory ? 'text-text' : 'text-text-secondary'}>
                {selectedCategory ? selectedCategory.nameTr : 'Kategori seçin'}
              </span>
            </div>
            <ChevronDownIcon className={`h-5 w-5 text-text-secondary transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-error">{errors.categoryId}</p>
          )}

          {/* Dropdown Menu */}
          {isCategoryDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-text font-medium">{category.nameTr}</p>
                    {category.description && (
                      <p className="text-sm text-text-secondary">{category.description}</p>
                    )}
                  </div>
                  {selectedCategory?.id === category.id && (
                    <CheckIcon className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Image Upload */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-2">Görseller</h2>
        <p className="text-sm text-text-secondary mb-4">
          İhtiyacınızı daha iyi anlatmak için görsel ekleyebilirsiniz. (Maksimum {MAX_IMAGES} görsel)
        </p>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary hover:bg-primary/5'
            }
            ${totalImageCount >= MAX_IMAGES ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <PhotoIcon className="h-12 w-12 text-text-secondary mx-auto mb-3" />
          <p className="text-text font-medium">
            Görselleri sürükleyip bırakın
          </p>
          <p className="text-sm text-text-secondary mt-1">
            veya <span className="text-primary">tıklayarak seçin</span>
          </p>
          <p className="text-xs text-text-secondary mt-2">
            {isPreparingImages
              ? 'Fotoğraflar hazırlanıyor…'
              : 'JPG, PNG veya WebP. Büyük fotoğraflar otomatik küçültülür.'}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            void handleImageSelect(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
          disabled={totalImageCount >= MAX_IMAGES}
        />

        {/* Image Previews */}
        {totalImageCount > 0 && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
            {keptImages.map((image, index) => (
              <div key={`existing-${image.id}`} className="relative aspect-square rounded-lg overflow-hidden group">
                <img
                  src={resolveMediaUrl(image.imageUrl)}
                  alt={image.altText || `Görsel ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {renderRemoveButton('Görseli Kaldır', () => handleRemoveExistingImage(image))}
              </div>
            ))}
            {imagePreviews.map((preview, index) => (
              <div key={preview} className="relative aspect-square rounded-lg overflow-hidden group">
                <img
                  src={preview}
                  alt={`Görsel ${keptImages.length + index + 1}`}
                  className="w-full h-full object-cover"
                />
                {renderRemoveButton('Görseli Kaldır', () => handleRemoveImage(index))}
              </div>
            ))}
          </div>
        )}

        {errors.images && (
          <p className="mt-2 text-sm text-error">{errors.images}</p>
        )}
      </Card>

      {/* Budget */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-2">Bütçe</h2>
        <p className="text-sm text-text-secondary mb-4">
          Bütçe belirtmek isteğe bağlıdır. Belirtirseniz size daha uygun teklifler alabilirsiniz.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Minimum Bütçe (TL)"
            placeholder="0"
            type="text"
            inputMode="numeric"
            value={formatBudget(formData.minBudget)}
            onChange={(e) => handleBudgetChange('minBudget', e.target.value)}
            onBlur={() => validateField('minBudget')}
            error={errors.minBudget}
          />
          <Input
            label="Maksimum Bütçe (TL)"
            placeholder="0"
            type="text"
            inputMode="numeric"
            value={formatBudget(formData.maxBudget)}
            onChange={(e) => handleBudgetChange('maxBudget', e.target.value)}
            onBlur={() => validateField('maxBudget')}
            error={errors.maxBudget}
          />
        </div>
      </Card>

      {/* Location */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-2">Konum</h2>
        <p className="text-sm text-text-secondary mb-4">
          Konum belirtmek isteğe bağlıdır. Yakınınızdaki satıcıları bulmanıza yardımcı olur.
        </p>

        <Input
          label="Adres"
          placeholder="Şehir, ilçe veya mahalle"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          error={errors.address}
          leftIcon={<MapPinIcon className="h-5 w-5" />}
        />
      </Card>

      {/* Expiry Date */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-2">Bitiş Tarihi</h2>
        <p className="text-sm text-text-secondary mb-4">
          İlanınızın ne zamana kadar aktif kalacağını belirleyin.
        </p>

        <Input
          label="Bitiş Tarihi"
          type="date"
          value={formData.expiryDate}
          onChange={(e) => handleInputChange('expiryDate', e.target.value)}
          onBlur={() => validateField('expiryDate')}
          error={errors.expiryDate}
          leftIcon={<CalendarIcon className="h-5 w-5" />}
          min={new Date().toISOString().split('T')[0]}
        />
      </Card>

      {/* Urgency */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-2">Aciliyet Durumu</h2>
        <p className="text-sm text-text-secondary mb-4">
          Acil ilanlar 7 gün boyunca listenin en üstünde gösterilir. Aynı anda bir acil ilanınız olabilir.
        </p>

        <div className="space-y-2">
          {(['Normal', 'Urgent'] as const).map((urgency) => {
            const isSelected = formData.urgency === urgency;
            return (
              <button
                key={urgency}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, urgency }))}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors
                  ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                `}
              >
                <div className={`w-3 h-3 rounded-full ${getUrgencyColor(urgency)}`} />
                <span className={`font-medium ${isSelected ? 'text-primary' : 'text-text'}`}>
                  {getUrgencyText(urgency)}
                </span>
                {isSelected && <CheckIcon className="h-5 w-5 text-primary ml-auto" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Submit Button */}
      <div className="mt-8">
        {notice}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting || isPreparingImages}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default NeedForm;
