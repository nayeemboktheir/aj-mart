import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Star, ShieldCheck, Truck, Phone, MessageCircle, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { motion, useInView } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Animated section wrapper
const AnimatedSection = ({ children, className, style, id }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; id?: string }) => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
};
import { ShippingMethodSelector, ShippingZone, SHIPPING_RATES } from "@/components/checkout/ShippingMethodSelector";
import { toast } from "sonner";
import { getEmbedUrl as getVideoEmbedUrl, parseIframeHtml } from "@/lib/videoEmbed";

interface Section {
  id: string;
  type: string;
  order: number;
  settings: Record<string, unknown>;
}

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  buttonStyle: string;
}

const DEFAULT_THEME: ThemeSettings = {
  primaryColor: "#000000",
  secondaryColor: "#f5f5f5",
  accentColor: "#ef4444",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  fontFamily: "Inter",
  borderRadius: "8px",
  buttonStyle: "filled",
};

const LandingPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["landing-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-muted-foreground">This landing page does not exist or is not published.</p>
        <Button asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  const sections = (page.sections as unknown as Section[]) || [];
  const theme = (page.theme_settings as unknown as ThemeSettings) || DEFAULT_THEME;

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: theme.fontFamily,
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
      }}
    >
      {/* SEO Meta */}
      {page.meta_title && <title>{page.meta_title}</title>}

      {/* Custom CSS */}
      {page.custom_css && <style>{page.custom_css}</style>}

      {/* Render Sections */}
      {sections.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          <p>This page has no content yet.</p>
        </div>
      ) : (
        sections.map((section) => (
          <SectionRenderer key={section.id} section={section} theme={theme} slug={slug || ""} />
        ))
      )}
    </div>
  );
};

interface SectionRendererProps {
  section: Section;
  theme: ThemeSettings;
  slug: string;
}

interface ProductVariation {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  stock: number;
}

interface ProductWithVariations {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  images: string[];
  variations: ProductVariation[];
}

interface CartItem {
  id: string; // unique key
  productId: string;
  productName: string;
  colorIdx: number;
  colorName: string;
  variationId: string;
  sizeName: string;
  quantity: number;
  price: number;
  image: string;
}

const SectionRenderer = ({ section, theme, slug }: SectionRendererProps) => {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [orderForm, setOrderForm] = useState({
    name: "",
    phone: "",
    address: "",
    quantity: 1,
    selectedVariationId: "",
  });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [tempColor, setTempColor] = useState<number | undefined>(undefined);
  const [tempSize, setTempSize] = useState<string>("");
  const [shippingZone, setShippingZone] = useState<ShippingZone>('outside_dhaka');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductWithVariations[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  // Fetch products for checkout section
  useEffect(() => {
    if (section.type !== "checkout-form") return;
    const settings = section.settings as { productIds?: string[]; productId?: string };
    // Support both productIds (array) and productId (single string)
    const ids = settings.productIds?.length ? settings.productIds : settings.productId ? [settings.productId] : [];
    if (ids.length === 0) return;

    const fetchProducts = async () => {
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, price, original_price, images")
        .in("id", ids);

      if (productsData) {
        const productsWithVariations = await Promise.all(
          productsData.map(async (product) => {
            const { data: variations } = await supabase
              .from("product_variations")
              .select("id, name, price, original_price, stock")
              .eq("product_id", product.id)
              .eq("is_active", true)
              .order("sort_order");

            return {
              ...product,
              images: product.images || [],
              variations: variations || [],
            };
          })
        );
        setProducts(productsWithVariations);
        
        // No auto-select - customer must choose manually
      }
    };

    fetchProducts();
  }, [section]);

  // Countdown effect
  useEffect(() => {
    if (section.type !== "countdown") return;
    const settings = section.settings as { endDate: string };
    if (!settings.endDate) return;

    const timer = setInterval(() => {
      const end = new Date(settings.endDate).getTime();
      const now = Date.now();
      const diff = Math.max(0, end - now);

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [section]);

  // Review carousel auto-scroll
  const reviewImages = section.type === "testimonials" ? ((section.settings as any)?.reviewImages || []) : [];
  const reviewVisibleCount = typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4;
  const reviewMaxIndex = Math.max(0, reviewImages.length - reviewVisibleCount);

  useEffect(() => {
    if (section.type !== "testimonials" || reviewImages.length <= reviewVisibleCount) return;
    const timer = setInterval(() => {
      setReviewIndex(prev => prev >= reviewMaxIndex ? 0 : prev + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, [section.type, reviewImages.length, reviewVisibleCount, reviewMaxIndex]);

  const getSelectedVariation = () => {
    for (const product of products) {
      const variation = product.variations.find(v => v.id === orderForm.selectedVariationId);
      if (variation) {
        return { product, variation };
      }
    }
    return null;
  };

  const addToCart = (product: ProductWithVariations) => {
    const colorNames = ["Ash", "White", "Sea Green", "Coffee", "Black", "Maroon"];
    if (product.images.length > 1 && tempColor === undefined) {
      toast.error("কালার সিলেক্ট করুন");
      return;
    }
    if (!tempSize) {
      toast.error("সাইজ সিলেক্ট করুন");
      return;
    }
    const variation = product.variations.find(v => v.id === tempSize);
    if (!variation) return;
    
    const colorIdx = tempColor ?? 0;
    const colorName = colorNames[colorIdx] || `Color ${colorIdx + 1}`;
    const existingIdx = cartItems.findIndex(
      ci => ci.productId === product.id && ci.colorIdx === colorIdx && ci.variationId === variation.id
    );
    
    if (existingIdx >= 0) {
      // Increment quantity of existing item
      setCartItems(prev => prev.map((ci, i) => i === existingIdx ? { ...ci, quantity: ci.quantity + 1 } : ci));
      toast.success("পরিমাণ বাড়ানো হয়েছে!");
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${colorIdx}-${variation.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        colorIdx,
        colorName,
        variationId: variation.id,
        sizeName: variation.name.replace(/^Size\s*/i, '').replace(/^Weight:\s*/i, ''),
        quantity: 1,
        price: variation.price,
        image: product.images[colorIdx] || product.images[0] || '',
      };
      setCartItems(prev => [...prev, newItem]);
      toast.success("কার্টে যোগ হয়েছে!");
    }
    // Reset temp selections
    setTempColor(undefined);
    setTempSize("");
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prev => prev.filter(ci => ci.id !== cartItemId));
  };

  const updateCartItemQty = (cartItemId: string, delta: number) => {
    setCartItems(prev => prev.map(ci => {
      if (ci.id !== cartItemId) return ci;
      const newQty = ci.quantity + delta;
      return newQty < 1 ? ci : { ...ci, quantity: newQty };
    }));
  };

  const totalCartQty = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);

  const handleOrderSubmit = async (e: React.FormEvent, settings: Record<string, unknown>) => {
    e.preventDefault();
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("অন্তত একটি আইটেম কার্টে যোগ করুন");
      return;
    }

    // Bundle pricing
    const bundlePrice = (settings as any).bundlePrice ? Number((settings as any).bundlePrice) : 0;
    const bundleQty = (settings as any).bundleQty ? Number((settings as any).bundleQty) : 2;
    const singlePrice = cartItems[0]?.price || 0;
    
    const rawTotal = cartItems.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);
    let subtotal: number;
    if (bundlePrice && totalCartQty >= bundleQty) {
      const fullBundles = Math.floor(totalCartQty / bundleQty);
      const remainder = totalCartQty % bundleQty;
      subtotal = fullBundles * bundlePrice + remainder * singlePrice;
    } else {
      subtotal = rawTotal;
    }
    
    const shippingCost = (settings as any).freeDelivery ? 0 : SHIPPING_RATES[shippingZone];
    const total = subtotal + shippingCost;

    setIsSubmitting(true);
    try {
      const items = cartItems.map(ci => ({
        productId: ci.productId,
        variationId: ci.variationId,
        quantity: ci.quantity,
        productImage: ci.image,
        colorName: ci.colorName,
      }));

      const notesParts = cartItems.map(ci => `${ci.colorName}/${ci.sizeName}×${ci.quantity}`).join(', ');

      const discount = rawTotal - subtotal;
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: {
          userId: null,
          items,
          shipping: {
            name: orderForm.name,
            phone: orderForm.phone,
            address: orderForm.address,
          },
          shippingZone,
          orderSource: 'landing_page',
          notes: `LP:${slug} | ${notesParts}`,
          discount: discount > 0 ? discount : undefined,
        },
      });

      if (error) throw error;
      if (!data?.orderId) throw new Error('Order was not created');

      navigate('/order-confirmation', {
        state: {
          orderNumber: data.orderNumber || data.orderId,
          customerName: orderForm.name,
          phone: orderForm.phone,
          total: total,
          items: cartItems.map(ci => ({
            productId: ci.productId,
            productName: `${ci.productName} - ${ci.colorName}`,
            price: ci.price,
            quantity: ci.quantity,
          })),
          numItems: totalCartQty,
          fromLandingPage: true,
          landingPageSlug: slug,
        }
      });
    } catch (error) {
      console.error("Order error:", error);
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  switch (section.type) {
    case "hero-product": {
      const settings = section.settings as {
        images: string[];
        title: string;
        subtitle: string;
        price: string;
        originalPrice: string;
        buttonText: string;
        buttonLink: string;
        badges: Array<{ text: string; subtext: string }>;
        backgroundColor: string;
        textColor: string;
        layout: string;
      };

      const images = settings.images || [];
      const isCenter = settings.layout === "center";
      const isRightImage = settings.layout === "right-image";

      const imageSection = (
        <div className="relative group">
          {images.length > 0 ? (
            <div className="relative aspect-[3/4] max-w-md mx-auto overflow-hidden rounded-2xl shadow-2xl">
              <img
                src={images[currentImage]}
                alt={settings.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Gradient overlay at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-white hover:scale-110 transition-all"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-800" />
                  </button>
                  <button
                    onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-white hover:scale-110 transition-all"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-800" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={`rounded-full transition-all duration-300 ${
                          idx === currentImage ? "w-8 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      );

      const textSection = (
        <div className={`space-y-6 ${isCenter ? "text-center" : "text-center md:text-left"}`}>
          <motion.h1 
            className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight" 
            style={{ color: settings.textColor }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {settings.title}
          </motion.h1>
          {settings.subtitle && (
            <motion.p 
              className="text-lg md:text-xl opacity-80 leading-relaxed" 
              style={{ color: settings.textColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.4 }}
            >
              {settings.subtitle}
            </motion.p>
          )}
          <motion.div
            className={`flex flex-col gap-3 ${isCenter ? "items-center" : "items-center md:items-start"}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {/* Single piece price */}
            <div className={`flex items-baseline gap-3 flex-wrap ${isCenter ? "justify-center" : "justify-center md:justify-start"}`}>
              <span className="text-base font-semibold px-3 py-1 rounded-lg bg-yellow-100 text-yellow-800">
                ১ পিচ
              </span>
              <span className="text-4xl md:text-5xl font-black" style={{ color: theme.accentColor }}>
                {settings.price ? `${settings.price}৳` : ""}
              </span>
              {settings.originalPrice && (
                <span
                  className="text-lg line-through opacity-40"
                  style={{ color: settings.textColor }}
                >
                  {settings.originalPrice}৳
                </span>
              )}
              {settings.originalPrice && settings.price && (
                <span className="ml-2 px-3 py-1 rounded-full text-xs font-bold text-white bg-red-500 animate-pulse">
                  {Math.round(((Number(settings.originalPrice) - Number(settings.price)) / Number(settings.originalPrice)) * 100)}% OFF
                </span>
              )}
            </div>
            {/* Bundle price - 2 pieces */}
            {(settings as any).bundlePrice && (
              <div className={`flex items-baseline gap-3 flex-wrap ${isCenter ? "justify-center" : "justify-center md:justify-start"}`}>
                <span className="text-base font-semibold px-3 py-1 rounded-lg bg-green-100 text-green-800">
                  ২ পিচ
                </span>
                <span className="text-3xl md:text-4xl font-black" style={{ color: '#16a34a' }}>
                  {(settings as any).bundlePrice}৳
                </span>
                <span className="text-sm line-through opacity-40" style={{ color: settings.textColor }}>
                  {Number(settings.price) * 2}৳
                </span>
                <span className="ml-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-green-500">
                  সেভ {Number(settings.price) * 2 - Number((settings as any).bundlePrice)}৳
                </span>
              </div>
            )}
          </motion.div>
          {settings.buttonText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                size="lg"
                className="px-10 py-7 text-lg font-bold shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                style={{
                  backgroundColor: theme.accentColor || theme.primaryColor,
                  color: "#fff",
                  borderRadius: "12px",
                }}
                onClick={() => {
                  const target = document.getElementById("checkout");
                  if (target) target.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {settings.buttonText}
              </Button>
            </motion.div>
          )}

          {settings.badges?.length > 0 && (
            <div
              className={`flex flex-wrap gap-6 mt-8 pt-6 border-t border-gray-200 ${isCenter ? "justify-center" : "justify-center md:justify-start"}`}
            >
              {settings.badges.map((badge, idx) => (
                <motion.div 
                  key={idx} 
                  className="text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                >
                  <div className="text-2xl md:text-3xl font-black" style={{ color: theme.accentColor || settings.textColor }}>
                    {badge.text}
                  </div>
                  <div className="text-xs md:text-sm opacity-60 mt-1" style={{ color: settings.textColor }}>
                    {badge.subtext}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      );

      return (
        <AnimatedSection className="py-16 md:py-24 px-4" style={{ backgroundColor: settings.backgroundColor }}>
          {isCenter ? (
            <div className="max-w-4xl mx-auto space-y-10">
              {imageSection}
              {textSection}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              {isRightImage ? (
                <>
                  {textSection}
                  {imageSection}
                </>
              ) : (
                <>
                  {imageSection}
                  {textSection}
                </>
              )}
            </div>
          )}
        </AnimatedSection>
      );
    }

    case "feature-badges": {
      const settings = section.settings as {
        title: string;
        badges: Array<{ icon: string; title: string; description: string }>;
        columns: number;
        backgroundColor: string;
        textColor: string;
      };

      const columns = settings.columns || 3;
      
      // Helper to clean text - remove special characters/emojis that don't render
      const cleanText = (text: string) => {
        if (!text) return text;
        return text.replace(/^[👍✅✔️•\-\*◊◆●○▪▫🔘🌴👉]+\s*/g, '').trim();
      };
      
      return (
        <AnimatedSection
          className="py-14 px-4"
          style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
        >
          <div className="max-w-6xl mx-auto">
            {settings.title && (
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">{settings.title}</h2>
            )}
            <div
              className={`grid gap-4 md:gap-6 ${
                columns === 2 ? "grid-cols-1 sm:grid-cols-2" :
                columns === 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" :
                columns === 4 ? "grid-cols-2 md:grid-cols-4" :
                "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
              }`}
            >
              {(settings.badges || []).map((badge, idx) => (
                <motion.div
                  key={idx}
                  className="text-center p-5 rounded-2xl bg-white/80 backdrop-blur border border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                >
                  {badge.icon && <span className="text-3xl mb-2 block">{badge.icon}</span>}
                  <div className="text-lg md:text-xl font-bold mb-1" style={{ color: theme.accentColor || '#333' }}>{cleanText(badge.title)}</div>
                  {badge.description && <div className="text-sm opacity-70">{cleanText(badge.description)}</div>}
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      );
    }

    case "text-block": {
      const settings = section.settings as {
        content: string;
        alignment: string;
        fontSize: string;
        backgroundColor: string;
        textColor: string;
        padding: string;
      };

      return (
        <section
          className="px-4"
          style={{
            backgroundColor: settings.backgroundColor || "transparent",
            color: settings.textColor,
            padding: settings.padding,
            textAlign: settings.alignment as "left" | "center" | "right",
            fontSize: settings.fontSize,
          }}
        >
          <div className="max-w-4xl mx-auto whitespace-pre-wrap">{settings.content}</div>
        </section>
      );
    }

    case "checkout-form": {
      const settings = section.settings as {
        title: string;
        buttonText: string;
        backgroundColor: string;
        accentColor: string;
        productIds?: string[];
        freeDeliveryMessage?: string;
        freeDelivery?: boolean;
        bundlePrice?: number;
        bundleQty?: number;
      };

      // Bundle pricing calculations based on total cart quantity
      const bQty = settings.bundleQty || 2;
      const bPrice = settings.bundlePrice;
      const singlePrice = cartItems[0]?.price || products[0]?.variations?.[0]?.price || 0;
      const rawTotal = cartItems.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);
      let subtotal = rawTotal;
      if (bPrice && totalCartQty >= bQty) {
        const fullBundles = Math.floor(totalCartQty / bQty);
        const remainder = totalCartQty % bQty;
        subtotal = fullBundles * bPrice + remainder * singlePrice;
      }
      const shippingCost = settings.freeDelivery ? 0 : SHIPPING_RATES[shippingZone];
      const total = subtotal + shippingCost;
      const savings = rawTotal - subtotal;

      return (
        <AnimatedSection
          id="checkout"
          className="py-16 px-4"
          style={{ backgroundColor: settings.backgroundColor }}
        >
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{settings.title}</h2>
            
            {/* Free Delivery Message */}
            {settings.freeDeliveryMessage && (
              <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 mb-6 text-center">
                <p className="text-green-700 font-bold text-lg">{settings.freeDeliveryMessage}</p>
              </div>
            )}

            {/* Bundle Offer Banner */}
            {bPrice && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4 mb-6 text-center">
                <p className="text-amber-800 font-bold text-lg">🎁 {bQty} পিচ নিলে মাত্র ৳{bPrice} — সেভ করুন!</p>
                <p className="text-amber-600 text-sm mt-1">বিভিন্ন কালার ও সাইজ মিক্স করতে পারবেন</p>
              </div>
            )}
            
            {/* Product Selection - Add to Cart Style */}
            {products.length > 0 && (
              <div className="mb-8 space-y-6">
                {products.map((product) => {
                  const displayPrice = product.variations[0]?.price || 0;
                  const displayOriginal = product.variations[0]?.original_price;

                  return (
                    <div key={product.id} className="bg-white rounded-2xl border p-5 space-y-5">
                      {/* Product Header */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 ring-2 ring-gray-200">
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-base md:text-lg">{product.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xl font-bold" style={{ color: settings.accentColor || '#ef4444' }}>
                              ৳ {displayPrice.toLocaleString()}
                            </span>
                            {displayOriginal && displayOriginal > displayPrice && (
                              <span className="text-sm text-gray-400 line-through">৳ {displayOriginal.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Color Selection */}
                      {product.images && product.images.length > 1 && (
                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">🎨 কালার সিলেক্ট করুন</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-3">
                            {product.images.map((img, idx) => {
                              const colorNames = ["Ash", "White", "Sea Green", "Coffee", "Black", "Maroon"];
                              const colorName = colorNames[idx] || `Color ${idx + 1}`;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setTempColor(idx)}
                                  className="flex flex-col items-center gap-1"
                                >
                                  <div className={`w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                    tempColor === idx
                                      ? 'border-amber-500 ring-2 ring-amber-300 scale-105 shadow-md'
                                      : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                                  }`}>
                                    <img src={img} alt={colorName} className="w-full h-full object-cover" />
                                  </div>
                                  <span className={`text-xs font-medium ${
                                    tempColor === idx ? 'text-amber-600' : 'text-gray-600'
                                  }`}>{colorName}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Size Selection */}
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">📏 সাইজ সিলেক্ট করুন</label>
                        <div className="flex flex-wrap gap-2">
                          {product.variations.map((variation) => {
                            const sizeLabel = variation.name.replace(/^Size\s*/i, '').replace(/^Weight:\s*/i, '');
                            const isSelected = tempSize === variation.id;
                            return (
                              <button
                                key={variation.id}
                                type="button"
                                onClick={() => setTempSize(variation.id)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 min-w-[52px] ${
                                  isSelected
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-md scale-105'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                {sizeLabel}
                                {variation.price !== product.variations[0]?.price && (
                                  <span className="block text-[10px] mt-0.5 opacity-80">৳{variation.price}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        type="button"
                        onClick={() => addToCart(product)}
                        className="w-full h-12 text-base font-bold rounded-xl flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: settings.accentColor || theme.accentColor,
                          color: "#fff",
                        }}
                      >
                        <ShoppingCart className="h-5 w-5" />
                        কার্টে যোগ করুন
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cart Items */}
            {cartItems.length > 0 && (
              <div className="mb-6 bg-white rounded-2xl border p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  আপনার কার্ট ({totalCartQty} পিচ)
                </h3>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <img src={item.image} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.colorName} — {item.sizeName}</p>
                        <p className="text-sm text-gray-500">৳ {item.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.id, -1)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center font-bold text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.id, 1)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Bundle status */}
                {bPrice && totalCartQty < bQty && (
                  <p className="text-sm text-amber-600 font-medium mt-3 text-center">
                    💡 আরো {bQty - totalCartQty} পিচ যোগ করলে বান্ডেল অফার পাবেন!
                  </p>
                )}
                {bPrice && totalCartQty >= bQty && savings > 0 && (
                  <p className="text-sm text-green-700 font-bold mt-3 bg-green-50 px-3 py-2 rounded-lg text-center">
                    ✅ বান্ডেল অফার প্রযোজ্য! সেভ হচ্ছে ৳{savings.toLocaleString()}
                  </p>
                )}
              </div>
            )}
            
            {/* Billing Form */}
            <form onSubmit={(e) => handleOrderSubmit(e, settings)} className="space-y-4">
              <h3 className="text-lg font-semibold">Billing details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Input
                    value={orderForm.phone}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="মোবাইল নম্বর *"
                    type="tel"
                    required
                    className="h-12 text-lg"
                  />
                </div>
                <div>
                  <Input
                    value={orderForm.name}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="আপনার নাম *"
                    required
                    className="h-12 text-lg"
                  />
                </div>
              </div>
              <div>
                <Textarea
                  value={orderForm.address}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="রোড/ ব্লক/ থানা/ জেলা *"
                  required
                  rows={3}
                  className="text-lg"
                />
              </div>
              
              {/* Shipping Zone Selector or Free Delivery Badge */}
              {settings.freeDelivery ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">🚚</span>
                    <span className="text-green-700 font-bold text-lg">ফ্রি ডেলিভারি</span>
                  </div>
                  <p className="text-green-600 text-sm mt-1">সারাদেশে বিনামূল্যে ডেলিভারি</p>
                </div>
              ) : (
                <ShippingMethodSelector
                  address={orderForm.address}
                  selectedZone={shippingZone}
                  onZoneChange={setShippingZone}
                />
              )}

              {/* Order Summary */}
              {cartItems.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 mt-6">
                  <h3 className="font-semibold mb-4">Your order</h3>
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center pb-2 border-b border-gray-200 last:border-0">
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt="" className="w-10 h-10 rounded object-cover" />
                          <div>
                            <p className="font-medium text-sm">{item.colorName} - {item.sizeName}</p>
                            <p className="text-sm text-gray-500">× {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-medium text-sm">৳ {(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2">
                      <span>মোট ({totalCartQty} পিচ)</span>
                      <span>৳ {rawTotal.toLocaleString()}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>বান্ডেল ডিসকাউন্ট</span>
                        <span>−৳ {savings.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>৳ {subtotal.toLocaleString()}</span>
                    </div>
                    {shippingCost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>৳ {shippingCost}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-3 border-t">
                      <span>Total</span>
                      <span style={{ color: settings.accentColor || '#b8860b' }}>৳ {total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Button
                  type="submit"
                  className="w-full h-16 text-lg font-bold mt-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 rounded-2xl"
                  style={{
                    backgroundColor: settings.accentColor || theme.accentColor,
                    color: "#fff",
                  }}
                  disabled={isSubmitting || cartItems.length === 0}
                >
                  {isSubmitting ? "Processing..." : `${settings.buttonText}  ৳ ${total.toLocaleString()}`}
                </Button>
              </motion.div>

              {/* Contact Options */}
              <div className="mt-4 text-center space-y-2">
                <p className="text-gray-600 text-sm">
                  📞 প্রয়োজনে কল করুন: <a href="tel:+8801577484748" className="font-medium text-gray-800 hover:underline">+8801577484748</a>
                </p>
                <p className="text-green-600 text-sm">
                  <a 
                    href="https://wa.me/8801854545686" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp এ মেসেজ করুন: +8801854545686
                  </a>
                </p>
              </div>
            </form>
          </div>
        </AnimatedSection>
      );
    }

    case "cta-banner": {
      const settings = section.settings as {
        title: string;
        subtitle: string;
        buttonText: string;
        buttonLink: string;
        backgroundColor: string;
        textColor: string;
      };

      return (
        <section
          className="py-16 px-4 text-center"
          style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
        >
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">{settings.title}</h2>
            {settings.subtitle && <p className="text-lg mb-6 opacity-90">{settings.subtitle}</p>}
            {settings.buttonText && (
              <Button
                size="lg"
                variant="secondary"
                style={{ borderRadius: theme.borderRadius }}
                onClick={() => {
                  if (settings.buttonLink?.startsWith("#")) {
                    const target = document.getElementById(settings.buttonLink.slice(1));
                    if (target) target.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                {settings.buttonText}
              </Button>
            )}
          </div>
        </section>
      );
    }

    case "image-gallery": {
      const settings = section.settings as {
        images: string[];
        columns: number;
        gap: string;
        aspectRatio: string;
      };

      const aspectClass: Record<string, string> = {
        square: "aspect-square",
        portrait: "aspect-[3/4]",
        landscape: "aspect-video",
        auto: "",
      };

      const columns = settings.columns || 3;
      
      return (
        <AnimatedSection className="py-12 px-4">
          <div
            className={`max-w-6xl mx-auto grid gap-4 ${
              columns === 2 ? 'grid-cols-1 sm:grid-cols-2' :
              columns === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
              columns === 4 ? 'grid-cols-2 md:grid-cols-4' :
              'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
            }`}
          >
            {(settings.images || []).map((img, idx) => (
              <motion.div 
                key={idx} 
                className={`${aspectClass[settings.aspectRatio] || "aspect-square"} overflow-hidden rounded-2xl shadow-lg group`}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
              >
                <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      );
    }

    case "image-text": {
      const settings = section.settings as {
        image: string;
        title: string;
        description: string;
        buttonText: string;
        buttonLink: string;
        imagePosition: string;
        backgroundColor: string;
      };

      const isLeft = settings.imagePosition !== "right";

      return (
        <section className="py-12 px-4" style={{ backgroundColor: settings.backgroundColor }}>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
            {isLeft && (
              <div className="aspect-video">
                {settings.image ? (
                  <img src={settings.image} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : null}
              </div>
            )}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">{settings.title}</h2>
              <p className="opacity-80">{settings.description}</p>
              {settings.buttonText && (
                <Button style={{ borderRadius: theme.borderRadius }}>{settings.buttonText}</Button>
              )}
            </div>
            {!isLeft && (
              <div className="aspect-video">
                {settings.image ? (
                  <img src={settings.image} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : null}
              </div>
            )}
          </div>
        </section>
      );
    }

    case "size-chart": {
      const settings = section.settings as {
        title: string;
        brandName?: string;
        backgroundColor?: string;
        textColor?: string;
        rows: Array<{ size: string; chest: string; length: string; sleeve: string }>;
      };

      return (
        <AnimatedSection
          className="py-12 md:py-16 px-4"
          style={{ backgroundColor: settings.backgroundColor || "#FFFFFF", color: settings.textColor || theme.textColor }}
        >
          <div className="max-w-3xl mx-auto">
            {settings.brandName && (
              <h3 className="text-2xl md:text-3xl font-extrabold text-center mb-2">{settings.brandName}</h3>
            )}
            <h2 className="text-xl md:text-2xl font-bold text-center mb-8">{settings.title || "📏 সাইজ চার্ট"}</h2>
            <div className="overflow-x-auto rounded-2xl shadow-lg border border-gray-200">
              <table className="w-full text-center">
                <thead>
                  <tr className="bg-yellow-400 text-gray-900">
                    <th className="px-6 py-4 text-base md:text-lg font-bold">Size</th>
                    <th className="px-6 py-4 text-base md:text-lg font-bold">Chest (Inch)</th>
                    <th className="px-6 py-4 text-base md:text-lg font-bold">Length (Inch)</th>
                    <th className="px-6 py-4 text-base md:text-lg font-bold">Sleeve (Inch)</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.rows || []).map((row, idx) => (
                    <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                      <td className="px-6 py-4 font-bold text-base md:text-lg">{row.size}</td>
                      <td className="px-6 py-4 text-base md:text-lg">{row.chest}</td>
                      <td className="px-6 py-4 text-base md:text-lg">{row.length}</td>
                      <td className="px-6 py-4 text-base md:text-lg">{row.sleeve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>
      );
    }

    case "testimonials": {
      const settings = section.settings as {
        title: string;
        reviewImages?: string[];
      };

      const images = settings.reviewImages || [];

      return (
        <AnimatedSection className="py-16 px-4" style={{ backgroundColor: theme.secondaryColor }}>
          <div className="max-w-6xl mx-auto">
            {settings.title && (
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{settings.title}</h2>
            )}

            {images.length > 0 && (
              <div className="relative">
                {/* Navigation arrows */}
                {images.length > reviewVisibleCount && (
                  <>
                    <button
                      onClick={() => setReviewIndex(prev => Math.max(0, prev - 1))}
                      className="absolute -left-2 md:-left-5 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white hover:scale-110 transition-all"
                      disabled={reviewIndex === 0}
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <button
                      onClick={() => setReviewIndex(prev => Math.min(reviewMaxIndex, prev + 1))}
                      className="absolute -right-2 md:-right-5 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white hover:scale-110 transition-all"
                      disabled={reviewIndex >= reviewMaxIndex}
                    >
                      <ChevronRight className="h-5 w-5 text-gray-700" />
                    </button>
                  </>
                )}

                {/* Carousel */}
                <div className="overflow-hidden rounded-2xl">
                  <div
                    className="flex transition-transform duration-500 ease-in-out gap-4"
                    style={{
                      transform: `translateX(-${reviewIndex * (100 / reviewVisibleCount)}%)`,
                    }}
                  >
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="flex-shrink-0 rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-white"
                        style={{ width: `calc(${100 / reviewVisibleCount}% - ${(reviewVisibleCount - 1) * 16 / reviewVisibleCount}px)` }}
                      >
                        <img
                          src={img}
                          alt={`Customer review ${idx + 1}`}
                          className="w-full h-auto object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dots */}
                {images.length > reviewVisibleCount && (
                  <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: reviewMaxIndex + 1 }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setReviewIndex(idx)}
                        className={`rounded-full transition-all duration-300 ${
                          idx === reviewIndex ? "w-8 h-2.5 bg-gray-800" : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </AnimatedSection>
      );
    }

    case "faq":
    case "faq-accordion": {
      const settings = section.settings as {
        title: string;
        items?: Array<{ question: string; answer: string }>;
        faqs?: Array<{ question: string; answer: string }>;
        backgroundColor?: string;
        textColor?: string;
      };

      const faqItems = settings.faqs || settings.items || [];

      return (
        <AnimatedSection 
          className="py-16 px-4" 
          style={{ 
            backgroundColor: settings.backgroundColor || '#ffffff',
            color: settings.textColor || '#1f2937'
          }}
        >
          <div className="max-w-3xl mx-auto">
            {settings.title && (
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{settings.title}</h2>
            )}
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqItems.map((item, idx) => (
                <AccordionItem 
                  key={idx} 
                  value={`faq-${idx}`} 
                  className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 overflow-hidden data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="text-left font-semibold text-base hover:no-underline py-5">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed pb-5">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </AnimatedSection>
      );
    }

    case "video":
    case "youtube-video": {
      const settings = section.settings as {
        videoUrl?: string;
        youtubeUrl?: string;
        title?: string;
        autoplay?: boolean;
        controls?: boolean;
        loop?: boolean;
        backgroundColor?: string;
        textColor?: string;
      };

      const videoUrl = settings.videoUrl || settings.youtubeUrl;
      if (!videoUrl) return null;

      // Check if it's raw iframe HTML first (Elementor-style)
      const iframeHtml = parseIframeHtml(videoUrl);
      if (iframeHtml) {
        return (
          <section 
            className="py-8 px-4"
            style={{ 
              backgroundColor: settings.backgroundColor || 'transparent',
              color: settings.textColor
            }}
          >
            <div className="max-w-4xl mx-auto">
              {settings.title && (
                <h2 className="text-2xl font-bold text-center mb-6">{settings.title}</h2>
              )}
              <div className="aspect-video relative w-full rounded-lg shadow-lg overflow-hidden">
                <div
                  className="absolute inset-0"
                  dangerouslySetInnerHTML={{ __html: iframeHtml }}
                />
              </div>
            </div>
          </section>
        );
      }

      let embedUrl = getVideoEmbedUrl(videoUrl);

      // Facebook: prefer plugin iframe with the *original* public URL (Elementor-style)
      if (
        (videoUrl.includes("facebook.com") || videoUrl.includes("fb.watch")) &&
        !videoUrl.includes("facebook.com/plugins/video.php")
      ) {
        const absolute = /^https?:\/\//i.test(videoUrl)
          ? videoUrl
          : videoUrl.startsWith("//")
            ? `https:${videoUrl}`
            : `https://${videoUrl}`;
        embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(absolute)}&show_text=false&lazy=true`;
      }

      const isEmbed = 
        embedUrl.includes("youtube.com/embed") || 
        embedUrl.includes("vimeo.com") || 
        embedUrl.includes("facebook.com/plugins/video.php");

      return (
        <section 
          className="py-8 px-4"
          style={{ 
            backgroundColor: settings.backgroundColor || 'transparent',
            color: settings.textColor
          }}
        >
          <div className="max-w-4xl mx-auto">
            {settings.title && (
              <h2 className="text-2xl font-bold text-center mb-6">{settings.title}</h2>
            )}
            <div className="aspect-video">
              {isEmbed ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full rounded-lg shadow-lg"
                  scrolling="no"
                  frameBorder={0}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                  {...(!embedUrl.includes("facebook.com/plugins/video.php")
                    ? { referrerPolicy: "no-referrer-when-downgrade" as const }
                    : {})}
                />
              ) : (
                <video
                  src={videoUrl}
                  className="w-full h-full rounded-lg"
                  autoPlay={settings.autoplay}
                  controls={settings.controls !== false}
                  loop={settings.loop}
                />
              )}
            </div>
          </div>
        </section>
      );
    }

    case "countdown": {
      const settings = section.settings as {
        title: string;
        endDate: string;
        backgroundColor: string;
        textColor: string;
      };

      return (
        <section
          className="py-8 px-4 text-center"
          style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
        >
          <div className="max-w-4xl mx-auto">
            {settings.title && <h2 className="text-xl font-bold mb-4">{settings.title}</h2>}
            <div className="flex justify-center gap-4 md:gap-8">
              {[
                { label: "Days", value: countdown.days },
                { label: "Hours", value: countdown.hours },
                { label: "Minutes", value: countdown.minutes },
                { label: "Seconds", value: countdown.seconds },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-3xl md:text-5xl font-bold">
                    {String(item.value).padStart(2, "0")}
                  </div>
                  <div className="text-sm opacity-80">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "divider": {
      const settings = section.settings as {
        style: string;
        color: string;
        thickness: string;
        width: string;
      };

      return (
        <div className="px-4">
          <hr
            style={{
              borderStyle: settings.style as "solid" | "dashed" | "dotted",
              borderColor: settings.color,
              borderWidth: `${settings.thickness} 0 0 0`,
              width: settings.width,
              margin: "0 auto",
            }}
          />
        </div>
      );
    }

    case "spacer": {
      const settings = section.settings as { height: string };
      return <div style={{ height: settings.height }} />;
    }

    case "hero-gradient": {
      const settings = section.settings as {
        badge: string;
        title: string;
        subtitle: string;
        description: string;
        features: Array<{ icon: string; text: string }>;
        buttonText: string;
        heroImage: string;
        gradientFrom: string;
        gradientTo: string;
        textColor: string;
      };

      return (
        <section 
          className="relative py-12 md:py-24 px-4 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${settings.gradientFrom || '#b8860b'} 0%, ${settings.gradientTo || '#d4a017'} 100%)`,
            color: settings.textColor || '#ffffff'
          }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Mobile: Stacked layout, Desktop: Side by side */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8 items-center">
              {/* Image - Shows first on mobile */}
              <div className="flex justify-center order-1 md:order-2 w-full">
                {settings.heroImage && (
                  <div className="relative p-3 md:p-4 bg-white/20 backdrop-blur rounded-2xl max-w-[280px] md:max-w-full">
                    <img 
                      src={settings.heroImage} 
                      alt={settings.title}
                      className="w-full h-auto rounded-xl"
                    />
                  </div>
                )}
              </div>
              
              {/* Text content - Shows below image on mobile */}
              <div className="space-y-4 md:space-y-6 text-center md:text-left order-2 md:order-1">
                {settings.badge && (
                  <div className="flex justify-center md:justify-start">
                    <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-medium">
                      🌴 {settings.badge}
                    </span>
                  </div>
                )}
                <h1 className="text-2xl md:text-5xl font-bold leading-tight">
                  {settings.title}
                </h1>
                <p className="text-base md:text-lg opacity-90">
                  {settings.subtitle}
                </p>
                <p className="opacity-80 text-sm md:text-base">
                  {settings.description}
                </p>
                {settings.features && settings.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start">
                    {settings.features.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur rounded-full text-xs md:text-sm">
                        {f.icon} {f.text}
                      </span>
                    ))}
                  </div>
                )}
                {settings.buttonText && (
                  <div className="pt-2 md:pt-0 flex justify-center md:justify-start">
                    <Button
                      size="lg"
                      className="px-6 md:px-8 py-5 md:py-6 text-base md:text-lg bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
                      onClick={() => {
                        const target = document.getElementById("checkout");
                        if (target) target.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      🔘 {settings.buttonText}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "problem-section": {
      const settings = section.settings as {
        title: string;
        problems: Array<{ icon: string; text: string }>;
        cta: string;
        backgroundColor: string;
        textColor: string;
      };

      return (
        <section 
          className="py-16 px-4"
          style={{ 
            backgroundColor: settings.backgroundColor || '#ffffff',
            color: settings.textColor || '#1f2937'
          }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-10">{settings.title}</h2>
            <div className="grid grid-cols-1 gap-4 mb-8">
              {(settings.problems || []).map((p, i) => (
                <div key={i} className="flex items-start gap-4 p-6 bg-red-50 rounded-xl text-left">
                  <span className="text-3xl">{p.icon}</span>
                  <p className="text-lg">{p.text}</p>
                </div>
              ))}
            </div>
            {settings.cta && (
              <p className="text-xl font-medium text-primary">👉 {settings.cta}</p>
            )}
          </div>
        </section>
      );
    }

    case "benefits-grid": {
      const settings = section.settings as {
        title: string;
        benefits: Array<{ icon: string; title: string; description: string }>;
        columns: number;
        backgroundColor: string;
        textColor: string;
      };

      return (
        <section 
          className="py-16 px-4"
          style={{ 
            backgroundColor: settings.backgroundColor || '#fef3c7',
            color: settings.textColor || '#1f2937'
          }}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{settings.title}</h2>
            <div 
              className={`grid gap-4 md:gap-6 ${
                (settings.columns || 3) === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                (settings.columns || 3) === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
                (settings.columns || 3) === 4 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' :
                'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              }`}
            >
              {(settings.benefits || []).map((b, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm text-center">
                  <span className="text-4xl mb-4 block">{b.icon}</span>
                  <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                  <p className="text-sm opacity-80">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "trust-badges": {
      const settings = section.settings as {
        title: string;
        badges: Array<{ icon: string; title: string; description: string }>;
        backgroundColor: string;
        textColor: string;
      };

      // Helper to clean text - remove special characters/emojis that don't render
      const cleanText = (text: string) => {
        if (!text) return text;
        return text.replace(/^[👍✅✔️•\-\*◊◆●○▪▫🔘🌴]+\s*/g, '').trim();
      };

      return (
        <section
          className="py-16 px-4"
          style={{
            backgroundColor: settings.backgroundColor || "#ffffff",
            color: settings.textColor || "#1f2937",
          }}
        >
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{settings.title}</h2>
            <div className="space-y-4">
              {(settings.badges || []).map((b, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 shadow-sm"
                >
                  <h3 className="font-bold text-gray-800">{cleanText(b.title)}</h3>
                  {b.description && <p className="text-sm opacity-80 mt-1">{cleanText(b.description)}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "guarantee-section": {
      const settings = section.settings as {
        title: string;
        guarantees: Array<{ icon: string; title: string; subtitle: string }>;
        ctaText: string;
        backgroundColor: string;
        textColor: string;
      };

      return (
        <section
          className="py-16 px-4"
          style={{
            backgroundColor: settings.backgroundColor || "#f3f4f6",
            color: settings.textColor || "#1f2937",
          }}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{settings.title}</h2>
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {(settings.guarantees || []).map((g, i) => (
                <div
                  key={i}
                  className="text-center p-6 rounded-xl bg-card text-card-foreground shadow-sm border border-border min-w-[140px]"
                >
                  <span className="text-3xl mb-2 block">{g.icon}</span>
                  <h3 className="font-bold text-sm">{g.title}</h3>
                  <p className="text-xs opacity-70">{g.subtitle}</p>
                </div>
              ))}
            </div>
            {settings.ctaText && (
              <div className="text-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8"
                  onClick={() => {
                    const target = document.getElementById("checkout");
                    if (target) target.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {settings.ctaText}
                </Button>
              </div>
            )}
          </div>
        </section>
      );
    }

    case "final-cta": {
      const settings = section.settings as {
        icon: string;
        title: string;
        subtitle: string;
        bulletPoints: string[];
        buttonText: string;
        footerText: string;
        backgroundColor: string;
        textColor: string;
      };

      return (
        <section 
          className="py-16 px-4 text-center"
          style={{ 
            backgroundColor: settings.backgroundColor || '#fef3c7',
            color: settings.textColor || '#1f2937'
          }}
        >
          <div className="max-w-3xl mx-auto">
            <span className="text-5xl mb-4 block">{settings.icon}</span>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{settings.title}</h2>
            <p className="text-lg opacity-90 mb-6">{settings.subtitle}</p>
            
            <div className="text-left inline-block mb-8">
              <h3 className="font-bold mb-3">🌴 আজই অর্ডার করুন এবং পান</h3>
              <ul className="space-y-2">
                {(settings.bulletPoints || []).map((point, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-green-600">✅</span> {point}
                  </li>
                ))}
              </ul>
            </div>

            {settings.buttonText && (
              <div className="mb-6">
                <Button
                  size="lg"
                  className="px-10 py-6 text-lg"
                  style={{ backgroundColor: theme.primaryColor }}
                  onClick={() => {
                    const target = document.getElementById("checkout");
                    if (target) target.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  🔘 {settings.buttonText}
                </Button>
              </div>
            )}

            {settings.footerText && (
              <p className="text-sm opacity-70">{settings.footerText}</p>
            )}
          </div>
        </section>
      );
    }

    case "no-risk-order": {
      const settings = section.settings as {
        title: string;
        badges: Array<{ icon: string; title: string; description: string }>;
        trustMessage: string;
        backgroundColor: string;
        textColor: string;
      };

      return (
        <section
          className="py-16 px-4"
          style={{
            backgroundColor: settings.backgroundColor || "#f5f5f5",
            color: settings.textColor || "#1f2937",
          }}
        >
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-10">{settings.title}</h2>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {(settings.badges || []).map((b, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-w-[140px] max-w-[160px] text-center"
                >
                  <span className="text-4xl mb-3 block">{b.icon}</span>
                  <h3 className="font-bold text-sm mb-1">{b.title}</h3>
                  <p className="text-xs text-gray-500">{b.description}</p>
                </div>
              ))}
            </div>
            {settings.trustMessage && (
              <div className="inline-block px-8 py-4 bg-white border-2 border-amber-400 rounded-xl text-amber-700 font-medium">
                {settings.trustMessage}
              </div>
            )}
          </div>
        </section>
      );
    }

    case "family-cta": {
      const settings = section.settings as {
        icon: string;
        title: string;
        subtitle: string;
        points: Array<{ icon: string; text: string }>;
        buttonText: string;
        phoneNumbers: string;
        backgroundColor: string;
        textColor: string;
      };

      return (
        <section
          className="py-16 px-4 text-center"
          style={{
            backgroundColor: settings.backgroundColor || "#fef3c7",
            color: settings.textColor || "#1f2937",
          }}
        >
          <div className="max-w-3xl mx-auto">
            <span className="text-5xl mb-4 block">{settings.icon || "🕌"}</span>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{settings.title}</h2>
            <p className="text-lg opacity-90 mb-8">{settings.subtitle}</p>
            
            <div className="text-left inline-block mb-8">
              {(settings.points || []).map((point, i) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <span className="text-green-600">{point.icon}</span>
                  <span>{point.text}</span>
                </div>
              ))}
            </div>

            {settings.buttonText && (
              <div className="mb-6">
                <Button
                  size="lg"
                  className="px-10 py-6 text-lg bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => {
                    const target = document.getElementById("checkout");
                    if (target) target.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {settings.buttonText}
                </Button>
              </div>
            )}

            {settings.phoneNumbers && (
              <p className="text-sm opacity-70 flex items-center justify-center gap-2">
                📞 যেকোনো প্রশ্নের জন্য কল করুন: {settings.phoneNumbers}
              </p>
            )}
          </div>
        </section>
      );
    }

    case "customer-screenshots": {
      const settings = section.settings as {
        title: string;
        subtitle?: string;
        images: string[];
        columns?: number;
        backgroundColor?: string;
        textColor?: string;
      };

      const columns = settings.columns || 2;

      return (
        <AnimatedSection
          className="py-16 px-4"
          style={{
            backgroundColor: settings.backgroundColor || "#f9fafb",
            color: settings.textColor || "#1f2937",
          }}
        >
          <div className="max-w-5xl mx-auto">
            {settings.title && (
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">{settings.title}</h2>
            )}
            {settings.subtitle && (
              <p className="text-center text-gray-500 mb-10">{settings.subtitle}</p>
            )}
            <div
              className={`grid gap-4 ${
                columns === 2 ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" :
                columns === 3 ? "grid-cols-2 md:grid-cols-3" :
                "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              }`}
            >
              {(settings.images || []).map((img, idx) => (
                <motion.div
                  key={idx}
                  className="rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-100 bg-white"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <img
                    src={img}
                    alt={`Customer review ${idx + 1}`}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      );
    }

    default:
      return null;
  }
};

export default LandingPage;
