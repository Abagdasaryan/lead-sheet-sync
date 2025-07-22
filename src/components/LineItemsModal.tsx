import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Send, Save, Lock, Unlock } from "lucide-react";
import { Product, JobLineItem } from "@/types/products";

interface LineItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: {
    sf_order_id: string;
    client: string;
    job_number: string;
    install_date: string;
    lineItems?: Array<{
      product_name: string;
      quantity: number;
    }>;
  };
  userId: string;
}

interface UnifiedLineItem {
  id?: string; // undefined for new items
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isNew?: boolean; // flag to track if it's a new item
}

export const LineItemsModal = ({ isOpen, onClose, jobData, userId }: LineItemsModalProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [lineItems, setLineItems] = useState<UnifiedLineItem[]>([]);
  const [isJobLocked, setIsJobLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
    console.log('🔍 Fetching line items for job:', jobData.sf_order_id, 'user:', userId);
    try {
      // First, check if job exists in jobs_sold table
      const { data: existingJobs, error: jobsError } = await supabase
        .from('jobs_sold')
        .select('id, webhook_sent_at')
        .eq('sf_order_id', jobData.sf_order_id)
        .eq('user_id', userId);

      console.log('🔍 Existing jobs query result:', existingJobs, 'error:', jobsError);

      if (existingJobs && existingJobs.length > 0) {
        const existingJob = existingJobs[0];
        setIsJobLocked(!!existingJob.webhook_sent_at);
        console.log('🔍 Job found, ID:', existingJob.id, 'locked:', !!existingJob.webhook_sent_at);
        
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from('job_line_items')
          .select('*')
          .eq('job_id', existingJob.id);

        console.log('🔍 Line items query result:', lineItemsData, 'error:', lineItemsError);

        if (lineItemsError) throw lineItemsError;
        
        const transformedItems: UnifiedLineItem[] = (lineItemsData || []).map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total),
          isNew: false
        }));
        
        console.log('🔍 Transformed line items:', transformedItems);
        setLineItems(transformedItems);
      } else {
        console.log('🔍 No existing job found, checking backend data for line items');
        setIsJobLocked(false);
        
        // If no database line items exist, populate from backend data if available
        if (jobData.lineItems && jobData.lineItems.length > 0) {
          console.log('🔍 Populating from backend line items:', jobData.lineItems);
          const backendItems: UnifiedLineItem[] = jobData.lineItems.map(item => ({
            productId: "", // Will need to be selected by user
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: 0, // Will need to be set by user
            total: 0,
            isNew: true // Mark as new since they're not in database yet
          }));
          setLineItems(backendItems);
        } else {
          setLineItems([]);
        }
      }
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('❌ Error fetching line items:', error);
      setIsJobLocked(false);
      setLineItems([]);
    }
  };

  const addNewLineItem = () => {
    const newItem: UnifiedLineItem = {
      productId: "",
      productName: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
      isNew: true
    };
    setLineItems([...lineItems, newItem]);
    setHasUnsavedChanges(true);
  };

  const updateLineItem = (index: number, field: keyof UnifiedLineItem, value: string | number) => {
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
      item.quantity = Number(value);
      item.total = item.unitPrice * item.quantity;
    } else {
      (item as any)[field] = value;
    }
    
    setLineItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const removeLineItem = async (index: number) => {
    const item = lineItems[index];
    
    if (item.id) {
      // Existing item - delete from database
      try {
        const { error } = await supabase
          .from('job_line_items')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
        
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
        return;
      }
    }
    
    // Remove from local state
    const updatedItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const saveAllChanges = async () => {
    console.log('💾 Starting to save all changes');
    
    const newItems = lineItems.filter(item => item.isNew && item.productId);
    const invalidItems = newItems.filter(item => !item.productId || item.quantity < 1);
    
    if (invalidItems.length > 0) {
      console.log('❌ Invalid items found:', invalidItems);
      toast({
        title: "Error",
        description: "Please fill all product selections and quantities for new items",
        variant: "destructive",
      });
      return;
    }

    if (newItems.length === 0) {
      toast({
        title: "Info",
        description: "No new items to save",
      });
      return;
    }

    setLoading(true);
    try {
      // First, ensure job exists in jobs_sold table
      let jobId;
      console.log('🔍 Looking for existing job with sf_order_id:', jobData.sf_order_id, 'user_id:', userId);
      
      const { data: existingJobs, error: jobQueryError } = await supabase
        .from('jobs_sold')
        .select('id')
        .eq('sf_order_id', jobData.sf_order_id)
        .eq('user_id', userId);

      console.log('🔍 Existing jobs query result:', existingJobs, 'error:', jobQueryError);

      if (jobQueryError) {
        console.error('❌ Error querying existing jobs:', jobQueryError);
        throw jobQueryError;
      }

      if (existingJobs && existingJobs.length > 0) {
        jobId = existingJobs[0].id;
        console.log('✅ Found existing job with ID:', jobId);
      } else {
        // Create job record
        console.log('➕ Creating new job record');
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

        console.log('➕ New job creation result:', newJob, 'error:', jobError);
        if (jobError) {
          console.error('❌ Error creating job:', jobError);
          throw jobError;
        }
        jobId = newJob.id;
        console.log('✅ Created new job with ID:', jobId);
      }

      // Prepare batch inserts for new items only
      const lineItemsToInsert = newItems.map(item => ({
        job_id: jobId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
      }));

      console.log('💾 Inserting line items:', lineItemsToInsert);

      const { data: insertResult, error: insertError } = await supabase
        .from('job_line_items')
        .insert(lineItemsToInsert)
        .select();

      console.log('💾 Line items insert result:', insertResult, 'error:', insertError);

      if (insertError) throw insertError;

      console.log('🔄 Refreshing line items after save');
      await fetchLineItems();
      
      toast({
        title: "Success",
        description: `${lineItemsToInsert.length} line items saved successfully`,
      });
    } catch (error: any) {
      console.error('❌ Error saving line items:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWebhook = async () => {
    const savedItems = lineItems.filter(item => !item.isNew);
    
    if (savedItems.length === 0) {
      toast({
        title: "Error",
        description: "No saved line items to send. Please save your changes first.",
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
          lineItems: savedItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          }))
        }
      });

      if (error) throw error;

      // Update the job to mark webhook as sent and lock it
      const jobToUpdate = await supabase
        .from('jobs_sold')
        .select('id')
        .eq('sf_order_id', jobData.sf_order_id)
        .eq('user_id', userId)
        .single();

      if (jobToUpdate?.data) {
        await supabase
          .from('jobs_sold')
          .update({ webhook_sent_at: new Date().toISOString() })
          .eq('id', jobToUpdate.data.id);
      }

      // Lock the job after successful webhook send
      setIsJobLocked(true);
      setHasUnsavedChanges(false);
      
      toast({
        title: "Success",
        description: "Sent to build successfully. Job is now locked.",
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
      console.log('🔄 Modal opened, fetching products and line items for job:', jobData.sf_order_id);
      fetchProducts();
      fetchLineItems();
    }
  }, [isOpen, jobData.sf_order_id]);

  const total = lineItems.reduce((sum, item) => sum + item.total, 0);
  const newItemsCount = lineItems.filter(item => item.isNew).length;
  const savedItemsCount = lineItems.filter(item => !item.isNew).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-hidden bg-gradient-to-br from-background to-secondary/10 flex flex-col">
        <DialogHeader className="border-b border-border/50 pb-2 mb-3 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            {isJobLocked ? (
              <>
                <Lock className="w-5 h-5 text-amber-600" />
                Manage Line Items (Locked)
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5 text-green-600" />
                Manage Line Items (Editable)
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Job: {jobData.job_number} • Client: {jobData.client}
            {isJobLocked && " • This job cannot be edited after being sent to build"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Saved: {savedItemsCount} • New: {newItemsCount}
            </div>
            <div className="text-lg font-bold text-primary">
              Total: ${total.toFixed(2)}
            </div>
          </div>
          
          <div className="flex gap-2">
            {!isJobLocked && (
              <>
                <Button onClick={addNewLineItem} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
                {hasUnsavedChanges && (
                  <Button 
                    onClick={saveAllChanges} 
                    disabled={loading}
                    variant="default"
                    size="sm"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? "Saving..." : `Save Changes (${newItemsCount})`}
                  </Button>
                )}
              </>
            )}
            {savedItemsCount > 0 && !isJobLocked && (
              <Button 
                onClick={sendWebhook} 
                disabled={sendingWebhook || hasUnsavedChanges}
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="mr-2 h-4 w-4" />
                {sendingWebhook ? "Sending..." : "Send to Build"}
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
                  <div className="col-span-2">Total</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {/* Line Items */}
                {lineItems.map((item, index) => (
                  <div 
                    key={item.id || index} 
                    className={`grid grid-cols-12 gap-3 p-3 rounded border ${
                      item.isNew ? 'bg-blue-50 border-blue-200' : 'bg-background border-border'
                    }`}
                  >
                    <div className="col-span-4">
                      {item.isNew && !isJobLocked ? (
                        <Select 
                          value={item.productId} 
                          onValueChange={(value) => updateLineItem(index, 'productId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - ${product.unit_price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="font-medium">{item.productName}</div>
                      )}
                    </div>
                    
                    <div className="col-span-2">
                      {item.isNew && !isJobLocked ? (
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      ) : (
                        <div>{item.quantity}</div>
                      )}
                    </div>
                    
                    <div className="col-span-2">
                      <div>${item.unitPrice.toFixed(2)}</div>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="font-semibold">${item.total.toFixed(2)}</div>
                    </div>
                    
                    <div className="col-span-1">
                      {item.isNew ? (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">NEW</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SAVED</span>
                      )}
                    </div>
                    
                    <div className="col-span-1">
                      {!isJobLocked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <div className="mb-2">No line items yet</div>
                {!isJobLocked && (
                  <Button onClick={addNewLineItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first line item
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Save Warning */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
              ⚠️ You have unsaved changes. Please save your changes before sending to build.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
