import { useCartStore } from '../stores';
import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';

export default function Cart() {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="container-custom py-16 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-txt-tertiary mb-4" />
        <h1 className="section-title">Your Cart is Empty</h1>
        <p className="text-txt-secondary mb-8">Add some items to get started</p>
        <Link to="/shop" className="btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <h1 className="section-title mb-8">Shopping Cart ({getTotalItems()})</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.product_id} className="card p-4 flex gap-4">
              <img
                src={item.images || 'assets/images/product-images/01.webp'}
                alt={item.name}
                className="w-24 h-24 object-cover rounded-lg"
              />
              
              <div className="flex-grow">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-txt-secondary">₱{(item.sale_price || item.price).toFixed(2)}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    className="p-1 border border-bdr rounded hover:bg-bg-hover"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  
                  <span className="w-8 text-center">{item.quantity}</span>
                  
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    className="p-1 border border-bdr rounded hover:bg-bg-hover"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => removeItem(item.product_id)}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="card p-6 h-fit">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₱{getTotalPrice().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>Free</span>
            </div>
          </div>
          
          <hr className="my-4" />
          
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>₱{getTotalPrice().toFixed(2)}</span>
          </div>
          
          <Link to="/checkout" className="btn-primary w-full text-center mt-6 block">
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
