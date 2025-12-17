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

      // Fetch fund transfers
      let transfersQuery = supabase
        .from("fund_transfers")
        .select("*, from_account:bank_accounts!fund_transfers_from_account_id_fkey(id, account_name), to_account:bank_accounts!fund_transfers_to_account_id_fkey(id, account_name)");

      if (filters.start_date) {
        transfersQuery = transfersQuery.gte("date", filters.start_date);
      }
      if (filters.end_date) {
        transfersQuery = transfersQuery.lte("date", filters.end_date);
      }
      if (filters.bank_account_id && filters.bank_account_id !== "all") {
        transfersQuery = transfersQuery.or(`from_account_id.eq.${filters.bank_account_id},to_account_id.eq.${filters.bank_account_id}`);
      }

      const [expensesResult, creditsResult, transfersResult] = await Promise.all([
        expensesQuery.order("date", { ascending: false }),
        creditsQuery.order("date", { ascending: false }),
        transfersQuery.order("date", { ascending: false }),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (creditsResult.error) throw creditsResult.error;
      if (transfersResult.error) throw transfersResult.error;

      // Combine expenses, credits and fund transfers with type indicator
      // For transfers, determine direction based on filtered bank account
      const transfersWithDirection = (transfersResult.data || []).map((item: any) => {
        let transfer_direction: 'in' | 'out' | 'neutral' = 'neutral';
        
        if (filters.bank_account_id && filters.bank_account_id !== "all") {
          if (item.to_account_id === filters.bank_account_id) {
            transfer_direction = 'in'; // Money coming into filtered account (credit)
          } else if (item.from_account_id === filters.bank_account_id) {
            transfer_direction = 'out'; // Money going out of filtered account (debit)
          }
        }
        
        return { 
          ...item, 
          type: "transfer",
          transfer_direction,
          bank_accounts: { account_name: `${item.from_account?.account_name} → ${item.to_account?.account_name}` }
        };
      });

      const combinedData = [
        ...(expensesResult.data || []).map((item: any) => ({ ...item, type: "expense" })),
        ...(creditsResult.data || []).map((item: any) => ({ ...item, type: "credit" })),
        ...transfersWithDirection,
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

  const exportToExcel = async () => {
    if (reportData.length === 0) {
      toast({
        variant: "destructive",
        title: "No data",
        description: "Please generate a report first",
      });
      return;
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Financial Report');

    // Define columns with width
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Site/Category', key: 'site', width: 20 },
      { header: 'Vendor', key: 'vendor', width: 18 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Bank Account', key: 'bank', width: 25 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Blue background
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add data rows
    reportData.forEach((row) => {
      let amount = row.amount;
      if (row.type === "expense") {
        amount = -row.amount;
      } else if (row.type === "transfer") {
        amount = row.transfer_direction === "out" ? -row.amount : row.amount;
      }

      const dataRow = worksheet.addRow({
        date: row.date,
        type: row.type === "transfer" 
          ? (row.transfer_direction === "in" ? "Transfer In" : row.transfer_direction === "out" ? "Transfer Out" : "Transfer") 
          : row.type.charAt(0).toUpperCase() + row.type.slice(1),
        site: row.type === "expense" ? row.sites?.site_name || "-" : row.type === "transfer" ? "Fund Transfer" : row.category || "-",
        vendor: row.type === "expense" ? row.vendors?.name || "-" : "-",
        category: row.type === "expense" ? row.categories?.category_name || "-" : "-",
        bank: row.bank_accounts?.account_name || "-",
        description: row.description || "",
        amount: amount,
        status: row.payment_status || "-",
      });

      // Color code based on type
      if (row.type === "expense" || row.transfer_direction === "out") {
        dataRow.getCell('amount').font = { color: { argb: 'FFDC2626' } }; // Red for expenses
      } else if (row.type === "credit" || row.transfer_direction === "in") {
        dataRow.getCell('amount').font = { color: { argb: 'FF16A34A' } }; // Green for credits
      }
    });

    // Add empty rows before summary
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Summary section header
    const summaryHeaderRow = worksheet.addRow(['SUMMARY']);
    summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summaryHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF374151' }, // Gray background
    };
    worksheet.mergeCells(`A${summaryHeaderRow.number}:I${summaryHeaderRow.number}`);
    summaryHeaderRow.alignment = { horizontal: 'center' };

    // Summary data with formatting
    const addSummaryRow = (label: string, value: number, isTotal: boolean = false) => {
      const row = worksheet.addRow([label, '', '', '', '', '', '', value, '']);
      row.font = { bold: isTotal };
      row.getCell(8).numFmt = '₹#,##0.00';
      if (value < 0) {
        row.getCell(8).font = { bold: isTotal, color: { argb: 'FFDC2626' } };
      } else if (value > 0) {
        row.getCell(8).font = { bold: isTotal, color: { argb: 'FF16A34A' } };
      }
      if (isTotal) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' }, // Light gray
        };
      }
    };

    if (filters.bank_account_id !== "all") {
      addSummaryRow('Total Expenses (incl. Transfers Out)', -(totalExpenses + transfersOut));
      addSummaryRow('Total Credits (incl. Transfers In)', totalCredits + transfersIn);
      addSummaryRow('Transfers In', transfersIn);
      addSummaryRow('Transfers Out', -transfersOut);
      addSummaryRow('Net Amount', netAmount, true);
    } else {
      addSummaryRow('Total Expenses', -totalExpenses);
      addSummaryRow('Total Credits', totalCredits);
      addSummaryRow('Total Transfers', totalTransfers);
      addSummaryRow('Net Amount', netAmount, true);
    }

    // Add borders to all data cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Format amount column as Indian currency
    worksheet.getColumn('amount').numFmt = '₹#,##0.00';

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.xlsx`;
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

  // Calculate transfers based on direction when bank account is filtered
  const transfersIn = reportData
    .filter((row) => row.type === "transfer" && row.transfer_direction === "in")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const transfersOut = reportData
    .filter((row) => row.type === "transfer" && row.transfer_direction === "out")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const totalTransfers = reportData
    .filter((row) => row.type === "transfer")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  
  // Net amount includes: Credits + TransfersIn - Expenses - TransfersOut
  const netAmount = (totalCredits + transfersIn) - (totalExpenses + transfersOut);

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
                onClick={exportToExcel}
                disabled={reportData.length === 0}
                className="w-full sm:w-auto"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export Excel
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-right w-full sm:w-auto">
                <div>
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                  <p className="text-lg font-bold text-destructive">₹{(totalExpenses + transfersOut).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Credits</p>
                  <p className="text-lg font-bold text-green-600">₹{(totalCredits + transfersIn).toLocaleString('en-IN')}</p>
                </div>
                {filters.bank_account_id !== "all" && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Transfers In</p>
                      <p className="text-lg font-bold text-green-600">₹{transfersIn.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transfers Out</p>
                      <p className="text-lg font-bold text-destructive">₹{transfersOut.toLocaleString('en-IN')}</p>
                    </div>
                  </>
                )}
                {filters.bank_account_id === "all" && (
                  <div>
                    <p className="text-xs text-muted-foreground">Total Transfers</p>
                    <p className="text-lg font-bold text-blue-600">₹{totalTransfers.toLocaleString('en-IN')}</p>
                  </div>
                )}
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
                      <Badge 
                        variant={
                          row.type === "credit" ? "default" : 
                          row.type === "transfer" ? (row.transfer_direction === "in" ? "default" : row.transfer_direction === "out" ? "destructive" : "secondary") : 
                          "destructive"
                        } 
                        className="capitalize text-xs"
                      >
                        {row.type === "transfer" && row.transfer_direction !== "neutral" 
                          ? `transfer-${row.transfer_direction}` 
                          : row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {row.type === "expense" ? row.sites?.site_name || "-" : row.type === "transfer" ? "Fund Transfer" : row.sites?.site_name || row.category || "-"}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{row.type === "expense" ? row.vendors?.name || "-" : "-"}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{row.type === "expense" ? row.categories?.category_name || "-" : "-"}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{row.bank_accounts?.account_name || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs sm:text-sm">{row.description || "-"}</TableCell>
                    <TableCell className={`text-xs sm:text-sm whitespace-nowrap font-semibold ${
                      row.type === "credit" ? "text-green-600" : 
                      row.type === "transfer" ? (row.transfer_direction === "in" ? "text-green-600" : row.transfer_direction === "out" ? "text-destructive" : "text-blue-600") : 
                      "text-destructive"
                    }`}>
                      {row.type === "credit" ? "+" : 
                       row.type === "transfer" ? (row.transfer_direction === "in" ? "+" : row.transfer_direction === "out" ? "-" : "↔") : 
                       "-"}₹{Number(row.amount).toLocaleString('en-IN')}
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