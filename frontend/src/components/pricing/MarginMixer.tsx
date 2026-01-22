"use client"

import { useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, ShieldAlert } from "lucide-react"

export function MarginMixer() {
    // State for the Simulation
    const [taskName, setTaskName] = useState("Custom CRM Module")
    const [hours, setHours] = useState(20)
    const [complexity, setComplexity] = useState("MEDIUM")
    const [assignedPersona, setAssignedPersona] = useState("SENIOR")
    const [actualResource, setActualResource] = useState("JUNIOR")
    const [reuseAsset, setReuseAsset] = useState(true)
    const [techStack, setTechStack] = useState("Standard")
    const [timeline, setTimeline] = useState(4)
    const [clientType, setClientType] = useState("INTERNAL")

    // Response State
    const [result, setResult] = useState<any>(null)
    const [curatedPrice, setCuratedPrice] = useState(0)
    const [loading, setLoading] = useState(false)

    const calculate = async () => {
        setLoading(true)
        try {
            // Connect to your Backend
            const response = await axios.post("http://localhost:8000/api/pricing/calculate", {
                task_name: taskName,
                standard_hours: hours,
                complexity: complexity,
                assigned_persona: assignedPersona,
                actual_resource: actualResource,
                is_asset_reused: reuseAsset,
                tech_stack_label: techStack,
                timeline_weeks: timeline,
                client_type: clientType
            })
            setResult(response.data)
            setCuratedPrice(response.data.actuarial_ceiling) // Default to max
        } catch (error) {
            console.error("Calculation failed", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* LEFT: THE INPUTS (The Levers) */}
            <Card>
                <CardHeader>
                    <CardTitle>Shadow Pricing Engine</CardTitle>
                    <CardDescription>Configure the Arbitrage parameters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="space-y-2">
                        <Label>Task Name</Label>
                        <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Standard Hours (Scope)</Label>
                            <span className="text-sm text-muted-foreground">{hours} hrs</span>
                        </div>
                        <Slider
                            value={[hours]}
                            max={100}
                            step={1}
                            onValueChange={(vals) => setHours(vals[0])}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Client Sees (Persona)</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={assignedPersona}
                                onChange={(e) => setAssignedPersona(e.target.value)}
                            >
                                <option value="JUNIOR">Junior Dev</option>
                                <option value="MID">Mid-Level</option>
                                <option value="SENIOR">Senior Architect</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Internal Resource</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={actualResource}
                                onChange={(e) => setActualResource(e.target.value)}
                            >
                                <option value="AI_AGENT">AI Agent (₹50)</option>
                                <option value="JUNIOR">Junior (₹400)</option>
                                <option value="SENIOR">Senior (₹2000)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={reuseAsset}
                            onChange={(e) => setReuseAsset(e.target.checked)}
                            className="h-4 w-4"
                        />
                        <Label>Asset Reuse Enabled (80% Efficiency)</Label>
                    </div>

                    <Separator />

                    <div className="space-y-4 pt-2">
                        <Label className="text-sm font-bold text-indigo-600">Phase 2.5: Risk Factors</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tech Complexity</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={techStack}
                                    onChange={(e) => setTechStack(e.target.value)}
                                >
                                    <option value="Standard">Standard Stack</option>
                                    <option value="Blockchain">Blockchain (1.5x)</option>
                                    <option value="AI">AI/ML (1.8x)</option>
                                    <option value="Embedded">Embedded (1.4x)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Client Risk Profile</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={clientType}
                                    onChange={(e) => setClientType(e.target.value)}
                                >
                                    <option value="INTERNAL">Internal/Seed</option>
                                    <option value="STARTUP">Startup (1.1x)</option>
                                    <option value="ENTERPRISE">Enterprise (1.3x)</option>
                                    <option value="GOVERNMENT">Gov/Fintech (1.5x)</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Urgency (Timeline)</Label>
                                <span className="text-sm font-bold text-red-500">{timeline} Weeks</span>
                            </div>
                            <Slider
                                value={[8 - timeline]} // Inverse mapping for visual feel
                                min={0}
                                max={7}
                                step={1}
                                onValueChange={(val) => setTimeline(8 - val[0])}
                            />
                            <p className="text-[10px] text-muted-foreground italic">Shorter timeline increases Actuarial Ceiling exponentially.</p>
                        </div>
                    </div>

                    <Button className="w-full" onClick={calculate} disabled={loading}>
                        {loading ? "Computing..." : "Run Simulation"}
                    </Button>

                </CardContent>
            </Card>

            {/* RIGHT: THE OUTPUT (God Mode View) */}
            <Card className="border-indigo-500 bg-slate-50/50">
                <CardHeader>
                    <CardTitle>God Mode Pricing</CardTitle>
                    <CardDescription>Curate the external price within the safety zone.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!result ? (
                        <div className="text-center text-muted-foreground p-8 flex flex-col items-center">
                            <ShieldAlert className="h-10 w-10 mb-2 opacity-20" />
                            Run Simulation to calculate Arbitrage.
                        </div>
                    ) : (
                        <>
                            {/* THE TRINITY VISUALIZER */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                                    <span className="text-red-600">Floor (Cost)</span>
                                    <span className="text-slate-600">Market Anchor</span>
                                    <span className="text-green-600">Risk Ceiling</span>
                                </div>

                                <div className="relative h-4 w-full bg-slate-200 rounded-full overflow-hidden">
                                    {/* Internal Cost Bar (Red) */}
                                    <div
                                        className="absolute h-full bg-red-400"
                                        style={{ width: `${(result.internal_floor / result.actuarial_ceiling) * 100}%` }}
                                    />
                                    {/* Market Anchor Marker (Line) */}
                                    <div
                                        className="absolute h-full w-1 bg-black z-10"
                                        style={{ left: `${(result.market_anchor / result.actuarial_ceiling) * 100}%` }}
                                    />
                                    {/* Profit Zone (Green Gradient) */}
                                    <div className="absolute h-full w-full bg-gradient-to-r from-transparent via-green-200 to-green-400 opacity-50" />
                                </div>

                                <div className="flex justify-between text-xs font-mono">
                                    <span>₹{result.internal_floor.toLocaleString()}</span>
                                    <span>₹{result.market_anchor.toLocaleString()}</span>
                                    <span>₹{result.actuarial_ceiling.toLocaleString()}</span>
                                </div>
                            </div>

                            <Separator />

                            {/* THE CURATOR SLIDER */}
                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-lg font-bold">Final Quote Price</Label>
                                    <span className="text-2xl font-black text-indigo-700">
                                        ₹{curatedPrice.toLocaleString()}
                                    </span>
                                </div>

                                <Slider
                                    value={[curatedPrice]}
                                    min={result.market_anchor} // Don't go below market rate usually
                                    max={result.actuarial_ceiling}
                                    step={1000}
                                    onValueChange={(val) => setCuratedPrice(val[0])}
                                    className="py-4"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    Adjusting based on negotiation/gut feeling.
                                </p>
                            </div>

                            {/* THE PROFIT REALIZATION */}
                            <div className="bg-white p-4 rounded border border-green-200 shadow-sm">
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-semibold text-slate-600">Net Profit Realized</span>
                                    <span className="text-sm font-bold text-green-600">
                                        {Math.round(((curatedPrice - result.internal_floor) / curatedPrice) * 100)}% Margin
                                    </span>
                                </div>
                                <div className="text-3xl font-black text-green-700">
                                    ₹{(curatedPrice - result.internal_floor).toLocaleString()}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 italic">
                                    {result.risk_factor_breakdown}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
