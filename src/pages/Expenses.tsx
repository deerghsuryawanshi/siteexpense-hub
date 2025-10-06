import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  payment_status: string;
  site_id?: string;
  vendor_id?: string;
  category_id?: string;
  sites: { site_name: string; id?: string };
  vendors: { name: string; id?: string };
  categories: { category_name: string; id?: string };
}

const Expenses = () => {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>("cash");

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user.id);
  };

  const fetchData = async () => {
    try {
      const [expensesRes, sitesRes, vendorsRes, categoriesRes, bankAccountsRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("*, sites(site_name), vendors(name), categories(category_name)")
          .order("date", { ascending: false }),
        supabase.from("sites").select("*"),
        supabase.from("vendors").select("*"),
        supabase.from("categories").select("*"),
        supabase.from("bank_accounts").select("*"),
      ]);

      if (expensesRes.data) setExpenses(expensesRes.data);
      if (sitesRes.data) setSites(sitesRes.data);
      if (vendorsRes.data) setVendors(vendorsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (bankAccountsRes.data) setBankAccounts(bankAccountsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newExpense: any = {
      site_id: formData.get("site_id") as string,
      vendor_id: formData.get("vendor_id") as string,
      category_id: formData.get("category_id") as string,
      date: formData.get("date") as string,
      description: formData.get("description") as string,
      amount: parseFloat(formData.get("amount") as string),
      payment_status: formData.get("payment_status") as "paid" | "unpaid" | "partial",
      payment_method: paymentMethod as "cash" | "bank_transfer",
      created_by: currentUser,
    };

    // Add bank_account_id only if payment method is bank_transfer
    if (paymentMethod === "bank_transfer") {
      newExpense.bank_account_id = formData.get("bank_account_id") as string;
    }

    const { error } = await supabase.from("expenses").insert([newExpense]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleEdit = async (expense: Expense) => {
    // Fetch full expense data
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expense.id)
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      return;
    }

    setEditingExpense({ ...expense, ...data });
    setEditPaymentMethod(data.payment_method || "cash");
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpense) return;

    const formData = new FormData(e.currentTarget);

    const updatedExpense: any = {
      site_id: formData.get("site_id") as string,
      vendor_id: formData.get("vendor_id") as string,
      category_id: formData.get("category_id") as string,
      date: formData.get("date") as string,
      description: formData.get("description") as string,
      amount: parseFloat(formData.get("amount") as string),
      payment_status: formData.get("payment_status") as "paid" | "unpaid" | "partial",
      payment_method: editPaymentMethod as "cash" | "bank_transfer",
    };

    if (editPaymentMethod === "bank_transfer") {
      updatedExpense.bank_account_id = formData.get("bank_account_id") as string;
    } else {
      updatedExpense.bank_account_id = null;
    }

    const { error } = await supabase
      .from("expenses")
      .update(updatedExpense)
      .eq("id", editingExpense.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      setEditDialogOpen(false);
      setEditingExpense(null);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      paid: "default",
      unpaid: "destructive",
      partial: "secondary",
    };
    return (
      <Badge variant={variants[status] || "default"} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage all construction site expenses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site_id">Site</Label>
                  <Select name="site_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Select name="vendor_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Select name="category_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input type="date" name="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input type="number" name="amount" step="0.01" min="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select name="payment_status" defaultValue="unpaid">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select 
                    name="payment_method" 
                    defaultValue="cash"
                    onValueChange={(value) => setPaymentMethod(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {paymentMethod === "bank_transfer" && (
                <div className="space-y-2">
                  <Label htmlFor="bank_account_id">Bank Account</Label>
                  <Select name="bank_account_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name} - {account.bank_name} (Balance: ₹{account.balance.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea name="description" placeholder="Enter expense details..." />
              </div>
              <Button type="submit" className="w-full">
                Add Expense
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_site_id">Site</Label>
                  <Select name="site_id" defaultValue={editingExpense.sites?.id || ""} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.site_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_vendor_id">Vendor</Label>
                  <Select name="vendor_id" defaultValue={editingExpense.vendors?.id || ""} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_category_id">Category</Label>
                  <Select name="category_id" defaultValue={editingExpense.categories?.id || ""} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_date">Date</Label>
                  <Input type="date" name="date" defaultValue={editingExpense.date} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_amount">Amount (₹)</Label>
                  <Input type="number" name="amount" step="0.01" min="0" defaultValue={editingExpense.amount} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_payment_status">Payment Status</Label>
                  <Select name="payment_status" defaultValue={editingExpense.payment_status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_payment_method">Payment Method</Label>
                  <Select 
                    name="payment_method" 
                    defaultValue={editPaymentMethod}
                    onValueChange={(value) => setEditPaymentMethod(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editPaymentMethod === "bank_transfer" && (
                <div className="space-y-2">
                  <Label htmlFor="edit_bank_account_id">Bank Account</Label>
                  <Select name="bank_account_id" defaultValue={(editingExpense as any).bank_account_id || ""} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name} - {account.bank_name} (Balance: ₹{account.balance.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea name="description" defaultValue={editingExpense.description || ""} placeholder="Enter expense details..." />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">
                  Update Expense
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto -mx-6 sm:mx-0">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Site</TableHead>
                  <TableHead className="text-xs sm:text-sm">Vendor</TableHead>
                  <TableHead className="text-xs sm:text-sm">Category</TableHead>
                  <TableHead className="text-xs sm:text-sm">Description</TableHead>
                  <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-xs sm:text-sm text-muted-foreground py-8">
                    No expenses found. Add your first expense to get started.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{expense.sites.site_name}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{expense.vendors.name}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{expense.categories.category_name}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs sm:text-sm">{expense.description || "-"}</TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">₹{expense.amount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(expense.payment_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;