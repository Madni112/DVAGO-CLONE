"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/Config/supabase";

export default function CategoriesSlider() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const [isSnappingActive, setIsSnappingActive] = useState(true);

  const scrollRef = useRef(null);

  useEffect(() => {
    async function fetchCategoriesList() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("categories")
          .select("id, title, image")
          .order("id", { ascending: true });

        if (!error && data) setCategories(data);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCategoriesList();
  }, []);

  const handleDragStart = (e) => {
    if (categories.length === 0) return;
    setIsDragging(true);
    setHasMoved(false);

    const clientX = e.type === "touchstart" ? e.touches.clientX : e.clientX;
    setStartX(clientX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = e.type === "touchmove" ? e.touches.clientX : e.clientX;
    const x = clientX - scrollRef.current.offsetLeft;
    const walkDistance = (x - startX) * 1.5;

    if (Math.abs(walkDistance) > 5) {
      setHasMoved(true);
    }

    scrollRef.current.scrollLeft = scrollLeftState - walkDistance;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setTimeout(() => setHasMoved(false), 50);
  };

  const handleScrollClick = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "next" ? 240 : -240;

      setIsSnappingActive(false);

      scrollRef.current.scrollLeft += scrollAmount;

      setTimeout(() => {
        setIsSnappingActive(true);
      }, 450);
    }
  };


  if (loading || categories.length === 0) {
    return (
      <div className="p-6 flex gap-6 max-w-7xl mx-auto overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-20 h-20 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }
  return (
    <div className="w-full max-w-7xl mx-auto p-6 relative group select-none">
      <div className="flex justify-between items-center mb-6">
        <div className="border-l-4 border-green-500 pl-3">
          <h3 className="text-xl font-extrabold text-gray-950 tracking-wide">Shop By Category</h3>
        </div>

        {categories.length > 4 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleScrollClick("prev")}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 flex items-center justify-center text-sm font-black transition-all hover:bg-gray-50 active:scale-95 cursor-pointer shadow-xs"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => handleScrollClick("next")}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 flex items-center justify-center text-sm font-black transition-all hover:bg-gray-50 active:scale-95 cursor-pointer shadow-xs"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        className={`w-full overflow-x-auto flex gap-6 sm:gap-8 py-2 scrollbar-none scroll-smooth cursor-grab active:cursor-grabbing select-none ${isSnappingActive ? "snap-x snap-mandatory" : ""
          }`}
        style={{ scrollbarWidth: "none" }}
      >
        {categories.map((cat) => (
          <div
            key={cat.id}
            snap-align="start"
            className="flex-shrink-0"
          >
            <div
              onClick={(e) => {
                if (hasMoved) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                router.push(`/category/${cat.id}`);
              }}
              className="flex flex-col items-center text-center cursor-pointer group/item w-[80px]  sm:w-[150px]"
            >

              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full border border-gray-100 flex items-center justify-center p-3 shadow-xs group-hover/item:shadow-md group-hover/item:border-pink-200 transition-all duration-300 transform group-hover/item:-translate-y-1">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="max-w-full max-h-full object-contain group-hover/item:scale-105 transition duration-300 pointer-events-none"
                  draggable="false"
                />
              </div>
              <span className="text-[11px] font-bold text-gray-700 mt-2.5 tracking-wide group-hover/item:text-pink-600 transition truncate w-full px-1">
                {cat.title}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
