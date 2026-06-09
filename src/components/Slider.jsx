"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/Config/supabase";

export default function Slider() {
  const router = useRouter();
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(1); 
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [hasMoved, setHasMoved] = useState(false); 

  const containerRef = useRef(null);

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
  }, []);

  // 🚀 FIXED INFINITE CLONE ARRAY: Bounds are now guarded perfectly
  const slidesWithClones = banners.length > 0 ? [
    banners[banners.length - 1], 
    ...banners,
    banners[0], // ✨ FIXED: Correctly targets the exact first slide object for seamless looping
  ] : [];

  // Unified loop watch transition calculation engine
  useEffect(() => {
    if (banners.length <= 1) return;

    // 1. Teleport logic past final slide boundary
    if (activeIndex === slidesWithClones.length - 1) {
      const teleportTimer = setTimeout(() => {
        setIsTransitioning(false);
        setActiveIndex(1);
      }, 600); 
      return () => clearTimeout(teleportTimer);
    }

    // 2. Teleport logic backward past first slide boundary
    if (activeIndex === 0) {
      const teleportTimer = setTimeout(() => {
        setIsTransitioning(false);
        setActiveIndex(slidesWithClones.length - 2);
      }, 600);
      return () => clearTimeout(teleportTimer);
    }

    // 3. Automated rotation loop (paused only when dragging)
    if (!isDragging) {
      const autoMoveTimer = setInterval(() => {
        setIsTransitioning(true);
        setActiveIndex((prev) => prev + 1);
      }, 2000);
      return () => clearInterval(autoMoveTimer);
    }
  }, [activeIndex, isDragging, banners.length, slidesWithClones.length]);

  // Instantly re-enable smooth css transitions right after an invisible teleport finishes
  useEffect(() => {
    if (!isTransitioning) {
      const transitionResetTimer = setTimeout(() => {
        setIsTransitioning(true);
      }, 20);
      return () => clearTimeout(transitionResetTimer);
    }
  }, [isTransitioning]);

  if (loading || banners.length === 0) {
    return <div className="w-full h-[180px] sm:h-[340px] bg-gray-100 rounded-2xl animate-pulse mt-4 max-w-7xl mx-auto"></div>;
  }

  const handleDragStart = (e) => {
    setIsDragging(true);
    setIsTransitioning(false);
    setHasMoved(false);
    const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    const currentOffset = clientX - startX;

    if (Math.abs(currentOffset) > 5) {
      setHasMoved(true);
    }

    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      const percentage = (currentOffset / width) * 100;
      setDragOffset(percentage);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setIsTransitioning(true);

    if (dragOffset < -15) {
      setActiveIndex((prev) => prev + 1);
    } else if (dragOffset > 15) {
      setActiveIndex((prev) => prev - 1);
    } else {
      setActiveIndex(activeIndex);
    }
    setDragOffset(0);
    setTimeout(() => setHasMoved(false), 50);
  };

  let normalizedActive = activeIndex - 1;
  if (activeIndex === 0) normalizedActive = banners.length - 1;
  if (activeIndex === slidesWithClones.length - 1) normalizedActive = 0;

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 group select-none px-4 md:px-0 relative">
      <div 
        className="w-full overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white relative"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{ cursor: 'grab', touchAction: "pan-y" }}
      >
        <div 
          ref={containerRef}
          className="flex"
          style={{ 
            transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffset}%))`,
            transition: isTransitioning ? "transform 600ms cubic-bezier(0.25, 1, 0.5, 1)" : "none"
          }}
        >
          {slidesWithClones.map((banner, idx) => (
            <div 
              key={idx} 
              className="min-w-full h-40 sm:h-70 md:h-100 relative flex items-center justify-center bg-gray-50 select-none"
              onClick={(e) => {
                if (hasMoved) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
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
      </div>

      {/* Navigation Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/10 px-3 py-1.5 rounded-full backdrop-blur-xs">
        {banners.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => { if (!isDragging) { setIsTransitioning(true); setActiveIndex(idx + 1); } }}
            className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${normalizedActive === idx ? "w-6 bg-pink-600" : "w-1.5 bg-white/70"}`}
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
