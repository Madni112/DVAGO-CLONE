"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/Config/supabase";

export default function Slider() {
  const router = useRouter();
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const scrollRef = useRef(null);

  // Initialize Data and Handle Screen Resize Checks
  useEffect(() => {
    async function initSliderAndAuth() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", session.user.id)
            .maybeSingle();
            
          if (profile?.is_admin || session.user.app_metadata?.role === "admin") {
            setIsAdmin(true);
          }
        }

        const { data: bData, error } = await supabase
          .from("slider_banners")
          .select("image_url, redirect_url")
          .order("display_order", { ascending: true });

        if (!error && bData) setBanners(bData);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    initSliderAndAuth();

    // Check if user screen is a mobile screen
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // 🚀 AUTOMATED DESKTOP ROTATOR: Disabled on mobile to prevent scrolling competition
  useEffect(() => {
    if (banners.length <= 1 || isMobile) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = prev === banners.length - 1 ? 0 : prev + 1;
        if (scrollRef.current) {
          const width = scrollRef.current.offsetWidth;
          scrollRef.current.scrollTo({
            left: nextIndex * width,
            behavior: "smooth"
          });
        }
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [banners.length, isMobile]);

  // 🚀 NATIVE MOBILE SWIPE MONITOR: Reads natural hardware scrolling position smoothly
  const handleMobileScrollSync = () => {
    if (!scrollRef.current || !isMobile) return;
    const width = scrollRef.current.offsetWidth;
    const scrollPosition = scrollRef.current.scrollLeft;
    const calculatedIndex = Math.round(scrollPosition / width);
    
    if (calculatedIndex !== activeIndex && calculatedIndex < banners.length) {
      setActiveIndex(calculatedIndex);
    }
  };

  const handleDotNavigation = (idx) => {
    setActiveIndex(idx);
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: idx * width,
        behavior: "smooth"
      });
    }
  };

  if (loading || banners.length === 0) {
    return <div className="w-full h-[180px] sm:h-[340px] bg-gray-100 rounded-2xl animate-pulse mt-4 max-w-7xl mx-auto"></div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 group select-none px-4 md:px-0 relative">
      <div 
        ref={scrollRef}
        onScroll={handleMobileScrollSync}
        // 🎯 PURE NATIVE CSS SWIPING RULES ON MOBILE: Feels fast and matches apps like Amazon/Daraz
        className={`w-full flex overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white scrollbar-none select-none ${
          isMobile ? "snap-x snap-mandatory scroll-smooth" : "overflow-hidden"
        }`}
        style={{ scrollbarWidth: "none" }}
      >
        {banners.map((banner, idx) => (
          <div 
            key={idx} 
            className="min-w-full h-40 sm:h-70 md:h-100 relative flex items-center justify-center bg-gray-50 flex-shrink-0 snap-start cursor-pointer"
            onClick={() => {
              if (!banner.redirect_url) return;
              if (banner.redirect_url.startsWith("http")) {
                window.open(banner.redirect_url, "_blank");
              } else {
                router.push(banner.redirect_url);
              }
            }}
          >
            <img 
              src={banner.image_url} 
              alt="Pharmacy Promotion Banner" 
              className="w-full h-full object-cover md:object-fill pointer-events-none" 
              draggable="false"
            />
          </div>
        ))}
      </div>

      {/* Bullet Dot Indicators (Synced smoothly on scroll) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/10 px-3 py-1.5 rounded-full backdrop-blur-xs">
        {banners.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleDotNavigation(idx)}
            className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
              activeIndex === idx ? "w-6 bg-pink-600" : "w-1.5 bg-white/70"
            }`}
          />
        ))}
      </div>

      {isAdmin && (
        <Link 
          href="/admin/slider" 
          className="absolute top-4 right-8 z-20 px-3 py-2 bg-gray-900/90 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-xs flex items-center gap-1.5 hover:scale-105 active:scale-[0.98] border border-white/10"
        >
          <span>⚙️</span>
          <span>Edit Slider</span>
        </Link>
      )}

    </div>
  );
}
