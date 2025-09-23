export interface Ad {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget: string;
  isUrgent: boolean;
  createdAt: string;
  user: {
    name: string;
    avatar?: string;
  };
}

export const MOCK_ADS: Ad[] = [
  {
    id: '1',
    title: '2+1 Kiralık Daire Arıyorum',
    description: 'Kadıköy, Moda civarında 2+1 kiralık daire arıyorum. Eşyalı olması tercih sebebi.',
    category: 'emlak',
    location: 'İstanbul, Kadıköy',
    budget: '15.000 - 20.000 TL',
    isUrgent: true,
    createdAt: '2 saat önce',
    user: { name: 'Ahmet K.' }
  },
  {
    id: '2',
    title: 'iPhone 14 Pro Arıyorum',
    description: '128GB iPhone 14 Pro arıyorum. 2. el olabilir, ekranı kırık olmasın.',
    category: 'alisveris',
    location: 'Ankara, Çankaya',
    budget: '35.000 - 40.000 TL',
    isUrgent: false,
    createdAt: '5 saat önce',
    user: { name: 'Zeynep M.' }
  },
  {
    id: '3',
    title: 'BMW E46 Ön Tampon Arıyorum',
    description: '2002 model BMW E46 için orijinal ön tampon arıyorum. Boyasız olması tercih.',
    category: 'yedek-parca',
    location: 'İzmir, Bornova',
    budget: '2.000 - 3.000 TL',
    isUrgent: true,
    createdAt: '1 gün önce',
    user: { name: 'Mehmet Y.' }
  },
  {
    id: '4',
    title: 'Ev Temizlik Hizmeti Arıyorum',
    description: 'Haftada 1 kez ev temizliği yapacak güvenilir kişi arıyorum. 3+1 daire.',
    category: 'hizmet',
    location: 'İstanbul, Beşiktaş',
    budget: '300 - 400 TL/hafta',
    isUrgent: false,
    createdAt: '3 saat önce',
    user: { name: 'Ayşe T.' }
  },
  {
    id: '5',
    title: 'React Native Developer Arıyorum',
    description: 'E-ticaret uygulaması için deneyimli React Native developer arıyorum. Remote çalışma imkanı var.',
    category: 'yazilim',
    location: 'İstanbul, Şişli',
    budget: '25.000 - 35.000 TL/ay',
    isUrgent: true,
    createdAt: '4 saat önce',
    user: { name: 'Startup A.Ş.' }
  },
  {
    id: '6',
    title: 'Golden Retriever Yavrusu Arıyorum',
    description: 'Sağlık kontrolü yapılmış, aşıları tam Golden Retriever yavrusu arıyorum.',
    category: 'hayvan',
    location: 'Bursa, Nilüfer',
    budget: '3.000 - 5.000 TL',
    isUrgent: false,
    createdAt: '6 saat önce',
    user: { name: 'Fatma S.' }
  },
  {
    id: '7',
    title: 'Grafik Tasarım Hizmeti Arıyorum',
    description: 'Logo ve kurumsal kimlik tasarımı yapacak grafik tasarımcı arıyorum.',
    category: 'hizmet',
    location: 'Antalya, Muratpaşa',
    budget: '2.000 - 4.000 TL',
    isUrgent: false,
    createdAt: '8 saat önce',
    user: { name: 'Ömer K.' }
  },
  {
    id: '8',
    title: 'Forklift Operatörü Arıyorum',
    description: 'Depo işlerinde çalışacak deneyimli forklift operatörü arıyorum. Vardiyalı çalışma.',
    category: 'is-arayanlar',
    location: 'İstanbul, Tuzla',
    budget: '18.000 - 22.000 TL/ay',
    isUrgent: true,
    createdAt: '1 gün önce',
    user: { name: 'Lojistik Ltd.' }
  }
];