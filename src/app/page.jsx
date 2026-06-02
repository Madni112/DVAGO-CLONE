'use client';

import React from 'react';
import Slider from '@/components/Slider';
import CategoriesSlider from '@/components/CategoriesSlider';
import FeaturedProducts from "@/components/FeaturedProducts";

export default function HomePage() {
  return (
    <div className="w-full space-y-10">
      <section className="w-full">
        <Slider />
      </section>

      <section className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm">
        <CategoriesSlider />
      </section>

      <section className="w-full">
        <FeaturedProducts />
      </section>
    </div>
  );
}
