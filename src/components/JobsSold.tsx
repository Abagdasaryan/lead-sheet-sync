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
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'status' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingLineItems, setEditingLineItems] = useState<JobLineItem[]>([]);
  const [showLineItemDialog, setShowLineItemDialog] = useState(false);
  const { toast } = useToast();

  // Mock data for now - will be replaced with sheet data
  const mockJobs: Job[] = [
    {
      id: "1",
      date: "7/16/2025",
      clientName: "John Smith",
      appointmentName: "PA 19063 - John Smith Gutter Installation",
      status: "Completed",
      totalAmount: "$3,500"
    },
    {
      id: "2", 
      date: "7/15/2025",
      clientName: "Sarah Johnson",
      appointmentName: "NJ 08901 - Sarah Johnson Gutter Repair",
      status: "In Progress",
      totalAmount: "$1,250"
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

  const handleFieldChange = (field: string, value: string) => {
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

  const saveLineItems = () => {
    if (!editedJobData) return;
    
    const totalAmount = editingLineItems.reduce((sum, item) => sum + item.total, 0);
    const updatedJob = {
      ...editedJobData,
      lineItems: editingLineItems,
      totalAmount: `$${totalAmount.toLocaleString()}`
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

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.appointmentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'date':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'client':
          aVal = a.clientName.toLowerCase();
          bVal = b.clientName.toLowerCase();
          break;
        case 'status':
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
        case 'total':
          aVal = parseFloat(a.totalAmount.replace(/[$,]/g, ''));
          bVal = parseFloat(b.totalAmount.replace(/[$,]/g, ''));
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [jobs, statusFilter, searchQuery, sortBy, sortOrder]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'in progress':
        return 'text-blue-600 bg-blue-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const toggleSort = (column: 'date' | 'client' | 'status' | 'total') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

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
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by client or appointment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sort-by">Sort By</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="client">Client Name</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="total">Total Amount</SelectItem>
                  </SelectContent>
                </Select>
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
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredAndSortedJobs.filter(job => job.status === 'Completed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredAndSortedJobs.filter(job => job.status === 'In Progress').length}
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
                  .filter(job => job.status === 'Completed')
                  .reduce((sum, job) => sum + parseFloat(job.totalAmount.replace(/[$,]/g, '')), 0)
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
                      onClick={() => toggleSort('date')}
                    >
                      Date <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('client')}
                    >
                      Client <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead>Appointment</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('status')}
                    >
                      Status <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('total')}
                    >
                      Total <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            value={editedJobData?.date || ''}
                            onChange={(e) => handleFieldChange('date', e.target.value)}
                            className="min-w-[100px]"
                          />
                        ) : (
                          job.date
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            value={editedJobData?.clientName || ''}
                            onChange={(e) => handleFieldChange('clientName', e.target.value)}
                            className="min-w-[150px]"
                          />
                        ) : (
                          job.clientName
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            value={editedJobData?.appointmentName || ''}
                            onChange={(e) => handleFieldChange('appointmentName', e.target.value)}
                            className="min-w-[200px]"
                          />
                        ) : (
                          job.appointmentName
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Select
                            value={editedJobData?.status || ''}
                            onValueChange={(value) => handleFieldChange('status', value)}
                          >
                            <SelectTrigger className="min-w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingJobId === job.id ? (
                          <Input
                            value={editedJobData?.totalAmount || ''}
                            onChange={(e) => handleFieldChange('totalAmount', e.target.value)}
                            className="min-w-[100px]"
                          />
                        ) : (
                          job.totalAmount
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
              <DialogTitle>Edit Line Items - {editedJobData?.clientName}</DialogTitle>
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