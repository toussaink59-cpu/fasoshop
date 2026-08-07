// Panier simple stocké dans localStorage (côté client uniquement).
// Format : [{ productId, name, price, shopName, image, quantity }]

const CART_KEY = "fasoshop_cart";

export function getCart() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("fasoshop-cart-updated"));
}

export function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((i) => i.productId === product.id);
  const image =
    (product.images && product.images[0]) || product.image || null;

  if (existing) {
    existing.quantity += 1;
    if (!existing.image) existing.image = image;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      shopName: product.shop_name,
      image: image,
      quantity: 1,
    });
  }
  saveCart(cart);
}

export function updateQuantity(productId, quantity) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter((i) => i.productId !== productId);
  } else {
    cart = cart.map((i) => (i.productId === productId ? { ...i, quantity } : i));
  }
  saveCart(cart);
}

export function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter((i) => i.productId !== productId);
  saveCart(cart);
}

export function clearCart() {
  saveCart([]);
}

export function cartCount(cart) {
  return cart.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartTotal(cart) {
  return cart.reduce((sum, i) => sum + i.quantity * i.price, 0);
}
