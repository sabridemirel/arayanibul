using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public static class SeedData
{
    public static async Task SeedCategoriesAsync(ApplicationDbContext context)
    {
        if (await context.Categories.AnyAsync())
        {
            return; // Categories already seeded
        }

        var categories = new List<Category>
        {
            // Ana Kategoriler
            new Category
            {
                Name = "Electronics",
                NameTr = "Elektronik",
                Description = "Elektronik cihazlar ve aksesuarlar",
                IconUrl = "/icons/electronics.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Home & Living",
                NameTr = "Ev & Yaşam",
                Description = "Ev aletleri ve yaşam ürünleri",
                IconUrl = "/icons/home.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Services",
                NameTr = "Hizmetler",
                Description = "Profesyonel ve kişisel hizmetler",
                IconUrl = "/icons/services.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Fashion & Beauty",
                NameTr = "Moda & Güzellik",
                Description = "Giyim, aksesuar ve güzellik ürünleri",
                IconUrl = "/icons/fashion.png",
                IsActive = true,
                SortOrder = 4
            },
            new Category
            {
                Name = "Automotive",
                NameTr = "Otomotiv",
                Description = "Araçlar ve otomotiv hizmetleri",
                IconUrl = "/icons/automotive.png",
                IsActive = true,
                SortOrder = 5
            },
            new Category
            {
                Name = "Health & Sports",
                NameTr = "Sağlık & Spor",
                Description = "Sağlık ürünleri ve spor ekipmanları",
                IconUrl = "/icons/health-sports.png",
                IsActive = true,
                SortOrder = 6
            },
            new Category
            {
                Name = "Education & Books",
                NameTr = "Eğitim & Kitap",
                Description = "Eğitim hizmetleri ve kitaplar",
                IconUrl = "/icons/education.png",
                IsActive = true,
                SortOrder = 7
            },
            new Category
            {
                Name = "Food & Beverage",
                NameTr = "Yiyecek & İçecek",
                Description = "Yiyecek ürünleri ve catering hizmetleri",
                IconUrl = "/icons/food.png",
                IsActive = true,
                SortOrder = 8
            },
            new Category
            {
                Name = "Real Estate",
                NameTr = "Emlak",
                Description = "Mülk satış ve kiralama",
                IconUrl = "/icons/real-estate.png",
                IsActive = true,
                SortOrder = 9
            },
            new Category
            {
                Name = "Travel & Tourism",
                NameTr = "Seyahat & Turizm",
                Description = "Seyahat hizmetleri ve turizm",
                IconUrl = "/icons/travel.png",
                IsActive = true,
                SortOrder = 10
            },
            new Category
            {
                Name = "Baby & Kids",
                NameTr = "Bebek & Çocuk",
                Description = "Bebek ve çocuk ürünleri",
                IconUrl = "/icons/baby-kids.png",
                IsActive = true,
                SortOrder = 11
            },
            new Category
            {
                Name = "Pets",
                NameTr = "Evcil Hayvan",
                Description = "Evcil hayvan ürünleri ve hizmetleri",
                IconUrl = "/icons/pets.png",
                IsActive = true,
                SortOrder = 12
            }
        };

        context.Categories.AddRange(categories);
        await context.SaveChangesAsync();

        // Alt Kategoriler - Elektronik
        var electronicsCategory = await context.Categories.FirstAsync(c => c.NameTr == "Elektronik");
        var electronicsSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Mobile Phones",
                NameTr = "Cep Telefonu",
                ParentCategoryId = electronicsCategory.Id,
                IconUrl = "/icons/mobile.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Computers & Laptops",
                NameTr = "Bilgisayar & Laptop",
                ParentCategoryId = electronicsCategory.Id,
                IconUrl = "/icons/computer.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "TV & Audio",
                NameTr = "TV & Ses Sistemi",
                ParentCategoryId = electronicsCategory.Id,
                IconUrl = "/icons/tv.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Gaming",
                NameTr = "Oyun",
                ParentCategoryId = electronicsCategory.Id,
                IconUrl = "/icons/gaming.png",
                IsActive = true,
                SortOrder = 4
            },
            new Category
            {
                Name = "Cameras & Photography",
                NameTr = "Kamera & Fotoğrafçılık",
                ParentCategoryId = electronicsCategory.Id,
                IconUrl = "/icons/camera.png",
                IsActive = true,
                SortOrder = 5
            }
        };

        // Alt Kategoriler - Ev & Yaşam
        var homeCategory = await context.Categories.FirstAsync(c => c.NameTr == "Ev & Yaşam");
        var homeSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Furniture",
                NameTr = "Mobilya",
                ParentCategoryId = homeCategory.Id,
                IconUrl = "/icons/furniture.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Home Appliances",
                NameTr = "Ev Aletleri",
                ParentCategoryId = homeCategory.Id,
                IconUrl = "/icons/appliances.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Decoration",
                NameTr = "Dekorasyon",
                ParentCategoryId = homeCategory.Id,
                IconUrl = "/icons/decoration.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Garden & Outdoor",
                NameTr = "Bahçe & Dış Mekan",
                ParentCategoryId = homeCategory.Id,
                IconUrl = "/icons/garden.png",
                IsActive = true,
                SortOrder = 4
            },
            new Category
            {
                Name = "Kitchen & Dining",
                NameTr = "Mutfak & Yemek",
                ParentCategoryId = homeCategory.Id,
                IconUrl = "/icons/kitchen.png",
                IsActive = true,
                SortOrder = 5
            }
        };

        // Alt Kategoriler - Hizmetler
        var servicesCategory = await context.Categories.FirstAsync(c => c.NameTr == "Hizmetler");
        var servicesSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Cleaning Services",
                NameTr = "Temizlik Hizmetleri",
                ParentCategoryId = servicesCategory.Id,
                IconUrl = "/icons/cleaning.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Repair & Maintenance",
                NameTr = "Tamir & Bakım",
                ParentCategoryId = servicesCategory.Id,
                IconUrl = "/icons/repair.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Photography",
                NameTr = "Fotoğrafçılık",
                ParentCategoryId = servicesCategory.Id,
                IconUrl = "/icons/photography.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Transportation",
                NameTr = "Ulaşım",
                ParentCategoryId = servicesCategory.Id,
                IconUrl = "/icons/transportation.png",
                IsActive = true,
                SortOrder = 4
            },
            new Category
            {
                Name = "Legal & Consulting",
                NameTr = "Hukuk & Danışmanlık",
                ParentCategoryId = servicesCategory.Id,
                IconUrl = "/icons/legal.png",
                IsActive = true,
                SortOrder = 5
            },
            new Category
            {
                Name = "Event Planning",
                NameTr = "Etkinlik Organizasyonu",
                ParentCategoryId = servicesCategory.Id,
                IconUrl = "/icons/event.png",
                IsActive = true,
                SortOrder = 6
            }
        };

        // Alt Kategoriler - Moda & Güzellik
        var fashionCategory = await context.Categories.FirstAsync(c => c.NameTr == "Moda & Güzellik");
        var fashionSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Women's Clothing",
                NameTr = "Kadın Giyim",
                ParentCategoryId = fashionCategory.Id,
                IconUrl = "/icons/women-clothing.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Men's Clothing",
                NameTr = "Erkek Giyim",
                ParentCategoryId = fashionCategory.Id,
                IconUrl = "/icons/men-clothing.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Shoes & Bags",
                NameTr = "Ayakkabı & Çanta",
                ParentCategoryId = fashionCategory.Id,
                IconUrl = "/icons/shoes-bags.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Beauty & Personal Care",
                NameTr = "Güzellik & Kişisel Bakım",
                ParentCategoryId = fashionCategory.Id,
                IconUrl = "/icons/beauty.png",
                IsActive = true,
                SortOrder = 4
            },
            new Category
            {
                Name = "Jewelry & Accessories",
                NameTr = "Mücevher & Aksesuar",
                ParentCategoryId = fashionCategory.Id,
                IconUrl = "/icons/jewelry.png",
                IsActive = true,
                SortOrder = 5
            }
        };

        // Alt Kategoriler - Otomotiv
        var automotiveCategory = await context.Categories.FirstAsync(c => c.NameTr == "Otomotiv");
        var automotiveSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Cars",
                NameTr = "Otomobil",
                ParentCategoryId = automotiveCategory.Id,
                IconUrl = "/icons/car.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Motorcycles",
                NameTr = "Motosiklet",
                ParentCategoryId = automotiveCategory.Id,
                IconUrl = "/icons/motorcycle.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Auto Parts",
                NameTr = "Yedek Parça",
                ParentCategoryId = automotiveCategory.Id,
                IconUrl = "/icons/auto-parts.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Auto Services",
                NameTr = "Oto Servis",
                ParentCategoryId = automotiveCategory.Id,
                IconUrl = "/icons/auto-service.png",
                IsActive = true,
                SortOrder = 4
            }
        };

        // Alt Kategoriler - Sağlık & Spor
        var healthSportsCategory = await context.Categories.FirstAsync(c => c.NameTr == "Sağlık & Spor");
        var healthSportsSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Sports Equipment",
                NameTr = "Spor Malzemeleri",
                ParentCategoryId = healthSportsCategory.Id,
                IconUrl = "/icons/sports.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Health Products",
                NameTr = "Sağlık Ürünleri",
                ParentCategoryId = healthSportsCategory.Id,
                IconUrl = "/icons/health.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Fitness & Gym",
                NameTr = "Fitness & Spor Salonu",
                ParentCategoryId = healthSportsCategory.Id,
                IconUrl = "/icons/fitness.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Outdoor Activities",
                NameTr = "Açık Hava Aktiviteleri",
                ParentCategoryId = healthSportsCategory.Id,
                IconUrl = "/icons/outdoor.png",
                IsActive = true,
                SortOrder = 4
            }
        };

        // Alt Kategoriler - Eğitim & Kitap
        var educationCategory = await context.Categories.FirstAsync(c => c.NameTr == "Eğitim & Kitap");
        var educationSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Books",
                NameTr = "Kitaplar",
                ParentCategoryId = educationCategory.Id,
                IconUrl = "/icons/books.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Online Courses",
                NameTr = "Online Kurslar",
                ParentCategoryId = educationCategory.Id,
                IconUrl = "/icons/online-course.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Tutoring",
                NameTr = "Özel Ders",
                ParentCategoryId = educationCategory.Id,
                IconUrl = "/icons/tutoring.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Language Learning",
                NameTr = "Dil Öğrenimi",
                ParentCategoryId = educationCategory.Id,
                IconUrl = "/icons/language.png",
                IsActive = true,
                SortOrder = 4
            }
        };

        // Alt Kategoriler - Yiyecek & İçecek
        var foodCategory = await context.Categories.FirstAsync(c => c.NameTr == "Yiyecek & İçecek");
        var foodSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Restaurant & Catering",
                NameTr = "Restoran & Catering",
                ParentCategoryId = foodCategory.Id,
                IconUrl = "/icons/restaurant.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Groceries",
                NameTr = "Market Alışverişi",
                ParentCategoryId = foodCategory.Id,
                IconUrl = "/icons/groceries.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Beverages",
                NameTr = "İçecekler",
                ParentCategoryId = foodCategory.Id,
                IconUrl = "/icons/beverages.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Specialty Foods",
                NameTr = "Özel Yiyecekler",
                ParentCategoryId = foodCategory.Id,
                IconUrl = "/icons/specialty-food.png",
                IsActive = true,
                SortOrder = 4
            }
        };

        // Alt Kategoriler - Emlak
        var realEstateCategory = await context.Categories.FirstAsync(c => c.NameTr == "Emlak");
        var realEstateSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Apartments",
                NameTr = "Daireler",
                ParentCategoryId = realEstateCategory.Id,
                IconUrl = "/icons/apartment.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Houses",
                NameTr = "Evler",
                ParentCategoryId = realEstateCategory.Id,
                IconUrl = "/icons/house.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Commercial",
                NameTr = "Ticari",
                ParentCategoryId = realEstateCategory.Id,
                IconUrl = "/icons/commercial.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Land",
                NameTr = "Arsa",
                ParentCategoryId = realEstateCategory.Id,
                IconUrl = "/icons/land.png",
                IsActive = true,
                SortOrder = 4
            }
        };

        // Alt Kategoriler - Seyahat & Turizm
        var travelCategory = await context.Categories.FirstAsync(c => c.NameTr == "Seyahat & Turizm");
        var travelSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Hotels & Accommodation",
                NameTr = "Otel & Konaklama",
                ParentCategoryId = travelCategory.Id,
                IconUrl = "/icons/hotel.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Tours & Activities",
                NameTr = "Turlar & Aktiviteler",
                ParentCategoryId = travelCategory.Id,
                IconUrl = "/icons/tour.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Travel Services",
                NameTr = "Seyahat Hizmetleri",
                ParentCategoryId = travelCategory.Id,
                IconUrl = "/icons/travel-service.png",
                IsActive = true,
                SortOrder = 3
            }
        };

        // Alt Kategoriler - Bebek & Çocuk
        var babyKidsCategory = await context.Categories.FirstAsync(c => c.NameTr == "Bebek & Çocuk");
        var babyKidsSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Baby Products",
                NameTr = "Bebek Ürünleri",
                ParentCategoryId = babyKidsCategory.Id,
                IconUrl = "/icons/baby.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Kids Clothing",
                NameTr = "Çocuk Giyim",
                ParentCategoryId = babyKidsCategory.Id,
                IconUrl = "/icons/kids-clothing.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Toys & Games",
                NameTr = "Oyuncak & Oyun",
                ParentCategoryId = babyKidsCategory.Id,
                IconUrl = "/icons/toys.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Childcare Services",
                NameTr = "Çocuk Bakım Hizmetleri",
                ParentCategoryId = babyKidsCategory.Id,
                IconUrl = "/icons/childcare.png",
                IsActive = true,
                SortOrder = 4
            }
        };

        // Alt Kategoriler - Evcil Hayvan
        var petsCategory = await context.Categories.FirstAsync(c => c.NameTr == "Evcil Hayvan");
        var petsSubCategories = new List<Category>
        {
            new Category
            {
                Name = "Pet Food",
                NameTr = "Evcil Hayvan Maması",
                ParentCategoryId = petsCategory.Id,
                IconUrl = "/icons/pet-food.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Pet Accessories",
                NameTr = "Evcil Hayvan Aksesuarları",
                ParentCategoryId = petsCategory.Id,
                IconUrl = "/icons/pet-accessories.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Pet Services",
                NameTr = "Evcil Hayvan Hizmetleri",
                ParentCategoryId = petsCategory.Id,
                IconUrl = "/icons/pet-services.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Pet Adoption",
                NameTr = "Evcil Hayvan Sahiplendirme",
                ParentCategoryId = petsCategory.Id,
                IconUrl = "/icons/pet-adoption.png",
                IsActive = true,
                SortOrder = 4
            }
        };

        var allSubCategories = new List<Category>();
        allSubCategories.AddRange(electronicsSubCategories);
        allSubCategories.AddRange(homeSubCategories);
        allSubCategories.AddRange(servicesSubCategories);
        allSubCategories.AddRange(fashionSubCategories);
        allSubCategories.AddRange(automotiveSubCategories);
        allSubCategories.AddRange(healthSportsSubCategories);
        allSubCategories.AddRange(educationSubCategories);
        allSubCategories.AddRange(foodSubCategories);
        allSubCategories.AddRange(realEstateSubCategories);
        allSubCategories.AddRange(travelSubCategories);
        allSubCategories.AddRange(babyKidsSubCategories);
        allSubCategories.AddRange(petsSubCategories);

        context.Categories.AddRange(allSubCategories);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Categories added after the first seed (launch focus areas: PC components, mother & baby,
    /// camping & caravans). Idempotent: runs at every startup and only adds what is missing.
    /// </summary>
    public static async Task EnsureFocusCategoriesAsync(ApplicationDbContext context)
    {
        var existing = await context.Categories.ToListAsync();

        async Task<Category> EnsureAsync(string name, string nameTr, int? parentId, int sortOrder, string? description = null)
        {
            var category = existing.FirstOrDefault(c => c.Name == name && c.ParentCategoryId == parentId);
            if (category != null) return category;

            category = new Category
            {
                Name = name,
                NameTr = nameTr,
                Description = description,
                ParentCategoryId = parentId,
                IsActive = true,
                SortOrder = sortOrder
            };
            context.Categories.Add(category);
            await context.SaveChangesAsync();
            existing.Add(category);
            return category;
        }

        var electronics = existing.FirstOrDefault(c => c.Name == "Electronics" && c.ParentCategoryId == null);
        if (electronics != null)
        {
            await EnsureAsync("Computer Components", "Bilgisayar Parçaları", electronics.Id, 6);
        }

        var babyKids = existing.FirstOrDefault(c => c.Name == "Baby & Kids" && c.ParentCategoryId == null);
        if (babyKids != null)
        {
            await EnsureAsync("Maternity & Nursing", "Anne Ürünleri", babyKids.Id, 5);
        }

        var camping = await EnsureAsync("Camping & Caravan", "Kamp & Karavan", null, 13,
            "Kamp ekipmanları, karavanlar ve karavan malzemeleri");
        await EnsureAsync("Tents & Sleeping Gear", "Çadır & Uyku Ekipmanı", camping.Id, 1);
        await EnsureAsync("Camp Kitchen & Gear", "Kamp Mutfağı & Ekipmanı", camping.Id, 2);
        await EnsureAsync("Caravans & Trailers", "Karavan & Çekme Karavan", camping.Id, 3);
        await EnsureAsync("Caravan Equipment", "Karavan Ekipmanı & Aksesuar", camping.Id, 4);
        await EnsureAsync("Campsites & Rentals", "Kamp Alanı & Kiralama", camping.Id, 5);

        // The launch focus areas lead every category list (web and mobile both follow SortOrder);
        // the remaining root categories keep their relative order behind them.
        var focusRoots = new[] { "Electronics", "Baby & Kids", "Camping & Caravan" };
        var roots = existing
            .Where(c => c.ParentCategoryId == null)
            .OrderBy(c => Array.IndexOf(focusRoots, c.Name) is var index && index >= 0 ? index : int.MaxValue)
            .ThenBy(c => c.SortOrder)
            .ThenBy(c => c.Id)
            .ToList();
        for (var position = 0; position < roots.Count; position++)
        {
            roots[position].SortOrder = position + 1;
        }

        // Within Electronics, PC components come first.
        var components = existing.FirstOrDefault(c => c.Name == "Computer Components" && c.ParentCategoryId == electronics?.Id);
        if (components != null)
        {
            components.SortOrder = 0;
        }

        await context.SaveChangesAsync();
    }

    /// <summary>
    /// First catalogue for "Gerçek Fiyat": common second-hand graphics cards. Idempotent (matched
    /// by slug); price ceilings are left empty for an admin to fill in, the default ceiling applies
    /// until then.
    /// </summary>
    public static async Task EnsureProductsAsync(ApplicationDbContext context)
    {
        var category = await context.Categories
            .FirstOrDefaultAsync(c => c.Name == "Computer Components" && c.ParentCategoryId != null);
        if (category == null) return;

        // "Ti", "Super" and "XT" versions are separate products with separate prices.
        var nvidia = new[]
        {
            "3050", "3060", "3060 Ti", "3070", "3070 Ti", "3080", "3080 Ti", "3090", "3090 Ti",
            "4060", "4060 Ti", "4070", "4070 Super", "4070 Ti", "4070 Ti Super", "4080", "4080 Super", "4090",
            "5060", "5060 Ti", "5070", "5070 Ti", "5080", "5090"
        };
        var amd = new[]
        {
            "6600", "6600 XT", "6650 XT", "6700 XT", "6750 XT", "6800", "6800 XT", "6900 XT", "6950 XT",
            "7600", "7600 XT", "7700 XT", "7800 XT", "7900 XT", "7900 XTX",
            "9060 XT", "9070", "9070 XT"
        };

        var wanted = nvidia.Select(model => (Name: $"RTX {model}", Aliases: $"rtx {model}|geforce {model}|{model}"))
            .Concat(amd.Select(model => (Name: $"RX {model}", Aliases: $"rx {model}|radeon {model}|{model}")))
            .ToList();

        var existingSlugs = (await context.Products.Select(p => p.Slug).ToListAsync()).ToHashSet();
        var order = existingSlugs.Count;
        foreach (var (name, aliases) in wanted)
        {
            var slug = name.ToLowerInvariant().Replace(' ', '-');
            if (existingSlugs.Contains(slug)) continue;

            context.Products.Add(new Product
            {
                Name = name,
                Slug = slug,
                CategoryId = category.Id,
                Aliases = aliases.ToLowerInvariant(),
                IsActive = true,
                SortOrder = ++order
            });
        }

        await context.SaveChangesAsync();
    }

    public static async Task UpdateCategoryDescriptionsAsync(ApplicationDbContext context)
    {
        var descriptions = new Dictionary<string, string>
        {
            { "Electronics",      "Elektronik cihazlar ve aksesuarlar" },
            { "Home & Living",    "Ev aletleri ve yaşam ürünleri" },
            { "Services",         "Profesyonel ve kişisel hizmetler" },
            { "Fashion & Beauty", "Giyim, aksesuar ve güzellik ürünleri" },
            { "Automotive",       "Araçlar ve otomotiv hizmetleri" },
            { "Health & Sports",  "Sağlık ürünleri ve spor ekipmanları" },
            { "Education & Books","Eğitim hizmetleri ve kitaplar" },
            { "Food & Beverage",  "Yiyecek ürünleri ve catering hizmetleri" },
            { "Real Estate",      "Mülk satış ve kiralama" },
            { "Travel & Tourism", "Seyahat hizmetleri ve turizm" },
            { "Baby & Kids",      "Bebek ve çocuk ürünleri" },
            { "Pets",             "Evcil hayvan ürünleri ve hizmetleri" }
        };

        var categories = await context.Categories
            .Where(c => descriptions.Keys.Contains(c.Name))
            .ToListAsync();

        foreach (var category in categories)
        {
            if (descriptions.TryGetValue(category.Name, out var description))
            {
                category.Description = description;
            }
        }

        await context.SaveChangesAsync();
    }
}