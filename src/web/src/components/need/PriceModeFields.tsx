import { Link } from 'react-router-dom';
import Input from '../ui/Input';
import type { ProductHint } from './needFormTypes';

interface PriceModeFieldsProps {
  /** Prefix for input ids/names, so two forms on one page never collide */
  idPrefix: string;
  isFixedPrice: boolean;
  /** Raw digits */
  price: string;
  onChange: (patch: { isFixedPrice?: boolean; price?: string }) => void;
  error?: string;
  product?: ProductHint | null;
  /** Budget an older listing was created with (open listings no longer take one) */
  legacyBudget?: string | null;
}

const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 9);
const withDots = (value: string) => (value ? Number(value).toLocaleString('tr-TR') : '');

const MODES = [
  {
    fixed: true,
    title: 'Bu fiyata hemen alırım',
    text: 'Fiyatınızı yazın. Satıcılar yalnızca bu fiyata “bende var” diyebilir.',
  },
  {
    fixed: false,
    title: 'Tekliflere açığım',
    text: 'Fiyat yazmayın; satıcılar kendi fiyatlarıyla teklif versin, en uygununu siz seçin.',
  },
] as const;

/** The listing's one price question: one firm price, or no price and offers from sellers. */
const PriceModeFields: React.FC<PriceModeFieldsProps> = ({
  idPrefix,
  isFixedPrice,
  price,
  onChange,
  error,
  product,
  legacyBudget,
}) => (
  <fieldset>
    <legend className="mb-2 block text-sm font-medium text-text">İlan türü</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      {MODES.map((mode) => {
        const selected = mode.fixed === isFixedPrice;
        const id = `${idPrefix}-type-${mode.fixed ? 'fixed' : 'offers'}`;
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
              name={`${idPrefix}-type`}
              checked={selected}
              onChange={() => onChange({ isFixedPrice: mode.fixed })}
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              <span className="block font-semibold text-text">{mode.title}</span>
              <span className="block text-sm text-text-secondary">{mode.text}</span>
            </span>
          </label>
        );
      })}
    </div>

    {isFixedPrice ? (
      <div className="mt-4 sm:max-w-xs">
        <Input
          id={`${idPrefix}-price`}
          name={`${idPrefix}-price`}
          label="Fiyatınız (TL)"
          placeholder="Örn. 15.000"
          type="text"
          inputMode="numeric"
          aria-required="true"
          value={withDots(price)}
          onChange={(event) => onChange({ price: digitsOnly(event.target.value) })}
          error={error}
          helperText="Teklif gelmezse fiyatı sonradan artırabilir ya da ilanı tekliflere açabilirsiniz."
        />
      </div>
    ) : (
      legacyBudget && (
        <p className="mt-3 text-sm text-text-secondary">
          Bu ilan daha önce {legacyBudget} bütçeyle açılmış; bütçe ilanda görünmeye devam eder.
        </p>
      )
    )}

    {product && (
      <p className="mt-3 rounded-lg bg-primary-light px-3 py-2 text-sm text-text">
        {product.realPrice
          ? `${product.name} için alıcıların şu an verdiği en yüksek fiyat ${Math.round(product.realPrice).toLocaleString('tr-TR')} TL.`
          : `${product.name} için henüz fiyat veren yok; ilk fiyatı siz verebilirsiniz.`}{' '}
        {isFixedPrice ? 'Fiyatınız bu ürünün fiyat sayfasında da sıralanır. ' : ''}
        <Link to={`/fiyat/${product.slug}`} className="font-semibold text-primary hover:underline">
          Fiyat sayfası
        </Link>
      </p>
    )}
  </fieldset>
);

export default PriceModeFields;
