"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/Context/CartContext";
import { OffCanvasProvider } from "@/Context/canvas";
import { WishlistProvider } from "@/Context/WishlistContext";
import Navbar from "@/components/Navbar";
import Cart from "@/components/Cart";
import WishlistDrawer from "@/components/WishlistDrawer";
import LoginPopup from "@/components/LoginPopup";
import { supabase } from "@/Config/supabase";
import "@/app/globals.css";

function AuthGatekeeper({ children }) {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function primeAuthSession() {
      try {
        await supabase.auth.getSession();
      } catch (e) {
        console.warn("Session check bypassed.");
      } finally {
        if (isMounted) setInitializing(false);
      }
    }
    primeAuthSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (initializing) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-screen select-none">
        <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return children;
}

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen" suppressHydrationWarning={true}>
        <AuthGatekeeper>
          <OffCanvasProvider>
            <WishlistProvider>
              <CartProvider>
                {!isLoginPage && <Navbar />}
                {!isLoginPage && <Cart />}
                {!isLoginPage && <WishlistDrawer />}
                <LoginPopup />
                <main className="w-full">{children}</main>
              </CartProvider>
            </WishlistProvider>
          </OffCanvasProvider>
        </AuthGatekeeper>
        <Toaster position="top-center" reverseOrder={false} />
      </body>
    </html>
  );
}
