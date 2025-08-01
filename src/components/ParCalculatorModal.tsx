import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Calculator } from "lucide-react";
import { Product } from "@/types/products";
import { validateNumericInput } from "@/lib/validation";

interface ParCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface CalculatorLineItem {
  id: string; // unique ID for React keys
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export const ParCalculatorModal = ({ isOpen, onClose, userId }: ParCalculatorModalProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [lineItems, setLineItems] = useState<CalculatorLineItem[]>([]);
  const [adminFee, setAdminFee] = useState<number>(350);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const addNewLineItem = () => {
    const newItem: CalculatorLineItem = {
      id: generateId(),
      productId: "",
      productName: "",
      quantity: 0,
      unitPrice: 0,
      total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (index: number, field: keyof CalculatorLineItem, value: string | number) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];
    
    if (field === 'productId') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        item.productId = selectedProduct.id;
        item.productName = selectedProduct.name;
        item.unitPrice = selectedProduct.unit_price;
        item.total = selectedProduct.unit_price * item.quantity;
      }
    } else if (field === 'quantity') {
      const numValue = Math.max(0, Math.floor(Number(value) || 0));
      item.quantity = numValue;
      item.total = item.unitPrice * numValue;
    } else {
      (item as any)[field] = value;
    }
    
    setLineItems(updatedItems);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedItems);
  };

  const clearCalculation = () => {
    setLineItems([]);
    toast({
      title: "Cleared",
      description: "Calculation cleared successfully",
    });
  };

  const resetModal = () => {
    setLineItems([]);
    setAdminFee(350);
  };

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    } else {
      resetModal();
    }
  }, [isOpen]);

  const total = lineItems.reduce((sum, item) => sum + item.total, 0);
  const subtotalWithAdmin = total + adminFee;
  const markups = [5, 10, 20, 30];
  const markupCalculations = markups.map(percentage => ({
    percentage,
    amount: Math.round(subtotalWithAdmin * (percentage / 100)),
    total: Math.round(subtotalWithAdmin + (subtotalWithAdmin * (percentage / 100)))
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-hidden bg-gradient-to-br from-background to-secondary/10 flex flex-col">
        <DialogHeader className="border-b border-border/50 pb-2 mb-3 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Par Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate project costs and pricing estimates
          </DialogDescription>
        </DialogHeader>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Items: {lineItems.length}
            </div>
            <div className="text-lg font-bold text-primary">
              Total: ${total.toFixed(2)}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={addNewLineItem} 
              variant="default" 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
            {lineItems.length > 0 && (
              <Button 
                onClick={clearCalculation} 
                variant="outline"
                size="sm"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {/* Line Items */}
          <div className="bg-card border rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="font-semibold text-foreground">
                Line Items ({lineItems.length})
              </h3>
            </div>
            
            {lineItems.length > 0 ? (
              <div className="p-4 space-y-3">
                {/* Grid Header */}
                <div className="grid grid-cols-12 gap-3 p-2 bg-muted/50 rounded text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="col-span-4">Product</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-3">Total</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {/* Line Items */}
                {lineItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="grid grid-cols-12 gap-3 p-3 rounded border bg-background border-border"
                  >
                    {/* Product Selection */}
                    <div className="col-span-4">
                      <Select 
                        value={item.productId} 
                        onValueChange={(value) => updateLineItem(index, 'productId', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-full"
                      />
                    </div>

                    {/* Unit Price - Read Only */}
                    <div className="col-span-2">
                      <Input
                        type="text"
                        value={item.unitPrice > 0 ? `$${item.unitPrice.toFixed(2)}` : '-'}
                        readOnly
                        className="w-full bg-muted/50 text-muted-foreground"
                      />
                    </div>

                    {/* Total - Read Only */}
                    <div className="col-span-3">
                      <Input
                        type="text"
                        value={item.total > 0 ? `$${item.total.toFixed(2)}` : '-'}
                        readOnly
                        className="w-full bg-muted/50 text-muted-foreground font-medium"
                      />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Calculator className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No items added yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Add Item" to start your calculation
                </p>
              </div>
            )}
          </div>

          {/* Admin Fee Section */}
          <div className="bg-card border rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="font-semibold text-foreground">Admin Fee</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="adminFee" className="text-sm font-medium min-w-0">
                  Admin Fee ($)
                </Label>
                <Input
                  id="adminFee"
                  type="number"
                  min="0"
                  step="1"
                  value={adminFee || ''}
                  onChange={(e) => setAdminFee(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  placeholder="0"
                  className="w-32"
                />
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          {(lineItems.length > 0 || adminFee > 0) && (
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="font-semibold text-foreground">Pricing Summary</h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Base Calculations */}
                <div className="space-y-2 border-b border-border pb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Line Items Total:</span>
                    <span className="font-medium">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admin Fee:</span>
                    <span className="font-medium">${adminFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Subtotal:</span>
                    <span>${subtotalWithAdmin.toFixed(2)}</span>
                  </div>
                </div>

                {/* Markup Options */}
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Markup Options</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {markupCalculations.map(({ percentage, amount, total: markupTotal }) => (
                      <div key={percentage} className="p-3 border rounded-lg bg-muted/20">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-primary">{percentage}% Markup</span>
                          <span className="text-sm text-muted-foreground">+${amount}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">${markupTotal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};