"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import { LiveCanvas } from "@/components/ingestion/LiveCanvas"
import { MarginMixer } from "@/components/pricing/MarginMixer"
import { BlueprintSelector } from "@/components/library/BlueprintSelector"
import { VaultView } from "@/components/project/VaultView"
import { TaskBoard } from "@/components/execution/TaskBoard"

export default function BuilderInterface() {
    // Mock Project State for MVP - In real app, this comes from URL /projects/[id]
    const [projectId] = useState("123e4567-e89b-12d3-a456-426614174000")
    const [requirements, setRequirements] = useState<any[]>([])
    const [userIntent, setUserIntent] = useState("")

    const fetchRequirements = async () => {
        try {
            const res = await axios.get(`http://localhost:8000/api/projects/${projectId}/requirements`)
            setRequirements(res.data)
        } catch (e) {
            console.error("Failed to fetch requirements", e)
        }
    }

    // Effect to load requirements on mount and when project changes
    useEffect(() => {
        fetchRequirements()
    }, [projectId])

    const refreshVault = () => {
        fetchRequirements()
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <header className="mb-10 text-center">
                <h1 className="text-5xl font-black tracking-tight text-slate-900">
                    Agency Operating System <span className="text-indigo-600">(AOS)</span>
                </h1>
                <p className="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto italic">
                    "The distance between a dream and a build is a well-locked scope."
                </p>
            </header>

            <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6">

                {/* LEFT: The Therapist (Canvas) & Pricing */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Module 2: The Live Canvas (The Therapist's Couch)</h2>
                            <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Traceability: Priority 1</span>
                        </div>
                        <LiveCanvas onIntentChange={setUserIntent} />
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Module 1: The Margin Mixer (Shadow Pricing)</h2>
                            <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Traceability: Priority 3</span>
                        </div>
                        <MarginMixer />
                    </div>
                </div>

                {/* RIGHT: The Architect (Library & Vault) */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

                    {/* 1. Select Blueprint */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-800">Blueprint Store</h3>
                            <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Priority 2</span>
                        </div>
                        <BlueprintSelector projectId={projectId} userIntent={userIntent} onApply={refreshVault} />
                    </div>

                    {/* 2. See Results */}
                    <div className="flex-1 space-y-6">
                        <VaultView requirements={requirements} projectId={projectId} onSync={refreshVault} />
                        <TaskBoard projectId={projectId} />
                    </div>

                </div>

            </div>
        </div>
    )
}
