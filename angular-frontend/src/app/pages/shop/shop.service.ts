import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, tap } from 'rxjs';
import { environment } from '@environments/environment';
// import { environment } from '../../../environments/environment';

export interface Product {
  id: number;
  title: string;
  price: number;
  originalPrice: number;
  discount: number;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  description: string;
  unavailablePincodes?: string;
}

export interface CartItem {
  id: number; // Database ID (primary key of CartItem table)
  userId: number;
  productId: number;
  quantity: number;
  productTitle: string;
  productPrice: number;
  productImage: string;
  productCategory: string;
  // Mapped properties for frontend compatibility
  title?: string;
  price?: number;
  image?: string;
  category?: string;
  Product?: Product;
}

export interface WishlistItem {
  id: number;
  productId: number;
  productTitle: string;
  productPrice: number;
  productImage: string;
  // Mapped properties
  title?: string;
  price?: number;
  image?: string;
  Product?: Product;
}

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private http = inject(HttpClient);
  // private apiUrl = `${environment.apiUrl}/shop`; // Assuming environment is set
  private apiUrl = `${environment.apiUrl}/api/shop`; // Hardcoded for now if needed

  // Mock data removed in favor of backend


  // Products Signal
  products = signal<Product[]>([]);
  sellerProducts = signal<Product[]>([]);
  sellerOrders = signal<any[]>([]);

  // Signals
  cartItems = signal<CartItem[]>([]);
  wishlistItems = signal<WishlistItem[]>([]);
  searchQuery = signal<string>('');

  cartTotal = computed(() => {
    return this.cartItems().reduce((total, item) => {
      const price = item.productPrice || item.price || 0;
      return total + (price * item.quantity);
    }, 0);
  });

  cartCount = computed(() => {
    return this.cartItems().reduce((total, item) => total + item.quantity, 0);
  });

  constructor() {
    this.initialLoad();
  }

  async initialLoad() {
    await this.loadCart();
    await this.loadWishlist();
    await this.loadProducts();
  }

  // --- Load Data ---
  async loadProducts() {
    try {
      const products = await firstValueFrom(this.http.get<Product[]>(`${this.apiUrl}/products`));
      this.products.set(products);
    } catch (e) {
      console.error('Failed to load products', e);
    }
  }

  async loadCart() {
    try {
      const items = await firstValueFrom(this.http.get<CartItem[]>(`${this.apiUrl}/cart`));
      const mappedItems = items.map(i => ({
        ...i,
        title: i.Product?.title || i.productTitle,
        price: i.Product?.price || i.productPrice,
        image: i.Product?.image || i.productImage,
        category: i.Product?.category || i.productCategory
      }));
      this.cartItems.set(mappedItems);
    } catch (e) {
      console.error('Failed to load cart', e);
    }
  }

  async loadWishlist() {
    try {
      const items = await firstValueFrom(this.http.get<WishlistItem[]>(`${this.apiUrl}/wishlist`));
      const mappedItems = items.map(i => ({
        ...i,
        title: i.Product?.title || i.productTitle,
        price: i.Product?.price || i.productPrice,
        image: i.Product?.image || i.productImage
      }));
      this.wishlistItems.set(mappedItems);
    } catch (e) {
      console.error('Failed to load wishlist', e);
    }
  }

  // --- Actions ---
  // Replaced static getProducts with signal access
  // getProducts() { return this.products; } 

  getProductById(id: number) {
    return computed(() => this.products().find(p => p.id === Number(id)));
  }

  async addToCart(product: Product) {
    try {
      const payload = {
        productId: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        category: product.category
      };

      await firstValueFrom(this.http.post<any>(`${this.apiUrl}/cart`, payload));
      await this.loadCart();
    } catch (e) {
      console.error('Add to cart failed', e);
    }
  }

  async removeFromCart(cartItemId: number) {
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/cart/${cartItemId}`));
      this.cartItems.update(items => items.filter(i => i.id !== cartItemId));
    } catch (e) {
      console.error('Remove from cart failed', e);
    }
  }

  async updateQuantity(cartItemId: number, quantity: number) {
    if (quantity < 0) return;
    try {
      await firstValueFrom(this.http.put(`${this.apiUrl}/cart/${cartItemId}`, { quantity }));
      if (quantity === 0) {
        this.cartItems.update(items => items.filter(i => i.id !== cartItemId));
      } else {
        this.cartItems.update(items => items.map(i => i.id === cartItemId ? { ...i, quantity } : i));
      }
    } catch (e) {
      console.error('Update qty failed', e);
    }
  }

  // --- Wishlist Actions ---
  async toggleWishlist(product: Product) {
    const existing = this.wishlistItems().find(i => i.productId === product.id);
    try {
      if (existing) {
        await this.removeFromWishlist(product.id);
      } else {
        const payload = {
          productId: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          category: product.category
        };
        await firstValueFrom(this.http.post(`${this.apiUrl}/wishlist`, payload));
        await this.loadWishlist();
      }
    } catch (e) {
      console.error('Wishlist toggle failed', e);
    }
  }

  async removeFromWishlist(productId: number) {
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/wishlist/${productId}`));
      this.wishlistItems.update(items => items.filter(i => i.productId !== productId));
    } catch (e) {
      console.error('Remove from wishlist failed', e);
      throw e;
    }
  }

  isInWishlist(productId: number) {
    return computed(() => !!this.wishlistItems().find(i => i.productId === productId));
  }

  setSearchQuery(query: string) {
    this.searchQuery.set(query);
  }

  // --- Seller Hub Features ---
  async loadSellerProducts() {
    try {
      const products = await firstValueFrom(this.http.get<Product[]>(`${this.apiUrl}/seller/products`));
      this.sellerProducts.set(products);
    } catch (e) {
      console.error('Failed to load seller products', e);
    }
  }

  async createProduct(productData: any) {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/products`, productData));
      await this.loadSellerProducts(); // Refresh seller list
      await this.loadProducts(); // Refresh global list
    } catch (e) {
      console.error('Create product failed', e);
      throw e;
    }
  }

  async updateProduct(id: number, productData: any) {
    try {
      await firstValueFrom(this.http.put(`${this.apiUrl}/products/${id}`, productData));
      await this.loadSellerProducts();
      await this.loadProducts();
    } catch (e) {
      console.error('Update product failed', e);
      throw e;
    }
  }

  async deleteProduct(id: number) {
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/products/${id}`));
      this.sellerProducts.update(p => p.filter(x => x.id !== id));
      this.products.update(p => p.filter(x => x.id !== id));
    } catch (e) {
      console.error('Delete product failed', e);
      throw e;
    }
  }

  async loadSellerOrders() {
    try {
      const orders = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/seller/orders`));
      this.sellerOrders.set(orders);
    } catch (e) {
      console.error('Failed to load seller orders', e);
    }
  }

  async updateOrderItemStatus(itemId: number, status: string) {
    try {
      await firstValueFrom(this.http.put(`${this.apiUrl}/seller/orders/${itemId}/status`, { status }));
      this.sellerOrders.update(orders => orders.map(o => o.id === itemId ? { ...o, status } : o));
    } catch (e) {
      console.error('Update order status failed', e);
      throw e;
    }
  }
  async createRazorpayOrder(amount: number) {
    try {
      const response = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/create-razorpay-order`, { amount }));
      return response;
    } catch (e) {
      console.error('Failed to create Razorpay order', e);
      throw e;
    }
  }

  async checkout(shippingAddress: string, paymentMethod: string) {
    try {
      const payload = { shippingAddress, paymentMethod };
      const response = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/checkout`, payload));
      this.cartItems.set([]); // Clear cart locally
      return response;
    } catch (e) {
      console.error('Checkout failed', e);
      throw e;
    }
  }
}
