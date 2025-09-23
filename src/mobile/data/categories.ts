export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'emlak', name: 'EMLAK', icon: 'home', color: '#FF6B6B' },
  { id: 'vasita', name: 'VASITA', icon: 'directions-car', color: '#4ECDC4' },
  { id: 'yedek-parca', name: 'YEDEK PARÇA', icon: 'build', color: '#45B7D1' },
  { id: 'alisveris', name: 'ALIŞVERİŞ', icon: 'shopping-cart', color: '#96CEB4' },
  { id: 'is-makinasi', name: 'İŞ MAKİNASI', icon: 'precision-manufacturing', color: '#FFEAA7' },
  { id: 'hizmet', name: 'HİZMET', icon: 'handyman', color: '#DDA0DD' },
  { id: 'is-arayanlar', name: 'İŞ ARAYANLAR', icon: 'work', color: '#98D8C8' },
  { id: 'hayvan', name: 'HAYVAN', icon: 'pets', color: '#F7DC6F' },
  { id: 'koleksiyon', name: 'KOLEKSİYON', icon: 'collections', color: '#BB8FCE' },
  { id: 'kayip-esya', name: 'KAYIP EŞYA', icon: 'search', color: '#F1948A' },
  { id: 'yazilim', name: 'YAZILIM', icon: 'computer', color: '#85C1E9' },
];