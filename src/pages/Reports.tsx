import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Search } from "lucide-react";

const Reports = () => {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const fetchFilterOptions = async () => {
    const [sitesRes, vendorsRes, categoriesRes] = await Promise.all([
      supabase.from("sites").select("*"),
      supabase.from("vendors").select("*"),
      supabase.from("categories").select("*"),
    ]);

    if (sitesRes.data) setSites(sitesRes.data);
    if (vendorsRes.data) setVendors(vendorsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
  };

  useState(() => {
    fetchFilterOptions();
  });

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const filters: any = {
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
      site_id: formData.get("site_id"),
      vendor_id: formData.get("vendor_id"),
      category_id: formData.get("category_id"),
      payment_status: formData.get("payment_status"),
    };

    try {
      let query = supabase
        .from("expenses")
        .select("*, sites(site_name), vendors(name), categories(category_name)");

      if (filters.start_date) {
        query = query.gte("date", filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte("date", filters.end_date);
      }
      if (filters.site_id) {
        query = query.eq("site_id", filters.site_id);
      }
      if (filters.vendor_id) {
        query = query.eq("vendor_id", filters.vendor_id);
      }
      if (filters.category_id) {
        query = query.eq("category_id", filters.category_id);
      }
      if (filters.payment_status) {
        query = query.eq("payment_status", filters.payment_status);
      }

      const { data, error } = await query.order("date", { ascending: false });

      if (error) throw error;
      setReportData(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast({
        variant: "destructive",
        title: "No data",
        description: "Please generate a report first",
      });
      return;
    }

    const headers = ["Date", "Site", "Vendor", "Category", "Description", "Amount", "Status"];
    const csvContent = [
      headers.join(","),
      ...reportData.map((row) =>
        [
          row.date,
          row.sites.site_name,
          row.vendors.name,
          row.categories.category_name,
          `"${row.description || ""}"`,
          row.amount,
          row.payment_status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  const totalAmount = reportData.reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Generate and export expense reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input type="date" name="start_date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input type="date" name="end_date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select name="payment_status">
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_id">Site</Label>
                <Select name="site_id">
                  <SelectTrigger>
                    <SelectValue placeholder="All sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.site_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor_id">Vendor</Label>
                <Select name="vendor_id">
                  <SelectTrigger>
                    <SelectValue placeholder="All vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select name="category_id">
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={exportToCSV}
                disabled={reportData.length === 0}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report Results</CardTitle>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell>{row.sites.site_name}</TableCell>
                    <TableCell>{row.vendors.name}</TableCell>
                    <TableCell>{row.categories.category_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{row.description || "-"}</TableCell>
                    <TableCell>₹{row.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.payment_status === "paid"
                            ? "default"
                            : row.payment_status === "unpaid"
                            ? "destructive"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {row.payment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;