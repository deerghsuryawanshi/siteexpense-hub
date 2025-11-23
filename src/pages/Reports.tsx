import { useState, useEffect } from "react";
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const Reports = () => {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    site_id: "all",
    vendor_id: "all",
    category_id: "all",
    payment_status: "all",
    bank_account_id: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchFilterOptions = async () => {
    const [sitesRes, vendorsRes, categoriesRes, bankAccountsRes] = await Promise.all([
      supabase.from("sites").select("*"),
      supabase.from("vendors").select("*"),
      supabase.from("categories").select("*"),
      supabase.from("bank_accounts").select("*").order("account_name"),
    ]);

    if (sitesRes.data) setSites(sitesRes.data);
    if (vendorsRes.data) setVendors(vendorsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (bankAccountsRes.data) setBankAccounts(bankAccountsRes.data);
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setCurrentPage(1); // Reset to first page on new search

    try {
      // Fetch expenses
      let expensesQuery = supabase
        .from("expenses")
        .select("*, sites(site_name), vendors(name), categories(category_name), bank_accounts(account_name)");

      if (filters.start_date) {
        expensesQuery = expensesQuery.gte("date", filters.start_date);
      }
      if (filters.end_date) {
        expensesQuery = expensesQuery.lte("date", filters.end_date);
      }
      if (filters.site_id && filters.site_id !== "all") {
        expensesQuery = expensesQuery.eq("site_id", filters.site_id);
      }
      if (filters.vendor_id && filters.vendor_id !== "all") {
        expensesQuery = expensesQuery.eq("vendor_id", filters.vendor_id);
      }
      if (filters.category_id && filters.category_id !== "all") {
        expensesQuery = expensesQuery.eq("category_id", filters.category_id);
      }
      if (filters.payment_status && filters.payment_status !== "all") {
        expensesQuery = expensesQuery.eq("payment_status", filters.payment_status as "paid" | "partial" | "unpaid");
      }
      if (filters.bank_account_id && filters.bank_account_id !== "all") {
        expensesQuery = expensesQuery.eq("bank_account_id", filters.bank_account_id);
      }

      // Fetch credits (filtered by date and site if applicable)
      let creditsQuery = supabase
        .from("credits")
        .select("*, sites(site_name), bank_accounts(account_name)");

      if (filters.start_date) {
        creditsQuery = creditsQuery.gte("date", filters.start_date);
      }
      if (filters.end_date) {
        creditsQuery = creditsQuery.lte("date", filters.end_date);
      }
      if (filters.site_id && filters.site_id !== "all") {
        creditsQuery = creditsQuery.eq("site_id", filters.site_id);
      }
      if (filters.bank_account_id && filters.bank_account_id !== "all") {
        creditsQuery = creditsQuery.eq("bank_account_id", filters.bank_account_id);
      }

      const [expensesResult, creditsResult] = await Promise.all([
        expensesQuery.order("date", { ascending: false }),
        creditsQuery.order("date", { ascending: false }),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (creditsResult.error) throw creditsResult.error;

      // Combine expenses and credits with type indicator
      const combinedData = [
        ...(expensesResult.data || []).map((item: any) => ({ ...item, type: "expense" })),
        ...(creditsResult.data || []).map((item: any) => ({ ...item, type: "credit" })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setReportData(combinedData);
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

    const headers = ["Date", "Type", "Site/Category", "Vendor", "Category", "Bank Account", "Description", "Amount", "Status"];
    const csvContent = [
      headers.join(","),
      ...reportData.map((row) =>
        [
          row.date,
          row.type,
          row.type === "expense" ? row.sites?.site_name || "-" : row.category || "-",
          row.type === "expense" ? row.vendors?.name || "-" : "-",
          row.type === "expense" ? row.categories?.category_name || "-" : "-",
          row.bank_accounts?.account_name || "-",
          `"${row.description || ""}"`,
          row.type === "credit" ? row.amount : -row.amount,
          row.payment_status || "-",
        ].join(",")
      ),
      "",
      "",
      `"Total Expenses",,,,,,${-totalExpenses},`,
      `"Total Credits",,,,,,${totalCredits},`,
      `"Net Amount",,,,,,${netAmount},`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  const totalExpenses = reportData
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  
  const totalCredits = reportData
    .filter((row) => row.type === "credit")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  
  const netAmount = totalCredits - totalExpenses;

  // Pagination calculations
  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = reportData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Generate and export expense reports</p>
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
                <Input 
                  type="date" 
                  name="start_date" 
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input 
                  type="date" 
                  name="end_date" 
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select value={filters.payment_status} onValueChange={(value) => setFilters({ ...filters, payment_status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_id">Site</Label>
                <Select value={filters.site_id} onValueChange={(value) => setFilters({ ...filters, site_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
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
                <Select value={filters.vendor_id} onValueChange={(value) => setFilters({ ...filters, vendor_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
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
                <Select value={filters.category_id} onValueChange={(value) => setFilters({ ...filters, category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_id">Bank Account</Label>
                <Select value={filters.bank_account_id} onValueChange={(value) => setFilters({ ...filters, bank_account_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                <Search className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={exportToCSV}
                disabled={reportData.length === 0}
                className="w-full sm:w-auto"
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <CardTitle>Report Results</CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="itemsPerPage" className="text-sm whitespace-nowrap">Rows per page:</Label>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right w-full sm:w-auto">
                <div>
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                  <p className="text-lg font-bold text-destructive">₹{totalExpenses.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Credits</p>
                  <p className="text-lg font-bold text-green-600">₹{totalCredits.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Amount</p>
                  <p className={`text-lg font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    ₹{netAmount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto -mx-6 sm:mx-0">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="text-xs sm:text-sm">Type</TableHead>
                    <TableHead className="text-xs sm:text-sm">Site/Category</TableHead>
                    <TableHead className="text-xs sm:text-sm">Vendor</TableHead>
                    <TableHead className="text-xs sm:text-sm">Category</TableHead>
                    <TableHead className="text-xs sm:text-sm">Bank Account</TableHead>
                    <TableHead className="text-xs sm:text-sm">Description</TableHead>
                    <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {paginatedData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={row.type === "credit" ? "default" : "destructive"} className="capitalize text-xs">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {row.type === "expense" ? row.sites?.site_name || "-" : row.sites?.site_name || row.category || "-"}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{row.type === "expense" ? row.vendors?.name || "-" : "-"}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{row.type === "expense" ? row.categories?.category_name || "-" : "-"}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{row.bank_accounts?.account_name || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs sm:text-sm">{row.description || "-"}</TableCell>
                    <TableCell className={`text-xs sm:text-sm whitespace-nowrap font-semibold ${row.type === "credit" ? "text-green-600" : "text-destructive"}`}>
                      {row.type === "credit" ? "+" : "-"}₹{Number(row.amount).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {row.payment_status && (
                        <Badge
                          variant={
                            row.payment_status === "paid"
                              ? "default"
                              : row.payment_status === "unpaid"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize text-xs"
                        >
                          {row.payment_status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, reportData.length)} of {reportData.length} entries
              </div>
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      // Show first page, last page, current page, and pages around current
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNumber)}
                              isActive={currentPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <span className="px-4">...</span>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;