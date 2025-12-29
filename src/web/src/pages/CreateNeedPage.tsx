import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhotoIcon,
  XMarkIcon,
  MapPinIcon,
  CalendarIcon,
  TagIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, categoryAPI } from '../services/api';
import type { Category, CreateNeedRequest } from '../services/api';
import { Button, Card, Input, Loading, ErrorMessage } from '../components/ui';
import { Header, Footer } from '../components/layout';

interface FormData {
  title: string;
  description: string;
  categoryId: number | null;
  minBudget: string;
  maxBudget: string;
  address: string;
  urgency: 'Flexible' | 'Normal' | 'Urgent';
  expiryDate: string;
}

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

const CreateNeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    categoryId: null,
    minBudget: '',
    maxBudget: '',
    address: '',
    urgency: 'Normal',
    expiryDate: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/create-need' } });
    }
  }, [isAuthenticated, navigate]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsCategoriesLoading(true);
        const categoriesData = await categoryAPI.getCategories();
        setCategories(categoriesData.filter(cat => cat.isActive));
      } catch (err) {
        console.error('Kategoriler yuklenirken hata:', err);
        setSubmitError('Kategoriler yuklenirken hata olustu. Lutfen sayfayi yenileyin.');
      } finally {
        setIsCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Calculate default expiry date (30 days from now)
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    const formattedDate = defaultDate.toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, expiryDate: formattedDate }));
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Baslik gereklidir';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Baslik en az 10 karakter olmalidir';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Baslik en fazla 100 karakter olabilir';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Aciklama gereklidir';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Aciklama en az 20 karakter olmalidir';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'Aciklama en fazla 1000 karakter olabilir';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Kategori secimi gereklidir';
    }

    if (formData.minBudget && isNaN(Number(formData.minBudget))) {
      newErrors.minBudget = 'Gecerli bir sayi giriniz';
    }

    if (formData.maxBudget && isNaN(Number(formData.maxBudget))) {
      newErrors.maxBudget = 'Gecerli bir sayi giriniz';
    }

    if (formData.minBudget && formData.maxBudget) {
      const min = Number(formData.minBudget);
      const max = Number(formData.maxBudget);
      if (min >= max) {
        newErrors.maxBudget = 'Maksimum butce minimum butceden buyuk olmalidir';
      }
    }

    if (formData.expiryDate) {
      const expiryDate = new Date(formData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        newErrors.expiryDate = 'Bitis tarihi gecmis bir tarih olamaz';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      // Scroll to top to show validation errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!user) {
      setSubmitError('Giris yapmaniz gerekiyor');
      return;
    }

    try {
      setIsLoading(true);

      // Map urgency string to backend enum value
      const urgencyMap: Record<string, number> = {
        'Flexible': 1,
        'Normal': 2,
        'Urgent': 3,
      };

      const requestData: CreateNeedRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId!,
        urgency: urgencyMap[formData.urgency],
      };

      if (formData.minBudget) {
        requestData.minBudget = Number(formData.minBudget);
      }

      if (formData.maxBudget) {
        requestData.maxBudget = Number(formData.maxBudget);
      }

      if (formData.address.trim()) {
        requestData.address = formData.address.trim();
      }

      // TODO: Handle image upload when API supports it
      // For now, images would be uploaded separately

      const createdNeed = await needAPI.createNeed(requestData);

      // Redirect to the created need detail page
      navigate(`/needs/${createdNeed.id}`, {
        state: { message: 'Ihtiyaciniz basariyla olusturuldu!' }
      });
    } catch (err: unknown) {
      console.error('Need creation error:', err);
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      let errorMessage = 'Ihtiyac olusturulurken hata olustu. Lutfen tekrar deneyin.';

      if (axiosError.response?.status === 401) {
        errorMessage = 'Oturum suresi dolmus. Lutfen tekrar giris yapin.';
      } else if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      }

      setSubmitError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, categoryId: category.id }));
    setIsCategoryDropdownOpen(false);
    setErrors(prev => ({ ...prev, categoryId: undefined }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate individual field on blur
  const validateField = (field: keyof FormData) => {
    const newErrors: FormErrors = { ...errors };

    switch (field) {
      case 'title':
        if (!formData.title.trim()) {
          newErrors.title = 'Baslik gereklidir';
        } else if (formData.title.length < 10) {
          newErrors.title = 'Baslik en az 10 karakter olmalidir';
        } else if (formData.title.length > 100) {
          newErrors.title = 'Baslik en fazla 100 karakter olabilir';
        } else {
          delete newErrors.title;
        }
        break;

      case 'description':
        if (!formData.description.trim()) {
          newErrors.description = 'Aciklama gereklidir';
        } else if (formData.description.length < 20) {
          newErrors.description = 'Aciklama en az 20 karakter olmalidir';
        } else if (formData.description.length > 1000) {
          newErrors.description = 'Aciklama en fazla 1000 karakter olabilir';
        } else {
          delete newErrors.description;
        }
        break;

      case 'minBudget':
        if (formData.minBudget && isNaN(Number(formData.minBudget))) {
          newErrors.minBudget = 'Gecerli bir sayi giriniz';
        } else {
          delete newErrors.minBudget;
        }
        break;

      case 'maxBudget':
        if (formData.maxBudget && isNaN(Number(formData.maxBudget))) {
          newErrors.maxBudget = 'Gecerli bir sayi giriniz';
        } else if (formData.minBudget && formData.maxBudget) {
          const min = Number(formData.minBudget);
          const max = Number(formData.maxBudget);
          if (min >= max) {
            newErrors.maxBudget = 'Maksimum butce minimum butceden buyuk olmalidir';
          } else {
            delete newErrors.maxBudget;
          }
        } else {
          delete newErrors.maxBudget;
        }
        break;

      case 'expiryDate':
        if (formData.expiryDate) {
          const expiryDate = new Date(formData.expiryDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (expiryDate < today) {
            newErrors.expiryDate = 'Bitis tarihi gecmis bir tarih olamaz';
          } else {
            delete newErrors.expiryDate;
          }
        }
        break;

      case 'categoryId':
        if (!formData.categoryId) {
          newErrors.categoryId = 'Kategori secimi gereklidir';
        } else {
          delete newErrors.categoryId;
        }
        break;
    }

    setErrors(newErrors);
  };

  // Image handling
  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    const previews: string[] = [];

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        if (images.length + validFiles.length < 5) {
          validFiles.push(file);
          previews.push(URL.createObjectURL(file));
        }
      }
    });

    setImages(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageSelect(e.dataTransfer.files);
  }, [images.length]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return 'bg-red-500';
      case 'Normal':
        return 'bg-yellow-500';
      case 'Flexible':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return 'Acil';
      case 'Normal':
        return 'Normal';
      case 'Flexible':
        return 'Esnek';
      default:
        return urgency;
    }
  };

  // Format number with thousand separator (Turkish format: 1.000.000)
  const formatBudget = (value: string): string => {
    // Remove non-digit characters
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    // Format with thousand separator
    return Number(numericValue).toLocaleString('tr-TR');
  };

  // Parse formatted budget string to raw number string
  const parseBudget = (formattedValue: string): string => {
    return formattedValue.replace(/\./g, '');
  };

  // Handle budget input change with formatting
  const handleBudgetChange = (field: 'minBudget' | 'maxBudget', value: string) => {
    const rawValue = parseBudget(value);
    setFormData(prev => ({ ...prev, [field]: rawValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (isCategoriesLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loading size="lg" text="Kategoriler yukleniyor..." />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-text">
              Ihtiyac Olustur
            </h1>
            <p className="mt-2 text-text-secondary">
              Ne aradiginizi detayli bir sekilde aciklayin, saticilarin tekliflerini alin.
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

          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-text mb-4">Temel Bilgiler</h2>

              {/* Title */}
              <div className="mb-4">
                <Input
                  label="Baslik *"
                  placeholder="Ihtiyacinizi kisaca ozetleyin"
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
                  Aciklama *
                </label>
                <textarea
                  placeholder="Ihtiyacinizi detayli bir sekilde aciklayin"
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
                      {selectedCategory ? selectedCategory.nameTr : 'Kategori secin'}
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
              <h2 className="text-lg font-semibold text-text mb-2">Gorseller</h2>
              <p className="text-sm text-text-secondary mb-4">
                Ihtiyacinizi daha iyi anlatmak icin gorsel ekleyebilirsiniz. (Maksimum 5 gorsel)
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
                  ${images.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <PhotoIcon className="h-12 w-12 text-text-secondary mx-auto mb-3" />
                <p className="text-text font-medium">
                  Gorselleri surukleyip birakin
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  veya <span className="text-primary">tiklayarak secin</span>
                </p>
                <p className="text-xs text-text-secondary mt-2">
                  PNG, JPG, GIF (Maks. 5MB)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageSelect(e.target.files)}
                className="hidden"
                disabled={images.length >= 5}
              />

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img
                        src={preview}
                        alt={`Gorsel ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(index);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
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
              <h2 className="text-lg font-semibold text-text mb-2">Butce</h2>
              <p className="text-sm text-text-secondary mb-4">
                Butce belirtmek istege baglidir. Belirtirseniz size daha uygun teklifler alabilirsiniz.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Minimum Butce (TL)"
                  placeholder="0"
                  type="text"
                  inputMode="numeric"
                  value={formatBudget(formData.minBudget)}
                  onChange={(e) => handleBudgetChange('minBudget', e.target.value)}
                  onBlur={() => validateField('minBudget')}
                  error={errors.minBudget}
                />
                <Input
                  label="Maksimum Butce (TL)"
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
                Konum belirtmek istege baglidir. Yakininizdaki saglayicilari bulmaniza yardimci olur.
              </p>

              <Input
                label="Adres"
                placeholder="Sehir, ilce veya mahalle"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                error={errors.address}
                leftIcon={<MapPinIcon className="h-5 w-5" />}
              />
            </Card>

            {/* Expiry Date */}
            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-text mb-2">Bitis Tarihi</h2>
              <p className="text-sm text-text-secondary mb-4">
                Ilaninizin ne zamana kadar aktif kalacagini belirleyin.
              </p>

              <Input
                label="Bitis Tarihi"
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
                Ihtiyacinizin ne kadar acil oldugunu belirtin.
              </p>

              <div className="space-y-2">
                {(['Flexible', 'Normal', 'Urgent'] as const).map((urgency) => (
                  <button
                    key={urgency}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, urgency }))}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors
                      ${formData.urgency === urgency
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className={`w-3 h-3 rounded-full ${getUrgencyColor(urgency)}`} />
                    <span className={`font-medium ${formData.urgency === urgency ? 'text-primary' : 'text-text'}`}>
                      {getUrgencyText(urgency)}
                    </span>
                    {formData.urgency === urgency && (
                      <CheckIcon className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* Submit Button */}
            <div className="mt-8">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={isLoading}
              >
                Ihtiyaci Olustur
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateNeedPage;
