
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
  const [newLineItems, setNewLineItems] = useState<Array<{
    productId: string;
    quantity: number;
    tempId: string;
  }>>([]);
  const [isJobLocked, setIsJobLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const { toast } = useToast();

  // Function to get webhook URL from database with fallback
  const getWebhookUrl = async (webhookName: string, fallbackUrl: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('webhook_configs')
        .select('url')
        .eq('name', webhookName)
        .eq('is_active', true)
        .single();
      
      if (data && !error) {
        return data.url;
      }
    } catch (error) {
      console.warn(`Failed to fetch webhook config for ${webhookName}, using fallback:`, error);
    }
    return fallbackUrl;
  };

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
      const { data: existingJobs } = await supabase
        .from('jobs_sold')
        .select('id, webhook_sent_at')
        .eq('sf_order_id', jobData.sf_order_id)
        .eq('user_id', userId);

      if (existingJobs && existingJobs.length > 0) {
        const existingJob = existingJobs[0]; // Use the first job if multiple exist
        setIsJobLocked(!!existingJob.webhook_sent_at);
        
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
      } else {
        setIsJobLocked(false);
        setLineItems([]);
      }
    } catch (error: any) {
      console.error('Error fetching line items:', error);
      setIsJobLocked(false);
      setLineItems([]);
    }
  };

  const addNewLineItem = () => {
    setNewLineItems([...newLineItems, {
      productId: "",
      quantity: 1,
      tempId: Math.random().toString(36)
    }]);
  };

  const updateNewLineItem = (tempId: string, field: 'productId' | 'quantity', value: string | number) => {
    setNewLineItems(newLineItems.map(item => 
      item.tempId === tempId ? { ...item, [field]: value } : item
    ));
  };

  const removeNewLineItem = (tempId: string) => {
    setNewLineItems(newLineItems.filter(item => item.tempId !== tempId));
  };

  const saveBatchLineItems = async () => {
    if (newLineItems.length === 0) {
      toast({
        title: "Error",
        description: "No line items to save",
        variant: "destructive",
      });
      return;
    }

    const invalidItems = newLineItems.filter(item => !item.productId || item.quantity < 1);
    if (invalidItems.length > 0) {
      toast({
        title: "Error",
        description: "Please fill all product selections and quantities",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, ensure job exists in jobs_sold table
      let jobId;
      const { data: existingJobs } = await supabase
        .from('jobs_sold')
        .select('id')
        .eq('sf_order_id', jobData.sf_order_id)
        .eq('user_id', userId);

      if (existingJobs && existingJobs.length > 0) {
        jobId = existingJobs[0].id; // Use the first job if multiple exist
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

      // Prepare batch inserts
      const lineItemsToInsert = newLineItems.map(item => {
        const selectedProduct = products.find(p => p.id === item.productId);
        if (!selectedProduct) throw new Error(`Product not found: ${item.productId}`);
        
        return {
          job_id: jobId,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          quantity: item.quantity,
          unit_price: selectedProduct.unit_price,
          total: selectedProduct.unit_price * item.quantity
        };
      });

      const { error } = await supabase
        .from('job_line_items')
        .insert(lineItemsToInsert);

      if (error) throw error;

      setNewLineItems([]);
      await fetchLineItems();
      
      toast({
        title: "Success",
        description: `${lineItemsToInsert.length} line items saved successfully`,
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
      // Get webhook URL from database with fallback
      const webhookUrl = await getWebhookUrl(
        'job_webhook', 
        'https://n8n.srv858576.hstgr.cloud/webhook/4bcba099-6b2a-4177-87c3-8930046d675b'
      );
      
      const { data, error } = await supabase.functions.invoke('send-job-webhook', {
        body: {
          webhookUrl,
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

      // Lock the job after successful webhook send
      setIsJobLocked(true);
      
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

  const existingTotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const newItemsTotal = newLineItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.unit_price * item.quantity : 0);
  }, 0);
  const total = existingTotal + newItemsTotal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Line Items {isJobLocked && "(Locked)"}</DialogTitle>
          <DialogDescription>
            Job: {jobData.job_number} - {jobData.client}
            {isJobLocked && " - This job cannot be edited after webhook has been sent"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Multiple Line Items */}
          {!isJobLocked && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Button onClick={addNewLineItem} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line Items
                </Button>
              </div>
              
              {newLineItems.map((item, index) => (
                <div key={item.tempId} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 border rounded">
                  <div className="md:col-span-2">
                    <Label>Product</Label>
                    <Select 
                      value={item.productId} 
                      onValueChange={(value) => updateNewLineItem(item.tempId, 'productId', value)}
                    >
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
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateNewLineItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    {(() => {
                      const product = products.find(p => p.id === item.productId);
                      return product ? (
                        <div className="text-sm text-muted-foreground font-medium">
                          Total: ${(product.unit_price * item.quantity).toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Select product
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeNewLineItem(item.tempId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {newLineItems.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                  <div className="text-sm font-medium">
                    Batch Total: ${newLineItems.reduce((sum, item) => {
                      const product = products.find(p => p.id === item.productId);
                      return sum + (product ? product.unit_price * item.quantity : 0);
                    }, 0).toFixed(2)}
                  </div>
                  <Button 
                    onClick={saveBatchLineItems} 
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Save All Line Items ({newLineItems.length})
                  </Button>
                </div>
              )}

              {lineItems.length > 0 && (
                <div className="flex justify-end">
                  <Button 
                    onClick={async () => {
                      await sendWebhook();
                      onClose();
                    }} 
                    disabled={sendingWebhook}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sendingWebhook ? "Saving..." : "Save and Close"}
                  </Button>
                </div>
              )}
            </div>
          )}

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
                    {!isJobLocked && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
