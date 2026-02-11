'use client';

import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Alert,
  LoadingSpinner,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableCell,
  Badge,
  Modal,
} from '@/components/ui';

export default function InventoryPage() {
  const { products, loading, error } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);

  // Get low stock products (< 20)
  const lowStockProducts = Array.isArray(products) ? products.filter((p) => p.stock < 20 && p.stock > 0) : [];
  const outOfStockProducts = Array.isArray(products) ? products.filter((p) => p.stock === 0) : [];

  // Filter for search
  const filteredProducts = Array.isArray(products) ? products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Calculate total inventory value
  const totalValue = Array.isArray(products) ? products.reduce((sum, p) => sum + p.price * p.stock, 0) : 0;

  const handleAdjustStock = (product: any) => {
    setSelectedProduct(product);
    setAdjustmentQty(0);
    setShowAdjustModal(true);
  };

  const submitAdjustment = async () => {
    if (selectedProduct) {
      console.log(`Adjust stock for ${selectedProduct.id} by ${adjustmentQty}`);
      setShowAdjustModal(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Inventory Management"
        description="Monitor and adjust product stock levels"
      >
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Import Stock
        </Button>
      </PageHeader>

      {error && <Alert type="error">{error}</Alert>}

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Alert type="warning">
            <strong>{lowStockProducts.length}</strong> products with low stock
          </Alert>
        )}

        {/* Out of Stock Alert */}
        {outOfStockProducts.length > 0 && (
          <Alert type="error">
            <strong>{outOfStockProducts.length}</strong> products out of stock
          </Alert>
        )}

        {/* Inventory Value */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm font-medium">Total Inventory Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              ₱{totalValue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Products */}
      {lowStockProducts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Current Stock</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                </TableHead>
                <tbody>
                  {lowStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <span className="text-amber-600 font-medium">
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">Low Stock</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => handleAdjustStock(product)}
                        >
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Out of Stock Products */}
      {outOfStockProducts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Out of Stock Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                </TableHead>
                <tbody>
                  {outOfStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="danger">Out of Stock</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleAdjustStock(product)}
                        >
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Products Stock Levels */}
      <Card>
        <CardHeader>
          <CardTitle>All Products Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              label="Search Products"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableHeaderCell>Product</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Price</TableHeaderCell>
                <TableHeaderCell>Stock</TableHeaderCell>
                <TableHeaderCell>Value</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
              </TableHead>
              <tbody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category?.name || 'Uncategorized'}</TableCell>
                    <TableCell>₱{product.price.toLocaleString('en-PH')}</TableCell>
                    <TableCell>
                      <span
                        className={
                          product.stock < 10
                            ? 'text-red-600 font-medium'
                            : product.stock < 20
                              ? 'text-amber-600 font-medium'
                              : ''
                        }
                      >
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ₱
                      {(product.price * product.stock).toLocaleString('en-PH', {
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleAdjustStock(product)}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title={`Adjust Stock - ${selectedProduct?.name}`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600">Current Stock</p>
            <p className="text-2xl font-bold">{selectedProduct?.stock || 0}</p>
          </div>
          <Input
            label="Adjustment Quantity"
            type="number"
            value={adjustmentQty}
            onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
            placeholder="Enter quantity (positive or negative)"
          />
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-slate-600">New Stock</p>
            <p className="text-xl font-bold text-blue-900">
              {(selectedProduct?.stock || 0) + adjustmentQty}
            </p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              onClick={submitAdjustment}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Stock
            </Button>
            <Button
              onClick={() => setShowAdjustModal(false)}
              className="bg-slate-300 hover:bg-slate-400 text-slate-900"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
