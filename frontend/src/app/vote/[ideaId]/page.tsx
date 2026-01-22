"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react"
import { useState } from "react"
import { useParams } from "next/navigation"

export default function PublicValidationPage() {
    const params = useParams()
    const [voted, setVoted] = useState(false)

    // In real app, fetch idea details using params.ideaId
    const idea = {
        title: "Airbnb for Camping Gear",
        elevator_pitch: "A peer-to-peer rental marketplace allowing outdoor enthusiasts to monetize their idle camping equipment. Why buy a $500 tent for one weekend?"
    }

    const handleVote = () => {
        setVoted(true)
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <Card className="max-w-xl w-full p-8 text-center border-t-8 border-purple-600 shadow-2xl">
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{idea.title}</h1>
                    <p className="text-slate-600 text-xl leading-relaxed font-light">
                        "{idea.elevator_pitch}"
                    </p>
                </div>

                {!voted ? (
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <Button variant="outline" className="h-24 text-xl border-red-200 hover:bg-red-50 hover:text-red-600 flex flex-col gap-2 rounded-xl" onClick={handleVote}>
                            <ThumbsDown className="h-8 w-8" /> Meh.
                        </Button>
                        <Button className="h-24 text-xl bg-purple-600 hover:bg-purple-700 flex flex-col gap-2 rounded-xl shadow-lg shadow-purple-200" onClick={handleVote}>
                            <ThumbsUp className="h-8 w-8" /> I'd use this!
                        </Button>
                    </div>
                ) : (
                    <div className="bg-green-50 p-8 rounded-xl border border-green-200 mb-8 animate-in zoom-in duration-300">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <h3 className="text-xl font-bold text-green-800">Thanks for voting!</h3>
                        <p className="text-green-600">You've been added to the priority access list.</p>
                    </div>
                )}

                <div className="bg-slate-100 p-6 rounded-xl">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-3 tracking-wider">Join the Waitlist</p>
                    <div className="flex gap-2">
                        <input className="flex-1 border border-slate-300 rounded-md p-3 text-sm focus:outline-purple-500" placeholder="Enter your email..." />
                        <Button>Join</Button>
                    </div>
                </div>

                <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest text-center">Powered by Scogen Venture Generator</p>
            </Card>
        </div>
    )
}
