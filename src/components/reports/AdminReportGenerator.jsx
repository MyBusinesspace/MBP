import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Customer, Project, Asset, CustomerCategory, ProjectCategory, AssetCategory, Branch, Contact, ContactCategory, TimeEntry, Team, PayrollRun, PettyCashEntry, PettyCashCategory, WorkOrderCategory, TimeReport } from "@/entities/all";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

export default function AdminReportGenerator() {
  const [department, setDepartment] = useState("admin"); // admin | operations | hr | finance
  const [type, setType] = useState("clients"); // per department
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const [dateMode, setDateMode] = useState("all"); // all | date | range
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [workOrdersList, setWorkOrdersList] = useState([]);
  const [workingReportsList, setWorkingReportsList] = useState([]);
  const [financeTargetId, setFinanceTargetId] = useState("");
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const departmentTypes = useMemo(() => ({
    admin: [
      { value: "clients", label: "Clients" },
      { value: "projects", label: "Projects" },
      { value: "assets", label: "Assets" },
    ],
    operations: [
      { value: "working_orders", label: "Working orders" },
      { value: "contacts", label: "Contacts" },
    ],
    hr: [
      { value: "users", label: "Users" },
      { value: "payroll", label: "Payroll runs" },
      { value: "petty_cash", label: "Petty cash" },
    ],
    finance: [
      { value: "cost_per_client", label: "Cost per client" },
      { value: "cost_per_project", label: "Cost per project" },
      { value: "cost_per_user", label: "Cost per user" },
      { value: "cost_per_asset", label: "Cost per asset/equipment" },
      { value: "cost_per_work_order", label: "Cost per working order" },
      { value: "cost_per_working_report", label: "Cost per working report" },
    ],
  }), []);

  useEffect(() => {
    const allowed = departmentTypes[department] || [];
    if (!allowed.find(t => t.value === type)) {
      setType(allowed[0]?.value || "");
    }
  }, [department, departmentTypes]);

  // Status options per type
  const statusOptions = useMemo(() => {
    if (type === "projects") return ["all", "active", "on_hold", "closed", "archived"];
    if (type === "assets") return ["all", "Available", "In Use", "Maintenance", "Decommissioned", "On Rent"];
    if (type === "working_orders") return ["all", "open", "closed"];
    if (type === "users") return ["all", "admin", "user"];
    if (type === "payroll") return ["all", "Draft", "Processing", "Needs Attention", "Paid"];
    return ["all", "active", "archived"]; // clients, contacts, petty_cash
  }, [type]);

  const customersMap = useMemo(() => {
    const m = new Map();
    (customers || []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [customers]);

  const projectCategoryMap = useMemo(() => {
    const m = new Map();
    (categories || []).forEach((c) => c?.id && m.set(c.id, c.name));
    return m;
  }, [categories]);

  const projectsMap = useMemo(() => {
    const m = new Map();
    (projects || []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  const teamsMap = useMemo(() => {
    const m = new Map();
    (teams || []).forEach((t) => m.set(t.id, t.name));
    return m;
  }, [teams]);

  const usersMap = useMemo(() => {
    const m = new Map();
    (usersList || []).forEach((u) => m.set(u.id, u.full_name || u.email));
    return m;
  }, [usersList]);

  const genericCategoryMap = useMemo(() => {
    const m = new Map();
    (categories || []).forEach((c) => c?.id && m.set(c.id, c.name));
    return m;
  }, [categories]);

  const financeOptions = useMemo(() => {
    if (!department || department !== 'finance') return [];
    switch (type) {
      case 'cost_per_client':
        return (customers || []).map((c) => ({ value: c.id, label: c.name }));
      case 'cost_per_project':
        return (projects || []).map((p) => ({ value: p.id, label: p.name }));
      case 'cost_per_user':
        return (usersList || []).map((u) => ({ value: u.id, label: u.full_name || u.email }));
      case 'cost_per_asset':
        return (assetsList || []).map((a) => ({ value: a.id, label: a.name }));
      case 'cost_per_work_order':
        return (workOrdersList || []).map((wo) => ({ value: wo.id, label: wo.work_order_number || projectsMap.get(wo.project_id) || wo.id }));
      case 'cost_per_working_report':
        return (workingReportsList || []).map((wr) => ({ value: wr.id, label: wr.title || wr.id }));
      default:
        return [];
    }
  }, [department, type, customers, projects, usersList, assetsList, workOrdersList, workingReportsList, projectsMap]);

  useEffect(() => {
    loadData();
    setFinanceTargetId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, department]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (type === "clients") {
        const [list, cats] = await Promise.all([
          Customer.list("-updated_date", 1000).catch(() => []),
          CustomerCategory.list("sort_order", 1000).catch(() => []),
        ]);
        setRows(Array.isArray(list) ? list : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setBranches([]);
      } else if (type === "projects") {
        const [list, cats, custs] = await Promise.all([
          Project.list("-updated_date", 2000).catch(() => []),
          ProjectCategory.list("sort_order", 1000).catch(() => []),
          Customer.list("name", 2000).catch(() => []),
        ]);
        setRows(Array.isArray(list) ? list : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setCustomers(Array.isArray(custs) ? custs : []);
        setBranches([]);
      } else if (type === "assets") {
        const [list, cats, brs] = await Promise.all([
          Asset.list("-updated_date", 2000).catch(() => []),
          AssetCategory.list("sort_order", 1000).catch(() => []),
          Branch.list("name", 200).catch(() => []),
        ]);
        setRows(Array.isArray(list) ? list : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setBranches(Array.isArray(brs) ? brs : []);
      } else if (type === "working_orders") {
        const [list, wCats, projs, tms] = await Promise.all([
          TimeEntry.list("-updated_date", 2000).catch(() => []),
          WorkOrderCategory.list("name", 500).catch(() => []),
          Project.list("name", 2000).catch(() => []),
          Team.list("sort_order", 500).catch(() => []),
        ]);
        setRows(Array.isArray(list) ? list : []);
        setCategories(Array.isArray(wCats) ? wCats : []);
        setProjects(Array.isArray(projs) ? projs : []);
        setTeams(Array.isArray(tms) ? tms : []);
      } else if (type === "contacts") {
        const [list, cats, custs] = await Promise.all([
          Contact.list("-updated_date", 2000).catch(() => []),
          ContactCategory.list("name", 500).catch(() => []),
          Customer.list("name", 2000).catch(() => []),
        ]);
        setRows(Array.isArray(list) ? list : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setCustomers(Array.isArray(custs) ? custs : []);
      } else if (type === "users") {
        const ul = await base44.entities.User.list("-created_date", 1000).catch(() => []);
        setRows(Array.isArray(ul) ? ul : []);
        setCategories([]);
      } else if (type === "payroll") {
        const prs = await PayrollRun.list("-created_date", 500).catch(() => []);
        setRows(Array.isArray(prs) ? prs : []);
        setCategories([]);
      } else if (type === "petty_cash") {
        const [entries, cats, ul] = await Promise.all([
          PettyCashEntry.list("-created_date", 1000).catch(() => []),
          PettyCashCategory.list("name", 500).catch(() => []),
          base44.entities.User.list("-created_date", 1000).catch(() => []),
        ]);
        setRows(Array.isArray(entries) ? entries : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setUsersList(Array.isArray(ul) ? ul : []);
      } else if (type === "cost_per_client") {
        const custs = await Customer.list("name", 2000).catch(() => []);
        setCustomers(Array.isArray(custs) ? custs : []);
      } else if (type === "cost_per_project") {
        const projs = await Project.list("name", 2000).catch(() => []);
        setProjects(Array.isArray(projs) ? projs : []);
      } else if (type === "cost_per_user") {
        const ul = await base44.entities.User.list("-created_date", 1000).catch(() => []);
        setUsersList(Array.isArray(ul) ? ul : []);
      } else if (type === "cost_per_asset") {
        const assets = await Asset.list("name", 2000).catch(() => []);
        setAssetsList(Array.isArray(assets) ? assets : []);
      } else if (type === "cost_per_work_order") {
        const wos = await TimeEntry.list("-updated_date", 2000).catch(() => []);
        setWorkOrdersList(Array.isArray(wos) ? wos : []);
      } else if (type === "cost_per_working_report") {
        const wrs = await TimeReport.list("-updated_date", 2000).catch(() => []);
        setWorkingReportsList(Array.isArray(wrs) ? wrs : []);
      } else {
        setRows([]);
        setCategories([]);
      }
    } catch (e) {
      console.error("Failed to load admin report data", e);
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const inDate = (item) => {
      if (dateMode === "all") return true;
      const ts = item.updated_date || item.created_date; // built-in fields
      if (!ts) return true;
      const d = new Date(ts);
      if (dateMode === "date") {
        if (!date1) return true;
        const dayStart = new Date(date1 + "T00:00:00");
        const dayEnd = new Date(date1 + "T23:59:59");
        return d >= dayStart && d <= dayEnd;
      }
      if (dateMode === "range") {
        if (!date1 || !date2) return true;
        const start = new Date(date1 + "T00:00:00");
        const end = new Date(date2 + "T23:59:59");
        return d >= start && d <= end;
      }
      return true;
    };

    const byStatus = (item) => {
      if (status === "all") return true;
      if (type === "clients") return status === "active" ? !item.archived : !!item.archived;
      if (type === "projects") return (item.status || "").toLowerCase() === status.toLowerCase();
      if (type === "assets") return (item.status || "") === status;
      if (type === "working_orders") return (item.status || "") === status;
      if (type === "users") return (item.role || "") === status;
      if (type === "payroll") return (item.status || "") === status;
      return true;
    };

    const byCategory = (item) => {
      if (category === "all") return true;
      if (type === "clients") return (item.category_ids || []).includes(category);
      if (type === "projects") return (item.category_ids || []).includes(category);
      if (type === "assets") return (item.category || "") === category || item.category_id === category;
      if (type === "working_orders") return item.work_order_category_id === category;
      if (type === "contacts") return (item.category_ids || []).includes(category) || item.category_id === category;
      if (type === "petty_cash") return item.category_id === category;
      return true;
    };

    return (rows || []).filter((r) => inDate(r) && byStatus(r) && byCategory(r));
  }, [rows, dateMode, date1, date2, status, category, type]);

  const generatePDF = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 40;
      let y = 40;
      const title = `Admin Report – ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      doc.setFontSize(16);
      doc.text(title, marginX, y);
      y += 20;

      doc.setFontSize(10);
      const info = `Status: ${status}  |  Category: ${category === "all" ? "All" : category}  |  Date: ${dateMode === "all" ? "All" : dateMode === "date" ? date1 : `${date1 || ""} → ${date2 || ""}`}`;
      doc.text(info, marginX, y);
      y += 20;

      // Headers per type
      const headers = type === "clients"
        ? ["Name", "Categories", "Archived"]
        : type === "projects"
        ? ["Name", "Client", "Status", "Categories", "Contact person", "Site location", "Notes"]
        : type === "assets"
        ? ["Name", "Category", "Status", "Branch"]
        : type === "working_orders"
        ? ["WO #", "Project", "Team(s)", "Status", "Planned start"]
        : type === "contacts"
        ? ["Name", "Client", "Category", "Phone", "Email"]
        : type === "users"
        ? ["Name", "Email", "Role"]
        : type === "payroll"
        ? ["Title", "Period", "Pay date", "Status", "Employees", "Total cost"]
        : ["Date", "Category", "Amount", "Employee", "Notes"];

      doc.setFont(undefined, "bold");
      doc.text(headers.join("  |  "), marginX, y);
      doc.setFont(undefined, "normal");
      y += 14;

      const lines = (filtered || []).map((it) => {
        if (type === "clients") {
          const catCount = (it.category_ids || []).length;
          return [it.name || "-", String(catCount), it.archived ? "Yes" : "No"].join("  |  ");
        }
        if (type === "projects") {
          const clientName = customersMap.get(it.customer_id) || "-";
          const catNames = (it.category_ids || []).map((cid) => projectCategoryMap.get(cid)).filter(Boolean).join(", ");
          const contact = it.contact_person || (it.contact_persons && it.contact_persons[0]) || "-";
          const site = it.location_name || it.address || "-";
          const notes = it.notes || "-";
          return [it.name || "-", clientName, it.status || "-", catNames || "-", contact, site, notes].join("  |  ");
        }
        if (type === "assets") {
          const branch = branches.find((b) => b.id === it.branch_id)?.name || "-";
          return [it.name || "-", it.category || "-", it.status || "-", branch].join("  |  ");
        }
        if (type === "working_orders") {
          const proj = projectsMap.get(it.project_id) || "-";
          const tnames = (it.team_ids || []).map((tid) => teamsMap.get(tid)).filter(Boolean).join(", ");
          const planned = (it.planned_start_time && new Date(it.planned_start_time).toLocaleString()) || "-";
          return [it.work_order_number || it.id, proj, tnames || "-", it.status || "-", planned].join("  |  ");
        }
        if (type === "contacts") {
          const client = customersMap.get(it.customer_id) || "-";
          const cat = genericCategoryMap.get((it.category_ids || [])[0]) || genericCategoryMap.get(it.category_id) || "-";
          return [it.name || it.full_name || "-", client, cat, it.phone || it.mobile || "-", it.email || "-"].join("  |  ");
        }
        if (type === "users") {
          return [it.full_name || "-", it.email || "-", it.role || "-"].join("  |  ");
        }
        if (type === "payroll") {
          const period = `${it.period_start_date || "-"} → ${it.period_end_date || "-"}`;
          const total = typeof it.total_payroll_cost === 'number' ? it.total_payroll_cost.toFixed(2) : '-';
          return [it.title || it.payrun_number || "-", period, it.pay_date || "-", it.status || "-", String(it.employee_count ?? '-') , total].join("  |  ");
        }
        // petty_cash
        const emp = usersMap.get(it.employee_id) || '-';
        const cat = genericCategoryMap.get(it.category_id) || '-';
        const amount = typeof it.amount === 'number' ? it.amount.toFixed(2) : '-';
        const date = (it.date || it.created_date || '').toString().slice(0,10);
        return [date, cat, amount, emp, it.notes || it.description || '-'].join("  |  ");
      });

      lines.forEach((line) => {
        if (y > 760) {
          doc.addPage();
          y = 40;
        }
        doc.text(line, marginX, y);
        y += 14;
      });

      doc.save(`admin-report-${type}-${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success("PDF generado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4"/> Generate report – Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-slate-600">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Data type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(departmentTypes[department] || []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {type === "clients" && categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  {type === "projects" && categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  {type === "assets" && (
                    Array.from(new Set(categories.map((c) => c.name))).map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))
                  )}
                  {type === "working_orders" && categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  {type === "contacts" && categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  {type === "petty_cash" && categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


          </div>



          <div className="flex justify-end gap-2">
            <Button onClick={loadData} variant="outline" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
              Refresh
            </Button>
            <Button onClick={generatePDF} className="bg-indigo-600 hover:bg-indigo-700">
              <FileText className="w-4 h-4 mr-2"/> Generate PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Results ({filtered.length})</CardTitle>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="text-xs font-medium text-slate-600">Period</div>
              <Select value={dateMode} onValueChange={setDateMode}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">See all</SelectItem>
                  <SelectItem value="date">Select date</SelectItem>
                  <SelectItem value="range">Select range</SelectItem>
                </SelectContent>
              </Select>
              {dateMode === "date" && (
                <Input type="date" value={date1} onChange={(e) => setDate1(e.target.value)} className="h-9" />
              )}
              {dateMode === "range" && (
                <>
                  <Input type="date" value={date1} onChange={(e) => setDate1(e.target.value)} className="h-9" />
                  <Input type="date" value={date2} onChange={(e) => setDate2(e.target.value)} className="h-9" />
                </>
              )}
              {department === "finance" && type.startsWith("cost_per_") && (
                <>
                  <div className="text-xs font-medium text-slate-600">Target</div>
                  <Select value={financeTargetId} onValueChange={setFinanceTargetId}>
                    <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="Select target" /></SelectTrigger>
                    <SelectContent>
                      {(financeOptions || []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative min-h-[360px] overflow-x-auto">

            {!loading && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  {type === "clients" && (
                    <tr className="bg-slate-50 text-left">
                      <th className="border-b p-2">Name</th>
                      <th className="border-b p-2">Categories</th>
                      <th className="border-b p-2">Archived</th>
                    </tr>
                  )}
                  {type === "projects" && (
                    <tr className="bg-slate-50 text-left">
                      <th className="border-b p-2">Name</th>
                      <th className="border-b p-2">Client</th>
                      <th className="border-b p-2">Status</th>
                      <th className="border-b p-2">Categories</th>
                      <th className="border-b p-2">Contact person</th>
                      <th className="border-b p-2">Site location</th>
                      <th className="border-b p-2">Notes</th>
                    </tr>
                  )}
                  {type === "assets" && (
                    <tr className="bg-slate-50 text-left">
                      <th className="border-b p-2">Name</th>
                      <th className="border-b p-2">Category</th>
                      <th className="border-b p-2">Status</th>
                      <th className="border-b p-2">Branch</th>
                    </tr>
                  )}
                  {type === "working_orders" && (
                    <tr className="bg-slate-50 text-left">
                      <th className="border-b p-2">WO #</th>
                      <th className="border-b p-2">Project</th>
                      <th className="border-b p-2">Team(s)</th>
                      <th className="border-b p-2">Status</th>
                      <th className="border-b p-2">Planned start</th>
                    </tr>
                  )}
                  {type === "contacts" && (
                    <tr className="bg-slate-50 text-left">
                      <th className="border-b p-2">Name</th>
                      <th className="border-b p-2">Client</th>
                      <th className="border-b p-2">Category</th>
                      <th className="border-b p-2">Phone</th>
                      <th className="border-b p-2">Email</th>
                    </tr>
                  )}
                  {type === "users" && (
                    <tr className="bg-slate-50 text-left">
                      <th className="border-b p-2">Name</th>
                      <th className="border-b p-2">Email</th>
                      <th className="border-b p-2">Role</th>
                    </tr>
                  )}
                  {type === "payroll" && (
                    <tr className="bg-slate-50 text-left">
                      <th className="border-b p-2">Title</th>
                      <th className="border-b p-2">Period</th>
                      <th className="border-b p-2">Pay date</th>
                      <th className="border-b p-2">Status</th>
                      <th className="border-b p-2">Employees</th>
                      <th className="border-b p-2">Total cost</th>
                    </tr>
                  )}
                  {type === "petty_cash" && (
                    <tr className="bg-slate-50 text-left">
                      <th className="border-b p-2">Date</th>
                      <th className="border-b p-2">Category</th>
                      <th className="border-b p-2">Amount</th>
                      <th className="border-b p-2">Employee</th>
                      <th className="border-b p-2">Notes</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={
                      type === "projects" ? 7 :
                      type === "clients" ? 3 :
                      type === "assets" ? 4 :
                      type === "working_orders" ? 5 :
                      type === "contacts" ? 5 :
                      type === "users" ? 3 :
                      type === "payroll" ? 6 :
                      type === "petty_cash" ? 5 : 4
                    } className="text-center text-slate-500 p-8">No results</td></tr>
                  ) : (
                    filtered.map((it) => (
                      type === "clients" ? (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="border-b p-2">{it.name || "-"}</td>
                          <td className="border-b p-2">{(it.category_ids || []).length}</td>
                          <td className="border-b p-2">{it.archived ? "Yes" : "No"}</td>
                        </tr>
                      ) : type === "projects" ? (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="border-b p-2">{it.name || "-"}</td>
                          <td className="border-b p-2">{customersMap.get(it.customer_id) || "-"}</td>
                          <td className="border-b p-2">{it.status || "-"}</td>
                          <td className="border-b p-2">{(it.category_ids || []).map((cid) => projectCategoryMap.get(cid)).filter(Boolean).join(", ") || "-"}</td>
                          <td className="border-b p-2">{it.contact_person || (it.contact_persons && it.contact_persons[0]) || "-"}</td>
                          <td className="border-b p-2">{it.location_name || it.address || "-"}</td>
                          <td className="border-b p-2">{it.notes || "-"}</td>
                        </tr>
                      ) : type === "assets" ? (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="border-b p-2">{it.name || "-"}</td>
                          <td className="border-b p-2">{it.category || "-"}</td>
                          <td className="border-b p-2">{it.status || "-"}</td>
                          <td className="border-b p-2">{branches.find((b) => b.id === it.branch_id)?.name || "-"}</td>
                        </tr>
                      ) : type === "working_orders" ? (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="border-b p-2">{it.work_order_number || it.id}</td>
                          <td className="border-b p-2">{projectsMap.get(it.project_id) || "-"}</td>
                          <td className="border-b p-2">{(it.team_ids || []).map((tid) => teamsMap.get(tid)).filter(Boolean).join(", ") || "-"}</td>
                          <td className="border-b p-2">{it.status || "-"}</td>
                          <td className="border-b p-2">{(it.planned_start_time && new Date(it.planned_start_time).toLocaleString()) || "-"}</td>
                        </tr>
                      ) : type === "contacts" ? (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="border-b p-2">{it.name || it.full_name || "-"}</td>
                          <td className="border-b p-2">{customersMap.get(it.customer_id) || "-"}</td>
                          <td className="border-b p-2">{genericCategoryMap.get((it.category_ids || [])[0]) || genericCategoryMap.get(it.category_id) || "-"}</td>
                          <td className="border-b p-2">{it.phone || it.mobile || "-"}</td>
                          <td className="border-b p-2">{it.email || "-"}</td>
                        </tr>
                      ) : type === "users" ? (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="border-b p-2">{it.full_name || "-"}</td>
                          <td className="border-b p-2">{it.email || "-"}</td>
                          <td className="border-b p-2">{it.role || "-"}</td>
                        </tr>
                      ) : type === "payroll" ? (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="border-b p-2">{it.title || it.payrun_number || "-"}</td>
                          <td className="border-b p-2">{`${it.period_start_date || "-"} → ${it.period_end_date || "-"}`}</td>
                          <td className="border-b p-2">{it.pay_date || "-"}</td>
                          <td className="border-b p-2">{it.status || "-"}</td>
                          <td className="border-b p-2">{it.employee_count ?? "-"}</td>
                          <td className="border-b p-2">{typeof it.total_payroll_cost === 'number' ? it.total_payroll_cost.toFixed(2) : '-'}</td>
                        </tr>
                      ) : type === "petty_cash" ? (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="border-b p-2">{(it.date || it.created_date || '').toString().slice(0,10)}</td>
                          <td className="border-b p-2">{genericCategoryMap.get(it.category_id) || '-'}</td>
                          <td className="border-b p-2">{typeof it.amount === 'number' ? it.amount.toFixed(2) : '-'}</td>
                          <td className="border-b p-2">{usersMap.get(it.employee_id) || '-'}</td>
                          <td className="border-b p-2">{it.notes || it.description || '-'}</td>
                        </tr>
                      ) : null
                    ))
                  )}
                </tbody>
              </table>
            )}
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500"/></div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}