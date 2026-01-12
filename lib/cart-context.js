'use client';

import { createContext, useContext, useReducer, useEffect, useState } from 'react';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'friesian-cart';

// Cart actions
const ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  LOAD_CART: 'LOAD_CART',
};

function cartReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_ITEM: {
      const { product, variant, quantity = 1 } = action.payload;
      const itemKey = variant ? `${product.id}-${variant.id}` : product.id;

      const existingIndex = state.items.findIndex(item => item.key === itemKey);

      if (existingIndex > -1) {
        // Update quantity of existing item
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + quantity,
        };
        return { ...state, items: newItems };
      }

      // Add new item
      const newItem = {
        key: itemKey,
        productId: product.id,
        variantId: variant?.id || null,
        name: product.name,
        price: variant?.price || product.basePrice || product.price,
        size: variant?.size || null,
        color: variant?.color || null,
        image: product.images?.[0]?.url || product.imageUrl || null,
        quantity,
      };

      return { ...state, items: [...state.items, newItem] };
    }

    case ACTIONS.REMOVE_ITEM: {
      return {
        ...state,
        items: state.items.filter(item => item.key !== action.payload.key),
      };
    }

    case ACTIONS.UPDATE_QUANTITY: {
      const { key, quantity } = action.payload;

      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.key !== key),
        };
      }

      return {
        ...state,
        items: state.items.map(item =>
          item.key === key ? { ...item, quantity } : item
        ),
      };
    }

    case ACTIONS.CLEAR_CART: {
      return { ...state, items: [] };
    }

    case ACTIONS.LOAD_CART: {
      return { ...state, items: action.payload.items || [] };
    }

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        dispatch({ type: ACTIONS.LOAD_CART, payload: { items: parsed.items || [] } });
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: state.items }));
      } catch (error) {
        console.error('Failed to save cart to storage:', error);
      }
    }
  }, [state.items, isLoaded]);

  // Calculate totals
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Actions
  const addItem = (product, variant = null, quantity = 1) => {
    dispatch({ type: ACTIONS.ADD_ITEM, payload: { product, variant, quantity } });
    setIsOpen(true); // Open cart drawer when adding
  };

  const removeItem = (key) => {
    dispatch({ type: ACTIONS.REMOVE_ITEM, payload: { key } });
  };

  const updateQuantity = (key, quantity) => {
    dispatch({ type: ACTIONS.UPDATE_QUANTITY, payload: { key, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: ACTIONS.CLEAR_CART });
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen(prev => !prev);

  const value = {
    items: state.items,
    itemCount,
    subtotal,
    isOpen,
    isLoaded,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
