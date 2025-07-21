
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Send } from "lucide-react";
import { Product, JobLineItem } from "@/types/products";

interface LineItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: {
    sf_order_id: string;
    client: string;
    job_number: string;
    install_date: string;
  };
  userId: string;
}

export const LineItemsModal = ({ isOpen, onClose, jobData, userId }: LineItemsModalProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [lineItems, setLineItems] = useState<JobLineItem[]>([]);
  const [newLineItem, setNewLineItem] = useState({
    productId: "",
    quantity: 1,
  });
  const [loading, setLoading] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const { toast } = useToast();

  const fetchProducts = async () => {
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
    }
  };

  const fetchLineItems = async () => {
    try {
      // First, check if job exists in jobs_sold table
      const { data: existingJob } = await supabase
        .from('jobs_sold')
        .select('id')
        .eq('sf_order_id', jobData.sf_order_id)
        .eq('user_id', userId)
        .single();

      if (existingJob) {
        const { data, error } = await supabase
          .from('job_line_items')
          .select('*')
          .eq('job_id', existingJob.id);

        if (error) throw error;
        
        const transformedItems: JobLineItem[] = (data || []).map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total)
        }));
        
        setLineItems(transformedItems);
      }
    } catch (error: any) {
      console.error('Error fetching line items:', error);
    }
  };

  const addLineItem = async () => {
    if (!newLineItem.productId) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    const selectedProduct = products.find(p => p.id === newLineItem.productId);
    if (!selectedProduct) return;

    setLoading(true);
    try {
      // First, ensure job exists in jobs_sold table
      let jobId;
      const { data: existingJob } = await supabase
        .from('jobs_sold')
        .select('id')
        .eq('sf_order_id', jobData.sf_order_id)
        .eq('user_id', userId)
        .single();

      if (existingJob) {
        jobId = existingJob.id;
      } else {
        // Create job record
        const { data: newJob, error: jobError } = await supabase
          .from('jobs_sold')
          .insert({
            user_id: userId,
            client: jobData.client,
            job_number: jobData.job_number,
            rep: "Sheet Import",
            lead_sold_for: 0,
            payment_type: "TBD",
            install_date: jobData.install_date,
            sf_order_id: jobData.sf_order_id
          })
          .select()
          .single();

        if (jobError) throw jobError;
        jobId = newJob.id;
      }

      const total = selectedProduct.unit_price * newLineItem.quantity;

      const { error } = await supabase
        .from('job_line_items')
        .insert({
          job_id: jobId,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          quantity: newLineItem.quantity,
          unit_price: selectedProduct.unit_price,
          total: total
        });

      if (error) throw error;

      setNewLineItem({ productId: "", quantity: 1 });
      await fetchLineItems();
      
      toast({
        title: "Success",
        description: "Line item added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeLineItem = async (lineItemId: string) => {
    try {
      const { error } = await supabase
        .from('job_line_items')
        .delete()
        .eq('id', lineItemId);

      if (error) throw error;
      
      await fetchLineItems();
      toast({
        title: "Success",
        description: "Line item removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendWebhook = async () => {
    if (lineItems.length === 0) {
      toast({
        title: "Error",
        description: "No line items to send",
        variant: "destructive",
      });
      return;
    }

    setSendingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-job-webhook', {
        body: {
          webhookUrl: 'https://n8n.srv858576.hstgr.cloud/webhook/4bcba099-6b2a-4177-87c3-8930046d675b',
          jobData: {
            client: jobData.client,
            jobNumber: jobData.job_number,
            rep: "Sheet Import",
            leadSoldFor: 0,
            paymentType: "TBD",
            installDate: jobData.install_date,
            sfOrderId: jobData.sf_order_id
          },
          lineItems: lineItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          }))
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Webhook sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingWebhook(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchLineItems();
    }
  }, [isOpen]);

  const selectedProduct = products.find(p => p.id === newLineItem.productId);
  const total = lineItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Line Items</DialogTitle>
          <DialogDescription>
            Job: {jobData.job_number} - {jobData.client}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Line Item */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium">Add Line Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="product">Product</Label>
                <Select value={newLineItem.productId} onValueChange={(value) => 
                  setNewLineItem({ ...newLineItem, productId: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - ${product.unit_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={newLineItem.quantity}
                  onChange={(e) => 
                    setNewLineItem({ ...newLineItem, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={addLineItem} 
                  disabled={loading || !newLineItem.productId}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </div>
            
            {selectedProduct && (
              <div className="text-sm text-muted-foreground">
                Unit Price: ${selectedProduct.unit_price} | 
                Total: ${(selectedProduct.unit_price * newLineItem.quantity).toFixed(2)}
              </div>
            )}
          </div>

          {/* Line Items List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Line Items ({lineItems.length})</h3>
              <div className="text-lg font-semibold">
                Total: ${total.toFixed(2)}
              </div>
            </div>
            
            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No line items added yet
              </div>
            ) : (
              <div className="space-y-2">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × ${item.unitPrice} = ${item.total.toFixed(2)}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {lineItems.length > 0 && (
              <Button 
                onClick={sendWebhook} 
                disabled={sendingWebhook}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="mr-2 h-4 w-4" />
                {sendingWebhook ? "Sending..." : "Send Webhook"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
