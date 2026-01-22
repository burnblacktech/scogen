"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, Clock } from "lucide-react"
import confetti from "canvas-confetti"

export default function DealRoom() {
    const params = useParams()
    const token = params.token as string

    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [accepted, setAccepted] = useState(false)

    // Negotiation State
    const [isRush, setIsRush] = useState(false)

    useEffect(() => {
        if (token) {
            axios.get(`http://localhost:8000/api/proposals/${token}`)
                .then(res => setData(res.data))
                .catch(err => setError("Invalid or Expired Link"))
                .finally(() => setLoading(false))
        }
    }, [token])

    const handleAccept = async () => {
        setLoading(true)
        try {
            await axios.post(`http://localhost:8000/api/proposals/${token}/accept`, { is_rush: isRush })
            setAccepted(true)
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
        } catch (e) {
            alert("Error accepting proposal. Please contact Scogen Support.")
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50 font-sans"><Loader2 className="animate-spin text-indigo-600" /></div>
    if (error) return <div className="flex justify-center items-center h-screen bg-slate-50 font-sans text-red-500 font-bold">{error}</div>

    if (accepted) {
        return (
            <div className="min-h-screen bg-green-50 flex items-center justify-center p-4 font-sans">
                <Card className="w-full max-w-lg bg-white shadow-xl p-10 text-center border-t-8 border-green-600 animate-in zoom-in duration-300">
                    <div className="mb-6 flex justify-center">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Aboard!</h1>
                    <p className="text-slate-500 mb-8">
                        The Scogen Factory has been notified. Your Pro-Forma Invoice has been generated and the project is active.
                    </p>
                    <div className="space-y-4">
                        <Button variant="default" className="w-full h-12 bg-black hover:bg-slate-800">
                            Download Invoice (PDF)
                        </Button>
                        <Button
                            size="lg"
                            className="w-full mt-4 bg-green-600 hover:bg-green-700 font-bold"
                            onClick={() => window.location.href = `/dashboard/${data.project_id}`}
                        >
                            Enter Mission Control →
                        </Button>
                        <p className="text-xs text-slate-400">A copy has also been sent to your registered email.</p>
                    </div>
                </Card>
            </div>
        )
    }

    const finalPrice = isRush ? data.rush_price : data.base_price

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <Card className="w-full max-w-2xl bg-white shadow-2xl border-t-8 border-indigo-600 overflow-hidden animate-in fade-in zoom-in duration-500">

                {/* Banner */}
                <div className="bg-slate-900 text-white p-6 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">{data.project_name}</h1>
                    <div className="flex justify-center items-center gap-2 text-slate-400 text-sm mt-2">
                        <Clock className="h-4 w-4" />
                        <span>Offer expires: {new Date(data.expires_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="p-8 space-y-8">

                    {/* The Negotiation Lever */}
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex justify-between items-center transition-all hover:shadow-md">
                        <div>
                            <h3 className="font-bold text-lg text-indigo-900">Timeline Strategy</h3>
                            <p className="text-sm text-indigo-600 mt-1">
                                {isRush ? "🚀 FAST TRACK: 2-Week Delivery Guarantee" : "🗓️ STANDARD TRACK: 8-Week Deployment"}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold ${!isRush ? 'text-slate-400' : 'text-indigo-600'}`}>RUSH</span>
                            <Switch checked={isRush} onCheckedChange={setIsRush} />
                        </div>
                    </div>

                    {/* The Price Reveal */}
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Total Investment Required</p>
                        <div className="text-6xl font-black text-slate-900 mt-4 tracking-tighter">
                            ₹{(finalPrice / 100000).toFixed(2)} L
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                            {isRush ? "Includes Priority Resource Allocation Fee" : "Standard Commercial Rates Applied"}
                        </p>
                    </div>

                    {/* The Action */}
                    <Button
                        size="lg"
                        className="w-full h-16 text-lg font-bold bg-black hover:bg-slate-800 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                        onClick={handleAccept}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-6 w-6" />}
                        Accept Proposal & Begin
                    </Button>

                    <div className="text-center">
                        <p className="text-[10px] text-slate-400">
                            By clicking Accept, you agree to the Terms of Service.
                            Scope Hash: {data.contract_hash || "PENDING_SIG"}
                        </p>
                    </div>

                </div>
            </Card>
        </div>
    )
}
