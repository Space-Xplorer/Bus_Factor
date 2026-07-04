import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  ShieldAlert, 
  RefreshCw, 
  Layers, 
  Send, 
  ArrowUpDown, 
  ArrowUpRight, 
  ChevronRight,
  TrendingDown,
  Terminal,
  User,
  CheckCircle
} from 'lucide-react';
import { api } from './mock';
import type { GraphNode, GraphEdge, RiskPair, ResignZone, InterviewQuestion, RiskDeltaItem } from './mock';
import './App.css';

type SortField = 'engineer' | 'service' | 'score' | 'status';

export default function App() {
  // Graph & general states
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [riskPairs, setRiskPairs] = useState<RiskPair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Interactive Graph selection
  const [selectedEngineer, setSelectedEngineer] = useState<string>('Priya Nair');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Sorting state for Risk Table
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Simulation & Interview states
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [zones, setZones] = useState<ResignZone[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [chatMessages, setChatMessages] = useState<{ sender: 'agent' | 'user'; text: string; timestamp: Date }[]>([]);
  const [answerText, setAnswerText] = useState<string>('');
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);
  const [interviewDone, setInterviewDone] = useState<boolean>(false);
  const [resigningInProgress, setResigningInProgress] = useState<boolean>(false);

  // Results & Healing states
  const [completedDelta, setCompletedDelta] = useState<RiskDeltaItem[] | null>(null);
  const [completedEvents, setCompletedEvents] = useState<string[]>([]);
  const [eventsToShow, setEventsToShow] = useState<string[]>([]);

  // Graph UI elements
  const [popover, setPopover] = useState<{
    service: GraphNode;
    x: number;
    y: number;
    pair: RiskPair;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

  // Fetch initial mock data
  const loadInitialData = async () => {
    setLoading(true);
    const g = await api.getGraph();
    const r = await api.getRisk();
    
    // Filter out dangling edges in graph mapping
    const nodeIds = new Set(g.nodes.map(n => n.id));
    const cleanEdges = g.edges.filter(e => {
      const sourceId = typeof e.source === 'object' ? (e.source as any).id : e.source;
      const targetId = typeof e.target === 'object' ? (e.target as any).id : e.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    setGraphData({ nodes: g.nodes, edges: cleanEdges });
    setRiskPairs(r.pairs);
    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Update canvas dimensions on container resize
  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loading]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle clicking a node in the graph
  const handleNodeClick = (node: any) => {
    if (node.type === 'service') {
      setSelectedService(node.id);
      if (fgRef.current) {
        const coords = fgRef.current.canvas2ScreenCoords(node.x, node.y);
        const pair = riskPairs.find(p => p.service === node.id);
        if (pair && coords) {
          setPopover({
            service: node,
            x: coords.x,
            y: coords.y,
            pair
          });
        }
      }
    } else {
      setSelectedEngineer(node.id);
      setSelectedService(null);
      setPopover(null);
    }
  };

  // Toggle sorting fields
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'engineer' || field === 'service'); // ascending by default for strings
    }
  };

  // Risk status priorities for sorting
  const statusPriority = { RED: 3, YELLOW: 2, GREEN: 1, EXCLUDED: 0 };

  // Sorted risk pairs
  const sortedPairs = [...riskPairs].sort((a, b) => {
    let valA: any = a[sortField];
    let valB: any = b[sortField];

    if (sortField === 'status') {
      valA = statusPriority[a.status];
      valB = statusPriority[b.status];
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Resignation Simulation trigger
  const handleSimulateResignation = async () => {
    setResigningInProgress(true);
    setCompletedDelta(null);
    setEventsToShow([]);
    try {
      const res = await api.resign(selectedEngineer);
      setActiveSessionId(res.session_id);
      setZones(res.zones);
      setCurrentQuestion(res.first_question);
      setInterviewDone(false);

      const welcomeText = `RESIGNATION INITIATED: ${selectedEngineer} has submitted notice.\n\n` +
        (res.zones.length > 0 
          ? `Traversing knowledge graph sub-network... Identified ${res.zones.length} red risk zones:\n` +
            res.zones.map(z => `• ${z.service} (Risk: ${z.score.toFixed(2)})`).join('\n') + 
            `\n\nStarting capture interview to record critical parameters and reduce organizational dependency.`
          : `No critical red risk zones detected for this engineer. You can complete the transition immediately.`);

      setChatMessages([
        { sender: 'agent', text: welcomeText, timestamp: new Date() },
        { 
          sender: 'agent', 
          text: `[Question ${res.first_question.index}/${res.first_question.total}] (Zone: ${res.first_question.zone})\n${res.first_question.text}`, 
          timestamp: new Date() 
        }
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setResigningInProgress(false);
    }
  };

  // Submit interview answer
  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!answerText.trim() || !activeSessionId) return;

    const userAns = answerText;
    setAnswerText('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userAns, timestamp: new Date() }]);
    setSubmittingAnswer(true);

    try {
      const res = await api.answer(activeSessionId, userAns);
      if (res.done) {
        setInterviewDone(true);
        setCurrentQuestion(null);
        setChatMessages(prev => [...prev, { 
          sender: 'agent', 
          text: `Interview questions complete! Captured exclusive knowledge zones: ${res.captured_zones.join(', ')}.\n\nClick the button below to write captured knowledge into Cognee and heal the organizational risk map.`, 
          timestamp: new Date() 
        }]);
      } else {
        setCurrentQuestion(res.next_question);
        setChatMessages(prev => [...prev, { 
          sender: 'agent', 
          text: `[Question ${res.next_question.index}/${res.next_question.total}] (Zone: ${res.next_question.zone})\n${res.next_question.text}`, 
          timestamp: new Date() 
        }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Finalize capture and re-cognify to heal graph
  const handleCompleteCapture = async () => {
    if (!activeSessionId) return;
    setLoading(true);
    try {
      const res = await api.completeCapture(activeSessionId);
      setCompletedDelta(res.delta);
      setCompletedEvents(res.memory_events);
      setActiveSessionId(null);
      setZones([]);
      setPopover(null);

      // Trigger scrolling text logs effect
      let currentLogIdx = 0;
      const interval = setInterval(() => {
        if (currentLogIdx < res.memory_events.length) {
          setEventsToShow(prev => [...prev, res.memory_events[currentLogIdx]]);
          currentLogIdx++;
        } else {
          clearInterval(interval);
        }
      }, 700);

      // Refresh graph/risk state from mock database (updated internally)
      await loadInitialData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemo = () => {
    api.reset();
    setActiveSessionId(null);
    setZones([]);
    setCurrentQuestion(null);
    setChatMessages([]);
    setCompletedDelta(null);
    setEventsToShow([]);
    setPopover(null);
    setSelectedEngineer('Priya Nair');
    loadInitialData();
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* 1. Left Panel (60%): Graph Panel */}
      <div 
        ref={containerRef} 
        className="w-3/5 h-full relative border-r border-slate-800 bg-slate-950/30 flex flex-col"
        onClick={() => setPopover(null)}
      >
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="text-indigo-400 w-5 h-5" />
            BusFactor Knowledge Graph
          </h1>
          <p className="text-xs text-slate-400">
            Engineers (Purple Circles) ↔ Services (Squares, colored by Risk).
          </p>
        </div>

        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleResetDemo();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-lg transition duration-150 text-slate-300 shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Reset State
          </button>
        </div>

        {loading && !activeSessionId && !completedDelta ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <p className="text-xs text-slate-400">Recomputing risk models...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full h-full">
            <ForceGraph2D
              ref={fgRef}
              graphData={{ nodes: graphData.nodes, links: graphData.edges }}
              width={dimensions.width}
              height={dimensions.height}
              nodeRelSize={6}
              nodeVal={node => {
                if (node.type === 'service') {
                  const p = riskPairs.find(rp => rp.service === node.id);
                  return p ? (p.breakdown.centrality * 4 + 4) : 4;
                }
                return 4;
              }}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const isService = node.type === 'service';
                const label = node.label || node.id;
                
                // Exclusivity / Centrality sizing
                let centrality = 0.5;
                const p = riskPairs.find(rp => rp.service === node.id);
                if (p) {
                  centrality = p.breakdown.centrality;
                } else if (node.criticality) {
                  const map = { CRITICAL: 1.0, HIGH: 0.7, MEDIUM: 0.4, LOW: 0.1 };
                  centrality = map[node.criticality as keyof typeof map] || 0.5;
                }
                
                const size = isService ? (centrality * 10 + 6) : 7;
                
                ctx.beginPath();
                if (isService) {
                  // Squares for services
                  ctx.rect(node.x - size, node.y - size, size * 2, size * 2);
                } else {
                  // Circles for engineers
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                }
                
                let fillStyle = '#6366f1'; // Default engineer (indigo)
                let borderStyle = '#4f46e5';
                let isDashed = false;
                
                if (isService) {
                  if (node.status === 'RED') {
                    fillStyle = '#ef4444';
                    borderStyle = '#991b1b';
                  } else if (node.status === 'YELLOW') {
                    fillStyle = '#f59e0b';
                    borderStyle = '#854d0e';
                  } else if (node.status === 'GREEN') {
                    fillStyle = '#22c55e';
                    borderStyle = '#166534';
                  } else if (node.status === 'EXCLUDED') {
                    fillStyle = '#111827';
                    borderStyle = '#4b5563';
                    isDashed = true;
                  }
                } else {
                  // Selected engineer node gets highlighted
                  if (selectedEngineer === node.id) {
                    fillStyle = '#a855f7'; // Purple
                    borderStyle = '#f3e8ff';
                  }
                }
                
                ctx.fillStyle = fillStyle;
                ctx.fill();
                
                ctx.strokeStyle = borderStyle;
                ctx.lineWidth = selectedEngineer === node.id ? 2.5 : 1.5;
                if (isDashed) {
                  ctx.setLineDash([2.5, 2.5]);
                } else {
                  ctx.setLineDash([]);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw text labels
                const fontSize = Math.max(7.5, 10 / Math.min(2, Math.max(0.5, globalScale)));
                ctx.font = `600 ${fontSize}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = isService ? '#f8fafc' : '#cbd5e1';
                ctx.fillText(label, node.x, node.y + size + 3);
              }}
              nodePointerAreaPaint={(node: any, color, ctx) => {
                const isService = node.type === 'service';
                let centrality = 0.5;
                const p = riskPairs.find(rp => rp.service === node.id);
                if (p) centrality = p.breakdown.centrality;
                const size = isService ? (centrality * 10 + 6) : 7;
                
                ctx.fillStyle = color;
                ctx.beginPath();
                if (isService) {
                  ctx.rect(node.x - size, node.y - size, size * 2, size * 2);
                } else {
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                }
                ctx.fill();
              }}
              onNodeClick={handleNodeClick}
              linkColor={link => {
                const k = (link as any).kind;
                if (k === 'touched') return '#4f46e5';
                if (k === 'depends_on') return '#334155';
                if (k === 'covers') return '#22c55e';
                return '#4b5563';
              }}
              linkWidth={link => {
                const k = (link as any).kind;
                return k === 'touched' ? 2 : 1.2;
              }}
              linkDirectionalParticles={link => {
                const k = (link as any).kind;
                return k === 'touched' ? 3 : k === 'depends_on' ? 1 : 0;
              }}
              linkDirectionalParticleWidth={1.8}
              linkDirectionalParticleSpeed={0.005}
              linkLineDash={link => {
                const k = (link as any).kind;
                return k === 'covers' || k === 'resolved' ? [4, 4] : null;
              }}
              onBackgroundClick={() => setPopover(null)}
            />
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 border border-slate-800/80 rounded-xl p-3.5 text-[11px] flex flex-col gap-2.5 backdrop-blur-md pointer-events-none shadow-xl">
          <div className="font-bold text-slate-300 text-xs tracking-wide border-b border-slate-800 pb-1.5">GRAPH LEGEND</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500 border border-indigo-400"></div>
            <span className="text-slate-300">Engineer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 border border-red-700"></div>
            <span className="text-slate-300 font-semibold">Critical Service (RED Risk &ge; 0.45)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 border border-amber-700"></div>
            <span className="text-slate-300">Medium Service (YELLOW Risk 0.20&ndash;0.45)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 border border-emerald-700"></div>
            <span className="text-slate-300">Healthy Service (GREEN Risk &lt; 0.20)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-900 border border-slate-600 border-dashed"></div>
            <span className="text-slate-400 italic">Deprecated (EXCLUDED, no risk calculated)</span>
          </div>
        </div>

        {/* Graph Click Popover */}
        {popover && (
          <div 
            className="absolute z-20 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-4 w-72 backdrop-blur-md transition-all duration-200"
            style={{ 
              left: Math.min(dimensions.width - 300, Math.max(16, popover.x - 144)), 
              top: Math.min(dimensions.height - 250, Math.max(80, popover.y - 260)) 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <h3 className="font-bold text-white text-sm tracking-tight">{popover.service.id}</h3>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                  {popover.service.criticality} Priority
                </span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                popover.pair.status === 'RED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                popover.pair.status === 'YELLOW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                popover.pair.status === 'GREEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {popover.pair.status} ({popover.pair.score.toFixed(2)})
              </span>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Formula Breakdown</div>
              
              {/* Exclusivity Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Exclusivity (Commit share)</span>
                  <span className="font-semibold text-white">{popover.pair.breakdown.exclusivity.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300 animate-pulse"
                    style={{ width: `${popover.pair.breakdown.exclusivity * 100}%` }}
                  />
                </div>
              </div>

              {/* Centrality Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Centrality (Dependencies)</span>
                  <span className="font-semibold text-white">{popover.pair.breakdown.centrality.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-sky-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${popover.pair.breakdown.centrality * 100}%` }}
                  />
                </div>
              </div>

              {/* Doc Coverage Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Doc Coverage (Alibi)</span>
                  <span className="font-semibold text-white">{popover.pair.breakdown.doc_coverage.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${popover.pair.breakdown.doc_coverage * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 italic text-right flex justify-between">
                  <span>Doc Multiplier:</span>
                  <span className="font-mono">{(1 - popover.pair.breakdown.doc_coverage).toFixed(2)}x</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setPopover(null)}
              className="mt-3.5 w-full text-center py-1 bg-slate-850 hover:bg-slate-800 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Right Side: Risk Table (Top) & Action Panel (Bottom) */}
      <div className="w-2/5 h-full flex flex-col bg-slate-950 overflow-hidden">
        
        {/* 2. Top Right: Risk Table */}
        <div className="h-1/2 border-b border-slate-800 p-5 flex flex-col overflow-hidden">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <ShieldAlert className="text-red-400 w-4 h-4" />
                Ranked Knowledge Risks
              </h2>
              {/* Glowing formula card */}
              <div className="bg-slate-900 border border-indigo-950/80 px-2 py-0.5 rounded text-[10px] font-mono text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.15)] flex items-center gap-1.5">
                <span className="text-[9px] text-slate-400">Formula:</span>
                <span>R = E &times; C &times; (1 &minus; D)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic risk assessment computed based on git commits, runbooks, and incidents.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-850 rounded-xl bg-slate-900/30">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-850 sticky top-0 backdrop-blur-sm z-10">
                  <th 
                    onClick={() => handleSort('engineer')}
                    className="p-2.5 font-bold tracking-wider uppercase text-[9px] cursor-pointer hover:text-white transition select-none"
                  >
                    <div className="flex items-center gap-1">
                      Engineer
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('service')}
                    className="p-2.5 font-bold tracking-wider uppercase text-[9px] cursor-pointer hover:text-white transition select-none"
                  >
                    <div className="flex items-center gap-1">
                      Service
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('score')}
                    className="p-2.5 font-bold tracking-wider uppercase text-[9px] cursor-pointer hover:text-white transition select-none text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Score
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="p-2.5 font-bold tracking-wider uppercase text-[9px] cursor-pointer hover:text-white transition select-none text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Status
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {sortedPairs.map((pair, idx) => {
                  const isSelected = selectedEngineer === pair.engineer && selectedService === pair.service;
                  return (
                    <tr 
                      key={idx}
                      onClick={() => {
                        setSelectedEngineer(pair.engineer);
                        setSelectedService(pair.service);
                        // Trigger graph focusing if ref loaded
                        const node = graphData.nodes.find(n => n.id === pair.service);
                        if (node && fgRef.current) {
                          fgRef.current.centerAt(node.x, node.y, 800);
                          fgRef.current.zoom(2.5, 800);
                          // Trigger popover showing
                          setTimeout(() => {
                            const coords = fgRef.current.canvas2ScreenCoords(node.x, node.y);
                            if (coords) {
                              setPopover({
                                service: node,
                                x: coords.x,
                                y: coords.y,
                                pair
                              });
                            }
                          }, 850);
                        }
                      }}
                      className={`hover:bg-slate-850/30 cursor-pointer transition-colors duration-150 ${
                        isSelected ? 'bg-indigo-950/20 text-indigo-200' : ''
                      }`}
                    >
                      <td className="p-2.5 font-semibold text-slate-200">{pair.engineer}</td>
                      <td className="p-2.5 text-slate-300 font-mono text-[11px]">{pair.service}</td>
                      <td className="p-2.5 text-right font-bold text-white font-mono">{pair.score.toFixed(2)}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          pair.status === 'RED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          pair.status === 'YELLOW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          pair.status === 'GREEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-slate-800 text-slate-400 border-slate-700 border-dashed'
                        }`}>
                          {pair.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Bottom Right: Action Panel & Interview Chat */}
        <div className="h-1/2 p-5 flex flex-col overflow-hidden bg-slate-950/20">
          
          {/* STATE A: Initial Selection & Resign Simulation Trigger */}
          {!activeSessionId && !completedDelta && (
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-5">
              <div className="text-center space-y-1">
                <h3 className="text-md font-bold text-white">Transition Risk Simulation</h3>
                <p className="text-xs text-slate-400">
                  Select an engineer to simulate their resignation. The AI agent will identify red zones and prepare target questions.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Select departing engineer</label>
                  <div className="relative">
                    <select 
                      value={selectedEngineer}
                      onChange={(e) => setSelectedEngineer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                    >
                      <option value="Priya Nair">Priya Nair (Senior Backend - 3 RED zones)</option>
                      <option value="Rohan Bhat">Rohan Bhat (Data Engineer - Green Decoy)</option>
                      <option value="Karan Shah">Karan Shah (Backend - Yellow zone)</option>
                      <option value="Arjun Mehta">Arjun Mehta (Backend - Green)</option>
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSimulateResignation}
                  disabled={resigningInProgress}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {resigningInProgress ? (
                    <>
                      <RefreshCw className="animate-spin w-3.5 h-3.5" />
                      Analyzing sub-graph...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Simulate Resignation
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STATE B: Active Interview Chat */}
          {activeSessionId && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chat Header: Zone Progress Chips */}
              <div className="bg-slate-900 border border-slate-850 px-3.5 py-2.5 rounded-xl flex items-center justify-between mb-3 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                  <span className="text-xs font-semibold text-white">Interviewing: {selectedEngineer}</span>
                </div>
                
                {/* Zone progress chips */}
                <div className="flex gap-1.5">
                  {zones.length === 0 ? (
                    <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Safe Exit Path
                    </span>
                  ) : (
                    zones.map((z, i) => {
                      const isQuestionZone = currentQuestion?.zone === z.service;
                      const isActive = isQuestionZone && !interviewDone;

                      // Completed is defined if index is higher than current zone index
                      const zoneIndex = zones.findIndex(zone => zone.service === z.service);
                      const currentZoneIndex = currentQuestion ? zones.findIndex(zone => zone.service === currentQuestion.zone) : zones.length;
                      const done = zoneIndex < currentZoneIndex;

                      return (
                        <div 
                          key={i} 
                          title={z.service}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all duration-300 max-w-[90px] truncate ${
                            done 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center gap-0.5' 
                              : isActive 
                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.25)] animate-pulse'
                                : 'bg-slate-950 border-slate-850 text-slate-500'
                          }`}
                        >
                          {done && <CheckCircle className="w-2.5 h-2.5 shrink-0" />}
                          {z.service}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mb-3 flex flex-col">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col max-w-[85%] text-xs ${
                      msg.sender === 'agent' ? 'self-start' : 'self-end ml-auto'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1 text-[10px] text-slate-400">
                      {msg.sender === 'agent' ? (
                        <>
                          <Terminal className="w-3 h-3 text-indigo-400" />
                          <span className="font-bold text-indigo-300">Knowledge Capture Agent</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-bold text-slate-300">{selectedEngineer}</span>
                        </>
                      )}
                    </div>
                    <div 
                      className={`p-3 rounded-2xl whitespace-pre-line shadow-md border ${
                        msg.sender === 'agent' 
                          ? 'bg-slate-900 border-slate-800 text-slate-100 rounded-tl-none' 
                          : 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {submittingAnswer && (
                  <div className="self-start flex flex-col max-w-[80%] text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1 text-[10px]">
                      <Terminal className="w-3 h-3 text-indigo-400" />
                      <span className="font-bold text-indigo-300">Agent thinking...</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-1 text-slate-400">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input or Final Action Button */}
              {interviewDone ? (
                <button 
                  onClick={handleCompleteCapture}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete Capture &amp; Heal Graph
                </button>
              ) : (
                <form onSubmit={handleSubmitAnswer} className="flex gap-2 shrink-0">
                  <input 
                    type="text" 
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Enter exclusive documentation answer..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-900/60"
                  />
                  <button 
                    type="submit" 
                    disabled={!answerText.trim() || submittingAnswer}
                    className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md transition cursor-pointer flex items-center justify-center"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

            </div>
          )}

          {/* STATE C: Risk Delta / Healing View */}
          {completedDelta && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="text-emerald-400 w-4 h-4" />
                  Risk Recomputation Delta
                </h3>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/20 px-2 py-0.5 border border-emerald-950/50 rounded font-semibold">
                  HEALED
                </span>
              </div>

              {/* Delta lists */}
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3 flex-1">
                {completedDelta.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500 italic">
                    No risk changes computed. Graph was already healthy.
                  </div>
                ) : (
                  completedDelta.map((item, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-200 text-xs">{item.service}</div>
                        <div className="text-[10px] text-slate-400">Departing: {item.engineer}</div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Before Score */}
                        <div className="text-right">
                          <div className="text-[9px] text-slate-500 uppercase font-semibold">Before</div>
                          <span className="font-mono font-bold text-red-400">{item.before.score.toFixed(2)}</span>
                        </div>
                        
                        <ChevronRight className="text-slate-600 w-4 h-4" />
                        
                        {/* After Score */}
                        <div className="text-right">
                          <div className="text-[9px] text-slate-500 uppercase font-semibold">After</div>
                          <span className="font-mono font-bold text-emerald-400">{item.after.score.toFixed(2)}</span>
                        </div>

                        {/* Drop percentage */}
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded font-mono font-bold border border-emerald-950/20">
                          -{Math.round(((item.before.score - item.after.score) / item.before.score) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Log Heartbeat Console */}
              <div className="bg-black/90 font-mono text-[9px] text-emerald-400 border border-emerald-950/60 rounded-lg p-3 h-28 overflow-y-auto flex flex-col space-y-1 shadow-inner select-text select-all">
                <div className="flex items-center gap-1.5 border-b border-emerald-950 pb-1 mb-1 text-[8px] text-slate-500 uppercase font-sans font-bold">
                  <Terminal className="w-3 h-3 text-emerald-500" />
                  Cognee Memory Sync Log
                </div>
                {eventsToShow.map((evt, idx) => (
                  <div key={idx} className="leading-relaxed animate-fade-in">
                    <span className="text-emerald-600 select-none">&gt;</span> {evt}
                  </div>
                ))}
                {eventsToShow.length < completedEvents.length && (
                  <div className="text-slate-600 italic select-none">Syncing memory block...</div>
                )}
                <div ref={chatEndRef} />
              </div>

              <button 
                onClick={handleResetDemo}
                className="mt-3.5 w-full bg-slate-900 hover:bg-slate-850 active:bg-slate-800 text-slate-200 border border-slate-800 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Simulate Another Departure
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
