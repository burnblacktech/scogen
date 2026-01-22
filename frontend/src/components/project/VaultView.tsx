"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lock, FileCode, CheckCircle2, ShieldCheck, Download } from "lucide-react"
import axios from "axios"
import { useState } from "react"

// You'd usually fetch this from GET /api/projects/{id}/requirements
// For MVP, we assume parent passes data or we mock fetch
export function VaultView({ requirements, projectId, onSync }: { requirements: any[], projectId: string, onSync?: () => void }) {
    const [isFrozen, setIsFrozen] = useState(false)
    const [freezing, setFreezing] = useState(false)
    const [freezeData, setFreezeData] = useState<any>(null)

    const handleFreeze = async () => {
        setFreezing(true)
        try {
            const res = await axios.post(`http://localhost:8000/api/projects/${projectId}/freeze`)
            setFreezeData(res.data)
            setIsFrozen(true)
            // alert(`Scope Frozen! Hash: ${res.data.hash}`)
        } catch (e) {
            console.error("Freeze failed", e)
            alert("Freeze failed. Ensure backend is running and project exists.")
        } finally {
            setFreezing(false)
        }
    }

    if (requirements.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                <FileCode className="h-10 w-10 mb-2 opacity-50" />
                <p>The Vault is empty.</p>
                <p className="text-xs">Apply a Blueprint to fill it.</p>
            </div>
        )
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b text-slate-900 border-slate-200">
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Lock className="h-4 w-4 text-emerald-600" />
                        The Vault
                    </CardTitle>
                    <div className="flex gap-2 items-center">
                        <Badge variant="outline">{requirements.length} Requirements Locked</Badge>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={onSync}
                            title="Manual Sync"
                        >
                            <FileCode className="h-4 w-4" />
                        </Button>
                        {!isFrozen ? (
                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs bg-rose-600 hover:bg-rose-700"
                                onClick={handleFreeze}
                                disabled={freezing}
                            >
                                {freezing ? <><ShieldCheck className="mr-2 h-3 w-3 animate-pulse" /> Freezing...</> : <><Lock className="mr-2 h-3 w-3" /> Freeze Scope</>}
                            </Button>
                        ) : (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 py-1 px-3">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> FROZEN
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                {isFrozen && freezeData && (
                    <div className="bg-emerald-50 border-b border-emerald-100 p-3 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-emerald-800">Digital Fingerprint</span>
                            <span className="text-[10px] font-mono text-emerald-600 truncate max-w-[200px]">{freezeData.hash}</span>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-emerald-200 text-emerald-700 hover:bg-emerald-100" onClick={() => window.open(freezeData.contract_url)}>
                            <Download className="mr-1 h-3 w-3" /> View Contract
                        </Button>
                    </div>
                )}
                <ScrollArea className="h-[400px] p-4">
                    <div className="space-y-4">
                        {requirements.map((req, i) => (
                            <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded border border-slate-200 hover:bg-white transition-colors">
                                <div className="min-w-[4px] h-full bg-slate-300 rounded-full" />
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-900">{req.title}</h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                                    <div className="mt-2 flex gap-2">
                                        {/* Show Nerve Ending status if available */}
                                        {req.traceability_meta?.nerves && (
                                            <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100">Nerves: Active</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
