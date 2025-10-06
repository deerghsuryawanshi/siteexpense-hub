import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Credit {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  payment_method: string;
  category: string;
  bank_account_id: string | null;
  bank_accounts: {
    account_name: string;
  } | null;
}

interface BankAccount {
  id: string;
  account_name: string;
}

interface Site {
  id: string;
  site_name: string;
}

const Credits = () => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch credits
      const { data: creditsData, error: creditsError } = await supabase
        .from("credits")
        .select(`
          *,
          bank_accounts (
            account_name
          )
        `)
        .order("date", { ascending: false });

      if (creditsError) throw creditsError;
      setCredits(creditsData || []);

      // Fetch bank accounts
      const { data: bankAccountsData, error: bankAccountsError } = await supabase
        .from("bank_accounts")
        .select("id, account_name")
        .order("account_name");

      if (bankAccountsError) throw bankAccountsError;
      setBankAccounts(bankAccountsData || []);

      // Fetch sites
      const { data: sitesData, error: sitesError } = await supabase
        .from("sites")
        .select("id, site_name")
        .order("site_name");

      if (sitesError) throw sitesError;
      setSites(sitesData || []);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const paymentMethodValue = formData.get("payment_method") as "cash" | "bank_transfer";
    const bankAccountIdValue = formData.get("bank_account_id") as string;
    const descriptionValue = formData.get("description") as string;
    
    const newCredit = {
      created_by: currentUserId,
      date: formData.get("date") as string,
      amount: parseFloat(formData.get("amount") as string),
      payment_method: paymentMethodValue,
      bank_account_id: bankAccountIdValue || null,
      description: descriptionValue || null,
      category: formData.get("category") as string,
    };

    try {
      const { error } = await supabase.from("credits").insert([newCredit]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credit added successfully",
      });

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("credits").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credit deleted successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Credits</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage income and credit entries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Credit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New Credit</DialogTitle>
                <DialogDescription>
                  Enter credit/income details below
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Site</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.site_name}>
                          {site.site_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    name="payment_method"
                    onValueChange={setPaymentMethod}
                    defaultValue="cash"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod === "bank_transfer" && (
                  <div className="grid gap-2">
                    <Label htmlFor="bank_account_id">Bank Account</Label>
                    <Select name="bank_account_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Additional details"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Credit</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Credits</CardTitle>
          <CardDescription>List of all credit entries</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto -mx-6 sm:mx-0">
          {credits.length === 0 ? (
            <p className="text-center text-xs sm:text-sm text-muted-foreground py-8 px-6">
              No credits found. Add your first credit entry.
            </p>
          ) : (
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="text-xs sm:text-sm">Category</TableHead>
                    <TableHead className="text-xs sm:text-sm">Description</TableHead>
                    <TableHead className="text-xs sm:text-sm">Payment Method</TableHead>
                    <TableHead className="text-xs sm:text-sm">Bank Account</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {credits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">{new Date(credit.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{credit.category}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{credit.description || "-"}</TableCell>
                    <TableCell className="capitalize text-xs sm:text-sm">
                      {credit.payment_method.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {credit.bank_accounts?.account_name || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600 text-xs sm:text-sm whitespace-nowrap">
                      ₹{credit.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(credit.id)}
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Credits;
