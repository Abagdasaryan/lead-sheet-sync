import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ArrowUpDown, Edit, Save, X, Plus, Trash2 } from "lucide-react";
import { Job, JobLineItem, Product } from "@/types/products";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface JobsSoldProps {
  user: User;
}

export const JobsSold = ({ user }: JobsSoldProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editedJobData, setEditedJobData] = useState<Job | null>(null);
  const [sortBy, setSortBy] = useState<'installDate' | 'client' | 'rep' | 'leadSoldFor'>('installDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [repFilter, setRepFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingLineItems, setEditingLineItems] = useState<JobLineItem[]>([]);
  const [showLineItemDialog, setShowLineItemDialog] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const { toast } = useToast();

  // Mock data for now - will be replaced with sheet data
  const mockJobs: Job[] = [
    {
      id: "1",
      client: "ALEXIS OSBORNE",
      jobNumber: "APG-01574",
      rep: "Phil Brooks",
      leadSoldFor: 1320,
      paymentType: "Finance",
      installDate: "2025-07-19",
      sfOrderId: "801RP00000YxqlQYAR"
    },
    {
      id: "2", 
      client: "JOHN SMITH",
      jobNumber: "APG-01575",
      rep: "Sarah Johnson",
      leadSoldFor: 2450,
      paymentType: "Cash",
      installDate: "2025-07-20",
      sfOrderId: "801RP00000YxqlRYAR"
    }
  ];

  // Fetch products from Supabase
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchProducts();
    setJobs(mockJobs);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    // TODO: Replace with actual sheet data fetch
    fetchProducts(); // Refresh products as well
    setTimeout(() => {
      setJobs(mockJobs);
      setLoading(false);
      toast({
        title: "Data refreshed",
        description: "Jobs sold data has been updated.",
      });
    }, 1000);
  };

  const handleEdit = (job: Job) => {
    setEditingJobId(job.id);
    setEditedJobData(job);
  };

  const handleSave = async () => {
    if (!editedJobData) return;
    
    setLoading(true);
    try {
      // TODO: Implement save to sheet
      setJobs(jobs.map(job => 
        job.id === editedJobData.id ? editedJobData : job
      ));
      
      setEditingJobId(null);
      setEditedJobData(null);
      toast({
        title: "Job updated",
        description: "Job data has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save job data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingJobId(null);
    setEditedJobData(null);
  };

  const handleFieldChange = (field: string, value: string | number) => {
    if (!editedJobData) return;
    setEditedJobData({
      ...editedJobData,
      [field]: value
    });
  };

  const handleEditLineItems = (job: Job) => {
    setEditingLineItems(job.lineItems || []);
    setEditedJobData(job);
    setShowLineItemDialog(true);
  };

  const addLineItem = () => {
    const newLineItem: JobLineItem = {
      id: Date.now().toString(),
      productId: "",
      productName: "",
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setEditingLineItems([...editingLineItems, newLineItem]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updatedItems = [...editingLineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].productName = product.name;
        updatedItems[index].unitPrice = product.unit_price;
        updatedItems[index].total = updatedItems[index].quantity * product.unit_price;
      }
    } else if (field === 'quantity') {
      updatedItems[index].total = value * updatedItems[index].unitPrice;
    }
    
    setEditingLineItems(updatedItems);
  };

  const removeLineItem = (index: number) => {
    setEditingLineItems(editingLineItems.filter((_, i) => i !== index));
  };

  const saveLineItems = async () => {
    if (!editedJobData) return;
    
    const totalAmount = editingLineItems.reduce((sum, item) => sum + item.total, 0);
    const updatedJob = {
      ...editedJobData,
      lineItems: editingLineItems,
      leadSoldFor: totalAmount // Update the lead sold amount with line items total
    };
    
    setJobs(jobs.map(job => 
      job.id === updatedJob.id ? updatedJob : job
    ));
    
    setShowLineItemDialog(false);
    setEditingLineItems([]);
    toast({
      title: "Line items updated",
      description: "Job line items have been saved successfully.",
    });
  };

  const sendWebhook = async (job: Job) => {
    if (!webhookUrl) {
      toast({
        title: "Webhook URL Required",
        description: "Please enter your n8n webhook URL in the settings.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-job-webhook', {
        body: {
          webhookUrl,
          jobData: job,
          lineItems: job.lineItems || []
        }
      });

      if (error) throw error;

      toast({
        title: "Webhook sent",
        description: "Job data has been sent to n8n successfully.",
      });
    } catch (error) {
      console.error('Error sending webhook:', error);
      toast({
        title: "Error",
        description: "Failed to send webhook to n8n.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;

    // Filter by rep
    if (repFilter !== 'all') {
      filtered = filtered.filter(job => job.rep === repFilter);
    }

    // Filter by payment type
    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter(job => job.paymentType === paymentTypeFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.rep.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'installDate':
          aVal = new Date(a.installDate);
          bVal = new Date(b.installDate);
          break;
        case 'client':
          aVal = a.client.toLowerCase();
          bVal = b.client.toLowerCase();
          break;
        case 'rep':
          aVal = a.rep.toLowerCase();
          bVal = b.rep.toLowerCase();
          break;
        case 'leadSoldFor':
          aVal = a.leadSoldFor;
          bVal = b.leadSoldFor;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [jobs, repFilter, paymentTypeFilter, searchQuery, sortBy, sortOrder]);

  const toggleSort = (column: 'installDate' | 'client' | 'rep' | 'leadSoldFor') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Get unique reps and payment types for filters
  const uniqueReps = [...new Set(jobs.map(job => job.rep))];
  const uniquePaymentTypes = [...new Set(jobs.map(job => job.paymentType))];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Jobs Sold</h1>
            <p className="text-muted-foreground">
              Manage completed and in-progress jobs
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by client, job number, or rep..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="rep-filter">Rep</Label>
                <Select value={repFilter} onValueChange={setRepFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Reps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reps</SelectItem>
                    {uniqueReps.map(rep => (
                      <SelectItem key={rep} value={rep}>{rep}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment-filter">Payment Type</Label>
                <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Payment Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Types</SelectItem>
                    {uniquePaymentTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="webhook-url">n8n Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://your-n8n-instance.com/webhook/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  type="url"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredAndSortedJobs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finance Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredAndSortedJobs.filter(job => job.paymentType === 'Finance').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredAndSortedJobs.filter(job => job.paymentType === 'Cash').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${filteredAndSortedJobs
                  .reduce((sum, job) => sum + job.leadSoldFor, 0)
                  .toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs ({filteredAndSortedJobs.length})</CardTitle>
            <CardDescription>
              Click on a job to edit details or manage line items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('installDate')}
                    >
                      Install Date <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('client')}
                    >
                      Client <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead>Job Number</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('rep')}
                    >
                      Rep <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('leadSoldFor')}
                    >
                      Lead Sold For <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>SF Order ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            type="date"
                            value={editedJobData?.installDate || ''}
                            onChange={(e) => handleFieldChange('installDate', e.target.value)}
                            className="min-w-[120px]"
                          />
                        ) : (
                          new Date(job.installDate).toLocaleDateString()
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            value={editedJobData?.client || ''}
                            onChange={(e) => handleFieldChange('client', e.target.value)}
                            className="min-w-[150px]"
                          />
                        ) : (
                          job.client
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            value={editedJobData?.jobNumber || ''}
                            onChange={(e) => handleFieldChange('jobNumber', e.target.value)}
                            className="min-w-[120px]"
                          />
                        ) : (
                          job.jobNumber
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            value={editedJobData?.rep || ''}
                            onChange={(e) => handleFieldChange('rep', e.target.value)}
                            className="min-w-[120px]"
                          />
                        ) : (
                          job.rep
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            type="number"
                            value={editedJobData?.leadSoldFor || ''}
                            onChange={(e) => handleFieldChange('leadSoldFor', parseFloat(e.target.value) || 0)}
                            className="min-w-[100px]"
                          />
                        ) : (
                          `$${job.leadSoldFor.toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Select
                            value={editedJobData?.paymentType || ''}
                            onValueChange={(value) => handleFieldChange('paymentType', value)}
                          >
                            <SelectTrigger className="min-w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {uniquePaymentTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="Check">Check</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.paymentType === 'Cash' ? 'text-green-600 bg-green-50' :
                            job.paymentType === 'Finance' ? 'text-blue-600 bg-blue-50' :
                            'text-gray-600 bg-gray-50'
                          }`}>
                            {job.paymentType}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            value={editedJobData?.sfOrderId || ''}
                            onChange={(e) => handleFieldChange('sfOrderId', e.target.value)}
                            className="min-w-[150px]"
                          />
                        ) : (
                          job.sfOrderId
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {editingJobId === job.id ? (
                            <>
                              <Button size="sm" onClick={handleSave}>
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancel}>
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(job)}>
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => handleEditLineItems(job)}>
                                Line Items
                              </Button>
                              <Button size="sm" variant="default" onClick={() => sendWebhook(job)}>
                                <Send className="h-3 w-3 mr-1" />
                                Send to n8n
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Line Items Dialog */}
        <Dialog open={showLineItemDialog} onOpenChange={setShowLineItemDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Line Items - {editedJobData?.client}</DialogTitle>
              <DialogDescription>
                Add, edit, or remove line items for this job
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Button onClick={addLineItem} className="mb-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editingLineItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select
                          value={item.productId}
                          onValueChange={(value) => updateLineItem(index, 'productId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} (${product.unit_price})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </TableCell>
                      <TableCell>${item.unitPrice}</TableCell>
                      <TableCell>${item.total}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="text-right">
                <strong>
                  Total: ${editingLineItems.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                </strong>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLineItemDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveLineItems}>
                Save Line Items
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};