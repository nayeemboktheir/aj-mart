import { Product } from '@/types';

// Demo men's fashion products with full details
export const demoProducts: Product[] = [
  {
    id: 'demo-1',
    name: 'প্রিমিয়াম কটন টি-শার্ট - নেভি ব্লু',
    slug: 'premium-cotton-tshirt-navy',
    description: 'আরামদায়ক এবং স্টাইলিশ প্রিমিয়াম কটন টি-শার্ট। সব ধরনের ক্যাজুয়াল আউটফিটের সাথে পারফেক্ট ম্যাচ।',
    short_description: '১০০% প্রিমিয়াম কটন • ব্রিদেবল ফ্যাব্রিক • মেশিন ওয়াশেবল',
    long_description: `
## পণ্যের বিবরণ

এই প্রিমিয়াম কটন টি-শার্ট আপনার ক্যাজুয়াল ওয়ারড্রোবের জন্য পারফেক্ট চয়েস। ১০০% সুতি কাপড় দিয়ে তৈরি যা অত্যন্ত আরামদায়ক এবং ত্বকের জন্য নিরাপদ।

### বৈশিষ্ট্য:
- ১০০% প্রিমিয়াম কটন
- সফট ফিনিশ
- ব্রিদেবল ফ্যাব্রিক
- কালার ফাস্ট
- মেশিন ওয়াশেবল

### সাইজ গাইড:
- M: বুক ৩৮", লম্বা ২৬"
- L: বুক ৪০", লম্বা ২৭"
- XL: বুক ৪২", লম্বা ২৮"
- XXL: বুক ৪৪", লম্বা ২৯"
    `,
    price: 650,
    originalPrice: 850,
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80',
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80',
    ],
    category: 'টি-শার্ট',
    categorySlug: 't-shirt',
    rating: 4.8,
    reviewCount: 156,
    stock: 50,
    featured: true,
    isNew: true,
    discount: 24,
    tags: ['টি-শার্ট', 'কটন', 'ক্যাজুয়াল'],
    variations: [
      { id: 'v1-m', product_id: 'demo-1', name: 'M', price: 650, original_price: 850, stock: 15, sort_order: 1, is_active: true },
      { id: 'v1-l', product_id: 'demo-1', name: 'L', price: 650, original_price: 850, stock: 20, sort_order: 2, is_active: true },
      { id: 'v1-xl', product_id: 'demo-1', name: 'XL', price: 650, original_price: 850, stock: 10, sort_order: 3, is_active: true },
      { id: 'v1-xxl', product_id: 'demo-1', name: 'XXL', price: 700, original_price: 900, stock: 5, sort_order: 4, is_active: true },
    ],
  },
  {
    id: 'demo-2',
    name: 'স্লিম ফিট ডেনিম জিন্স',
    slug: 'slim-fit-denim-jeans',
    description: 'মডার্ন স্লিম ফিট ডেনিম জিন্স যা আপনাকে দেবে স্মার্ট লুক। স্ট্রেচ ফ্যাব্রিক মুভমেন্টে সাহায্য করে।',
    short_description: 'স্ট্রেচ ডেনিম • স্লিম ফিট • ফ্যাশনেবল লুক',
    price: 1450,
    originalPrice: 1850,
    images: [
      'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=800&q=80',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80',
      'https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=800&q=80',
    ],
    category: 'জিন্স',
    categorySlug: 'jeans',
    rating: 4.6,
    reviewCount: 98,
    stock: 35,
    featured: true,
    discount: 22,
    tags: ['জিন্স', 'ডেনিম', 'স্লিম ফিট'],
    variations: [
      { id: 'v2-30', product_id: 'demo-2', name: '30', price: 1450, original_price: 1850, stock: 10, sort_order: 1, is_active: true },
      { id: 'v2-32', product_id: 'demo-2', name: '32', price: 1450, original_price: 1850, stock: 12, sort_order: 2, is_active: true },
      { id: 'v2-34', product_id: 'demo-2', name: '34', price: 1450, original_price: 1850, stock: 8, sort_order: 3, is_active: true },
      { id: 'v2-36', product_id: 'demo-2', name: '36', price: 1500, original_price: 1900, stock: 5, sort_order: 4, is_active: true },
    ],
  },
  {
    id: 'demo-3',
    name: 'ক্লাসিক পোলো শার্ট - হোয়াইট',
    slug: 'classic-polo-white',
    description: 'ক্লাসিক ডিজাইনের পোলো শার্ট। অফিস থেকে উইকেন্ড আউটিং - সব জায়গায় পারফেক্ট।',
    short_description: 'পিক ল্যাপেল কলার • বাটন প্ল্যাকেট • রিব কাফ',
    price: 850,
    originalPrice: 1100,
    images: [
      'https://images.unsplash.com/photo-1625910513413-5fc6e2bc6b12?w=800&q=80',
      'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&q=80',
    ],
    category: 'পোলো শার্ট',
    categorySlug: 'polo',
    rating: 4.7,
    reviewCount: 124,
    stock: 42,
    isNew: true,
    discount: 23,
    tags: ['পোলো', 'শার্ট', 'ক্লাসিক'],
    variations: [
      { id: 'v3-m', product_id: 'demo-3', name: 'M', price: 850, original_price: 1100, stock: 15, sort_order: 1, is_active: true },
      { id: 'v3-l', product_id: 'demo-3', name: 'L', price: 850, original_price: 1100, stock: 15, sort_order: 2, is_active: true },
      { id: 'v3-xl', product_id: 'demo-3', name: 'XL', price: 850, original_price: 1100, stock: 12, sort_order: 3, is_active: true },
    ],
  },
  {
    id: 'demo-4',
    name: 'ফর্মাল অফিস শার্ট - স্কাই ব্লু',
    slug: 'formal-office-shirt-blue',
    description: 'প্রফেশনাল লুকের জন্য পারফেক্ট ফর্মাল শার্ট। অফিস মিটিং এবং বিজনেস ইভেন্টের জন্য আদর্শ।',
    short_description: 'রেগুলার ফিট • ফুল স্লিভ • প্রিমিয়াম ফ্যাব্রিক',
    price: 950,
    originalPrice: 1200,
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
    ],
    category: 'ফর্মাল শার্ট',
    categorySlug: 'formal-shirt',
    rating: 4.5,
    reviewCount: 87,
    stock: 28,
    discount: 21,
    tags: ['ফর্মাল', 'অফিস', 'শার্ট'],
    variations: [
      { id: 'v4-m', product_id: 'demo-4', name: 'M', price: 950, original_price: 1200, stock: 10, sort_order: 1, is_active: true },
      { id: 'v4-l', product_id: 'demo-4', name: 'L', price: 950, original_price: 1200, stock: 10, sort_order: 2, is_active: true },
      { id: 'v4-xl', product_id: 'demo-4', name: 'XL', price: 950, original_price: 1200, stock: 8, sort_order: 3, is_active: true },
    ],
  },
  {
    id: 'demo-5',
    name: 'কম্ফোর্ট ফিট চিনো প্যান্ট',
    slug: 'comfort-fit-chino',
    description: 'আল্ট্রা কম্ফোর্টেবল চিনো প্যান্ট। ক্যাজুয়াল এবং সেমি-ফর্মাল দুই ধরনের লুকেই পারফেক্ট।',
    short_description: 'কটন টুইল • কম্ফোর্ট ফিট • ইজি কেয়ার',
    price: 1250,
    originalPrice: 1500,
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80',
      'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80',
    ],
    category: 'প্যান্ট',
    categorySlug: 'pants',
    rating: 4.4,
    reviewCount: 65,
    stock: 38,
    discount: 17,
    tags: ['চিনো', 'প্যান্ট', 'ক্যাজুয়াল'],
    variations: [
      { id: 'v5-30', product_id: 'demo-5', name: '30', price: 1250, original_price: 1500, stock: 12, sort_order: 1, is_active: true },
      { id: 'v5-32', product_id: 'demo-5', name: '32', price: 1250, original_price: 1500, stock: 14, sort_order: 2, is_active: true },
      { id: 'v5-34', product_id: 'demo-5', name: '34', price: 1250, original_price: 1500, stock: 8, sort_order: 3, is_active: true },
      { id: 'v5-36', product_id: 'demo-5', name: '36', price: 1300, original_price: 1550, stock: 4, sort_order: 4, is_active: true },
    ],
  },
  {
    id: 'demo-6',
    name: 'উইন্টার লেদার জ্যাকেট',
    slug: 'winter-leather-jacket',
    description: 'প্রিমিয়াম কোয়ালিটি লেদার জ্যাকেট। শীতকালীন ফ্যাশনের জন্য মাস্ট হ্যাভ আইটেম।',
    short_description: 'জেনুইন লেদার • কিল্টেড লাইনিং • YKK জিপার',
    long_description: `
## প্রোডাক্ট ডিটেইলস

এই উইন্টার লেদার জ্যাকেট আপনার শীতকালীন ওয়ারড্রোবের জন্য পারফেক্ট অ্যাডিশন। প্রিমিয়াম কোয়ালিটি লেদার এবং ওয়ার্ম লাইনিং আপনাকে রাখবে উষ্ণ।

### বৈশিষ্ট্য:
- প্রিমিয়াম PU লেদার
- কিল্টেড ইনার লাইনিং
- YKK ব্র্যান্ডেড জিপার
- মাল্টিপল পকেট
- স্ট্যান্ড কলার

### কেয়ার ইন্সট্রাকশন:
- ড্রাই ক্লিন রিকমেন্ডেড
- সরাসরি সূর্যের আলো থেকে দূরে রাখুন
- লেদার কন্ডিশনার ব্যবহার করুন
    `,
    price: 3500,
    originalPrice: 4500,
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
      'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800&q=80',
      'https://images.unsplash.com/photo-1559551409-dadc959f76b8?w=800&q=80',
    ],
    category: 'জ্যাকেট',
    categorySlug: 'jacket',
    rating: 4.9,
    reviewCount: 203,
    stock: 20,
    featured: true,
    discount: 22,
    tags: ['জ্যাকেট', 'লেদার', 'উইন্টার'],
    variations: [
      { id: 'v6-m', product_id: 'demo-6', name: 'M', price: 3500, original_price: 4500, stock: 5, sort_order: 1, is_active: true },
      { id: 'v6-l', product_id: 'demo-6', name: 'L', price: 3500, original_price: 4500, stock: 8, sort_order: 2, is_active: true },
      { id: 'v6-xl', product_id: 'demo-6', name: 'XL', price: 3500, original_price: 4500, stock: 5, sort_order: 3, is_active: true },
      { id: 'v6-xxl', product_id: 'demo-6', name: 'XXL', price: 3700, original_price: 4700, stock: 2, sort_order: 4, is_active: true },
    ],
  },
  {
    id: 'demo-7',
    name: 'স্পোর্টস ট্র্যাক প্যান্ট',
    slug: 'sports-track-pants',
    description: 'লাইটওয়েট এবং কম্ফোর্টেবল ট্র্যাক প্যান্ট। জিম, জগিং বা ক্যাজুয়াল হোম ওয়্যারের জন্য পারফেক্ট।',
    short_description: 'ড্রাই ফিট ফ্যাব্রিক • ইলাস্টিক ওয়েস্ট • জিপ পকেট',
    price: 750,
    originalPrice: 950,
    images: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&q=80',
      'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80',
    ],
    category: 'প্যান্ট',
    categorySlug: 'pants',
    rating: 4.3,
    reviewCount: 76,
    stock: 55,
    isNew: true,
    discount: 21,
    tags: ['স্পোর্টস', 'ট্র্যাক প্যান্ট', 'ক্যাজুয়াল'],
    variations: [
      { id: 'v7-m', product_id: 'demo-7', name: 'M', price: 750, original_price: 950, stock: 18, sort_order: 1, is_active: true },
      { id: 'v7-l', product_id: 'demo-7', name: 'L', price: 750, original_price: 950, stock: 20, sort_order: 2, is_active: true },
      { id: 'v7-xl', product_id: 'demo-7', name: 'XL', price: 750, original_price: 950, stock: 12, sort_order: 3, is_active: true },
      { id: 'v7-xxl', product_id: 'demo-7', name: 'XXL', price: 800, original_price: 1000, stock: 5, sort_order: 4, is_active: true },
    ],
  },
  {
    id: 'demo-8',
    name: 'গ্রাফিক প্রিন্ট টি-শার্ট',
    slug: 'graphic-print-tshirt',
    description: 'ট্রেন্ডি গ্রাফিক প্রিন্ট টি-শার্ট। ইয়াং জেনারেশনের জন্য পারফেক্ট স্টাইল স্টেটমেন্ট।',
    short_description: 'হাই কোয়ালিটি প্রিন্ট • সফট কটন • ক্রু নেক',
    price: 550,
    originalPrice: 750,
    images: [
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80',
      'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800&q=80',
    ],
    category: 'টি-শার্ট',
    categorySlug: 't-shirt',
    rating: 4.5,
    reviewCount: 112,
    stock: 60,
    discount: 27,
    tags: ['টি-শার্ট', 'গ্রাফিক', 'ক্যাজুয়াল'],
    variations: [
      { id: 'v8-m', product_id: 'demo-8', name: 'M', price: 550, original_price: 750, stock: 20, sort_order: 1, is_active: true },
      { id: 'v8-l', product_id: 'demo-8', name: 'L', price: 550, original_price: 750, stock: 25, sort_order: 2, is_active: true },
      { id: 'v8-xl', product_id: 'demo-8', name: 'XL', price: 550, original_price: 750, stock: 15, sort_order: 3, is_active: true },
    ],
  },
];

// Get demo product by slug
export const getDemoProductBySlug = (slug: string): Product | undefined => {
  return demoProducts.find(p => p.slug === slug);
};

// Get related demo products
export const getRelatedDemoProducts = (category: string, excludeId: string): Product[] => {
  return demoProducts.filter(p => p.category === category && p.id !== excludeId).slice(0, 4);
};
