"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import { useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Activity, Server, ShieldCheck, FileText } from "lucide-react"

export default function ClientCommandCenter() {
    const params = useParams()
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        // Poll for updates every 5 seconds to show "Live" activity
        const fetcher = () => {
            // Ensure backend URL is correct locally
            axios.get(`http://localhost:8000/api/projects/${params.id}/dashboard`)
                .then(res => setData(res.data))
                .catch(console.error)
        }
        fetcher()
        const interval = setInterval(fetcher, 5000)
        return () => clearInterval(interval)
    }, [params.id])

    if (!data) return <div className="p-10 text-center">Connecting to Satellite...</div>

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{data.project_name}</h1>
                    <p className="text-slate-500 flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        System Online | Mission Control
                    </p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-1 border-indigo-500 text-indigo-700">
                    {data.status}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* COL 1: FINANCIALS */}
                <Card className="border-t-4 border-emerald-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-emerald-600" /> Billing Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Billed To:</span>
                            <span className="font-bold">{data.billing.entity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Payment:</span>
                            <Badge variant={data.billing.status === "PAID" ? "default" : "destructive"}>
                                {data.billing.status}
                            </Badge>
                        </div>
                        <Button variant="outline" className="w-full mt-4 border-slate-200">
                            <Download className="mr-2 h-4 w-4" /> Download Tax Invoice
                        </Button>
                    </CardContent>
                </Card>

                {/* COL 2: EXECUTION PULSE */}
                <Card className="border-t-4 border-blue-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-600" /> Factory Output
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-slate-700">Construction Progress</span>
                                <span className="font-bold text-blue-600">{data.execution.progress_percent}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                                    style={{ width: `${data.execution.progress_percent}%` }}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="bg-slate-50 p-2 rounded text-center border border-slate-100">
                                <div className="text-2xl font-bold text-slate-700">{data.execution.total_modules}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active Modules</div>
                            </div>
                            <div className="bg-slate-50 p-2 rounded text-center border border-slate-100">
                                <div className="text-2xl font-bold text-slate-700">{data.maturity_score}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Health Score</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* COL 3: ASSETS */}
                <Card className="border-t-4 border-purple-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-purple-600" /> Legal & Arch
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button className="w-full justify-start bg-slate-900 hover:bg-slate-800 text-white">
                            <Server className="mr-2 h-4 w-4" /> Download Architecture
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                            <ShieldCheck className="mr-2 h-4 w-4" /> View Signed Contract
                        </Button>
                        <p className="text-[10px] text-center text-slate-300 font-mono mt-2">
                            HASH: {data.artifacts.contract_hash?.substring(0, 20)}...
                        </p>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
