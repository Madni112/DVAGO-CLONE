"use client";

import React, { useState, useEffect, useContext } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/Config/supabase";
import { CartContext } from "@/Context/CartContext";
import { WishlistContext } from "@/Context/WishlistContext";
import { OffCanvasContext } from "@/Context/canvas";

function formatProductAge(timestampString) {
  if (!timestampString) return "";
  const createdDate = new Date(timestampString);
  const currentDate = new Date();
  const diffInMs = currentDate - createdDate;
  if (diffInMs < 0) return "Added just now";
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  if (diffInHours < 24) return `Added ${diffInHours || 1}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Added ${diffInDays}d ago`;
  if (diffInDays < 30) return `Added ${Math.floor(diffInDays / 7)}w ago`;
  const diffInMonths = Math.floor(diffInDays / 30.43);
  if (diffInMonths < 12) return `Added ${diffInMonths || 1}m ago`;
  return `Added ${Math.floor(diffInMonths / 12) || 1}y ago`;
}

function formatProductEditAge(updatedAt, createdAt) {
  if (!updatedAt || !createdAt) return "";
  if (new Date(updatedAt).getTime() === new Date(createdAt).getTime()) return "";
  const updatedDate = new Date(updatedAt);
  const currentDate = new Date();
  const diffInMs = currentDate - updatedDate;
  if (diffInMs < 0) return "Edited just now";
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  if (diffInHours < 24) return `Edited ${diffInHours || 1}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Edited ${diffInDays}d ago`;
  if (diffInDays < 30) return `Edited ${Math.floor(diffInDays / 7)}w ago`;
  const diffInMonths = Math.floor(diffInDays / 30.43);
  if (diffInMonths < 12) return `Edited ${diffInMonths || 1}m ago`;
  return `Edited ${Math.floor(diffInMonths / 12) || 1}y ago`;
}

export default function CategoryProductsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { state: cartState, dispatch } = useContext(CartContext);
  const { wishlistItems, toggleWishlist } = useContext(WishlistContext);
  const { setOpenCanvas, setLoginPopupOpen } = useContext(OffCanvasContext);
  
  const [categoryName, setCategoryName] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 18;
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [updatingQuantityId, setUpdatingQuantityId] = useState(null);

  useEffect(() => {
    async function checkUserRole() {
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
    }
    checkUserRole();
  }, []);
  useEffect(() => {
    if (!id) return;
    let isTabActive = true;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabActive = false;
      } else {
        setTimeout(() => { isTabActive = true; }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    async function fetchCategoryData() {
      if (!isTabActive) return;

      try {
        setLoading(true);
        
        // 🚀 CRITICAL RE-RENDER RESETS: Clears out current grid memory arrays on page shift clicks
        setProducts([]);

        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("title")
          .eq("id", id)
          .maybeSingle();

        if (catError) throw catError;
        if (catData) setCategoryName(catData.title);

        const fromOffset = (currentPage - 1) * itemsPerPage;
        const toOffset = fromOffset + itemsPerPage - 1;

        const { error: countError, count } = await supabase
          .from("product_categories")
          .select("product_id", { count: "exact", head: true })
          .eq("category_id", id);

        if (countError) throw countError;
        setTotalCount(count || 0);

        const { data: prodData, error: prodError } = await supabase
          .from("product_categories")
          .select(`
            product_id,
            products:product_id (
              id,
              title,
              price,
              image,
              stock,
              created_at,
              updated_at
            )
          `)
          .eq("category_id", id)
          .range(fromOffset, toOffset);

        if (prodError) throw prodError;
        if (prodData) {
          const formatted = prodData.map((item) => item.products).filter(Boolean);
          setProducts(formatted);
        }
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCategoryData();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // 🧠 DEPENDENCY SYNCHRONIZATION: Bypasses product array lengths to allow continuous pagination checks
  }, [id, currentPage]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const handleAddToCart = async (product) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast("To add items to your cart, Login First", {
        icon: (
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        ),
        duration: 4000,
      });
      setLoginPopupOpen(true);
      return;
    }

    try {
      setLoadingProductId(product.id);
      const cartItem = cartState.find((item) => item.id === product.id);
      const nextQty = cartItem ? (cartItem.quantity || 1) + 1 : 1;

      const { error } = await supabase
        .from("user_carts")
        .upsert(
          { user_id: user.id, product_id: product.id, quantity: nextQty },
          { onConflict: "user_id,product_id" }
        );

      if (error) throw error;
      dispatch({ type: "addProduct", data: product });
      setOpenCanvas(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProductId(null);
    }
  };

  const handleUpdateQuantity = async (productId, currentQty, amount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const targetQty = currentQty + amount;

    try {
      setUpdatingQuantityId(productId);
      if (targetQty <= 0) {
        await supabase.from("user_carts").delete().eq("user_id", user.id).eq("product_id", productId);
      } else {
        await supabase.from("user_carts").update({ quantity: targetQty }).eq("user_id", user.id).eq("product_id", productId);
      }
      dispatch({ type: "updateQuantity", data: { id: productId, quantity: targetQty } });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingQuantityId(null);
    }
  };

  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;
    const buttons = [];
    
    buttons.push(
      <button key="prev" onClick={() => { setCurrentPage((prev) => Math.max(prev - 1, 1)); window.scrollTo(0, 0); }} disabled={currentPage === 1} className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition text-sm font-medium cursor-pointer">‹</button>
    );
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    
    if (startPage > 1) {
      buttons.push(<button key={1} onClick={() => { setCurrentPage(1); window.scrollTo(0, 0); }} className={`w-9 h-9 flex items-center justify-center border rounded-lg text-sm font-medium transition cursor-pointer ${currentPage === 1 ? "border-pink-600 bg-pink-50 text-pink-600" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>1</button>);
      if (startPage > 2) buttons.push(<span key="dots-start" className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">...</span>);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(<button key={i} onClick={() => { setCurrentPage(i); window.scrollTo(0, 0); }} className={`w-9 h-9 flex items-center justify-center border rounded-lg text-sm font-medium transition cursor-pointer ${currentPage === i ? "border-pink-600 bg-pink-50 text-pink-600" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>{i}</button>);
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttons.push(<span key="dots-end" className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">...</span>);
      buttons.push(<button key={totalPages} onClick={() => { setCurrentPage(totalPages); window.scrollTo(0, 0); }} className={`w-9 h-9 flex items-center justify-center border rounded-lg text-sm font-medium transition cursor-pointer ${currentPage === totalPages ? "border-pink-600 bg-pink-50 text-pink-600" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>{totalPages}</button>);
    }
    
    buttons.push(<button key="next" onClick={() => { setCurrentPage((prev) => Math.min(prev + 1, totalPages)); window.scrollTo(0, 0); }} disabled={currentPage === totalPages} className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition text-sm font-medium cursor-pointer">›</button>);
    return buttons;
  };

  if (loading && products.length === 0) {
    return <div className="w-full max-w-7xl mx-auto px-4 py-12"><div className="animate-pulse space-y-6"><div className="h-4 bg-gray-200 rounded w-1/4"></div><div className="h-8 bg-gray-200 rounded w-1/3"></div><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">{[...Array(12)].map((_, i) => <div key={i} className="h-80 bg-gray-200 rounded-xl"></div>)}</div></div></div>;
  }
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-pink-600 transition">Home</Link>
        <span>›</span>
        <span className="text-gray-400">Consumer</span>
        <span>›</span>
        <span className="text-pink-600 font-medium">{categoryName}</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-100 pb-4">
        <div className="border-l-4 border-green-500 pl-3">
          <h1 className="text-2xl font-bold text-gray-900">{categoryName}</h1>
        </div>

        {isAdmin && (
          <Link
            href={`/admin/category/${id}`}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚙️</span>
            <span>Edit Category</span>
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl bg-white">
          <p className="text-gray-400 text-sm">No products available in this category yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {products.map((product) => {
              const cartItem = cartState.find((item) => item.id === product.id);
              const isItemInCart = !!cartItem;
              const isOutOfStock = product.stock <= 0;
              const isSaved = wishlistItems?.some((item) => item.id === product.id);

              return (
                <div key={product.id} className="group relative flex flex-col justify-between p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition duration-300 min-h-[340px]">
                  
                  {!isAdmin && (
                    <button 
                      onClick={() => toggleWishlist(product)}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full shadow-sm border border-gray-100 flex items-center justify-center transition z-10 ${
                        isSaved ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-white text-pink-400 hover:text-pink-500'
                      }`}
                    >
                      <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                  )}

                  <div className="w-full h-40 flex items-center justify-center mb-4 bg-white p-2 relative">
                    <img src={product.image} alt={product.title} className={`max-w-full max-h-full object-contain group-hover:scale-105 transition duration-300 ${isOutOfStock ? "opacity-40" : ""}`} />
                    
                    {isOutOfStock ? (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white font-bold text-xs uppercase px-2.5 py-1 rounded shadow-md z-10 tracking-wider">Out of Stock</div>
                    ) : isAdmin ? (
                      <Link href={`/admin/product/${product.id}`} className="absolute bottom-0 right-0 px-3 py-1.5 rounded-full bg-pink-600 text-white font-bold text-xs shadow-md hover:bg-pink-700 transition-all duration-300 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 z-20">Edit Product</Link>
                    ) : isItemInCart ? (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center bg-[#7bc143] text-white rounded-full px-2 py-1 shadow-md z-20 min-w-[110px] justify-between select-none">
                        <button onClick={() => handleUpdateQuantity(product.id, cartItem.quantity, -1)} disabled={updatingQuantityId === product.id} className="w-5 h-5 flex items-center justify-center font-black text-xs hover:bg-green-600 rounded-full transition disabled:opacity-50">-</button>
                        <span className="text-[10px] font-black tracking-wide px-0.5 min-w-[50px] text-center flex items-center justify-center">
                          {updatingQuantityId === product.id ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div> : `${cartItem.quantity} in Cart`}
                        </span>
                        <button onClick={() => handleUpdateQuantity(product.id, cartItem.quantity, 1)} disabled={updatingQuantityId === product.id || cartItem.quantity >= product.stock} className="w-5 h-5 flex items-center justify-center font-black text-xs hover:bg-green-600 rounded-full transition disabled:opacity-30">+</button>
                      </div>
                    ) : (
                      <button onClick={() => handleAddToCart(product)} disabled={loadingProductId === product.id} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#7bc143] text-white flex items-center justify-center shadow-md hover:bg-green-600 transition-all duration-300 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 z-20">
                        {loadingProductId === product.id ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div> : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z" /></svg>
                        )}
                      </button>
                    )}
                  </div>

                  <Link href={`/product/${product.id}`} className="flex flex-col flex-grow justify-end cursor-pointer">
                    <div className="flex flex-col gap-0.5 mb-1.5">
                      <span className="text-[10px] font-bold text-pink-500 block tracking-wide">{formatProductAge(product.created_at)}</span>
                      {isAdmin && formatProductEditAge(product.updated_at, product.created_at) && (
                        <span className="text-[10px] font-extrabold text-amber-600 block tracking-wide">{formatProductEditAge(product.updated_at, product.created_at)}</span>
                      )}
                    </div>
                    <h2 className="text-xs text-gray-800 font-normal line-clamp-2 mb-2 min-h-[32px] leading-tight transition group-hover:text-pink-600">{product.title}</h2>
                    <p className="text-sm font-bold text-green-600">Rs. {product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center items-center gap-2 mt-12 pt-6 border-t border-gray-100 select-none">
            {renderPaginationButtons()}
          </div>
        </>
      )}
    </div>
  );
}
