import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, LogOut, Database, Filter, X, TrendingUp, Save, Edit, ArrowUpDown, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardProps {
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

export const Dashboard = ({ user }: DashboardProps) => {
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Store row ID for editing rather than index
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] = useState<any | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'client'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  // Define editable columns
  const editableColumns = ['Status', 'Lost Reason', 'Last Price'];
  const allColumns = ['date', 'CLIENT NAME', 'AppointmentName', 'Status', 'Lost Reason', 'Last Price'];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const handleEdit = (rowData: any) => {
    // Create unique ID using date + client as key to identify the row
    const rowId = `${rowData.date}-${rowData['CLIENT NAME']}`;
    setEditingRowId(rowId);
    // Initialize edited data with current row data
    setEditedRowData({ ...rowData });
  };

  const handleSave = async () => {
    if (!editingRowId || !editedRowData) return;
    
    try {
      // Update Google Sheets
      const { data, error } = await supabase.functions.invoke('update-sheet-data', {
        body: { 
          rowData: editedRowData,
          rowIndex: 0 // Not using index-based approach
        }
      });

      if (error) throw error;

      // Update local data on successful save
      setSheetData(prev => prev.map(row => {
        const rowId = `${row.date}-${row['CLIENT NAME']}`;
        return rowId === editingRowId ? editedRowData : row;
      }));
      
      // Clear editing state
      setEditingRowId(null);
      setEditedRowData(null);

      toast({
        title: "Success",
        description: "Row updated successfully in Google Sheets",
      });
    } catch (error: any) {
      console.error('Error saving to Google Sheets:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save changes to Google Sheets",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    // Clear editing state
    setEditingRowId(null);
    setEditedRowData(null);
  };

  const handleCellChange = (column: string, value: string) => {
    setEditedRowData(prev => ({
      ...prev,
      [column]: value
    }));
  };

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

  const fetchSheetData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-sheet-data', {
        body: { 
          userEmail: user.email,
          userAlias: profile?.rep_alias
        }
      });

      if (error) throw error;

      setSheetData(data.rows || []);
      toast({
        title: "Data loaded",
        description: `Found ${data.rows?.length || 0} rows${profile?.rep_alias ? ' using alias' : ''}.`,
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

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  useEffect(() => {
    if (profile) {
      fetchSheetData();
    }
  }, [profile]);

  // Filter by date range and sort data - show last 5 days by default
  const filteredAndSortedData = React.useMemo(() => {
    // Start with all data
    let filteredData = [...sheetData];
    
    // Apply automatic 5-day filter (unless custom date range is set)
    if (!startDate && !endDate) {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      filteredData = filteredData.filter(row => {
        const rowDateStr = row.date;
        if (!rowDateStr) return false;
        
        const [month, day, year] = rowDateStr.split('/').map(num => parseInt(num));
        if (!month || !day || !year) return false;
        
        const rowDate = new Date(year, month - 1, day);
        return rowDate >= fiveDaysAgo;
      });
    }
    
    // Apply custom date filters if selected
    if (startDate || endDate) {
      filteredData = filteredData.filter(row => {
        // Parse the date from the row (expected format like "7/7/2025")
        const rowDateStr = row.date;
        if (!rowDateStr) return false;
        
        // Try to parse the date in MM/DD/YYYY format
        const [month, day, year] = rowDateStr.split('/').map(num => parseInt(num));
        if (!month || !day || !year) return false;
        
        const rowDate = new Date(year, month - 1, day); // Month is 0-indexed in JS Date
        
        // Apply start date filter
        if (startDate && rowDate < new Date(startDate.setHours(0, 0, 0, 0))) {
          return false;
        }
        
        // Apply end date filter
        if (endDate && rowDate > new Date(endDate.setHours(23, 59, 59, 999))) {
          return false;
        }
        
        return true;
      });
    }
    
    // Always apply sorting to maintain consistent row indices
    return filteredData.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date || '').getTime() || 0;
          bValue = new Date(b.date || '').getTime() || 0;
          break;
        case 'status':
          aValue = a.Status || '';
          bValue = b.Status || '';
          break;
        case 'client':
          aValue = a['CLIENT NAME'] || '';
          bValue = b['CLIENT NAME'] || '';
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [sheetData, sortBy, sortOrder, startDate, endDate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 animate-fade-in">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="animate-slide-up">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 bg-gradient-to-r from-card to-card/50 rounded-2xl shadow-elegant border border-border/50 backdrop-blur-sm">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                APGS Sales Rep Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Welcome back, <span className="text-foreground font-medium">{user.email}</span>
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Connected to Google Sheets</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={fetchSheetData} 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 shadow-primary transition-all duration-300 hover:shadow-hover hover:scale-105"
                size="lg"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                {loading ? "Loading..." : "Refresh Data"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                size="lg"
                className="hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Data Controls Section */}
        <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <Card className="shadow-elegant border-border/50 bg-gradient-to-r from-card to-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-primary" />
                Data Controls
              </CardTitle>
              <CardDescription>Sort and filter your data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Range Filter */}
                <div className="flex flex-wrap gap-2 items-center mb-4">
                  <div className="flex flex-col">
                    <Label htmlFor="start-date" className="mb-1 text-sm">From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="start-date"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-[150px] justify-start text-left",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "MM/dd/yyyy") : <span>Start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex flex-col">
                    <Label htmlFor="end-date" className="mb-1 text-sm">To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="end-date"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-[150px] justify-start text-left",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "MM/dd/yyyy") : <span>End date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-end">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStartDate(undefined);
                        setEndDate(undefined);
                      }}
                      className="mb-1 hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  </div>
                </div>
                
                {/* Sorting Options */}
                <Select value={sortBy} onValueChange={(value: 'date' | 'status' | 'client') => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="client">Client Name</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="hover:bg-primary/10 hover:border-primary transition-all duration-300"
                >
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <Card className="shadow-elegant hover:shadow-hover transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{filteredAndSortedData.length}</div>
              <p className="text-xs text-muted-foreground">
                {(!startDate && !endDate) ? 'from last 5 days' : 'in selected date range'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant hover:shadow-hover transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Email</CardTitle>
              <Database className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{user.email}</div>
              <p className="text-xs text-muted-foreground">
                authenticated user
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant hover:shadow-hover transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Source</CardTitle>
              <Filter className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Google Sheets</div>
              <p className="text-xs text-muted-foreground">
                live connection
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Card className="shadow-elegant border-border/50 bg-gradient-to-br from-card to-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Your Sheet Data
              </CardTitle>
              <CardDescription>
                Data filtered for your email: <span className="font-medium text-foreground">{user.email}</span>
                <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                  {(!startDate && !endDate) ? 'Last 5 days • ' : ''}Sorted by {sortBy} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAndSortedData.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-lg mb-2">No data found</p>
                  <p className="text-sm text-muted-foreground">
                    {(!startDate && !endDate) 
                      ? "No records found for your email in the last 5 days" 
                      : "No records found for your email in the selected date range"}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-muted to-muted/50">
                        <tr>
                          {allColumns.map((column) => (
                            <th key={column} className="border-r border-border/30 p-4 text-left font-semibold text-foreground">
                              {column}
                            </th>
                          ))}
                          <th className="border-r border-border/30 p-4 text-left font-semibold text-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                         {filteredAndSortedData.map((row, rowIndex) => {
                           const rowId = `${row.date}-${row['CLIENT NAME']}`;
                           const isEditing = editingRowId === rowId;
                           const currentData = isEditing ? editedRowData : row;
                           
                           return (
                             <tr 
                               key={rowIndex} 
                               className={cn(
                                 "transition-colors duration-200 border-b border-border/30",
                                 isEditing 
                                   ? "bg-primary/10 border-primary/30 shadow-md ring-2 ring-primary/20" 
                                   : "hover:bg-muted/30"
                               )}
                             >
                               {allColumns.map((column) => {
                                 const isEditable = editableColumns.includes(column);
                                 const cellValue = currentData[column] || '';
                                 
                                 return (
                                   <td key={column} className="border-r border-border/20 p-4 text-sm">
                                     {isEditing && isEditable ? (
                                       <div className="w-full min-w-[120px]">
                                         {column === 'Status' ? (
                                           <Select
                                             value={cellValue}
                                             onValueChange={(value) => handleCellChange(column, value)}
                                           >
                                             <SelectTrigger className="w-full">
                                               <SelectValue placeholder="Select status" />
                                             </SelectTrigger>
                                             <SelectContent>
                                               <SelectItem value="Closed - Won">Closed - Won</SelectItem>
                                               <SelectItem value="Closed - Lost">Closed - Lost</SelectItem>
                                             </SelectContent>
                                           </Select>
                                         ) : column === 'Last Price' ? (
                                           <Input
                                             type="number"
                                             value={cellValue.toString().replace(/[$,]/g, '')}
                                             onChange={(e) => {
                                               const value = e.target.value;
                                               const formattedValue = value ? `$${parseFloat(value).toLocaleString()}` : '';
                                               handleCellChange(column, formattedValue);
                                             }}
                                             className="w-full"
                                             placeholder="Enter amount"
                                             step="0.01"
                                             min="0"
                                           />
                                         ) : (
                                           <Input
                                             value={cellValue}
                                             onChange={(e) => handleCellChange(column, e.target.value)}
                                             className="w-full"
                                             placeholder={`Enter ${column}`}
                                           />
                                         )}
                                       </div>
                                     ) : (
                                       <span className={cn(
                                         isEditable && !isEditing && "cursor-pointer hover:bg-primary/5 px-2 py-1 rounded transition-colors",
                                         column === 'Status' && cellValue && getStatusColor(cellValue),
                                         "block min-h-[32px] flex items-center"
                                       )}>
                                         {column === 'Last Price' && cellValue ? 
                                           (cellValue.toString().startsWith('$') ? cellValue : `$${cellValue}`) 
                                           : cellValue
                                         }
                                       </span>
                                     )}
                                   </td>
                                 );
                               })}
                               <td className="border-r border-border/20 p-4 text-sm">
                                 <div className="flex gap-2">
                                   {isEditing ? (
                                     <>
                                       <Button
                                         size="sm"
                                         onClick={handleSave}
                                         className="bg-green-600 hover:bg-green-700 text-white"
                                       >
                                         <Save className="h-3 w-3 mr-1" />
                                         Save
                                       </Button>
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={handleCancel}
                                       >
                                         Cancel
                                       </Button>
                                     </>
                                   ) : (
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => handleEdit(row)}
                                       className="hover:bg-primary/10 hover:border-primary"
                                     >
                                       <Edit className="h-3 w-3 mr-1" />
                                       Edit
                                     </Button>
                                   )}
                                 </div>
                               </td>
                             </tr>
                           );
                         })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper function to get status colors
const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('confirmed') || statusLower.includes('booked')) {
    return 'text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium';
  }
  if (statusLower.includes('pending') || statusLower.includes('scheduled')) {
    return 'text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium';
  }
  if (statusLower.includes('cancelled') || statusLower.includes('lost')) {
    return 'text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium';
  }
  return 'text-gray-600 bg-gray-50 px-2 py-1 rounded-full text-xs font-medium';
};