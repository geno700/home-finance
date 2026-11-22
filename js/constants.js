// Plain data shared by the app, the demo and the backup code (no browser APIs, so tests can load it).

export const PAYMENTS = ['cash', 'card', 'wallet', 'transfer'];

// Arabic labels the Android app stores for each payment method (used in backup files).
export const PAYMENT_AR = { cash: 'نقداً', card: 'بطاقة بنكية', wallet: 'محفظة إلكترونية', transfer: 'تحويل بنكي' };

// The ten starting categories (same as the Android app and schema.sql). key = the parser's kind.
export const DEFAULT_CATEGORIES = [
  { key: 'bills', name_ar: 'الأساسيات والفواتير', name_en: 'Utilities & Bills', budget: 2500, color: '#3b82f6' },
  { key: 'transport', name_ar: 'المواصلات', name_en: 'Transportation', budget: 1500, color: '#eab308' },
  { key: 'meat', name_ar: 'اللحوم والدواجن والأسماك', name_en: 'Meat, Poultry & Fish', budget: 4000, color: '#ef4444' },
  { key: 'pantry', name_ar: 'الخزين والبقالة', name_en: 'Pantry & Groceries', budget: 3000, color: '#10b981' },
  { key: 'dairy', name_ar: 'الجبن والألبان والبيض', name_en: 'Dairy, Cheese & Eggs', budget: 1500, color: '#f59e0b' },
  { key: 'cleaning', name_ar: 'المنظفات والورقيات والمستلزمات', name_en: 'Cleaning & Supplies', budget: 800, color: '#06b6d4' },
  { key: 'produce', name_ar: 'الفاكهة والخضروات', name_en: 'Fruits & Vegetables', budget: 1200, color: '#22c55e' },
  { key: 'medical', name_ar: 'العلاج', name_en: 'Medical & Health', budget: 1000, color: '#ec4899' },
  { key: 'charity', name_ar: 'الصدقة', name_en: 'Charity & Donations', budget: 500, color: '#8b5cf6' },
  { key: 'fun', name_ar: 'الترفيه', name_en: 'Entertainment & Outings', budget: 1000, color: '#f43f5e' },
].map((c, i) => ({ ...c, sort_order: i + 1 }));
