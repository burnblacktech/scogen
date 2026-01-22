"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { ArrowRight, Lightbulb, Hammer } from "lucide-react"
import BuilderInterface from "@/components/views/BuilderInterface"
import DreamerInterface from "@/components/views/DreamerInterface"

export default function LandingGate() {
  const [mode, setMode] = useState<"DREAM" | "BUILD" | null>(null)

  if (mode === "BUILD") return <BuilderInterface />
  if (mode === "DREAM") return <DreamerInterface />

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">

        {/* DOOR A: THE DREAMER (TIER 1/2) */}
        <motion.div whileHover={{ scale: 1.02 }} className="cursor-pointer" onClick={() => setMode("DREAM")}>
          <Card className="h-96 bg-gradient-to-br from-purple-900 to-slate-900 border-purple-500/50 p-8 flex flex-col justify-between hover:shadow-purple-500/20 hover:shadow-2xl transition-all">
            <div>
              <Lightbulb className="h-12 w-12 text-purple-400 mb-4" />
              <h2 className="text-3xl font-bold mb-2 text-white">I have an Idea</h2>
              <p className="text-purple-200">
                Turn a sentence into a 50-page Investment Memo & Pitch Deck.
                Get validation before you build.
              </p>
            </div>
            <div className="flex items-center gap-2 text-purple-400 font-bold group">
              START VENTURE GENERATOR <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </motion.div>

        {/* DOOR B: THE BUILDER (TIER 3) */}
        <motion.div whileHover={{ scale: 1.02 }} className="cursor-pointer" onClick={() => setMode("BUILD")}>
          <Card className="h-96 bg-gradient-to-br from-emerald-900 to-slate-900 border-emerald-500/50 p-8 flex flex-col justify-between hover:shadow-emerald-500/20 hover:shadow-2xl transition-all">
            <div>
              <Hammer className="h-12 w-12 text-emerald-400 mb-4" />
              <h2 className="text-3xl font-bold mb-2 text-white">I have a Spec</h2>
              <p className="text-emerald-200">
                Turn requirements into Architecture, Fixed-Price Contracts, and Code.
                Ready to deploy.
              </p>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold group">
              OPEN MISSION CONTROL <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </motion.div>

      </div>
    </div>
  )
}
