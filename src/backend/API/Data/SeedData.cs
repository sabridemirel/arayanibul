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
                Description = "Electronic devices and accessories",
                IconUrl = "/icons/electronics.png",
                IsActive = true,
                SortOrder = 1
            },
            new Category
            {
                Name = "Home & Living",
                NameTr = "Ev & Yaşam",
                Description = "Home appliances and living essentials",
                IconUrl = "/icons/home.png",
                IsActive = true,
                SortOrder = 2
            },
            new Category
            {
                Name = "Services",
                NameTr = "Hizmetler",
                Description = "Professional and personal services",
                IconUrl = "/icons/services.png",
                IsActive = true,
                SortOrder = 3
            },
            new Category
            {
                Name = "Fashion & Beauty",
                NameTr = "Moda & Güzellik",
                Description = "Clothing, accessories and beauty products",
                IconUrl = "/icons/fashion.png",
                IsActive = true,
                SortOrder = 4
            },
            new Category
            {
                Name = "Automotive",
                NameTr = "Otomotiv",
                Description = "Vehicles and automotive services",
                IconUrl = "/icons/automotive.png",
                IsActive = true,
                SortOrder = 5
            },
            new Category
            {
                Name = "Health & Sports",
                NameTr = "Sağlık & Spor",
                Description = "Health products and sports equipment",
                IconUrl = "/icons/health-sports.png",
                IsActive = true,
                SortOrder = 6
            },
            new Category
            {
                Name = "Education & Books",
                NameTr = "Eğitim & Kitap",
                Description = "Educational services and books",
                IconUrl = "/icons/education.png",
                IsActive = true,
                SortOrder = 7
            },
            new Category
            {
                Name = "Food & Beverage",
                NameTr = "Yiyecek & İçecek",
                Description = "Food products and catering services",
                IconUrl = "/icons/food.png",
                IsActive = true,
                SortOrder = 8
            },
            new Category
            {
                Name = "Real Estate",
                NameTr = "Emlak",
                Description = "Property sales and rentals",
                IconUrl = "/icons/real-estate.png",
                IsActive = true,
                SortOrder = 9
            },
            new Category
            {
                Name = "Travel & Tourism",
                NameTr = "Seyahat & Turizm",
                Description = "Travel services and tourism",
                IconUrl = "/icons/travel.png",
                IsActive = true,
                SortOrder = 10
            },
            new Category
            {
                Name = "Baby & Kids",
                NameTr = "Bebek & Çocuk",
                Description = "Baby and children products",
                IconUrl = "/icons/baby-kids.png",
                IsActive = true,
                SortOrder = 11
            },
            new Category
            {
                Name = "Pets",
                NameTr = "Evcil Hayvan",
                Description = "Pet products and services",
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
}