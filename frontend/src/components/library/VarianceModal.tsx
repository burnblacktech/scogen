"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { useState } from "react"

interface Variance {
    id: string
    question: string
    impact: string
    cost_add: number
}

interface Props {
    open: boolean
    variances: Variance[]
    onConfirm: (responses: Record<string, boolean>) => void
    onCancel: () => void
}

export function VarianceModal({ open, variances, onConfirm, onCancel }: Props) {
    const [responses, setResponses] = useState<Record<string, boolean>>({})

    // Default all to FALSE (Keep Standard) unless clicked
    const toggleVariance = (id: string, val: boolean) => {
        setResponses(prev => ({ ...prev, [id]: val }))
    }

    const handleConfirm = () => {
        onConfirm(responses)
    }

    return (
        <Dialog open={open} onOpenChange={onCancel}>
            <DialogContent className="sm:max-w-[600px] bg-slate-900 text-white border-slate-700">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-yellow-400">
                        <AlertTriangle className="h-5 w-5" /> Architectural Deviation Detected
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        The Neural Core found {variances.length} gap(s) between your intent and the Standard Blueprint.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {variances.map((v) => (
                        <div key={v.id} className="bg-slate-800 p-4 rounded border border-slate-700">
                            <p className="font-medium text-sm mb-3">{v.question}</p>

                            <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                                <div className="text-xs text-slate-500">
                                    Impact: <span className="text-white">{v.impact}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={responses[v.id] === false || responses[v.id] === undefined ? "secondary" : "ghost"}
                                        onClick={() => toggleVariance(v.id, false)}
                                        className="text-xs"
                                    >
                                        Keep Standard
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={responses[v.id] === true ? "default" : "outline"}
                                        className={responses[v.id] === true ? "bg-indigo-600 border-indigo-600 hover:bg-indigo-700" : "border-slate-600 text-slate-300 hover:bg-slate-800"}
                                        onClick={() => toggleVariance(v.id, true)}
                                    >
                                        Apply Change (+₹{v.cost_add})
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button onClick={handleConfirm} className="w-full bg-green-600 hover:bg-green-700 text-white">
                        Confirm Architecture & Hydrate <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    {/* Fallback cancel mainly via Dialog overlay click or explicitly if needed, but Confirm is primary path */}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
