import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Send, Save, Lock, Unlock } from "lucide-react";
import { Product, JobLineItem } from "@/types/products";
import { useSecureWebhook } from "@/hooks/useSecureWebhook";
import { validateNumericInput, sanitizeInput } from "@/lib/validation";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [isSaving, setIsSaving] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const { getSecureWebhookUrl, validateWebhookPayload } = useSecureWebhook();
  const { handleError } = useErrorHandler();
  const isMobile = useIsMobile();

  // Removed - now using useSecureWebhook hook

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('products_sorted', { ascending: true });

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
      // Get user's profile to use their full_name for matching
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();
        
      const { data: existingJobs, error: jobsError } = await supabase
        .from('jobs_sold')
        .select('id, webhook_sent_at')
        .eq('sf_order_id', jobData.sf_order_id)
        .eq('rep', userProfile?.full_name);

      if (existingJobs && existingJobs.length > 0) {
        const existingJob = existingJobs[0];
        setIsJobLocked(!!existingJob.webhook_sent_at);
        
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from('job_line_items')
          .select(`
            id,
            quantity,
            unit_price,
            total,
            product_id,
            product_name
          `)
          .eq('job_id', existingJob.id);

        if (lineItemsData) {
          const transformedItems: UnifiedLineItem[] = lineItemsData.map(item => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total,
            isFromDatabase: true
          }));
        
          setLineItems(transformedItems);
        } else {
          setLineItems([]);
        }
      } else {
        setIsJobLocked(false);
        
        // If no database line items exist, populate from backend data if available
        if (jobData.lineItems && jobData.lineItems.length > 0) {
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
      quantity: 0,
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
      if (selectedProduct && selectedProduct.id !== 'placeholder-select') {
        item.productId = selectedProduct.id;
        item.productName = selectedProduct.name;
        item.unitPrice = selectedProduct.unit_price;
        item.total = selectedProduct.unit_price * item.quantity;
      } else if (selectedProduct?.id === 'placeholder-select') {
        // Reset to empty state if placeholder is selected
        item.productId = "";
        item.productName = "";
        item.unitPrice = 0;
        item.total = 0;
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
    setIsSaving(true);
    
    const invalidItems = lineItems.filter(item => !item.productId || item.productId === 'placeholder-select' || item.quantity <= 0 || item.unitPrice <= 0);
    
    if (invalidItems.length > 0) {
      toast({
        title: "Error",
        description: "Please fill all product selections and quantities for new items",
        variant: "destructive",
      });
      return;
    }

    const newItems = lineItems.filter(item => item.isNew && item.productId);
    if (newItems.length === 0) {
      toast({
        title: "Info",
        description: "No new items to save",
      });
      setIsSaving(false);
      return;
    }

    try {
      // First, ensure job exists in jobs_sold table
      let jobId;
      
      // Get user's profile to use their full_name for matching
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();
      
      const { data: existingJobs, error: jobQueryError } = await supabase
        .from('jobs_sold')
        .select('id')
        .eq('sf_order_id', jobData.sf_order_id)
        .eq('rep', userProfile?.full_name);

      if (jobQueryError) {
        throw jobQueryError;
      }

      if (existingJobs && existingJobs.length > 0) {
        jobId = existingJobs[0].id;
      } else {
          
        // Create job record
        const { data: newJob, error: jobError } = await supabase
          .from('jobs_sold')
          .insert({
            user_id: userId,
            client: jobData.client,
            job_number: jobData.job_number,
            rep: userProfile?.full_name || "Unknown Rep",
            lead_sold_for: 0,
            payment_type: "TBD",
            install_date: jobData.install_date,
            sf_order_id: jobData.sf_order_id
          })
          .select('id')
          .single();

        if (jobError) {
          throw jobError;
        }

        jobId = newJob.id;
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

      const { data: insertResult, error: insertError } = await supabase
        .from('job_line_items')
        .insert(lineItemsToInsert);

      if (insertError) throw insertError;

      await fetchLineItems();
      
      toast({
        title: "Success",
        description: `${lineItemsToInsert.length} line items saved successfully`,
      });
    } catch (error: any) {
      handleError(error, 'Line Items Save');
    } finally {
      setIsSaving(false);
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
      // Prepare and validate webhook payload
      const payload = {
        jobData: {
          client: sanitizeInput(jobData.client),
          jobNumber: sanitizeInput(jobData.job_number),
          rep: "Sheet Import",
          leadSoldFor: 0,
          paymentType: "TBD",
          installDate: jobData.install_date,
          sfOrderId: sanitizeInput(jobData.sf_order_id)
        },
        lineItems: savedItems.map(item => ({
          productId: sanitizeInput(item.productId),
          productName: sanitizeInput(item.productName),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        }))
      };
      
      if (!validateWebhookPayload(payload)) {
        throw new Error('Invalid webhook payload');
      }

      const { data, error } = await supabase.functions.invoke('send-job-webhook', {
        body: payload
      });

      if (error) throw error;

      // Update the job to mark webhook as sent and lock it
      const jobToUpdate = await supabase
        .from('jobs_sold')
        .select('id')
        .eq('sf_order_id', jobData.sf_order_id)
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
      handleError(error, 'Webhook Send');
    } finally {
      setSendingWebhook(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchLineItems();
    }
  }, [isOpen, jobData.sf_order_id]);

  const total = lineItems.reduce((sum, item) => sum + item.total, 0);
  const newItemsCount = lineItems.filter(item => item.isNew).length;
  const savedItemsCount = lineItems.filter(item => !item.isNew).length;

  return (
    isMobile ? (
      <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent className="z-50">
          <div className="mx-auto w-full max-w-5xl h-[92vh] flex flex-col bg-gradient-to-br from-background to-secondary/10 rounded-t-2xl overflow-hidden">
            <DrawerHeader className="border-b border-border/50 px-4 py-3 flex-shrink-0">
              <DrawerTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                {isJobLocked ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-600" />
                    Manage Line Items (Locked)
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-green-600" />
                    Manage Line Items (Editable)
                  </>
                )}
              </DrawerTitle>
              <DrawerDescription className="text-xs">
                Job: {jobData.job_number} • Client: {jobData.client}
                {isJobLocked && " • This job cannot be edited after being sent to build"}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 py-2 flex items-center justify-between text-xs sm:text-sm flex-shrink-0">
              <div className="text-muted-foreground">
                Saved: {savedItemsCount} • New: {newItemsCount}
              </div>
              <div className="font-semibold text-primary">
                Total: ${total.toFixed(2)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 sm:px-4 space-y-4">
              <div className="bg-card border rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="font-semibold text-foreground">
                    Line Items ({lineItems.length})
                  </h3>
                </div>

                {lineItems.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {/* Header hidden on mobile */}
                    <div className="hidden sm:grid grid-cols-12 gap-3 p-2 bg-muted/50 rounded text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <div className="col-span-4">Product</div>
                      <div className="col-span-2">Quantity</div>
                      <div className="col-span-2">Unit Price</div>
                      <div className="col-span-2">Total</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1">Actions</div>
                    </div>

                    {lineItems.map((item, index) => (
                      <div
                        key={item.id || index}
                        className={`grid grid-cols-12 sm:grid-cols-12 gap-3 p-3 rounded border ${
                          item.isNew ? 'bg-blue-50 border-blue-200' : 'bg-background border-border'
                        }`}
                      >
                        <div className="col-span-12 sm:col-span-4">
                          {item.isNew && !isJobLocked ? (
                            <Select
                              value={item.productId}
                              onValueChange={(value) => updateLineItem(index, 'productId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product..." />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover text-popover-foreground shadow-lg">
                                {products.map((product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id}
                                    disabled={product.id === 'placeholder-select' && item.productId !== ''}
                                  >
                                    {product.id === 'placeholder-select' ? (
                                      product.name
                                    ) : (
                                      `${product.name} - $${product.unit_price}`
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="font-medium">{item.productName}</div>
                          )}
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          {item.isNew && !isJobLocked ? (
                            <Input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min="1"
                              max="999"
                              step="1"
                              autoComplete="off"
                              placeholder="Qty"
                              value={item.quantity === 0 ? '' : item.quantity.toString()}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  updateLineItem(index, 'quantity', 0);
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue > 0 && numValue <= 999) {
                                    updateLineItem(index, 'quantity', numValue);
                                  }
                                }
                              }}
                            />
                          ) : (
                            <div>{item.quantity}</div>
                          )}
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <div>${item.unitPrice.toFixed(2)}</div>
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <div className="font-semibold">${item.total.toFixed(2)}</div>
                        </div>

                        <div className="col-span-6 sm:col-span-1">
                          {item.isNew ? (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">NEW</span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SAVED</span>
                          )}
                        </div>

                        <div className="col-span-6 sm:col-span-1 flex justify-end">
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
                    <div className="text-sm">Click "Add Item" below to get started</div>
                  </div>
                )}
              </div>

              {hasUnsavedChanges && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs sm:text-sm text-yellow-800">
                  ⚠️ You have unsaved changes. Please save your changes before sending to build.
                </div>
              )}
            </div>

            <div className="sticky bottom-0 w-full border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4 py-3 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              {!isJobLocked && (
                <Button onClick={addNewLineItem} size="sm" variant="secondary">
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                {!isJobLocked && hasUnsavedChanges && (
                  <Button onClick={saveAllChanges} disabled={isSaving} size="sm">
                    <Save className="mr-1 h-3 w-3" /> {isSaving ? 'Saving…' : `Save (${newItemsCount})`}
                  </Button>
                )}
                {lineItems.length > 0 && !isJobLocked && (
                  <Button onClick={sendWebhook} disabled={sendingWebhook || hasUnsavedChanges} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Send className="mr-1 h-3 w-3" /> {sendingWebhook ? 'Sending…' : 'Send to Build'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    ) : (
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
                  <Button
                    onClick={addNewLineItem}
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                  {hasUnsavedChanges && (
                    <Button
                      onClick={saveAllChanges}
                      disabled={isSaving}
                      variant="default"
                      size="sm"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : `Save Changes (${newItemsCount})`}
                    </Button>
                  )}
                </>
              )}
              {lineItems.length > 0 && !isJobLocked && (
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
                            <SelectContent className="z-50 bg-popover text-popover-foreground shadow-lg">
                              {products.map((product) => (
                                <SelectItem
                                  key={product.id}
                                  value={product.id}
                                  disabled={product.id === 'placeholder-select' && item.productId !== ''}
                                >
                                  {product.id === 'placeholder-select' ? (
                                    product.name
                                  ) : (
                                    `${product.name} - $${product.unit_price}`
                                  )}
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
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="1"
                            max="999"
                            step="1"
                            autoComplete="off"
                            placeholder="Qty"
                            value={item.quantity === 0 ? '' : item.quantity.toString()}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                updateLineItem(index, 'quantity', 0);
                              } else {
                                // Only allow whole numbers
                                const numValue = parseInt(value);
                                if (!isNaN(numValue) && numValue > 0 && numValue <= 999) {
                                  updateLineItem(index, 'quantity', numValue);
                                }
                              }
                            }}
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
                  <div className="text-sm">Click "Add Item" above to get started</div>
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
    )
  );
};
