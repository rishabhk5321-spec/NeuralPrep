
import React, { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { AppState } from '../types';

interface CognitiveHeatmapProps {
  state: AppState;
}

const CognitiveHeatmap: React.FC<CognitiveHeatmapProps> = ({ state }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const activityMap: Record<string, number> = {};
    
    const addActivity = (timestamp: number, weight: number = 1) => {
      const date = new Date(timestamp);
      const dateKey = date.toISOString().split('T')[0];
      activityMap[dateKey] = (activityMap[dateKey] || 0) + weight;
    };

    // Quizzes and their history
    state.quizzes.forEach(q => {
      addActivity(q.timestamp, 5); // Base quiz creation/first attempt
      q.history?.forEach(h => addActivity(h.timestamp, 5));
    });

    // Flashcards
    state.flashcards.forEach(f => addActivity(f.timestamp, 3));

    // Summaries
    state.summaries.forEach(s => addActivity(s.timestamp, 2));

    // Individual attempts
    state.memory.attempts.forEach(a => addActivity(a.timestamp, 1));

    return activityMap;
  }, [state]);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 150;
    const cellSize = 12;
    const cellPadding = 3;
    const yearHeight = cellSize * 7 + cellPadding * 6;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const now = new Date();
    const startDate = d3.timeDay.offset(now, -365);
    const endDate = now;

    const colorScale = d3.scaleThreshold<number, string>()
      .domain([1, 5, 15, 30])
      .range(['rgba(255, 255, 255, 0.05)', 'rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.4)', 'rgba(99, 102, 241, 0.7)', 'rgba(99, 102, 241, 1)']);

    const days = d3.timeDays(startDate, endDate);

    const g = svg.append("g")
      .attr("transform", `translate(40, 20)`);

    // Month labels
    const monthLabels = g.selectAll(".month-label")
      .data(d3.timeMonths(startDate, endDate))
      .enter()
      .append("text")
      .attr("class", "month-label")
      .attr("x", d => d3.timeWeek.count(startDate, d) * (cellSize + cellPadding))
      .attr("y", -10)
      .attr("fill", "rgba(255, 255, 255, 0.3)")
      .style("font-size", "9px")
      .style("font-weight", "900")
      .style("text-transform", "uppercase")
      .text(d => d3.timeFormat("%b")(d));

    // Day labels
    const dayLabels = ["Mon", "Wed", "Fri"];
    g.selectAll(".day-label")
      .data(dayLabels)
      .enter()
      .append("text")
      .attr("class", "day-label")
      .attr("x", -30)
      .attr("y", (d, i) => (i * 2 + 1) * (cellSize + cellPadding) + cellSize / 2 + 4)
      .attr("fill", "rgba(255, 255, 255, 0.2)")
      .style("font-size", "8px")
      .style("font-weight", "900")
      .text(d => d);

    // Cells
    g.selectAll(".day-cell")
      .data(days)
      .enter()
      .append("rect")
      .attr("class", "day-cell")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("x", d => d3.timeWeek.count(startDate, d) * (cellSize + cellPadding))
      .attr("y", d => d.getDay() * (cellSize + cellPadding))
      .attr("rx", 2)
      .attr("fill", d => {
        const key = d.toISOString().split('T')[0];
        return colorScale(data[key] || 0);
      })
      .append("title")
      .text(d => {
        const key = d.toISOString().split('T')[0];
        const count = data[key] || 0;
        return `${count} cognitive units on ${d3.timeFormat("%B %d, %Y")(d)}`;
      });

  }, [data]);

  return (
    <div className="w-full overflow-x-auto scroll-slim pb-4">
      <div className="min-w-[800px]">
        <svg ref={svgRef} width="850" height="160" className="mx-auto"></svg>
      </div>
      <div className="flex items-center justify-end gap-2 px-6 mt-2">
        <span className="text-[8px] font-black uppercase tracking-widest opacity-20">Less</span>
        <div className="flex gap-1">
          {[0, 2, 10, 20, 40].map((v, i) => (
            <div 
              key={i} 
              className="w-3 h-3 rounded-sm" 
              style={{ 
                backgroundColor: i === 0 ? 'rgba(255, 255, 255, 0.05)' : 
                                 i === 1 ? 'rgba(99, 102, 241, 0.2)' :
                                 i === 2 ? 'rgba(99, 102, 241, 0.4)' :
                                 i === 3 ? 'rgba(99, 102, 241, 0.7)' : 'rgba(99, 102, 241, 1)'
              }}
            />
          ))}
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest opacity-20">More</span>
      </div>
    </div>
  );
};

export default CognitiveHeatmap;
