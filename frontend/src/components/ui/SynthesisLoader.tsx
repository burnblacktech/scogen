"use client"
import React, { useEffect, useState } from 'react'

export const SynthesisLoader = () => {
    const [dots, setDots] = useState('')

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.')
        }, 400)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center">
            <div className="relative w-64 h-64">
                {/* The Outer Pulse */}
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                {/* The Core */}
                <div className="absolute inset-4 rounded-full border-2 border-indigo-500/50 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-8 rounded-full border border-slate-800 flex items-center justify-center">
                    <div className="text-4xl font-black text-indigo-500 animate-pulse">
                        AOS
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center px-4">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    Neural Synthesis in Progress{dots}
                </h3>
                <p className="text-indigo-400/80 mt-2 font-mono text-xs tracking-widest uppercase">
                    Mutating Blueprint Protocol #768
                </p>
            </div>

            {/* Matrix-like code stream simulation */}
            <div className="absolute bottom-12 left-12 right-12 h-24 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black,transparent)] pointer-events-none">
                <div className="text-[10px] font-mono text-indigo-900/40 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-2">
                    {[...Array(24)].map((_, i) => (
                        <div key={i} className="whitespace-nowrap overflow-hidden">
                            {Math.random().toString(16).substring(2, 20)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
