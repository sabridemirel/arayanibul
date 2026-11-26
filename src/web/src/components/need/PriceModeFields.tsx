import Input from '../ui/Input';

interface PriceModeFieldsProps {
  /** Prefix for input ids/names, so two forms on one page never collide */
  idPrefix: string;
  isFixedPrice: boolean;
  /** Raw digits */
  minBudget: string;
  maxBudget: string;
  onChange: (patch: { isFixedPrice?: boolean; minBudget?: string; maxBudget?: string }) => void;
  onBlur?: (field: 'minBudget' | 'maxBudget') => void;
  errors?: { minBudget?: string; maxBudget?: string };
}

const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 9);
const withDots = (value: string) => (value ? Number(value).toLocaleString('tr-TR') : '');

const MODES = [
  {
    fixed: false,
    title: 'Pazarlığa açık',
    text: 'Satıcılar kendi fiyatlarıyla teklif verir, en uygununu siz seçersiniz.',
  },
  {
    fixed: true,
    title: 'Bu fiyata hemen alırım',
    text: 'Fiyatınız kesindir. Satıcılar yalnızca bu fiyata “bende var” diyebilir.',
  },
] as const;

/**
 * The one price question of a listing: open to bargaining (optional budget range) or one firm
 * price. The firm price is stored in maxBudget.
 */
const PriceModeFields: React.FC<PriceModeFieldsProps> = ({
  idPrefix,
  isFixedPrice,
  minBudget,
  maxBudget,
  onChange,
  onBlur,
  errors = {},
}) => (
  <fieldset>
    <legend className="sr-only">Fiyat tercihi</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      {MODES.map((mode) => {
        const selected = mode.fixed === isFixedPrice;
        const id = `${idPrefix}-price-mode-${mode.fixed ? 'fixed' : 'open'}`;
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
              name={`${idPrefix}-price-mode`}
              checked={selected}
              onChange={() => onChange({ isFixedPrice: mode.fixed, ...(mode.fixed ? { minBudget: '' } : {}) })}
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

    <div className="mt-4">
      {isFixedPrice ? (
        <div className="sm:max-w-xs">
          <Input
            id={`${idPrefix}-fixed-price`}
            name={`${idPrefix}-fixed-price`}
            label="Fiyatınız (TL)"
            placeholder="Örn. 15.000"
            type="text"
            inputMode="numeric"
            aria-required="true"
            value={withDots(maxBudget)}
            onChange={(event) => onChange({ maxBudget: digitsOnly(event.target.value) })}
            onBlur={() => onBlur?.('maxBudget')}
            error={errors.maxBudget}
            helperText="Yanıt gelmezse fiyatı sonradan artırabilir ya da ilanı pazarlığa açabilirsiniz."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Input
            id={`${idPrefix}-min-budget`}
            name={`${idPrefix}-min-budget`}
            label="En az (TL)"
            placeholder="İsteğe bağlı"
            type="text"
            inputMode="numeric"
            value={withDots(minBudget)}
            onChange={(event) => onChange({ minBudget: digitsOnly(event.target.value) })}
            onBlur={() => onBlur?.('minBudget')}
            error={errors.minBudget}
          />
          <Input
            id={`${idPrefix}-max-budget`}
            name={`${idPrefix}-max-budget`}
            label="En fazla (TL)"
            placeholder="İsteğe bağlı"
            type="text"
            inputMode="numeric"
            value={withDots(maxBudget)}
            onChange={(event) => onChange({ maxBudget: digitsOnly(event.target.value) })}
            onBlur={() => onBlur?.('maxBudget')}
            error={errors.maxBudget}
          />
        </div>
      )}
    </div>
  </fieldset>
);

export default PriceModeFields;
