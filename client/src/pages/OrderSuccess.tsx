import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function OrderSuccess() {
  return (
    <div className="container-custom py-16 text-center">
      <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
      <h1 className="section-title">Order Placed!</h1>
      <p className="text-gray-600 mb-8">Thank you for your purchase.</p>
      <Link to="/orders" className="btn-primary">View Orders</Link>
    </div>
  );
}
