import { useState, useEffect, useCallback, memo, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getEmbedUrl, normalizeExternalUrl, parseIframeHtml } from "@/lib/videoEmbed";
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  Shield,
  Phone,
  CheckCircle2,
  ShoppingBag,
  MessageCircle,
  Play,
  Users,
  Clock,
  Flame,
  Gift,
  MapPin,
} from "lucide-react";

import {
  ShippingMethodSelector,
  ShippingZone,
  SHIPPING_RATES,
} from "@/components/checkout/ShippingMethodSelector";
import { toast } from "sonner";
// ====== Interfaces ======
interface ProductVariation {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  stock: number;
}

interface ProductData {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  images: string[];
  video_url?: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  variations: ProductVariation[];
}

interface OrderForm {
  name: string;
  phone: string;
  address: string;
  quantity: number;
  selectedVariationId: string;
  shippingZone?: ShippingZone;
  subtotal?: number;
  shippingCost?: number;
  total?: number;
}

// ====== Optimized Image ======
const OptimizedImage = memo(({ src, alt, className, priority = false }: { 
  src: string; alt: string; className?: string; priority?: boolean;
}) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
});
OptimizedImage.displayName = 'OptimizedImage';

// ====== Urgency Banner ======
const UrgencyBanner = memo(() => {
  const [viewers] = useState(() => Math.floor(Math.random() * 15) + 8);
  const [stock] = useState(() => Math.floor(Math.random() * 10) + 3);
  
  return (
    <div className="bg-[#1a0f0a] text-amber-100 py-2.5 px-4 border-b border-amber-900/30">
      <div className="container mx-auto flex items-center justify-center gap-6 text-sm font-medium flex-wrap">
        <span className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
          <Users className="h-4 w-4 text-amber-400" />
          <span className="font-bold text-amber-300">{viewers} জন</span> এখন দেখছেন
        </span>
        <span className="hidden sm:block text-amber-800">|</span>
        <span className="flex items-center gap-2">
          <Flame className="h-4 w-4 animate-pulse text-orange-500" />
          মাত্র <span className="font-bold text-amber-300">{stock}টি</span> স্টকে আছে!
        </span>
      </div>
    </div>
  );
});
UrgencyBanner.displayName = 'UrgencyBanner';

// ====== Hero Section - Boys Fashion Style ======
const HeroSection = memo(({ product, currentImage, setCurrentImage, onBuyNow }: { 
  product: ProductData; currentImage: number; setCurrentImage: (i: number) => void; onBuyNow: () => void;
}) => {
  const images = product.images || [];
  const discount = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100) 
    : 0;
  const savings = product.original_price ? product.original_price - product.price : 0;

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setCurrentImage((currentImage + 1) % images.length), 4000);
    return () => clearInterval(timer);
  }, [currentImage, images.length, setCurrentImage]);

  return (
    <section className="bg-[#1a0f0a] py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center max-w-6xl mx-auto">
          {/* Image Gallery - Left Side */}
          <div className="relative max-w-lg mx-auto w-full">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl">
              {discount > 0 && (
                <span className="absolute top-4 left-4 z-20 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                  -{discount}% ছাড়
                </span>
              )}
              
              {images[currentImage] && (
                <OptimizedImage src={images[currentImage]} alt={product.name} className="w-full h-full" priority />
              )}
              
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage((currentImage - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-all"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-800" />
                  </button>
                  <button
                    onClick={() => setCurrentImage((currentImage + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-all"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-800" />
                  </button>
                  
                  {/* Dots indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-full">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          idx === currentImage ? "bg-white w-6" : "bg-white/50 w-2 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 mt-4 justify-center">
                {images.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                      idx === currentImage 
                        ? "border-amber-400 scale-110 shadow-lg shadow-amber-500/30" 
                        : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <OptimizedImage src={img} alt="" className="w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info - Right Side */}
          <div className="text-white space-y-4 text-center md:text-left">
            {/* Hot Selling Badge */}
            <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
              <Flame className="h-3.5 w-3.5" />
              হট সেলিং প্রোডাক্ট
            </span>
            
            {/* Product Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-amber-50">
              {product.name}
            </h1>
            
            {/* Short Description */}
            {product.short_description && (
              <p className="text-base md:text-lg text-amber-100/70 leading-relaxed">
                {product.short_description}
              </p>
            )}

            {/* Price Box */}
            <div className="flex items-center gap-3 flex-wrap py-4 px-5 bg-gradient-to-r from-amber-900/30 to-amber-800/20 rounded-xl border border-amber-700/30 justify-center md:justify-start">
              <span className="text-4xl md:text-5xl font-bold text-amber-400">
                ৳{product.price.toLocaleString()}
              </span>
              {product.original_price && product.original_price > product.price && (
                <>
                  <span className="text-xl text-amber-100/40 line-through">
                    ৳{product.original_price.toLocaleString()}
                  </span>
                  <span className="bg-green-500 text-white text-sm font-bold px-2.5 py-1 rounded-full">
                    ৳{savings.toLocaleString()} সেভ!
                  </span>
                </>
              )}
            </div>

            {/* CTA Button */}
            <Button
              onClick={onBuyNow}
              size="lg"
              className="w-full md:w-auto px-10 py-6 text-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              এখনই অর্ডার করুন
            </Button>

            {/* Trust Badges - 3 columns */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Shield, text: "১০০% গ্যারান্টি" },
                { icon: Truck, text: "সারাদেশে ডেলিভারি" },
                { icon: Gift, text: "ক্যাশ অন ডেলিভারি" },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="text-center p-3 rounded-xl bg-amber-900/20 border border-amber-800/30 hover:bg-amber-900/30 transition-colors"
                >
                  <item.icon className="h-5 w-5 mx-auto mb-1.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-100/80">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
HeroSection.displayName = 'HeroSection';

// ====== Features Banner - Yellow Strip ======
const FeaturesBanner = memo(() => (
  <section className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 py-4 overflow-hidden">
    <div className="container mx-auto px-4">
      <div className="flex flex-wrap justify-center gap-3 md:gap-6">
        {[
          { text: "প্রিমিয়াম কোয়ালিটি", icon: "✨" },
          { text: "কালার গ্যারান্টি", icon: "🎨" },
          { text: "কমফোর্টেবল ফিট", icon: "👕" },
          { text: "ইজি এক্সচেঞ্জ", icon: "🔄" }
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full text-gray-800 font-semibold text-sm shadow-sm hover:bg-white/80 transition-colors">
            <span>{item.icon}</span>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
));
FeaturesBanner.displayName = 'FeaturesBanner';

// ====== Gallery - Dark Theme ======
const GallerySection = memo(({ images }: { images: string[] }) => {
  if (!images || images.length < 2) return null;
  return (
    <section className="py-12 md:py-16 bg-[#0f0805]">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-block bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
              📸 গ্যালারি
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-amber-50">প্রোডাক্ট গ্যালারি</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.slice(0, 6).map((img, idx) => (
              <div key={idx} className="group aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ring-1 ring-amber-800/30">
                <OptimizedImage src={img} alt="" className="w-full h-full group-hover:scale-110 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
GallerySection.displayName = 'GallerySection';

// ====== Video ======
const VideoSection = memo(({ videoUrl }: { videoUrl?: string }) => {
  if (!videoUrl) return null;

  const raw = (videoUrl || "").trim();
  
  // Check if it's raw HTML (iframe embed code) - Elementor style: render exactly as-is
  const isRawHtml = raw.startsWith("<");
  
  // Extract aspect ratio info from iframe for proper sizing
  const extractAspectInfo = (html: string) => {
    const widthMatch = html.match(/width=["']?(\d+)/i);
    const heightMatch = html.match(/height=["']?(\d+)/i);
    const width = widthMatch ? parseInt(widthMatch[1]) : 16;
    const height = heightMatch ? parseInt(heightMatch[1]) : 9;
    return { aspectRatio: width / height, isPortrait: height > width };
  };

  const aspectInfo = isRawHtml ? extractAspectInfo(raw) : { aspectRatio: 16/9, isPortrait: false };

  return (
    <section className="py-10 md:py-16 bg-[#1a0f0a]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
            <Play className="h-4 w-4" />
            ভিডিও দেখুন
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-amber-50">প্রোডাক্ট ভিডিও</h2>
        </div>

        <div className={`max-w-3xl mx-auto ${aspectInfo.isPortrait ? "max-w-sm" : ""}`}>
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900 ring-1 ring-white/10"
            style={{ aspectRatio: aspectInfo.isPortrait ? "9/16" : "16/9" }}
          >
            {isRawHtml ? (
              // ELEMENTOR STYLE: Render raw HTML exactly as provided - no sanitization
              <div
                className="absolute inset-0 [&>iframe]:!absolute [&>iframe]:!inset-0 [&>iframe]:!w-full [&>iframe]:!h-full [&>iframe]:!border-0"
                dangerouslySetInnerHTML={{ __html: raw }}
              />
            ) : raw.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={raw}
                controls
                className="absolute inset-0 w-full h-full object-contain"
                preload="metadata"
                playsInline
              />
            ) : (
              <iframe
                src={getEmbedUrl(raw)}
                title="Video"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 w-full h-full border-0"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
VideoSection.displayName = "VideoSection";

// ====== Product Description - Dark Theme ======
const ProductDescriptionSection = memo(({ description }: { description?: string }) => {
  if (!description || !description.trim()) return null;
  
  const lines = description.split('\n').filter(line => line.trim());
  
  return (
    <section className="py-10 md:py-16 bg-[#0f0805]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
              📋 বিস্তারিত
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-amber-50">প্রোডাক্ট বিবরণ</h2>
          </div>
          
          {/* Description Cards */}
          <div className="bg-[#1a0f0a] rounded-2xl shadow-xl border border-amber-800/30 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-4">
              <h3 className="text-lg font-bold text-white">
                এই প্রোডাক্টের বৈশিষ্ট্য
              </h3>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3">
                {lines.map((line, idx) => {
                  const cleanLine = line
                    .replace(/^[\s◊◆●○▪▫•✓✔✅👉👍🔘🌴\-\*\u25CA\u25C6\u25CF\u25CB\u25AA\u25AB]+/g, '')
                    .trim();
                  if (!cleanLine) return null;
                  
                  return (
                    <li 
                      key={idx}
                      className="p-4 rounded-xl bg-amber-900/20 border border-amber-800/30 hover:bg-amber-900/30 transition-all duration-300"
                    >
                      <span className="text-amber-100 font-medium text-base md:text-lg leading-relaxed">
                        {cleanLine}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            
            {/* Trust Footer */}
            <div className="bg-gradient-to-r from-amber-700/30 to-amber-600/30 p-4 border-t border-amber-700/30">
              <p className="text-center text-amber-300 font-medium">
                ১০০% কোয়ালিটি গ্যারান্টি সহ
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
ProductDescriptionSection.displayName = 'ProductDescriptionSection';

// ====== Delivery Info - Dark Theme ======
const DeliverySection = memo(() => (
  <section className="py-8 md:py-12 bg-[#1a0f0a]">
    <div className="container mx-auto px-4">
      <h2 className="text-xl md:text-2xl font-bold text-center text-amber-50 mb-6">ডেলিভারি ও পেমেন্ট</h2>
      <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[
          { icon: Truck, title: "ঢাকায় ৮০৳", sub: "বাইরে ১৩০৳", color: "bg-blue-500" },
          { icon: Clock, title: "১-৩ দিনে", sub: "ডেলিভারি", color: "bg-green-500" },
          { icon: Shield, title: "ক্যাশ অন", sub: "ডেলিভারি", color: "bg-purple-500" },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-4 bg-amber-900/20 rounded-xl border border-amber-800/30">
            <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <item.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-amber-100">{item.title}</p>
              <p className="text-sm text-amber-200/70">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
));
DeliverySection.displayName = 'DeliverySection';

// ====== Checkout Form ======
const CheckoutSection = memo(({ product, onSubmit, isSubmitting }: { 
  product: ProductData; onSubmit: (form: OrderForm) => void; isSubmitting: boolean;
}) => {
  const [form, setForm] = useState<OrderForm>({
    name: "", phone: "", address: "", quantity: 1, selectedVariationId: "",
  });
  const [shippingZone, setShippingZone] = useState<ShippingZone>('outside_dhaka');
  const formRef = useRef<HTMLFormElement>(null);
  const sizeSelectionRef = useRef<HTMLDivElement>(null);

  const variations = useMemo(() => {
    // De-dupe by variation name to avoid showing the same "Size" multiple times
    const seen = new Set<string>();
    const out: ProductVariation[] = [];
    for (const v of product.variations || []) {
      const key = String(v.name || '').trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  }, [product.variations]);

  const selectedVariation = useMemo(
    () => variations.find(v => v.id === form.selectedVariationId),
    [variations, form.selectedVariationId]
  );

  const unitPrice = selectedVariation?.price || product.price;
  const subtotal = unitPrice * form.quantity;
  const shippingCost = SHIPPING_RATES[shippingZone];
  const total = subtotal + shippingCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (variations.length > 0 && !form.selectedVariationId) {
      toast.error("সাইজ সিলেক্ট করুন");
      // Scroll to size selection area
      sizeSelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(form.phone.replace(/\s/g, ''))) {
      toast.error("সঠিক মোবাইল নম্বর দিন");
      return;
    }
    onSubmit({ ...form, shippingZone, subtotal, shippingCost, total });
  };

  const updateForm = useCallback((key: keyof OrderForm, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <section id="checkout" className="py-8 md:py-12 bg-gradient-to-b from-[#0f0805] to-[#1a0f0a]">
      <div className="container mx-auto px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-amber-50">অর্ডার করুন</h2>
            <p className="text-amber-200/70 text-sm mt-1">পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন</p>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Product Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
              <div className="bg-gray-900 text-white py-3 px-4 font-bold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                প্রোডাক্ট
              </div>
              
              <div className="p-4">
                {/* Product Info Row */}
                <div className="flex gap-3 items-center mb-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {product.images?.[0] && <OptimizedImage src={product.images[0]} alt="" className="w-full h-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xl font-bold text-amber-600">৳{unitPrice.toLocaleString()}</p>
                  </div>
                </div>

                {/* Size Selection */}
                {variations.length > 0 && (
                  <div ref={sizeSelectionRef} className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">সাইজ নির্বাচন করুন <span className="text-red-500">*</span></p>
                    <div className="flex flex-wrap gap-2">
                      {variations.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => updateForm('selectedVariationId', v.id)}
                          className={`px-4 py-2.5 rounded-lg font-semibold transition-all border-2 ${
                            form.selectedVariationId === v.id
                              ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-amber-300'
                          }`}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                    {!form.selectedVariationId && (
                      <p className="text-xs text-red-500 mt-1">* সাইজ সিলেক্ট করুন</p>
                    )}
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-700">পরিমাণ</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateForm('quantity', Math.max(1, form.quantity - 1))}
                      className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 font-bold text-lg"
                    >−</button>
                    <span className="text-lg font-bold w-6 text-center">{form.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateForm('quantity', form.quantity + 1)}
                      className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 font-bold text-lg"
                    >+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-lg p-4 border space-y-3">
              <h3 className="font-bold flex items-center gap-2 text-gray-900">
                <Phone className="h-4 w-4 text-amber-500" />
                আপনার তথ্য
              </h3>
              <Input
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                placeholder="মোবাইল নম্বর *"
                type="tel"
                inputMode="numeric"
                required
                className="h-12 text-base rounded-lg border-2 focus:border-amber-500"
              />
              <Input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="আপনার নাম *"
                required
                className="h-12 text-base rounded-lg border-2 focus:border-amber-500"
              />
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Textarea
                  value={form.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  placeholder="সম্পূর্ণ ঠিকানা (বাড়ি, রোড, থানা, জেলা) *"
                  required
                  rows={2}
                  className="pl-10 text-base rounded-lg border-2 focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white rounded-xl shadow-lg p-4 border">
              <h3 className="font-bold flex items-center gap-2 text-gray-900 mb-3">
                <Truck className="h-4 w-4 text-amber-500" />
                ডেলিভারি এরিয়া
              </h3>
              <ShippingMethodSelector
                address={form.address}
                selectedZone={shippingZone}
                onZoneChange={setShippingZone}
              />
            </div>

            {/* Order Summary */}
            <div className="bg-gray-900 rounded-xl p-4 text-white">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">সাবটোটাল ({form.quantity}টি)</span>
                  <span>৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ডেলিভারি</span>
                  <span>৳{shippingCost}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
                  <span>সর্বমোট</span>
                  <span className="text-amber-400">৳{total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-xl disabled:opacity-70"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  প্রসেসিং...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  অর্ডার কনফার্ম করুন — ৳{total.toLocaleString()}
                </span>
              )}
            </Button>

            {/* Contact */}
            <div className="text-center text-sm text-amber-200/70 space-y-1">
              <p>
                কল করুন: <a href="tel:+8801995909243" className="font-bold text-amber-300">01995909243</a>
              </p>
              <a 
                href="https://wa.me/8801995909243"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-green-400 font-medium hover:text-green-300"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
});
CheckoutSection.displayName = 'CheckoutSection';

// ====== Main Component ======
const ProductLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFloatingCta, setShowFloatingCta] = useState(true);
  const checkoutRef = useRef<HTMLDivElement>(null);

  // Hide floating CTA when checkout section is visible
  useEffect(() => {
    const checkVisibility = () => {
      if (checkoutRef.current) {
        const rect = checkoutRef.current.getBoundingClientRect();
        // Hide floating button when checkout section top is in lower 70% of viewport
        const isCheckoutVisible = rect.top < window.innerHeight * 0.7;
        setShowFloatingCta(!isCheckoutVisible);
      }
    };

    // Check on scroll
    window.addEventListener('scroll', checkVisibility, { passive: true });
    // Initial check after a small delay to ensure DOM is ready
    const timer = setTimeout(checkVisibility, 100);

    return () => {
      window.removeEventListener('scroll', checkVisibility);
      clearTimeout(timer);
    };
  }, []);


  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product-landing", slug],
    queryFn: async () => {
      const { data: landingPage } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      const productId = landingPage?.product_ids?.[0];
      
      if (productId) {
        const { data: productData } = await supabase.from("products").select("*, long_description").eq("id", productId).single();
        if (productData) {
          const { data: variations } = await supabase
            .from("product_variations")
            .select("*")
            .eq("product_id", productId)
            .eq("is_active", true)
            .order("sort_order");
          return { ...productData, images: productData.images || [], variations: variations || [], long_description: productData.long_description } as ProductData;
        }
      }

      const { data: directProduct } = await supabase.from("products").select("*, long_description").eq("slug", slug).single();
      if (directProduct) {
        const { data: variations } = await supabase
          .from("product_variations")
          .select("*")
          .eq("product_id", directProduct.id)
          .eq("is_active", true)
          .order("sort_order");
        return { ...directProduct, images: directProduct.images || [], variations: variations || [], long_description: directProduct.long_description } as ProductData;
      }

      throw new Error("Product not found");
    },
    staleTime: 5 * 60 * 1000,
  });

  const scrollToCheckout = useCallback(() => {
    document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleOrderSubmit = async (form: OrderForm) => {
    if (!product) return;
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: {
          userId: null,
          items: [{ productId: product.id, variationId: form.selectedVariationId || null, quantity: form.quantity }],
          shipping: { name: form.name, phone: form.phone, address: form.address },
          shippingZone: form.shippingZone,
          orderSource: 'landing_page',
          notes: `LP:${slug}`,
        },
      });

      if (error) throw error;

      // place-order returns 200 even for blocked attempts (data.error + errorCode)
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (!data?.orderId) {
        throw new Error('Order was not created');
      }

      navigate('/order-confirmation', {
        state: {
          orderNumber: data.orderNumber || data.orderId,
          customerName: form.name,
          phone: form.phone,
          total: form.total,
          items: [{ productId: product.id, productName: product.name, price: form.subtotal! / form.quantity, quantity: form.quantity }],
          numItems: form.quantity,
          fromLandingPage: true,
          landingPageSlug: slug,
        }
      });
    } catch (err) {
      console.error("Order error:", err);
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0f0a]">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a0f0a] p-4">
        <h1 className="text-xl font-bold mb-4 text-amber-50">প্রোডাক্ট পাওয়া যায়নি</h1>
        <Button onClick={() => navigate("/")} className="bg-amber-500 hover:bg-amber-600 text-gray-900">হোম পেজে যান</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0805]">
      <UrgencyBanner />
      <HeroSection product={product} currentImage={currentImage} setCurrentImage={setCurrentImage} onBuyNow={scrollToCheckout} />
      <FeaturesBanner />
      <ProductDescriptionSection description={product.long_description} />
      <GallerySection images={product.images} />
      <VideoSection videoUrl={product.video_url} />
      <DeliverySection />
      <div ref={checkoutRef}>
        <CheckoutSection product={product} onSubmit={handleOrderSubmit} isSubmitting={isSubmitting} />
      </div>
      
      {/* Floating CTA - hidden when checkout is visible */}
      {showFloatingCta && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#1a0f0a]/95 backdrop-blur-sm border-t border-amber-800/30 md:hidden z-50 safe-area-inset-bottom">
          <Button
            onClick={scrollToCheckout}
            className="w-full h-12 text-base font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 rounded-xl shadow-lg shadow-amber-500/30"
          >
            <ShoppingBag className="mr-2 h-5 w-5" />
            এখনই অর্ডার করুন
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductLandingPage;
