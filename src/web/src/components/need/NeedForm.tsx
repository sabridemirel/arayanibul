import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDownIcon, MapPinIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { resolveMediaUrl } from '../../services/api';
import type { NeedDraftQuestion, NeedImage } from '../../services/api';
import { Button, Card, Input } from '../ui';
import { prepareImageForUpload, ImageDecodeError } from '../../utils/prepareImage';
import { useCategories } from '../../utils/categoryVisual';
import PriceModeFields from './PriceModeFields';
import type { NeedFormSubmitData, NeedFormValues, NeedUrgency, ProductHint } from './needFormTypes';

interface FormErrors {
  title?: string;
  description?: string;
  categoryId?: string;
  price?: string;
  expiryDate?: string;
  images?: string;
}

interface NeedFormProps {
  initialValues: NeedFormValues;
  /** Images already attached to the need (edit mode) */
  existingImages?: NeedImage[];
  /** One-tap questions for the category (from the quick-listing sentence) */
  questions?: NeedDraftQuestion[];
  /** Catalogued product recognised in the text */
  product?: ProductHint | null;
  /** Start with "Ayrıntılar" open (detailed listing, editing) */
  detailsOpen?: boolean;
  /** Guests cannot upload yet: photos are added after signing in */
  canAddPhotos?: boolean;
  /** Budget of a listing created before open listings stopped taking one */
  legacyBudget?: string | null;
  submitLabel: string;
  /** Shown right above the submit button */
  notice?: React.ReactNode;
  isSubmitting: boolean;
  onSubmit: (data: NeedFormSubmitData) => void;
}

const MAX_IMAGES = 5;

const URGENCY_OPTIONS: { value: NeedUrgency; title: string; text: string }[] = [
  { value: 'Normal', title: 'Normal', text: 'İlanınız yayın sırasına göre listelenir.' },
  { value: 'Urgent', title: 'Acil', text: '7 gün boyunca listenin en üstünde görünür. Aynı anda bir acil ilanınız olabilir.' },
];

const validate = (values: NeedFormValues): FormErrors => {
  const errors: FormErrors = {};
  const title = values.title.trim();
  if (title.length < 5) errors.title = 'Başlık en az 5 karakter olmalı';
  else if (title.length > 200) errors.title = 'Başlık en fazla 200 karakter olabilir';
  if (!values.categoryId) errors.categoryId = 'İlanınız için bir kategori seçin';
  if (values.isFixedPrice && !(Number(values.price) > 0)) errors.price = 'Hemen almak istediğiniz fiyatı yazın';
  else if (values.isFixedPrice && Number(values.price) > 100_000_000) errors.price = 'Fiyat en fazla 100.000.000 TL olabilir; kontrol edin';
  if (values.description.length > 1500) errors.description = 'Açıklama en fazla 1500 karakter olabilir';
  if (values.expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(values.expiryDate) < today) errors.expiryDate = 'Bitiş tarihi geçmiş bir tarih olamaz';
  }
  return errors;
};

/**
 * The one listing form: quick listing (filled from a sentence, "Ayrıntılar" closed), detailed
 * listing ("Ayrıntılar" open) and editing all use it. The page decides what to do on submit.
 */
const NeedForm: React.FC<NeedFormProps> = ({
  initialValues,
  existingImages = [],
  questions = [],
  product = null,
  detailsOpen = false,
  canAddPhotos = true,
  legacyBudget = null,
  submitLabel,
  notice,
  isSubmitting,
  onSubmit,
}) => {
  const idPrefix = useId().replace(/:/g, '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = useCategories();
  const roots = categories.filter((c) => !c.parentCategoryId).sort((a, b) => a.sortOrder - b.sortOrder);

  const [values, setValues] = useState<NeedFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showDetails, setShowDetails] = useState(detailsOpen);
  const [keptImages, setKeptImages] = useState<NeedImage[]>(existingImages);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const totalImageCount = keptImages.length + images.length;

  // Release object URLs of picked files when leaving the form
  const previewsRef = useRef<string[]>([]);
  useEffect(() => {
    previewsRef.current = imagePreviews;
  }, [imagePreviews]);
  useEffect(() => () => previewsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const update = (patch: Partial<NeedFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      (Object.keys(patch) as (keyof NeedFormValues)[]).forEach((key) => {
        delete next[key as keyof FormErrors];
        if (key === 'isFixedPrice') delete next.price;
      });
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      if (found.description || found.expiryDate) setShowDetails(true);
      document.getElementById(`${idPrefix}-errors`)?.focus();
      return;
    }
    onSubmit({ values, newImages: images, keptImages, removedImageIds });
  };

  // Photos are downscaled in the browser before upload (see prepareImageForUpload)
  const handleImageSelect = async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - totalImageCount;
    const picked = Array.from(files).filter((file) => file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name));
    if (picked.length === 0 || remaining <= 0) return;

    setIsPreparingImages(true);
    setErrors((prev) => ({ ...prev, images: undefined }));
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
      setErrors((prev) => ({
        ...prev,
        images:
          failed === 1
            ? 'Bir fotoğraf açılamadı. JPG, PNG veya WebP formatında bir fotoğraf seçin.'
            : `${failed} fotoğraf açılamadı. JPG, PNG veya WebP formatında fotoğraflar seçin.`,
      }));
    }
    setImages((prev) => [...prev, ...prepared]);
    setImagePreviews((prev) => [...prev, ...prepared.map((file) => URL.createObjectURL(file))]);
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (image: NeedImage) => {
    setKeptImages((prev) => prev.filter((i) => i.id !== image.id));
    setRemovedImageIds((prev) => [...prev, image.id]);
  };

  const errorList = Object.values(errors).filter(Boolean);
  const answeredCount = Object.keys(values.answers).length;

  const removeButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="absolute right-1 top-1 rounded-full bg-red-600 p-1.5 text-white"
    >
      <XMarkIcon className="h-4 w-4" />
    </button>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorList.length > 0 && (
        <div
          id={`${idPrefix}-errors`}
          tabIndex={-1}
          role="alert"
          className="mb-4 rounded-lg border border-error/40 bg-red-50 px-4 py-3 text-sm text-error"
        >
          Lütfen işaretli alanları düzeltin.
        </div>
      )}

      <Card className="mb-6">
        <div className="space-y-5">
          <Input
            id={`${idPrefix}-title`}
            label="Başlık"
            placeholder="Örn. Bebek arabası arıyorum"
            value={values.title}
            onChange={(event) => update({ title: event.target.value })}
            error={errors.title}
            maxLength={200}
            aria-required="true"
          />

          <div>
            <label htmlFor={`${idPrefix}-category`} className="mb-1 block text-sm font-medium text-text">
              Kategori
            </label>
            <select
              // Remount when the list arrives: a select ignores a value whose option did not exist yet
              key={categories.length}
              id={`${idPrefix}-category`}
              value={values.categoryId ?? ''}
              onChange={(event) => update({ categoryId: event.target.value ? Number(event.target.value) : null })}
              aria-invalid={Boolean(errors.categoryId)}
              className={`min-h-11 w-full rounded-lg border bg-surface px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                errors.categoryId ? 'border-error' : 'border-border focus:border-primary'
              }`}
            >
              <option value="">Kategori seçin</option>
              {roots.map((root) => {
                const subs = categories
                  .filter((c) => c.parentCategoryId === root.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder);
                return subs.length > 0 ? (
                  <optgroup key={root.id} label={root.nameTr || root.name}>
                    {subs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameTr || c.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={root.id} value={root.id}>
                    {root.nameTr || root.name}
                  </option>
                );
              })}
            </select>
            {errors.categoryId && <p className="mt-1 text-sm text-error">{errors.categoryId}</p>}
          </div>

          <PriceModeFields
            idPrefix={idPrefix}
            isFixedPrice={values.isFixedPrice}
            price={values.price}
            onChange={update}
            error={errors.price}
            product={product}
            legacyBudget={legacyBudget}
          />

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-text">Aciliyet</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {URGENCY_OPTIONS.map((option) => {
                const id = `${idPrefix}-urgency-${option.value}`;
                const selected = values.urgency === option.value;
                return (
                  <label
                    key={id}
                    htmlFor={id}
                    className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                      selected ? 'border-primary bg-primary-light' : 'border-border bg-surface hover:border-primary/50'
                    }`}
                  >
                    <input
                      id={id}
                      type="radio"
                      name={`${idPrefix}-urgency`}
                      checked={selected}
                      onChange={() => update({ urgency: option.value })}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span>
                      <span className="block font-semibold text-text">{option.title}</span>
                      <span className="block text-sm text-text-secondary">{option.text}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Input
            id={`${idPrefix}-address`}
            label="Konum (isteğe bağlı)"
            placeholder="Şehir, ilçe veya mahalle"
            value={values.address}
            onChange={(event) => update({ address: event.target.value })}
            leftIcon={<MapPinIcon className="h-5 w-5" aria-hidden="true" />}
            maxLength={500}
          />
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-base font-semibold text-text">Fotoğraflar (isteğe bağlı)</h2>
        {canAddPhotos ? (
          <>
            <p className="mb-3 mt-1 text-sm text-text-secondary">
              Aradığınız şeyin fotoğrafı satıcıların doğru teklif vermesine yardımcı olur. En fazla {MAX_IMAGES} fotoğraf.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void handleImageSelect(event.dataTransfer.files);
              }}
              disabled={totalImageCount >= MAX_IMAGES}
              className={`flex w-full flex-col items-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
                isDragging ? 'border-primary bg-primary-light' : 'border-border hover:border-primary hover:bg-primary-light'
              }`}
            >
              <PhotoIcon className="mb-2 h-9 w-9 text-text-secondary" aria-hidden="true" />
              <span className="font-medium text-text">Fotoğraf Ekle</span>
              <span className="mt-1 text-xs text-text-secondary">
                {isPreparingImages ? 'Fotoğraflar hazırlanıyor…' : 'Sürükleyip bırakın ya da seçin. JPG, PNG veya WebP.'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              aria-label="Fotoğraf seç"
              onChange={(event) => {
                void handleImageSelect(event.target.files);
                event.target.value = '';
              }}
              className="hidden"
            />
            {totalImageCount > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {keptImages.map((image, index) => (
                  <div key={`existing-${image.id}`} className="relative aspect-square overflow-hidden rounded-lg">
                    <img src={resolveMediaUrl(image.imageUrl)} alt={image.altText || `Fotoğraf ${index + 1}`} className="h-full w-full object-cover" />
                    {removeButton('Fotoğrafı kaldır', () => removeExistingImage(image))}
                  </div>
                ))}
                {imagePreviews.map((preview, index) => (
                  <div key={preview} className="relative aspect-square overflow-hidden rounded-lg">
                    <img src={preview} alt={`Fotoğraf ${keptImages.length + index + 1}`} className="h-full w-full object-cover" />
                    {removeButton('Fotoğrafı kaldır', () => removeNewImage(index))}
                  </div>
                ))}
              </div>
            )}
            {errors.images && <p className="mt-2 text-sm text-error">{errors.images}</p>}
          </>
        ) : (
          <p className="mt-1 text-sm text-text-secondary">
            Fotoğrafları giriş yaptıktan sonra ekleyebilirsiniz; yazdıklarınız kaybolmaz.
          </p>
        )}
      </Card>

      <Card className="mb-6" padding="none">
        <button
          type="button"
          onClick={() => setShowDetails((open) => !open)}
          aria-expanded={showDetails}
          aria-controls={`${idPrefix}-details`}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-6 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span>
            <span className="block font-semibold text-text">Ayrıntılar (isteğe bağlı)</span>
            <span className="block text-sm text-text-secondary">
              Açıklama{questions.length > 0 ? ', ürün bilgileri' : ''} ve bitiş tarihi
              {answeredCount > 0 ? ` · ${answeredCount} bilgi seçili` : ''}
            </span>
          </span>
          <ChevronDownIcon className={`h-5 w-5 shrink-0 text-text-secondary transition-transform ${showDetails ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {showDetails && (
          <div id={`${idPrefix}-details`} className="space-y-5 border-t border-border px-6 pb-6 pt-5">
            {questions.map((question) => (
              <fieldset key={question.label}>
                <legend className="mb-2 text-sm font-medium text-text">{question.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {question.options.map((option) => {
                    const selected = values.answers[question.label] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          const answers = { ...values.answers };
                          if (selected) delete answers[question.label];
                          else answers[question.label] = option;
                          update({ answers });
                        }}
                        className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          selected ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text hover:border-primary'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div>
              <label htmlFor={`${idPrefix}-description`} className="mb-1 block text-sm font-medium text-text">
                Açıklama
              </label>
              <textarea
                id={`${idPrefix}-description`}
                placeholder="Aradığınızı biraz daha anlatın: model, ölçü, teslimat tercihi…"
                value={values.description}
                onChange={(event) => update({ description: event.target.value })}
                maxLength={1500}
                rows={4}
                aria-invalid={Boolean(errors.description)}
                className={`block w-full resize-none rounded-lg border bg-surface px-4 py-2.5 text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  errors.description ? 'border-error' : 'border-border focus:border-primary'
                }`}
              />
              {errors.description && <p className="mt-1 text-sm text-error">{errors.description}</p>}
            </div>

            <Input
              id={`${idPrefix}-expiry`}
              label="Bitiş tarihi"
              type="date"
              value={values.expiryDate}
              onChange={(event) => update({ expiryDate: event.target.value })}
              error={errors.expiryDate}
              min={new Date().toISOString().split('T')[0]}
              helperText="Boş bırakırsanız ilanınız siz kapatana kadar yayında kalır."
            />
          </div>
        )}
      </Card>

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
    </form>
  );
};

export default NeedForm;
