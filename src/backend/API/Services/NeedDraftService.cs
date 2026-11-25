using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using API.Interfaces;
using API.Models;

namespace API.Services;

/// <summary>
/// Turns one line of free text ("İkinci el RTX 3080, 15 bin TL'ye kadar, İstanbul") into suggested
/// listing fields using fixed rules: a keyword dictionary for the category, number patterns for the
/// budget and the list of provinces for the location. No external service is involved, so it is
/// free, instant and predictable. A language model can later replace the rules behind the same
/// endpoint without an app update.
/// </summary>
public class NeedDraftService : INeedDraftService
{
    private const int MaxTitleLength = 80;
    private const int MinTitleLength = 5;
    private const int MinDescriptionLength = 10;
    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromMilliseconds(250);

    private readonly ICategoryService _categoryService;

    private readonly IProductPricingService? _productPricing;

    public NeedDraftService(ICategoryService categoryService, IProductPricingService? productPricing = null)
    {
        _categoryService = categoryService;
        _productPricing = productPricing;
    }

    public async Task<NeedDraftResponse> BuildDraftAsync(string text)
    {
        var original = CollapseWhitespace(text);
        var folded = Fold(original);

        var budget = FindBudget(folded);
        var location = FindLocation(folded);
        var categoryName = FindCategoryName(folded);

        var response = new NeedDraftResponse
        {
            MinBudget = budget?.Min,
            MaxBudget = budget?.Max,
            Address = location?.Display
        };

        if (categoryName != null)
        {
            var categories = await _categoryService.GetCategoriesAsync();
            var all = categories.Concat(categories.SelectMany(c => c.SubCategories)).ToList();
            var category = all.FirstOrDefault(c => c.Name == categoryName);
            if (category != null)
            {
                var parent = category.ParentCategoryId.HasValue
                    ? all.FirstOrDefault(c => c.Id == category.ParentCategoryId)
                    : null;
                response.CategoryId = category.Id;
                response.CategoryName = category.NameTr;
                response.ParentCategoryName = parent?.NameTr;
                response.Questions = BuildQuestions(category.Name, parent?.Name, folded);
            }
        }

        // Fold() keeps the string length, so spans found in the folded text apply to the original.
        var spans = new List<(int Start, int Length)>();
        if (budget != null) spans.Add((budget.Start, budget.Length));
        if (location != null) spans.Add((location.Start, location.Length));
        if (_productPricing != null)
        {
            var product = await _productPricing.FindProductInTextAsync(original);
            if (product != null)
            {
                response.ProductSlug = product.Slug;
                response.ProductName = product.Name;
            }
        }

        response.Title = BuildTitle(original, spans);
        response.Description = original.Length >= MinDescriptionLength ? original : $"{original} arıyorum.";
        return response;
    }

    // ---------------------------------------------------------------- text helpers

    private static string CollapseWhitespace(string text)
        => string.Join(' ', text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    /// <summary>
    /// Lower-cases and removes Turkish diacritics one character for one character, so people who
    /// type "ekran karti" match "ekran kartı" and positions stay aligned with the original text.
    /// </summary>
    public static string Fold(string text)
    {
        var builder = new StringBuilder(text.Length);
        foreach (var ch in text)
        {
            builder.Append(ch switch
            {
                'İ' or 'I' or 'ı' or 'i' => 'i',
                'Ç' or 'ç' => 'c',
                'Ğ' or 'ğ' => 'g',
                'Ö' or 'ö' => 'o',
                'Ş' or 'ş' => 's',
                'Ü' or 'ü' => 'u',
                'Â' or 'â' => 'a',
                'Î' or 'î' => 'i',
                'Û' or 'û' => 'u',
                '’' or '`' => '\'',
                _ => char.ToLowerInvariant(ch)
            });
        }
        return builder.ToString();
    }

    private static readonly Regex TrailingFillerRegex = new(
        @"\s+(?:ariyorum|araniyor|aramaktayim|lazim|gerekiyor|gerekli|istiyorum|almak istiyorum|alinir|alinacaktir|olan var mi|var mi)[\s.!?]*$",
        RegexOptions.Compiled, RegexTimeout);

    private static string BuildTitle(string original, List<(int Start, int Length)> spans)
    {
        var title = original;
        foreach (var (start, length) in spans.OrderByDescending(s => s.Start))
        {
            if (start >= 0 && start + length <= title.Length)
            {
                title = title.Remove(start, length);
            }
        }

        // Tidy what removing "15 bin TL'ye kadar" and "İstanbul" leaves behind: ", , " etc.
        title = Regex.Replace(title, @"\s*[,;]\s*(?=[,;.]|$)", "", RegexOptions.None, RegexTimeout);
        title = Regex.Replace(title, @"\s{2,}", " ", RegexOptions.None, RegexTimeout);
        title = title.Trim(' ', ',', ';', '-', '.', ':');

        // "RTX 3080 arıyorum" reads better as "RTX 3080": every listing here is a search already.
        var filler = TrailingFillerRegex.Match(Fold(title));
        if (filler.Success && filler.Index >= MinTitleLength)
        {
            title = title[..filler.Index].TrimEnd(' ', ',', ';', '-', '.', ':');
        }

        if (title.Length < MinTitleLength)
        {
            title = original;
        }

        if (title.Length > MaxTitleLength)
        {
            var cut = title.LastIndexOf(' ', MaxTitleLength);
            title = title[..(cut > MaxTitleLength / 2 ? cut : MaxTitleLength)].TrimEnd(' ', ',', ';', '-');
        }

        if (title.Length < MinTitleLength)
        {
            title = $"{title} arıyorum";
        }

        return char.ToUpper(title[0], Tr) + title[1..];
    }

    // ---------------------------------------------------------------- budget

    private sealed record BudgetMatch(decimal? Min, decimal? Max, int Start, int Length);

    private const string Number = @"\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?";
    private const string Unit = @"bin|milyon|k(?![a-z])|mn(?![a-z])";
    private const string Currency = @"tl|lira|₺|try";

    // "10-15 bin tl", "10.000 - 15.000 TL", "10 bin ile 15 bin arasi"
    private static readonly Regex RangeRegex = new(
        $@"(?<![\w.])(?:₺\s*)?(?<a>{Number})\s*(?<ua>{Unit})?\s*(?:{Currency})?\s*(?:-|–|ile|ila)\s*(?:₺\s*)?(?<b>{Number})\s*(?<ub>{Unit})?\s*(?<cur>{Currency})?(?:'?\s*(?:arasi|arasinda|araligi|araliginda))?",
        RegexOptions.Compiled, RegexTimeout);

    // "15 bin tl'ye kadar", "en fazla 15000 lira", "₺15.000", "20 bin üstü"
    private static readonly Regex SingleRegex = new(
        $@"(?<pre>en\s+fazla|en\s+cok|maksimum|max|maks|en\s+az|minimum|min|butce(?:m)?\s*:?)?\s*(?<![\w.])(?<sym>₺\s*)?(?<n>{Number})\s*(?<u>{Unit})?\s*(?<cur>{Currency})?(?<suf>'?\s*(?:y?[ea]\s+)?(?:kadar|civari|civarinda|alti|altinda|ustu|ustunde|uzeri|ve\s+uzeri))?",
        RegexOptions.Compiled, RegexTimeout);

    private static BudgetMatch? FindBudget(string folded)
    {
        foreach (Match match in RangeRegex.Matches(folded))
        {
            var unitA = match.Groups["ua"].Value;
            var unitB = match.Groups["ub"].Value;
            // A range only counts as money with a unit or a currency ("10-15 bin", "100-200 tl"),
            // otherwise "2020-2022 model" or "8-16 gb" would be read as a budget.
            if (unitA.Length == 0 && unitB.Length == 0 && !match.Groups["cur"].Success)
            {
                continue;
            }

            var low = ToAmount(match.Groups["a"].Value, unitA.Length > 0 ? unitA : unitB);
            var high = ToAmount(match.Groups["b"].Value, unitB);
            if (low is > 0 && high is > 0 && low <= high)
            {
                return new BudgetMatch(low, high, match.Index, match.Length);
            }
        }

        foreach (Match match in SingleRegex.Matches(folded))
        {
            var unit = match.Groups["u"].Value;
            var prefix = Regex.Replace(match.Groups["pre"].Value, @"\s+", " ").TrimEnd(':', ' ');
            var suffix = match.Groups["suf"].Value;
            var hasCurrency = match.Groups["cur"].Success || match.Groups["sym"].Success;
            var hasQualifier = prefix.Length > 0 || suffix.Length > 0;

            // A bare number is a model name, a year or a size ("RTX 3080", "2 kişilik").
            // "4k" is a resolution unless money words surround it.
            var isMoney = unit is "bin" or "milyon" || hasCurrency || (hasQualifier && unit.Length > 0) ||
                          (hasQualifier && prefix.StartsWith("butce", StringComparison.Ordinal));
            if (!isMoney)
            {
                continue;
            }

            var amount = ToAmount(match.Groups["n"].Value, unit);
            if (amount is not > 0)
            {
                continue;
            }

            var isMinimum = prefix is "en az" or "minimum" or "min" ||
                            suffix.Contains("ust", StringComparison.Ordinal) ||
                            suffix.Contains("uzeri", StringComparison.Ordinal);

            // Leading whitespace captured before the number is not part of the phrase.
            var start = match.Index;
            var length = match.Length;
            while (length > 0 && folded[start] == ' ')
            {
                start++;
                length--;
            }

            return isMinimum
                ? new BudgetMatch(amount, null, start, length)
                : new BudgetMatch(null, amount, start, length);
        }

        return null;
    }

    private static decimal? ToAmount(string number, string unit)
    {
        var hasUnit = unit.Length > 0;
        string normalized;
        if (hasUnit)
        {
            // "1,5 milyon" / "1.5 bin": the separator is a decimal point.
            normalized = number.Replace(" ", "").Replace(',', '.');
        }
        else
        {
            // "15.000" / "15 000": the separator groups thousands; "149,90" has a decimal comma.
            normalized = number.Replace(" ", "").Replace(".", "").Replace(',', '.');
        }

        if (!decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out var value))
        {
            return null;
        }

        value *= unit switch
        {
            "bin" or "k" => 1_000m,
            "milyon" or "mn" => 1_000_000m,
            _ => 1m
        };

        return value is > 0 and < 1_000_000_000m ? decimal.Round(value, 2) : null;
    }

    // ---------------------------------------------------------------- location

    private sealed record LocationMatch(string Display, int Start, int Length);

    private static readonly string[] Provinces =
    {
        "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan",
        "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu",
        "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne",
        "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay",
        "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu",
        "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya",
        "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize",
        "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon",
        "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
    };

    private static readonly (string District, string Province)[] Districts =
    {
        ("Kadıköy", "İstanbul"), ("Beşiktaş", "İstanbul"), ("Üsküdar", "İstanbul"), ("Şişli", "İstanbul"),
        ("Bakırköy", "İstanbul"), ("Ataşehir", "İstanbul"), ("Maltepe", "İstanbul"), ("Kartal", "İstanbul"),
        ("Pendik", "İstanbul"), ("Ümraniye", "İstanbul"), ("Beylikdüzü", "İstanbul"), ("Esenyurt", "İstanbul"),
        ("Bahçelievler", "İstanbul"), ("Başakşehir", "İstanbul"), ("Sarıyer", "İstanbul"), ("Fatih", "İstanbul"),
        ("Beyoğlu", "İstanbul"), ("Avcılar", "İstanbul"), ("Küçükçekmece", "İstanbul"), ("Tuzla", "İstanbul"),
        ("Çankaya", "Ankara"), ("Keçiören", "Ankara"), ("Yenimahalle", "Ankara"), ("Etimesgut", "Ankara"),
        ("Mamak", "Ankara"), ("Karşıyaka", "İzmir"), ("Bornova", "İzmir"), ("Konak", "İzmir"),
        ("Buca", "İzmir"), ("Çiğli", "İzmir"), ("Nilüfer", "Bursa"), ("Osmangazi", "Bursa"),
        ("Muratpaşa", "Antalya"), ("Konyaaltı", "Antalya"), ("Alanya", "Antalya"), ("Bodrum", "Muğla"),
        ("Fethiye", "Muğla"), ("Marmaris", "Muğla"), ("Gebze", "Kocaeli"), ("İzmit", "Kocaeli")
    };

    // Locative / ablative endings people attach to place names: "İstanbul'da", "ankaradan", "izmirde"
    private const string PlaceSuffix = @"(?:'?(?:da|de|ta|te|dan|den|tan|ten|daki|deki|taki|teki|ici|icinde))?";

    private static readonly List<(Regex Pattern, string Display)> PlacePatterns = BuildPlacePatterns();

    private static List<(Regex, string)> BuildPlacePatterns()
    {
        var patterns = new List<(Regex, string)>();
        // Districts first: "Kadıköy" should win over a later bare "İstanbul".
        foreach (var (district, province) in Districts)
        {
            patterns.Add((PlaceRegex(district), $"{district}, {province}"));
        }
        foreach (var province in Provinces)
        {
            patterns.Add((PlaceRegex(province), province));
        }
        return patterns;
    }

    private static Regex PlaceRegex(string name)
        => new($@"(?<![a-z0-9]){Regex.Escape(Fold(name))}{PlaceSuffix}(?![a-z0-9])", RegexOptions.Compiled, RegexTimeout);

    private static LocationMatch? FindLocation(string folded)
    {
        LocationMatch? district = null;
        LocationMatch? province = null;

        foreach (var (pattern, display) in PlacePatterns)
        {
            var match = pattern.Match(folded);
            if (!match.Success) continue;

            if (display.Contains(','))
            {
                district ??= new LocationMatch(display, match.Index, match.Length);
            }
            else
            {
                province ??= new LocationMatch(display, match.Index, match.Length);
            }
        }

        if (district == null) return province;
        if (province == null) return district;

        // "Kadıköy, İstanbul": remove both words from the title when they sit next to each other.
        var first = district.Start < province.Start ? district : province;
        var second = district.Start < province.Start ? province : district;
        var gap = folded[(first.Start + first.Length)..second.Start];
        return gap.Trim(' ', ',', '/', '-').Length == 0
            ? new LocationMatch(district.Display, first.Start, second.Start + second.Length - first.Start)
            : district;
    }

    // ---------------------------------------------------------------- category

    /// <summary>
    /// Folded keywords (prefix-matched at word starts, so "çadır" also matches "çadırı") mapped to a
    /// category by its English seed name. The three launch focus areas are covered in depth; the
    /// rest only with their most common words. Longer keywords win over shorter ones.
    /// </summary>
    private static readonly (string Category, string[] Keywords)[] CategoryKeywords =
    {
        // --- Focus: PC components
        ("Computer Components", new[]
        {
            "ekran karti", "grafik karti", "rtx", "gtx", "radeon", "rx 5", "rx 6", "rx 7", "rx 9", "geforce",
            "islemci", "ryzen", "intel core", "core i3", "core i5", "core i7", "core i9", "anakart", "motherboard",
            "ram", "ddr3", "ddr4", "ddr5", "ssd", "nvme", "m.2", "harddisk", "hard disk", "hdd", "power supply",
            "guc kaynagi", "psu", "sivi sogutma", "islemci sogutucu", "bilgisayar kasasi", "oyuncu kasasi",
            "mekanik klavye", "oyuncu mouse", "gaming mouse", "monitor", "ekran karti arayan"
        }),
        ("Computers & Laptops", new[]
        {
            "laptop", "notebook", "dizustu", "macbook", "masaustu bilgisayar", "bilgisayar", "tablet", "ipad",
            "oyuncu bilgisayari", "all in one", "mini pc", "thinkpad"
        }),
        // --- Focus: mother & baby
        ("Maternity & Nursing", new[]
        {
            "gogus pompasi", "sut pompasi", "emzirme", "hamile", "lohusa", "gebelik", "emzirme yastigi",
            "hamile yastigi", "momcozy", "medela", "sut saklama"
        }),
        ("Baby Products", new[]
        {
            "bebek arabasi", "puset", "travel sistem", "oto koltugu", "ana kucagi", "mama sandalyesi", "besik",
            "park yatak", "bebek", "kanguru", "biberon", "sterilizator", "bebek telsizi", "bebek kamerasi",
            "yurutec", "alt degistirme", "bebek bezi", "emzik", "uyku tulumu bebek", "bugaboo", "chicco",
            "cybex", "maxi cosi", "joie", "kraft bebek", "stokke"
        }),
        ("Kids Clothing", new[] { "cocuk giyim", "cocuk mont", "cocuk ayakkabi", "bebek giyim", "bebek kiyafet", "cocuk kiyafet" }),
        ("Toys & Games", new[] { "oyuncak", "lego", "barbie", "akulu araba", "cocuk bisikleti", "scooter cocuk", "puzzle" }),
        ("Childcare Services", new[] { "bakici", "bebek bakicisi", "cocuk bakicisi", "dadi", "kres" }),
        // --- Focus: camping & caravans
        ("Caravans & Trailers", new[]
        {
            "karavan", "cekme karavan", "motokaravan", "moto karavan", "camper", "karavana cevrilmis",
            "kamp romorku", "romork"
        }),
        ("Caravan Equipment", new[]
        {
            "karavan tentesi", "karavan aksesuar", "karavan buzdolabi", "karavan klima", "karavan aku",
            "karavan gunes paneli", "gunes paneli", "inverter", "jel aku", "lityum aku", "webasto",
            "karavan isitici", "portatif tuvalet", "kaset tuvalet", "karavan cami", "karavan mobilya",
            "cekme karavan mover", "karavan su deposu", "karavan ekipman", "karavan malzeme"
        }),
        ("Tents & Sleeping Gear", new[]
        {
            "cadir", "uyku tulumu", "kamp mati", "sisme yatak", "kamp yatagi", "hamak", "tarp", "branda cadir",
            "cati cadiri", "roof tent", "kamp yastigi"
        }),
        ("Camp Kitchen & Gear", new[]
        {
            "kamp ocagi", "kamp masasi", "kamp sandalyesi", "kamp sobasi", "kamp lambasi", "kamp feneri",
            "kamp buzlugu", "termos", "kamp seti", "kamp malzeme", "kamp ekipman", "kafa lambasi",
            "kartuslu ocak", "kamp cantasi", "trekking", "kamp baltasi"
        }),
        ("Campsites & Rentals", new[] { "kamp alani", "karavan kiralama", "kiralik karavan", "karavan parki", "cadir kiralama" }),
        // --- Other electronics
        ("Mobile Phones", new[] { "iphone", "samsung galaxy", "cep telefonu", "telefon", "xiaomi", "redmi", "huawei", "android telefon" }),
        ("TV & Audio", new[] { "televizyon", "smart tv", "oled", "soundbar", "hoparlor", "kulaklik", "airpods", "amfi", "ses sistemi" }),
        ("Gaming", new[] { "playstation", "ps4", "ps5", "xbox", "nintendo", "oyun konsolu", "steam deck", "oyun kolu" }),
        ("Cameras & Photography", new[] { "fotograf makinesi", "kamera", "lens", "objektif", "drone", "gopro", "tripod" }),
        // --- Home
        ("Furniture", new[] { "koltuk", "kanepe", "yatak", "gardirop", "masa", "sandalye", "mobilya", "dolap", "baza", "kitaplik" }),
        ("Home Appliances", new[] { "buzdolabi", "camasir makinesi", "bulasik makinesi", "firin", "supurge", "klima", "kombi", "kurutma makinesi", "derin dondurucu" }),
        ("Decoration", new[] { "hali", "perde", "avize", "tablo", "dekorasyon", "ayna" }),
        ("Garden & Outdoor", new[] { "bahce", "cim bicme", "mangal", "barbeku", "saksi", "bahce mobilyasi", "semsiye" }),
        ("Kitchen & Dining", new[] { "tencere", "yemek takimi", "kahve makinesi", "mutfak robotu", "airfryer", "blender", "cay makinesi" }),
        // --- Services
        ("Cleaning Services", new[] { "temizlik", "koltuk yikama", "hali yikama", "ev temizligi", "temizlikci" }),
        ("Repair & Maintenance", new[] { "tamir", "tadilat", "boya badana", "tesisatci", "elektrikci", "usta", "montaj", "bakim onarim" }),
        ("Photography", new[] { "fotografci", "dugun fotograf", "dis cekim", "video cekim" }),
        ("Transportation", new[] { "nakliye", "nakliyat", "evden eve", "tasima", "kurye", "transfer" }),
        ("Legal & Consulting", new[] { "avukat", "danisman", "muhasebeci", "mali musavir", "tercuman" }),
        ("Event Planning", new[] { "organizasyon", "dugun", "nisan", "dogum gunu", "catering organizasyon" }),
        // --- Fashion
        ("Women's Clothing", new[] { "elbise", "kadin giyim", "abiye", "bluz", "etek", "kadin mont" }),
        ("Men's Clothing", new[] { "takim elbise", "erkek giyim", "gomlek", "erkek mont" }),
        ("Shoes & Bags", new[] { "ayakkabi", "canta", "bot", "sneaker", "spor ayakkabi" }),
        ("Beauty & Personal Care", new[] { "parfum", "makyaj", "sac kurutma", "epilasyon", "cilt bakim" }),
        ("Jewelry & Accessories", new[] { "kolye", "yuzuk", "bileklik", "kol saati", "saat", "gozluk", "aksesuar" }),
        // --- Automotive
        ("Auto Parts", new[] { "yedek parca", "cikma parca", "jant", "lastik", "far", "tampon", "aku", "oto teyp" }),
        ("Auto Services", new[] { "oto servis", "oto tamir", "kaporta", "oto yikama", "ekspertiz", "oto elektrik" }),
        ("Motorcycles", new[] { "motosiklet", "motor", "scooter", "kask" }),
        ("Cars", new[] { "otomobil", "araba", "arac", "suv", "sedan", "hatchback" }),
        // --- Health & sports
        ("Sports Equipment", new[] { "bisiklet", "kosu bandi", "dambil", "agirlik", "raket", "kayak", "paten", "spor malzeme" }),
        ("Health Products", new[] { "tekerlekli sandalye", "tansiyon aleti", "oksijen konsantratoru", "ortopedik", "isitme cihazi", "masaj" }),
        ("Fitness & Gym", new[] { "spor salonu", "fitness", "pilates", "antrenor", "personal trainer", "yoga" }),
        ("Outdoor Activities", new[] { "olta", "balik tutma", "dalis", "tirmanis", "kano", "sup board" }),
        // --- Education
        ("Tutoring", new[] { "ozel ders", "matematik dersi", "ogretmen", "lgs", "yks", "tyt", "kpss" }),
        ("Language Learning", new[] { "ingilizce", "almanca", "dil kursu", "ielts", "toefl", "yabanci dil" }),
        ("Online Courses", new[] { "online kurs", "udemy", "online egitim", "sertifika programi" }),
        ("Books", new[] { "kitap", "roman", "ders kitabi", "ansiklopedi", "cizgi roman", "dergi" }),
        // --- Food
        ("Restaurant & Catering", new[] { "catering", "yemek servisi", "restoran", "toplu yemek" }),
        ("Specialty Foods", new[] { "organik", "koy urunu", "bal", "zeytinyagi", "glutensiz", "ev yapimi" }),
        ("Beverages", new[] { "kahve", "cay", "icecek", "sarap" }),
        ("Groceries", new[] { "market alisveris", "toptan gida", "erzak" }),
        // --- Real estate
        ("Apartments", new[] { "kiralik daire", "satilik daire", "daire", "1+1", "2+1", "3+1", "esyali daire", "rezidans" }),
        ("Houses", new[] { "mustakil", "villa", "yazlik", "kiralik ev", "satilik ev", "dubleks" }),
        ("Commercial", new[] { "dukkan", "ofis", "isyeri", "depo", "magaza", "atolye" }),
        ("Land", new[] { "arsa", "tarla", "bag", "zeytinlik", "hobi bahcesi" }),
        // --- Travel
        ("Hotels & Accommodation", new[] { "otel", "pansiyon", "konaklama", "bungalov", "tatil koyu" }),
        ("Tours & Activities", new[] { "tur", "tekne turu", "gezi", "balon turu" }),
        ("Travel Services", new[] { "ucak bileti", "vize", "arac kiralama", "rent a car" }),
        // --- Pets
        ("Pet Food", new[] { "kedi mamasi", "kopek mamasi", "mama" }),
        ("Pet Accessories", new[] { "kedi kumu", "tasma", "akvaryum", "kafes", "kedi evi", "kopek kulubesi" }),
        ("Pet Services", new[] { "veteriner", "pet kuafor", "kopek egitimi", "kopek pansiyonu", "kedi oteli" }),
        ("Pet Adoption", new[] { "sahiplendirme", "yavru kedi", "yavru kopek", "sahiplenmek" })
    };

    private static readonly List<(Regex Pattern, string Category, int Weight)> CategoryPatterns =
        CategoryKeywords
            .SelectMany(entry => entry.Keywords.Select(keyword => (
                Pattern: new Regex($@"(?<![a-z0-9]){Regex.Escape(keyword)}", RegexOptions.Compiled, RegexTimeout),
                entry.Category,
                // Longer, multi-word keywords are more specific than short ones.
                Weight: keyword.Length + (keyword.Contains(' ') ? 5 : 0))))
            .OrderByDescending(p => p.Weight)
            .ToList();

    private static string? FindCategoryName(string folded)
    {
        foreach (var (pattern, category, _) in CategoryPatterns)
        {
            if (pattern.IsMatch(folded))
            {
                return category;
            }
        }
        return null;
    }

    // ---------------------------------------------------------------- quick questions

    private static readonly string[] ConditionOptions = { "Sıfır", "İkinci el", "Fark etmez" };

    private static List<NeedDraftQuestion> BuildQuestions(string categoryName, string? parentName, string folded)
    {
        var questions = new List<NeedDraftQuestion>();
        var root = parentName ?? categoryName;

        var isPcHardware = categoryName is "Computer Components" or "Computers & Laptops";
        var isBaby = root == "Baby & Kids" && categoryName != "Childcare Services";
        var isCamping = root == "Camping & Caravan";

        if (!isPcHardware && !isBaby && !isCamping)
        {
            return questions;
        }

        if (categoryName != "Campsites & Rentals")
        {
            questions.Add(new NeedDraftQuestion
            {
                Label = "Durum",
                Options = ConditionOptions.ToList(),
                Selected = DetectCondition(folded)
            });
        }

        if (isPcHardware)
        {
            questions.Add(new NeedDraftQuestion
            {
                Label = "Garanti veya fatura",
                Options = new List<string> { "Şart", "Fark etmez" },
                Selected = Regex.IsMatch(folded, @"garantili|faturali", RegexOptions.None, RegexTimeout) ? "Şart" : null
            });
        }

        if (isCamping)
        {
            questions.Add(new NeedDraftQuestion
            {
                Label = "Amaç",
                Options = new List<string> { "Satın alma", "Kiralama" },
                Selected = Regex.IsMatch(folded, @"kiralik|kirala", RegexOptions.None, RegexTimeout) ? "Kiralama" : null
            });
        }

        return questions;
    }

    private static string? DetectCondition(string folded)
    {
        if (Regex.IsMatch(folded, @"ikinci\s*el|2\.?\s*el|kullanilmis|temiz kullanilmis", RegexOptions.None, RegexTimeout))
        {
            return "İkinci el";
        }
        if (Regex.IsMatch(folded, @"(?<![a-z])sifir(?![a-z])|kapali kutu|kutusu acilmamis", RegexOptions.None, RegexTimeout))
        {
            return "Sıfır";
        }
        return null;
    }
}
