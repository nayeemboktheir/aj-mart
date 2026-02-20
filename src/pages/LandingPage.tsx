import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Star, ShieldCheck, Truck, Phone, MessageCircle } from "lucide-react";
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
  const [shippingZone, setShippingZone] = useState<ShippingZone>('outside_dhaka');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductWithVariations[]>([]);

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
        
        // Auto-select first variation
        if (productsWithVariations.length > 0 && productsWithVariations[0].variations.length > 0) {
          setOrderForm(prev => ({ ...prev, selectedVariationId: productsWithVariations[0].variations[0].id }));
        }
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

  // Get selected variation details
  const getSelectedVariation = () => {
    for (const product of products) {
      const variation = product.variations.find(v => v.id === orderForm.selectedVariationId);
      if (variation) {
        return { product, variation };
      }
    }
    return null;
  };

  const handleOrderSubmit = async (e: React.FormEvent, settings: Record<string, unknown>) => {
    e.preventDefault();
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }

    const selected = getSelectedVariation();
    if (!selected) {
      toast.error("প্রোডাক্ট সিলেক্ট করুন");
      return;
    }

    const { product, variation } = selected;
    const subtotal = variation.price * orderForm.quantity;
    const shippingCost = SHIPPING_RATES[shippingZone];
    const total = subtotal + shippingCost;

    setIsSubmitting(true);
    try {
      // Use the backend function (public) to create the order (bypasses RLS safely)
      // Determine selected color info
      const colorNames = ["Ash", "White", "Sea Green", "Coffee", "Black", "Maroon"];
      const selectedColorIdx = (orderForm as any).selectedColor ?? 0;
      const selectedColorName = colorNames[selectedColorIdx] || `Color ${selectedColorIdx + 1}`;
      const selectedColorImage = product.images?.[selectedColorIdx] ?? product.images?.[0] ?? null;

      const { data, error } = await supabase.functions.invoke('place-order', {
        body: {
          userId: null,
          items: [
            {
              productId: product.id,
              variationId: variation.id,
              quantity: orderForm.quantity,
              productImage: selectedColorImage,
              colorName: selectedColorName,
            },
          ],
          shipping: {
            name: orderForm.name,
            phone: orderForm.phone,
            address: orderForm.address,
          },
          shippingZone,
          orderSource: 'landing_page',
          notes: `LP:${slug} | Color: ${selectedColorName}`,
        },
      });

      if (error) throw error;
      if (!data?.orderId) throw new Error('Order was not created');

      // Navigate to confirmation page with items for tracking
      navigate('/order-confirmation', {
        state: {
          orderNumber: data.orderNumber || data.orderId,
          customerName: orderForm.name,
          phone: orderForm.phone,
          total: total,
          items: [{
            productId: product.id,
            productName: product.name,
            price: variation.price,
            quantity: orderForm.quantity,
          }],
          numItems: orderForm.quantity,
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
        <div className={`space-y-6 ${isCenter ? "text-center" : ""}`}>
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
            className="flex items-baseline gap-3 flex-wrap"
            style={{ justifyContent: isCenter ? "center" : "flex-start" }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-lg font-medium" style={{ color: theme.accentColor }}>
              দাম
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
              className="flex flex-wrap gap-6 mt-8 pt-6 border-t border-gray-200"
              style={{ justifyContent: isCenter ? "center" : "flex-start" }}
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
      };

      const selected = getSelectedVariation();
      const subtotal = selected ? selected.variation.price * orderForm.quantity : 0;
      const shippingCost = settings.freeDelivery ? 0 : SHIPPING_RATES[shippingZone];
      const total = subtotal + shippingCost;

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
            
            {/* Product Selection - Color & Size */}
            {products.length > 0 && (
              <div className="mb-8 space-y-6">
                {products.map((product) => {
                  const selectedVar = product.variations.find(v => v.id === orderForm.selectedVariationId);
                  const displayPrice = selectedVar?.price || product.variations[0]?.price || 0;
                  const displayOriginal = selectedVar?.original_price || product.variations[0]?.original_price;

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
                                  onClick={() => setOrderForm(prev => ({ ...prev, selectedColor: idx }))}
                                  className="flex flex-col items-center gap-1"
                                >
                                  <div className={`w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                    (orderForm as any).selectedColor === idx
                                      ? 'border-amber-500 ring-2 ring-amber-300 scale-105 shadow-md'
                                      : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                                  }`}>
                                    <img src={img} alt={colorName} className="w-full h-full object-cover" />
                                  </div>
                                  <span className={`text-xs font-medium ${
                                    (orderForm as any).selectedColor === idx ? 'text-amber-600' : 'text-gray-600'
                                  }`}>{colorName}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Size Selection - Single Row */}
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">📏 সাইজ সিলেক্ট করুন</label>
                        <div className="flex flex-wrap gap-2">
                          {product.variations.map((variation) => {
                            const sizeLabel = variation.name.replace(/^Size\s*/i, '').replace(/^Weight:\s*/i, '');
                            const isSelected = orderForm.selectedVariationId === variation.id;
                            return (
                              <button
                                key={variation.id}
                                type="button"
                                onClick={() => setOrderForm(prev => ({ ...prev, selectedVariationId: variation.id }))}
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

                      {/* Quantity */}
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">🛒 পরিমাণ</label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setOrderForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                            className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:bg-gray-100 text-lg font-bold transition-colors"
                          >−</button>
                          <span className="w-10 text-center font-bold text-lg">{orderForm.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setOrderForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                            className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:bg-gray-100 text-lg font-bold transition-colors"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              {selected && (
                <div className="bg-gray-50 rounded-xl p-4 mt-6">
                  <h3 className="font-semibold mb-4">Your order</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <div className="flex items-center gap-3">
                        {selected.product.images?.[0] && (
                          <img 
                            src={selected.product.images[0]} 
                            alt="" 
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{selected.product.name} - {selected.variation.name}</p>
                          <p className="text-sm text-gray-500">× {orderForm.quantity}</p>
                        </div>
                      </div>
                      <span className="font-medium">৳ {(selected.variation.price * orderForm.quantity).toLocaleString()}</span>
                    </div>
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
                  disabled={isSubmitting || !selected}
                >
                  {isSubmitting ? "Processing..." : `${settings.buttonText}  ৳ ${total.toLocaleString()}`}
                </Button>
              </motion.div>

              {/* Contact Options */}
              <div className="mt-4 text-center space-y-2">
                <p className="text-gray-600 text-sm">
                  📞 যেকোনো প্রশ্নের জন্য কল করুন: <a href="tel:+8801995909243" className="font-medium text-gray-800 hover:underline">+8801995909243</a>
                </p>
                <p className="text-green-600 text-sm">
                  <a 
                    href="https://wa.me/8801995909243" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp এ মেসেজ করুন: +8801995909243
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

    case "testimonials": {
      const settings = section.settings as {
        title: string;
        items: Array<{ name: string; role: string; content: string; avatar: string }>;
        layout: string;
        columns: number;
      };

      return (
        <AnimatedSection className="py-16 px-4" style={{ backgroundColor: theme.secondaryColor }}>
          <div className="max-w-6xl mx-auto">
            {settings.title && (
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{settings.title}</h2>
            )}
            <div
              className={`grid gap-5 md:gap-6 ${
                (settings.columns || 3) === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                (settings.columns || 3) === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
                'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              }`}
            >
              {(settings.items || []).map((item, idx) => (
                <motion.div 
                  key={idx} 
                  className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-50"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  {/* Star rating */}
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="mb-5 text-gray-600 italic leading-relaxed">&ldquo;{item.content}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    {item.avatar ? (
                      <img src={item.avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100" />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: theme.accentColor || theme.primaryColor }}
                      >
                        {item.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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

    default:
      return null;
  }
};

export default LandingPage;
