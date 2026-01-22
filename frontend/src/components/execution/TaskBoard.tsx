"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, PlayCircle, CheckCircle, Construction, User, Clock } from "lucide-react"

export function TaskBoard({ projectId }: { projectId: string }) {
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const loadTasks = async () => {
        try {
            const res = await axios.get(`http://localhost:8000/api/execution/${projectId}/tasks`)
            setTasks(res.data)
        } catch (e) {
            console.error("Failed to load tasks", e)
        }
    }

    const handleLaunch = async () => {
        setLoading(true)
        try {
            await axios.post(`http://localhost:8000/api/execution/${projectId}/launch`)
            await loadTasks()
        } catch (e) {
            console.error("Launch failed", e)
            alert("Launch failed. Ensure project is FROZEN before launching factory.")
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadKit = async (taskId: string, path: string) => {
        // Call the Airlock
        // In our implementation, path is module_path
        // Endpoint: GET /api/airlock/generate-bundle/{task_id}
        window.open(`http://localhost:8000/api/airlock/generate-bundle/${taskId}?module_path=${path}`, '_blank')
    }

    useEffect(() => {
        if (projectId) loadTasks()
    }, [projectId])

    if (tasks.length === 0) {
        return (
            <Card className="border-dashed border-2 bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <Construction className="h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700">Factory Ready</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">Once your scope is frozen, launch the factory to generate atomic work packets for freelancers.</p>
                    <Button onClick={handleLaunch} size="lg" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg">
                        {loading ? <Construction className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />}
                        Launch Execution
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Construction className="h-4 w-4 text-orange-500" />
                    Active Tasks (AWPs)
                </h3>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">{tasks.length} Packets</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks.map(task => (
                    <Card key={task.id} className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge className={task.status === 'PENDING' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}>
                                    {task.status}
                                </Badge>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                    <User className="h-3 w-3" />
                                    {task.persona_label}
                                </div>
                            </div>
                            <CardTitle className="text-sm mt-3 flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono">TASK-{task.id.slice(0, 4)}</Badge>
                                Requirement: {task.requirement_id.slice(0, 8)}...
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 p-2 rounded">
                                    <code className="text-slate-600">{task.technical_context.airlock_path}</code>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <div className="flex items-center gap-1 text-slate-500">
                                        <Clock className="h-3 w-3" />
                                        {task.time_limit_hours}h Deadline
                                    </div>
                                    <div className="font-bold text-slate-900">
                                        Budget: ₹{task.agreed_cost.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                                onClick={() => handleDownloadKit(task.id, task.technical_context.airlock_path)}
                            >
                                <Download className="mr-2 h-4 w-4" /> Download Work Kit
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
