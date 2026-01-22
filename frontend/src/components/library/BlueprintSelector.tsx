"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Server } from "lucide-react"

import { APP_CONFIG } from "@/lib/config"
import { SynthesisLoader } from "@/components/ui/SynthesisLoader"
import { VarianceModal } from "./VarianceModal"

// Types matching your Backend Schema
interface Archetype {
    id: string
    name: string
    description: string
    base_hours: number
    tech_stack: string[]
}

export function BlueprintSelector({ projectId, userIntent, onApply }: { projectId: string, userIntent: string, onApply: () => void }) {
    const [archetypes, setArchetypes] = useState<Archetype[]>([])
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState<string | null>(null)

    // Variance State
    const [isSynthesizing, setIsSynthesizing] = useState(false)
    const [showVariance, setShowVariance] = useState(false)
    const [detectedVariances, setDetectedVariances] = useState([])
    const [selectedArchetype, setSelectedArchetype] = useState("")

    useEffect(() => {
        // Fetch the "Frozen Assets" from your Library
        axios.get(`${APP_CONFIG.API_URL}/api/archetypes/`)
            .then(res => setArchetypes(res.data))
            .catch(err => console.error("Failed to load library", err))
            .finally(() => setLoading(false))
    }, [])

    const handleInitialClick = async (archetypeId: string) => {
        setSelectedArchetype(archetypeId)
        setApplying(archetypeId) // Start button spinner
        setIsSynthesizing(true) // Start Matrix overlay
    }

    const onSynthesisComplete = async () => {
        try {
            // 1. Ask the Oracle
            const intent = userIntent || "Standard Implementation" // Fallback if user didn't type anything

            const res = await axios.post(`${APP_CONFIG.API_URL}/api/variance/detect`, {
                archetype_id: selectedArchetype,
                user_intent: intent
            })

            if (res.data.variances && res.data.variances.length > 0) {
                setDetectedVariances(res.data.variances)
                setIsSynthesizing(false) // Hide loader
                setShowVariance(true) // Show Modal
            } else {
                // No variance, proceed directly
                finalizeHydration({})
            }
        } catch (e) {
            console.error("Variance check failed, defaulting to standard", e)
            finalizeHydration({})
        }
    }

    const finalizeHydration = async (varianceResponses: any) => {
        setShowVariance(false)
        setIsSynthesizing(false)

        console.log(`🚀 Hydrating Neural Assets for archetype: ${selectedArchetype} with variances:`, varianceResponses)

        try {
            await axios.post(`${APP_CONFIG.API_URL}/api/archetypes/apply`, {
                project_id: projectId,
                archetype_id: selectedArchetype,
                variance_responses: varianceResponses
            })
            onApply() // Refresh UI
        } catch (error) {
            console.error("Neural Synthesis failed", error)
        } finally {
            setApplying(null)
        }
    }

    if (loading) return <div className="flex gap-2 items-center text-sm text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Syncing Neural Assets...</div>

    return (
    return (
        <div className="grid grid-cols-1 gap-4">
            {isSynthesizing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <SynthesisLoader onComplete={onSynthesisComplete} />
                </div>
            )}

            <VarianceModal
                open={showVariance}
                variances={detectedVariances}
                onConfirm={finalizeHydration}
                onCancel={() => { setShowVariance(false); setApplying(null); setIsSynthesizing(false); }}
            />

            {archetypes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No archetypes found in library.</p>
            ) : (
                archetypes.map((arch) => (
                    <Card key={arch.id} className="border-l-4 border-l-indigo-500 hover:shadow-md transition-all cursor-pointer">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{arch.name}</CardTitle>
                                <Badge variant="secondary">{arch.base_hours} Hours</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                            <p className="text-sm text-muted-foreground mb-3">{arch.description}</p>
                            <div className="flex gap-2 flex-wrap">
                                {arch.tech_stack.map(tech => (
                                    <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button
                                size="sm"
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => handleInitialClick(arch.id)}
                                disabled={!!applying}
                            >
                                {applying === arch.id ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                                ) : (
                                    <><Server className="mr-2 h-4 w-4" /> Load Blueprint (Hydrate DB)</>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                ))
            )}
        </div>
    )
}
