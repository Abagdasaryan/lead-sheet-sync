import React, { useState, useEffect, useMemo, useCallback } from "react";
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

interface Profile {
  id: string;
  user_id: string;
  email: string;
  rep_email: string | null;
  rep_alias: string | null;
  created_at: string;
  updated_at: string;
}

export const JobsSold = ({ user }: JobsSoldProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [editedJobData, setEditedJobData] = useState<Job | null>(null);
  const [sortBy, setSortBy] = useState<'installDate' | 'client' | 'leadSoldFor'>('installDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingLineItems, setEditingLineItems] = useState<JobLineItem[]>([]);
  const [showLineItemDialog, setShowLineItemDialog] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { toast } = useToast();

  // Test webhook URL
  const TEST_WEBHOOK_URL = 'https://n8n.srv858576.hstgr.cloud/webhook-test/4bcba099-6b2a-4177-87c3-8930046d675b';

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchJobsData = async () => {
    setLoading(true);
    console.log('=== FETCH JOBS DATA START ===');
    console.log('Profile:', profile);
    console.log('User email:', user.email);
    
    try {
      if (!profile?.rep_alias) {
        console.log('ERROR: No rep alias found');
        toast({
          title: "Error",
          description: "Rep alias not found in profile. Please update your profile with your rep slug.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('Fetching jobs sold data for rep slug:', profile.rep_alias);
      
      const { data, error } = await supabase.functions.invoke('fetch-jobs-sold-data', {
        body: { 
          userRepSlug: profile.rep_alias
        }
      });

      console.log('=== EDGE FUNCTION RESPONSE ===');
      console.log('Error:', error);
      console.log('Data:', data);
      
      if (error) {
        console.log('Edge function error:', error);
        throw error;
      }

      const jobsData = data?.rows || [];
      console.log('Jobs data length:', jobsData.length);
      console.log('Jobs data:', jobsData);
      
      // Map the sheet data to Job format - the edge function now returns the correct structure
      const mappedJobs: Job[] = jobsData.map((row: any, index: number) => {
        console.log('Processing row:', index, row);
        
        const mappedJob = {
          id: `job-${index}`,
          client: row.client || '',
          jobNumber: row.jobNumber || '',
          rep: row.rep || '',
          leadSoldFor: row.leadSoldFor || 0,
          paymentType: row.paymentType || '',
          installDate: row.installDate || '',
          sfOrderId: row.sfOrderId || ''
        };
        
        console.log('Mapped job:', mappedJob);
        return mappedJob;
      });
      
      console.log('=== FINAL MAPPED JOBS ===');
      console.log('Mapped jobs count:', mappedJobs.length);
      console.log('Mapped jobs:', mappedJobs);
      
      setJobs(mappedJobs);
      console.log('Jobs state updated');
      
      toast({
        title: "Data loaded",
        description: `Found ${jobsData.length} jobs sold for rep ${profile.rep_alias}.`,
      });
    } catch (error: any) {
      console.error('Error fetching jobs data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch jobs data",
        variant: "destructive",
      });
    } finally {
      console.log('=== FETCH JOBS DATA END ===');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

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
  }, []);

  const handleRefresh = async () => {
    fetchProducts();
    if (profile) {
      await fetchJobsData();
    }
    toast({
      title: "Data refreshed",
      description: "Jobs sold data has been updated.",
    });
  };

  const handleEditLineItems = (job: Job) => {
    if (job.lineItemsLocked) {
      toast({
        title: "Line items locked",
        description: "Line items have already been saved and cannot be edited.",
        variant: "destructive"
      });
      return;
    }
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
      leadSoldFor: totalAmount,
      lineItemsLocked: true
    };
    
    setJobs(jobs.map(job => 
      job.id === updatedJob.id ? updatedJob : job
    ));
    
    try {
      const { data, error } = await supabase.functions.invoke('send-job-webhook', {
        body: {
          webhookUrl: TEST_WEBHOOK_URL,
          jobData: updatedJob,
          lineItems: editingLineItems
        }
      });

      if (error) throw error;

      toast({
        title: "Line items saved and sent to n8n",
        description: "Job line items have been saved and sent to your webhook successfully.",
      });
    } catch (error) {
      console.error('Error sending webhook:', error);
      toast({
        title: "Line items saved",
        description: "Line items saved but failed to send webhook to n8n.",
        variant: "destructive"
      });
    }
    
    setShowLineItemDialog(false);
    setEditingLineItems([]);
  };

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;

    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter(job => job.paymentType === paymentTypeFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.rep.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

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
  }, [jobs, paymentTypeFilter, searchQuery, sortBy, sortOrder]);

  const toggleSort = (column: 'installDate' | 'client' | 'leadSoldFor') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

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
          <Button onClick={fetchJobsData} disabled={loading || !profile?.rep_alias}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Fetch Jobs Data
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                     <TableHead>Rep</TableHead>
                     <TableHead 
                       className="cursor-pointer"
                       onClick={() => toggleSort('leadSoldFor')}
                     >
                       Lead Sold For <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                     </TableHead>
                     <TableHead>Payment Type</TableHead>
                     <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedJobs.map((job) => (
                    <TableRow key={job.id}>
                       <TableCell>
                         {new Date(job.installDate).toLocaleDateString()}
                       </TableCell>
                       <TableCell>
                         {job.client}
                       </TableCell>
                       <TableCell>
                         {job.jobNumber}
                       </TableCell>
                       <TableCell>
                         {job.rep}
                       </TableCell>
                       <TableCell>
                         {`$${job.leadSoldFor.toLocaleString()}`}
                       </TableCell>
                       <TableCell>
                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                           job.paymentType === 'Cash' ? 'text-green-600 bg-green-50' :
                           job.paymentType === 'Finance' ? 'text-blue-600 bg-blue-50' :
                           'text-gray-600 bg-gray-50'
                         }`}>
                           {job.paymentType}
                         </span>
                       </TableCell>
                       <TableCell>
                         <div className="flex space-x-2">
                           <Button 
                             size="sm" 
                             variant={job.lineItemsLocked ? "outline" : "secondary"} 
                             onClick={() => handleEditLineItems(job)}
                             disabled={job.lineItemsLocked}
                           >
                             {job.lineItemsLocked ? "Line Items (Locked)" : "Line Items"}
                           </Button>
                          </div>
                         {job.lineItems && job.lineItems.length > 0 && (
                           <div className="mt-2 p-2 bg-muted rounded text-xs">
                             <strong>Line Items:</strong>
                             <div className="mt-1">
                               {job.lineItems.map((item, index) => (
                                 <div key={index} className="flex justify-between">
                                   <span>{item.productName}</span>
                                   <span>{item.quantity}x ${item.unitPrice} = ${item.total}</span>
                                 </div>
                               ))}
                               <div className="border-t pt-1 mt-1 font-semibold">
                                 Total: ${job.lineItems.reduce((sum, item) => sum + item.total, 0)}
                               </div>
                             </div>
                           </div>
                         )}
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
