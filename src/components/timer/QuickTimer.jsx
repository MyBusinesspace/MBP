
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const colorStyles = {
  blue: "border-blue-200 hover:bg-blue-50",
  green: "border-green-200 hover:bg-green-50",
  purple: "border-purple-200 hover:bg-purple-50",
  orange: "border-orange-200 hover:bg-orange-50",
  red: "border-red-200 hover:bg-red-50",
  pink: "border-pink-200 hover:bg-pink-50",
  indigo: "border-indigo-200 hover:bg-indigo-50",
  yellow: "border-yellow-200 hover:bg-yellow-50",
  cyan: "border-cyan-200 hover:bg-cyan-50",
  emerald: "border-emerald-200 hover:bg-emerald-50"
};

export default function QuickTimer({ project, onStart }) {
  return (
    <Card className={`${colorStyles[project.color]} border transition-all duration-300 hover:shadow-md cursor-pointer`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full bg-${project.color}-500`}></div>
            <div>
              <h4 className="font-medium text-slate-900">{project.name}</h4>
              {project.client && (
                <p className="text-sm text-slate-600">{project.client}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onStart(project.id)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="w-3 h-3 mr-1" />
            Start
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

