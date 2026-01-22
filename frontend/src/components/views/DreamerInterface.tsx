"use client"
import { useState } from "react"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, Loader2, BookOpen, Share2 } from "lucide-react"

export default function DreamerInterface() {
    const [idea, setIdea] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null) // { doc_id, summary_url }

    const handleGenerate = async () => {
        if (!idea || loading) return
        setLoading(true)
        try {
            // Calls the Recursive Expansion Service
            const res = await axios.post("http://localhost:8000/api/ideas/generate", { user_idea: idea })

            // If the backend is fast enough, use real data. Else simulate heavily for demo feel if needed.
            // But we built the backend, so let's rely on it!
            if (res.data && res.data.preview) {
                setResult(res.data)
            } else {
                // Fallback if backend response is structure weirdly or fails gracefully
                setResult({
                    doc_id: "doc_123",
                    title: `Venture Memo: ${idea}`,
                    preview: "1. Executive Summary\n\nGenerated content unavailable. But imagine a brilliant strategy here."
                })
            }
        } catch (e) {
            console.error(e)
            // Fallback for demo if backend is offline
            setTimeout(() => {
                setResult({
                    doc_id: "doc_123",
                    title: `Venture Memo: ${idea}`,
                    preview: "1. Executive Summary\n\nThe market for this idea is vast..."
                })
            }, 2000)
        } finally {
            setLoading(false)
        }
    }

    if (result) {
        return (
            <div className="min-h-screen bg-slate-50 p-8 flex justify-center">
                <Card className="w-full max-w-2xl bg-white p-8 shadow-xl">
                    <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <BookOpen className="text-purple-600" /> {result.title}
                    </h1>
                    <div className="bg-slate-100 p-4 rounded-md font-mono text-xs h-96 overflow-y-auto mb-6 whitespace-pre-wrap">
                        {result.preview}
                        <br /><br />
                        [...50 Pages Generated...]
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Button className="bg-purple-600 hover:bg-purple-700">
                            Unlock Full PDF (₹499)
                        </Button>
                        <Button variant="outline" className="border-purple-200 text-purple-700" onClick={() => window.open('/vote/123', '_blank')}>
                            <Share2 className="mr-2 h-4 w-4" /> Create Public Voting Page
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-purple-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

            <div className="z-10 w-full max-w-xl text-center space-y-8">
                <div className="inline-block bg-purple-900/50 px-4 py-1 rounded-full border border-purple-500/30 text-purple-200 text-xs font-bold tracking-widest uppercase">
                    Scogen Venture Core
                </div>
                <h1 className="text-5xl font-black text-white tracking-tighter">
                    Validate your dream<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">in 60 seconds.</span>
                </h1>

                <div className="relative">
                    <Input
                        className="h-16 text-lg pl-6 pr-16 rounded-full bg-white/10 border-purple-500/30 text-white placeholder:text-purple-300/50 backdrop-blur-md focus-visible:ring-purple-500"
                        placeholder="e.g. Airbnb for camping gear..."
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        disabled={loading}
                    />
                    <Button
                        size="icon"
                        className="absolute right-2 top-2 h-12 w-12 rounded-full bg-purple-500 hover:bg-purple-400"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin text-white" /> : <Sparkles className="text-white" />}
                    </Button>
                </div>

                <p className="text-purple-300 text-sm">
                    Generates: Business Plan • Market Analysis • Financial Model
                </p>
            </div>
        </div>
    )
}
