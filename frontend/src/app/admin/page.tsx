"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, DollarSign, Users, Cpu } from "lucide-react"

export default function AdminConsole() {
    const [pulse, setPulse] = useState<any>(null)
    const [ops, setOps] = useState<any>(null)
    const [refresh, setRefresh] = useState(0)

    useEffect(() => {
        // Ensure URLs match backend router
        axios.get("http://localhost:8000/api/admin/pulse").then(res => setPulse(res.data)).catch(console.error)
        axios.get("http://localhost:8000/api/admin/overview").then(res => setOps(res.data)).catch(console.error)
    }, [refresh])

    const markPaid = async (id: string) => {
        try {
            await axios.post(`http://localhost:8000/api/admin/projects/${id}/pay`)
            setRefresh(r => r + 1)
        } catch (e) { alert("Error marking paid") }
    }

    // Helper for Queue/Bench Lists
    // NOTE: For 'assign', we need a way to dispatch. The unified UI snippet was simple list.
    // We can add a simple "Auto-Assign" or just list for now as per MVP snippet.
    // User snippet showed: "Simple list for MVP... Queue... Bench"
    // It removed the Dispatch dropdown logic from previous version.
    // I will implement exactly as requested in "Step 4: The Admin Dashboard" snippet.
    // It does NOT have explicit dispatch controls in the code snippet, just 'div' lists.
    // I will stick to the snippet to be compliant with "Cockpit" request.

    if (!pulse || !ops) return <div className="p-10 text-slate-400 font-mono">Booting Admin Console...</div>

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-mono">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Cpu className="text-indigo-400" /> SCOGEN_ADMIN_CORE
                </h1>
                <Badge variant={pulse.status === "HEALTHY" ? "default" : "destructive"} className="text-lg">
                    SYSTEM STATUS: {pulse.status}
                </Badge>
            </div>

            {/* ROW 1: SENTINEL (Health) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Database</CardTitle></CardHeader>
                    <CardContent><span className="text-xl font-bold text-green-400">{pulse.components?.database || "Unknown"}</span></CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">AI Brain</CardTitle></CardHeader>
                    <CardContent><span className={pulse.components?.ai_brain === "ONLINE" ? "text-green-400 font-bold" : "text-yellow-400 font-bold"}>{pulse.components?.ai_brain || "Checking..."}</span></CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Disk Free</CardTitle></CardHeader>
                    <CardContent><span className="text-xl font-bold">{pulse.resources?.disk_free_gb || 0} GB</span></CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">RAM Load</CardTitle></CardHeader>
                    <CardContent><span className="text-xl font-bold">{pulse.resources?.ram_used_percent || 0}%</span></CardContent>
                </Card>
            </div>

            {/* ROW 2: FINANCIALS */}
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><DollarSign className="text-emerald-400" /> Pending Invoices</h2>
            <div className="grid grid-cols-1 gap-4 mb-8">
                {ops.invoices.length === 0 ? <p className="text-slate-500 italic">No pending payments.</p> :
                    ops.invoices.map((inv: any) => (
                        <div key={inv.id} className="flex justify-between items-center bg-slate-800 p-4 rounded border border-slate-700">
                            <div>
                                <h3 className="font-bold text-lg">{inv.name}</h3>
                                <p className="text-xs text-slate-400">ID: {inv.id}</p>
                                <p className="text-sm text-emerald-400">Billed To: {inv.commercial_profile?.client_name || "Valued Client"}</p>
                            </div>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => markPaid(inv.id)}>
                                MARK PAID & ACTIVATE
                            </Button>
                        </div>
                    ))
                }
            </div>

            {/* ROW 3: DISPATCH */}
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="text-blue-400" /> Factory Queue</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unassigned Tasks */}
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-400 mb-2">Unassigned Tasks</h3>
                    {ops.queue.length === 0 ? <p className="text-slate-500">Queue empty.</p> :
                        ops.queue.map((t: any) => (
                            <div key={t.id} className="p-2 mb-2 bg-slate-700 rounded text-sm flex justify-between items-center">
                                <span>{t.persona_label || "Task"} Req</span>
                                <Badge variant="outline" className="text-xs border-slate-500">PENDING</Badge>
                            </div>
                        ))
                    }
                </div>
                {/* Active Bench */}
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-400 mb-2">Active Bench</h3>
                    {ops.bench.length === 0 ? <p className="text-slate-500">No freelancers. Seed DB.</p> :
                        ops.bench.map((w: any) => (
                            <div key={w.id} className="p-2 mb-2 bg-slate-700 rounded text-sm flex justify-between items-center">
                                <span>{w.name} ({w.skills?.[0] || "General"})</span>
                                <span className="text-green-400">${w.hourly_rate}/hr</span>
                            </div>
                        ))
                    }
                </div>
            </div>

        </div>
    )
}
