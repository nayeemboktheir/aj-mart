import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import defaultLogo from '@/assets/site-logo.png';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Heart, User, LayoutDashboard, ChevronRight, ChevronLeft, ChevronDown,
  Truck, Shield, RotateCcw, Star, ArrowRight, Headphones,
  Search, Menu, X, Eye, Zap, CreditCard, Package
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectCartCount, toggleCart, addToCart, openCart } from '@/store/slices/cartSlice';
import { selectWishlistItems, toggleWishlist } from '@/store/slices/wishlistSlice';
import { toast } from 'sonner';
import { Product as ProductType } from '@/types';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  images: string[];
  slug: string;
  category_id: string | null;
  is_new?: boolean;
  is_featured?: boolean;
  rating?: number;
  review_count?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  productImage?: string | null;
}

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
}

// Demo men's fashion categories
const demoCategories = [
  { id: '1', name: 'টি-শার্ট', slug: 't-shirt', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80' },
  { id: '2', name: 'জিন্স', slug: 'jeans', image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400&q=80' },
  { id: '3', name: 'পোলো শার্ট', slug: 'polo', image: 'https://images.unsplash.com/photo-1625910513413-5fc6e2bc6b12?w=400&q=80' },
  { id: '4', name: 'ফর্মাল শার্ট', slug: 'formal-shirt', image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80' },
  { id: '5', name: 'প্যান্ট', slug: 'pants', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80' },
  { id: '6', name: 'জ্যাকেট', slug: 'jacket', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80' },
];

// Demo men's fashion products
const demoProducts = [
  { id: '1', name: 'প্রিমিয়াম কটন টি-শার্ট - নেভি ব্লু', price: 650, original_price: 850, images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80'], slug: 'premium-cotton-tshirt-navy', is_new: true },
  { id: '2', name: 'স্লিম ফিট ডেনিম জিন্স', price: 1450, original_price: 1850, images: ['https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400&q=80'], slug: 'slim-fit-denim-jeans', is_featured: true },
  { id: '3', name: 'ক্লাসিক পোলো শার্ট - হোয়াইট', price: 850, original_price: 1100, images: ['https://images.unsplash.com/photo-1625910513413-5fc6e2bc6b12?w=400&q=80'], slug: 'classic-polo-white', is_new: true },
  { id: '4', name: 'ফর্মাল অফিস শার্ট - স্কাই ব্লু', price: 950, original_price: 1200, images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80'], slug: 'formal-office-shirt-blue' },
  { id: '5', name: 'কম্ফোর্ট ফিট চিনো প্যান্ট', price: 1250, original_price: 1500, images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80'], slug: 'comfort-fit-chino' },
  { id: '6', name: 'উইন্টার লেদার জ্যাকেট', price: 3500, original_price: 4500, images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80'], slug: 'winter-leather-jacket', is_featured: true },
  { id: '7', name: 'স্পোর্টস ট্র্যাক প্যান্ট', price: 750, original_price: 950, images: ['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&q=80'], slug: 'sports-track-pants', is_new: true },
  { id: '8', name: 'গ্রাফিক প্রিন্ট টি-শার্ট', price: 550, original_price: 750, images: ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80'], slug: 'graphic-print-tshirt' },
];

// Demo banners for hero slider
const demoBanners = [
  {
    id: '1',
    title: 'সামার কালেকশন ২০২৬',
    subtitle: 'টি-শার্ট, পোলো এবং ক্যাজুয়াল ওয়্যারে ৪০% পর্যন্ত ছাড়',
    image: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=1920&q=80',
    badge: '৪০% ছাড়',
    link: '/products?category=t-shirt'
  },
  {
    id: '2', 
    title: 'প্রিমিয়াম জিন্স কালেকশন',
    subtitle: 'স্লিম ফিট, রেগুলার ফিট - সব স্টাইলে',
    image: 'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=1920&q=80',
    badge: 'নতুন',
    link: '/products?category=jeans'
  },
  {
    id: '3',
    title: 'ফর্মাল কালেকশন',
    subtitle: 'অফিস এবং পার্টির জন্য পারফেক্ট',
    image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1920&q=80',
    badge: 'ট্রেন্ডিং',
    link: '/products?category=formal-shirt'
  }
];

export default function FashionHomePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [categoryScrollPosition, setCategoryScrollPosition] = useState(0);

  const cartCount = useAppSelector(selectCartCount);
  const wishlistItems = useAppSelector(selectWishlistItems);

  // Site header settings
  const { data: headerSettings } = useQuery({
    queryKey: ['header-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['site_name', 'site_logo', 'shop_logo_url']);
      if (error) throw error;
      const settingsMap: Record<string, string> = {};
      data?.forEach(item => { settingsMap[item.key] = item.value; });
      return settingsMap;
    },
    staleTime: 0,
  });

  const siteName = headerSettings?.site_name || 'Fashion Hub';
  const siteLogo = headerSettings?.site_logo || headerSettings?.shop_logo_url || defaultLogo;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch banners from database
        const { data: bannersData } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (bannersData && bannersData.length > 0) {
          setBanners(bannersData);
        }

        // Fetch categories
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });
        
        if (categoriesData && categoriesData.length > 0) {
          setCategories(categoriesData);
        }

        // Fetch featured products
        const { data: featuredData } = await supabase
          .from('products')
          .select('*')
          .eq('is_featured', true)
          .eq('is_active', true)
          .limit(8);
        
        if (featuredData && featuredData.length > 0) {
          setFeaturedProducts(featuredData);
        }

        // Fetch new arrivals
        const { data: newData } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(8);
        
        if (newData && newData.length > 0) {
          setNewArrivals(newData);
        }

        // Check user auth
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id)
            .eq('role', 'admin')
            .maybeSingle();
          setIsAdmin(!!roleData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Use demo data if database is empty
  const displayCategories = categories.length > 0 ? categories.map(c => ({
    ...c,
    image: c.image_url || demoCategories.find(d => d.slug === c.slug)?.image || demoCategories[0].image
  })) : demoCategories;

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : demoProducts;
  const displayNewArrivals = newArrivals.length > 0 ? newArrivals : demoProducts.filter(p => p.is_new);
  
  const heroSlides = banners.length > 0 
    ? banners.map(b => ({ id: b.id, title: b.title, subtitle: b.subtitle || '', image: b.image_url, link: b.link_url || '/products', badge: 'নতুন' }))
    : demoBanners;

  // Auto-slide
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  }, [heroSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, [heroSlides.length]);

  const formatPrice = (price: number) => `৳${price.toLocaleString('bn-BD')}`;

  const getDiscount = (price: number, originalPrice: number | null) => {
    if (!originalPrice || originalPrice <= price) return null;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const productForCart: ProductType = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: '',
      price: product.price,
      originalPrice: product.original_price || undefined,
      images: product.images || [],
      category: '',
      rating: product.rating || 0,
      reviewCount: product.review_count || 0,
      stock: 100,
    };
    dispatch(addToCart({ product: productForCart, quantity: 1 }));
    dispatch(openCart());
    toast.success('কার্টে যোগ করা হয়েছে');
  };

  const handleBuyNow = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const productForCart: ProductType = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: '',
      price: product.price,
      originalPrice: product.original_price || undefined,
      images: product.images || [],
      category: '',
      rating: product.rating || 0,
      reviewCount: product.review_count || 0,
      stock: 100,
    };
    dispatch(addToCart({ product: productForCart, quantity: 1 }));
    navigate('/checkout');
  };

  const handleToggleWishlist = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const productForWishlist: ProductType = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: '',
      price: product.price,
      originalPrice: product.original_price || undefined,
      images: product.images || [],
      category: '',
      rating: product.rating || 0,
      reviewCount: product.review_count || 0,
      stock: 100,
    };
    dispatch(toggleWishlist(productForWishlist));
  };

  const isInWishlist = (productId: string) => wishlistItems.some((item: any) => item.id === productId);

  // Feature items for sokherhut-style bar
  const featureItems = [
    { icon: Package, title: 'সহজে পরিবর্তনের নিশ্চয়তা', desc: 'Easy Exchange' },
    { icon: Truck, title: 'সারাদেশে ক্যাশ অন ডেলিভারি', desc: 'COD Available' },
    { icon: CreditCard, title: 'নিরাপদে পেমেন্টের মাধ্যম', desc: 'Secure Payment' },
    { icon: Headphones, title: 'সর্বক্ষনিক গ্রাহক সেবা', desc: '24/7 Support' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Sokherhut Style */}
      <header className="sticky top-0 z-50 bg-background shadow-sm">
        <div className="container-custom py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img
                src={siteLogo}
                alt={siteName}
                className="h-8 md:h-10 w-auto object-contain"
                loading="eager"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== defaultLogo) target.src = defaultLogo;
                }}
              />
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              <div className="relative group">
                <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                  ক্যাটাগরি
                  <ChevronDown className="w-4 h-4" />
                </button>
                {/* Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-card rounded-lg shadow-xl border border-border py-2 min-w-[180px]">
                    {displayCategories.slice(0, 6).map((category: any) => (
                      <Link
                        key={category.id}
                        to={`/products?category=${category.slug}`}
                        className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-muted transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <Link to="/products?sale=true" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                ফ্ল্যাশ সেল
              </Link>
              <Link to="/products" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                সকল প্রডাক্ট
              </Link>
            </nav>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:flex flex-1 max-w-lg">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="আপনার কাঙ্খিত পণ্য সার্চ করুন"
                  className="pr-14 h-11 rounded-lg border border-border bg-background focus:border-primary placeholder:text-muted-foreground/70"
                />
                <Button 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-10 rounded-md bg-orange-500 hover:bg-orange-600"
                >
                  <Search className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Mobile Search Toggle */}
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Search className="h-5 w-5" />
              </Button>

              {/* Cart */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => dispatch(toggleCart())}
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>

              {/* Language/User - Desktop */}
              <div className="hidden md:flex items-center gap-1">
                <Link to={user ? (isAdmin ? '/admin' : '/my-account') : '/auth'}>
                  <Button variant="ghost" size="icon">
                    {user && isAdmin ? <LayoutDashboard className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </Button>
                </Link>
              </div>

              {/* Mobile Menu Toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-background"
            >
              <nav className="container-custom py-4">
                <div className="mb-4">
                  <div className="relative">
                    <Input type="text" placeholder="পণ্য খুঁজুন..." className="pr-12" />
                    <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-orange-500 hover:bg-orange-600 rounded-md">
                      <Search className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
                <ul className="space-y-1">
                  <li><Link to="/" className="block py-2.5 px-3 rounded-lg text-foreground hover:bg-muted font-medium" onClick={() => setIsMobileMenuOpen(false)}>হোম</Link></li>
                  <li><Link to="/products?sale=true" className="block py-2.5 px-3 rounded-lg text-foreground hover:bg-muted font-medium" onClick={() => setIsMobileMenuOpen(false)}>ফ্ল্যাশ সেল</Link></li>
                  <li><Link to="/products" className="block py-2.5 px-3 rounded-lg text-foreground hover:bg-muted font-medium" onClick={() => setIsMobileMenuOpen(false)}>সকল প্রডাক্ট</Link></li>
                  <li className="pt-2 border-t border-border mt-2">
                    <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase">ক্যাটাগরি</p>
                    {displayCategories.slice(0, 6).map((category: any) => (
                      <Link
                        key={category.id}
                        to={`/products?category=${category.slug}`}
                        className="block py-2 px-3 text-foreground hover:bg-muted rounded-lg"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {category.name}
                      </Link>
                    ))}
                  </li>
                </ul>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Banner Slider - Sokherhut Style */}
      <section className="py-6 md:py-8 bg-muted/30">
        <div className="container-custom">
          <div className="relative bg-muted/50 rounded-2xl overflow-hidden shadow-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="relative aspect-[21/9] md:aspect-[21/8]"
              >
                <img
                  src={heroSlides[currentSlide].image}
                  alt={heroSlides[currentSlide].title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Slider Dots - Bottom Center */}
            {heroSlides.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'w-6 bg-primary' 
                        : 'w-2 bg-foreground/30 hover:bg-foreground/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Bar - Sokherhut Style */}
      <section className="py-4 bg-card border-y border-border shadow-sm">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featureItems.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="hidden md:block">
                    <p className="font-semibold text-foreground text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories Section - Sokherhut Style with Gradient Background */}
      <section className="py-10 md:py-14" style={{ background: 'linear-gradient(180deg, hsl(174, 62%, 47%) 0%, hsl(174, 62%, 55%) 100%)' }}>
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white">জনপ্রিয় ক্যাটাগরি</h2>
            <Button variant="ghost" onClick={() => navigate('/products')} className="text-white hover:bg-white/20">
              সবগুলো দেখুন <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          {/* Circular Category Cards */}
          <div className="relative">
            <div className="flex gap-4 md:gap-8 overflow-x-auto pb-4 scrollbar-hide justify-start md:justify-center">
              {displayCategories.map((category: any, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center cursor-pointer flex-shrink-0"
                  onClick={() => navigate(`/products?category=${category.slug}`)}
                >
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-white shadow-lg hover:scale-105 transition-transform bg-white">
                    <img
                      src={category.image || category.image_url || demoCategories[index % demoCategories.length]?.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="mt-3 text-sm md:text-base font-medium text-white text-center">{category.name}</p>
                </motion.div>
              ))}
            </div>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-2 mt-4">
              {[0, 1, 2].map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${index === 0 ? 'bg-white w-6' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-10 md:py-14 bg-background">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-primary font-medium text-sm tracking-wider uppercase">বেস্ট সেলিং</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-1">
                জনপ্রিয় <span className="text-primary">প্রোডাক্ট</span>
              </h2>
            </div>
            <Button variant="outline" onClick={() => navigate('/products')} className="rounded-full">
              সব দেখুন <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {displayProducts.slice(0, 8).map((product: any, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div 
                  className="bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => product.slug && navigate(`/product/${product.slug}`)}
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={product.images?.[0] || demoProducts[index % demoProducts.length]?.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {getDiscount(product.price, product.original_price) && (
                      <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground">
                        -{getDiscount(product.price, product.original_price)}%
                      </Badge>
                    )}

                    {product.is_new && !getDiscount(product.price, product.original_price) && (
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">নতুন</Badge>
                    )}

                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md"
                        onClick={(e) => handleToggleWishlist(product, e)}
                      >
                        <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-destructive text-destructive' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md"
                        onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.slug}`); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <Button
                        className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={(e) => handleAddToCart(product, e)}
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" /> কার্টে যোগ করুন
                      </Button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-medium text-foreground mb-2 line-clamp-2 text-sm min-h-[2.5rem]">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">({Math.floor(Math.random() * 50) + 10})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Promo Banners */}
      <section className="py-10 md:py-14 bg-secondary/30">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 md:p-10 cursor-pointer group"
              onClick={() => navigate('/products?category=t-shirt')}
            >
              <div className="relative z-10">
                <Badge className="mb-3 bg-white/20 text-white border-0">সীমিত অফার</Badge>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">টি-শার্ট কালেকশন</h3>
                <p className="text-white/90 mb-4">৩০% পর্যন্ত ছাড়</p>
                <Button className="bg-white text-blue-600 hover:bg-white/90 rounded-full">
                  এখনই কিনুন <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 to-slate-900 p-8 md:p-10 cursor-pointer group"
              onClick={() => navigate('/products?category=jeans')}
            >
              <div className="relative z-10">
                <Badge className="mb-3 bg-white/20 text-white border-0">নতুন আগমন</Badge>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">প্রিমিয়াম জিন্স</h3>
                <p className="text-white/90 mb-4">স্লিম ফিট কালেকশন</p>
                <Button className="bg-white text-slate-800 hover:bg-white/90 rounded-full">
                  এখনই কিনুন <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-10 md:py-14 bg-background">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-primary font-medium text-sm tracking-wider uppercase">নতুন সংযোজন</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-1">নিউ <span className="text-primary">অ্যারাইভালস</span></h2>
            </div>
            <Button variant="outline" onClick={() => navigate('/products')} className="rounded-full">
              সব দেখুন <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {displayNewArrivals.slice(0, 4).map((product: any, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer"
                onClick={() => product.slug && navigate(`/product/${product.slug}`)}
              >
                <div className="relative overflow-hidden rounded-xl bg-card mb-3 border border-border">
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={product.images?.[0] || demoProducts[index]?.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  
                  <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">নতুন</Badge>

                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-white/90 hover:bg-white"
                    onClick={(e) => handleToggleWishlist(product, e)}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-destructive text-destructive' : ''}`} />
                  </Button>

                  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      className="w-full rounded-full bg-primary/90 backdrop-blur-md text-primary-foreground hover:bg-primary"
                      onClick={(e) => handleAddToCart(product, e)}
                    >
                      কার্টে যোগ করুন
                    </Button>
                  </div>
                </div>

                <h3 className="font-medium text-foreground mb-1 line-clamp-1 text-sm">{product.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
                  {product.original_price && product.original_price > product.price && (
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-12 md:py-16 bg-secondary/50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-accent p-8 md:p-14 text-center"
          >
            <div className="relative z-10">
              <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground mb-4">
                ৩০% ছাড় পান প্রথম অর্ডারে!
              </h2>
              <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                আজই সাবস্ক্রাইব করুন এবং এক্সক্লুসিভ অফার পান।
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <Input
                  type="text"
                  placeholder="আপনার ফোন নম্বর"
                  className="flex-1 px-6 py-6 rounded-full bg-white/20 backdrop-blur-md border-white/30 text-primary-foreground placeholder:text-primary-foreground/60"
                />
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full px-8">
                  সাবস্ক্রাইব
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 md:py-16">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src={siteLogo} alt={siteName} className="h-10 w-auto object-contain invert" onError={(e) => { (e.target as HTMLImageElement).src = defaultLogo; }} />
              </div>
              <p className="text-sm text-muted mb-4">
                বাংলাদেশের সেরা পুরুষ ফ্যাশন ব্র্যান্ড। প্রিমিয়াম কোয়ালিটি, সাশ্রয়ী মূল্যে।
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">কুইক লিংক</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link to="/products" className="hover:text-background transition-colors">সব প্রোডাক্ট</Link></li>
                <li><Link to="/products?category=t-shirt" className="hover:text-background transition-colors">টি-শার্ট</Link></li>
                <li><Link to="/products?category=jeans" className="hover:text-background transition-colors">জিন্স</Link></li>
                <li><Link to="/about" className="hover:text-background transition-colors">আমাদের সম্পর্কে</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">সাহায্য</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link to="/contact" className="hover:text-background transition-colors">যোগাযোগ</Link></li>
                <li><span className="hover:text-background transition-colors cursor-pointer">রিটার্ন পলিসি</span></li>
                <li><span className="hover:text-background transition-colors cursor-pointer">শিপিং তথ্য</span></li>
                <li><span className="hover:text-background transition-colors cursor-pointer">FAQ</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">যোগাযোগ</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li>📞 01XXX-XXXXXX</li>
                <li>✉️ info@fashionhub.com</li>
                <li>📍 ঢাকা, বাংলাদেশ</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-muted/20 pt-8 text-center text-sm text-muted">
            <p>© ২০২৬ {siteName}। সর্বস্বত্ব সংরক্ষিত।</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
