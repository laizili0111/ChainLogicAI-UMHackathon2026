"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Database, Save, X, GripVertical, CalendarDays, GitBranch, Settings, RefreshCw, ChevronDown } from "lucide-react";
import { TabKey, LedgerCell, useLedgerStore } from "@/store/useLedgerStore";
import LogisticsMap from "@/components/LogisticsMap";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const PLUGINS = [
  { id: 'custom', icon: '📝', label: 'Human Overrides' },
  { id: 'weather', icon: '🌧️', label: 'MET Live Weather' },
  { id: 'traffic', icon: '🚦', label: 'Waze Live Traffic' },
  { id: 'holiday', icon: '📅', label: 'UM Campus Calendar' },
  { id: 'routing', icon: '📍', label: 'Delivery Routing Map' },
];

function DraggablePlugin({ plugin }: { plugin: any }) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({ id: plugin.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`flex items-center p-4 rounded-xl border cursor-grab select-none transition-colors shadow-md ${
        isDragging ? 'opacity-90 border-amber-400 bg-[#5e5142] scale-105 z-50 shadow-black/40 shadow-2xl relative' 
                   : 'border-[#6b5e4f] bg-[#4a4034] hover:bg-[#5c4f40]'
      }`}
    >
       <GripVertical className="w-4 h-4 text-[#baa182] mr-3 shrink-0" />
       <span className="text-2xl mr-3">{plugin.icon}</span>
       <span className="text-sm font-bold text-[#f2ebd4] tracking-wide">{plugin.label}</span>
    </div>
  );
}

function DroppableCanvas({ children }: any) {
  const {isOver, setNodeRef} = useDroppable({ id: 'canvas' });
  
  return (
    <div ref={setNodeRef} className={`flex-1 transition-all rounded-3xl min-h-[500px] ${isOver ? 'ring-2 ring-amber-500/50 bg-amber-500/5 shadow-[0_0_50px_-12px_rgba(245,158,11,0.15)]' : ''}`}>
       {children}
    </div>
  );
}

function OnboardingModal() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const { setHasInitializedErp, setUniversalTruth } = useLedgerStore();

  const handleInitialize = async () => {
     if(!inputText.trim()) return;
     setLoading(true);
     try {
        const response = await fetch("http://localhost:8000/api/initialize-erp", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ universal_truth: inputText })
        });
        if(response.ok) {
           setUniversalTruth(inputText);
           setHasInitializedErp(true);
        }
     } catch (e) {
        console.error(e);
     } finally {
        setLoading(false);
     }
  };

  return (
     <div className="fixed inset-0 z-[100] bg-[#2c2621] flex flex-col items-center justify-center p-6 text-[#e6dccf] selection:bg-amber-500/20">
        <div className="max-w-2xl w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="flex justify-center mb-10">
              <span className="w-4 h-4 rounded-full bg-amber-500 animate-pulse ring-8 ring-amber-500/20"></span>
           </div>
           
           <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#f2ebd4] text-center mb-4">
              Zero-Setup ERP.
           </h1>
           <p className="text-lg text-[#8c7f6e] text-center mb-12 leading-relaxed font-serif">
              Describe your business operations. Z.AI will dynamically build your entire generalized database schema instantly.
           </p>

           <div className="bg-[#332c25] border border-[#52493f] rounded-3xl p-8 shadow-2xl">
              <textarea 
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 className="w-full bg-[#251f1b] border border-[#453d34] rounded-xl p-6 text-xl text-[#f2ebd4] placeholder:text-[#6b5e4f] focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition-all resize-none min-h-[160px]"
                 placeholder="e.g. I am a freelance software engineer. I need to track my active side projects, hourly rates, and unpaid clients."
                 autoFocus
              />
              
              <div className="mt-8 flex justify-end">
                 <button 
                    onClick={handleInitialize}
                    disabled={loading || !inputText.trim()}
                    className={`px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all shadow-lg flex items-center ${
                       loading 
                          ? "bg-[#4a4034] text-[#8c7f6e] cursor-wait" 
                          : "bg-amber-600 hover:bg-amber-500 text-white hover:shadow-amber-900/40 hover:-translate-y-1"
                    }`}
                 >
                    {loading ? (
                        <>
                           <div className="w-5 h-5 border-2 border-[#8c7f6e] border-t-white rounded-full animate-spin mr-3"></div>
                           Architecting Database...
                        </>
                    ) : (
                        "Initialize Universal Schema"
                    )}
                 </button>
              </div>
           </div>
        </div>
     </div>
  );
}

export default function SmartLedger() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const { hasInitializedErp, universalTruth, activeTab, days, setActiveTab, addCell, updateCellPlan, toggleCellCollapse, addContext, removeContext, setCustomContextText, setUniversalTruth } = useLedgerStore();
  const currentDay = days[activeTab];

  const [loading, setLoading] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [showContextEditor, setShowContextEditor] = useState(false);
  const [contextDraft, setContextDraft] = useState(universalTruth);
  const [reInitLoading, setReInitLoading] = useState(false);
  const [reInitSuccess, setReInitSuccess] = useState(false);

  const handleReInitialize = async () => {
    if (!contextDraft.trim()) return;
    setReInitLoading(true);
    setReInitSuccess(false);
    try {
      const response = await fetch("http://localhost:8000/api/initialize-erp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universal_truth: contextDraft }),
      });
      if (response.ok) {
        setUniversalTruth(contextDraft);
        setReInitSuccess(true);
        setTimeout(() => { setReInitSuccess(false); setShowContextEditor(false); }, 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReInitLoading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Type an operational note to log in the chain...' })
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setEditorContent(editor.getText());
    },
    editorProps: {
      attributes: {
         class: 'prose prose-invert prose-stone max-w-none focus:outline-none min-h-[100px] text-lg text-[#f2ebd4]'
      }
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (over && over.id === 'canvas') {
      addContext(activeTab, active.id as string);
    }
  };

  const handleGenerateCell = async () => {
    if (!editor || !editorContent.trim()) return;
    const noteHTML = editor.getHTML();
    const cleanNote = noteHTML.replace(/<[^>]*>?/gm, '');

    const newCellId = "cell-" + Date.now();
    const newCell: LedgerCell = {
        id: newCellId,
        timestamp: Date.now(),
        completedAt: null,
        noteText: noteHTML,
        generatedPlan: null,
        isCollapsed: false,
        activeContexts: [...currentDay.activeContexts],
        customContextText: currentDay.customContextText,
        executedOptionId: null
    };

    addCell(activeTab, newCell);
    editor.commands.clearContent();
    setEditorContent('');
    setLoading(true);

    // Cumulative context
    const prevText = currentDay.cells.map((c, i) => `Log Entry ${i+1}:\n${c.noteText.replace(/<[^>]*>?/gm, '')}`).join('\n\n');
    const cumulativeText = prevText ? `${prevText}\n\nLog Entry ${currentDay.cells.length + 1}:\n${cleanNote}` : `Log Entry 1:\n${cleanNote}`;

    try {
      const response = await fetch("http://localhost:8000/api/generate-ledger-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           document_text: cumulativeText, 
           active_plugins: newCell.activeContexts,
           custom_context_notes: newCell.customContextText
        }),
      });
      if (!response.ok) {
         const errData = await response.json().catch(()=>({}));
         throw new Error(errData.detail || `Server returned ${response.status}`);
      }
      const data = await response.json();
      updateCellPlan(activeTab, newCellId, data);
    } catch (error: any) {
      console.error("Failed to connect to backend:", error);
      updateCellPlan(activeTab, newCellId, { blocks: [{type: "alert", content: `${error.message}`}] });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (cellId: string, option_id: string, action_text: string) => {
    try {
      const response = await fetch("http://localhost:8000/api/execute-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_id, sku: "ACTION", action: action_text }),
      });
      const data = await response.json();
      if (data.status === "success") {
        useLedgerStore.getState().executeCellAction(activeTab, cellId, option_id);
      }
    } catch (error) {
      console.error("Execution failed:", error);
    }
  };

  if (!isMounted) return null;
  if (!hasInitializedErp) return <OnboardingModal />;

  return (
    <DndContext onDragEnd={handleDragEnd} id="ledger-dnd-context">
      <main className="min-h-screen bg-[#2c2621] text-[#e6dccf] font-sans selection:bg-amber-500/20 overflow-y-auto pb-32">
        
        <header className="border-b border-[#453d34] bg-[#251f1b]/90 pt-10 pb-6 sticky top-0 z-50 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ring-4 ring-amber-500/20"></span>
                <h1 className="text-xl font-bold tracking-tight text-[#f2ebd4]">ChainLogic AI</h1>
                <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20">AGENTIC LEDGER</span>
              </div>

              {/* TABS MENU */}
              <div className="flex space-x-1.5 p-1.5 bg-[#201c18] rounded-xl border border-[#40372f] overflow-x-auto shadow-inner">
                 {(['Yesterday', 'Today', 'Tomorrow'] as TabKey[]).map(tab => (
                    <button 
                       key={tab} 
                       onClick={() => setActiveTab(tab)}
                       className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                         activeTab === tab 
                           ? 'bg-[#6b5843] text-[#f2ebd4] shadow-md border border-[#856f56] cursor-default' 
                           : 'text-[#8c7f6e] hover:text-[#d6cab7] hover:bg-[#332c25]'
                       }`}
                    >
                       <CalendarDays className={`w-4 h-4 mr-2 ${activeTab === tab ? 'text-amber-400' : 'text-[#73685a]'}`} />
                       {tab}
                    </button>
                 ))}
              </div>

              {/* BUSINESS CONTEXT TOGGLE */}
              <button
                onClick={() => { setShowContextEditor(v => !v); setContextDraft(universalTruth); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all border ${
                  showContextEditor
                    ? 'bg-amber-600/20 border-amber-500/50 text-amber-400'
                    : 'bg-[#332c25] border-[#52493f] text-[#8c7f6e] hover:text-[#d6cab7] hover:border-[#6b5e4f]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Business Context
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showContextEditor ? 'rotate-180' : ''}`} />
              </button>

            </div>
          </div>

          {/* CONTEXT EDITOR SLIDE-DOWN PANEL */}
          {showContextEditor && (
            <div className="border-t border-[#453d34] bg-[#1d1814] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-w-[1400px] mx-auto px-6 py-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-3">Business Context — Universal Truth</p>
                <div className="flex gap-4 items-start">
                  <textarea
                    value={contextDraft}
                    onChange={(e) => setContextDraft(e.target.value)}
                    rows={3}
                    className="flex-1 bg-[#251f1b] border border-[#453d34] rounded-xl px-4 py-3 text-sm text-[#f2ebd4] placeholder:text-[#6b5e4f] focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition-all resize-none"
                  />
                  <button
                    onClick={handleReInitialize}
                    disabled={reInitLoading || !contextDraft.trim() || contextDraft === universalTruth}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shrink-0 ${
                      reInitSuccess
                        ? "bg-[#253f2c] text-[#86efac] border border-[#166534]"
                        : reInitLoading
                        ? "bg-[#4a4034] text-[#8c7f6e] cursor-wait border border-[#52493f]"
                        : contextDraft === universalTruth
                        ? "bg-[#332c25] text-[#73685a] border border-[#453d34] cursor-not-allowed"
                        : "bg-amber-600 hover:bg-amber-500 text-white border border-amber-500 hover:-translate-y-0.5"
                    }`}
                  >
                    {reInitSuccess ? (
                      "✓ Rebuilt"
                    ) : reInitLoading ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Rebuilding...</>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5" /> Re-initialize Schema</>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-[#73685a] mt-2">Changing the context will rebuild the ERP entity database. Running log cells are not affected.</p>
              </div>
            </div>
          )}
        </header>

        <div className="max-w-[1400px] w-full mx-auto px-4 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDEBAR: GIT TIMELINE TREE (20%) */}
            <div className="lg:col-span-3 hidden lg:block">
               <div className="sticky top-32">
                 <h3 className="text-[10px] font-bold tracking-widest uppercase text-amber-500 mb-6 flex items-center bg-[#251f1b] p-3 rounded-lg border border-[#453d34]">
                    <GitBranch className="w-4 h-4 mr-2" /> Operations Thread
                 </h3>
                 <div className="pl-6 border-l-2 border-[#453d34] space-y-8 py-2 relative">
                    {currentDay.cells.length === 0 && (
                        <p className="text-xs text-[#8c7f6e] absolute top-2 -left-6 ml-12">No nodes generated.</p>
                    )}
                    {currentDay.cells.map((cell, idx) => (
                       <div key={cell.id} className="relative group">
                          <span className="absolute -left-[31px] top-2 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-[#2c2621] group-hover:scale-125 transition-transform"></span>
                          <button 
                              onClick={() => document.getElementById(`cell-${cell.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                              className="text-left w-full hover:bg-[#332c25] p-3 rounded-xl transition-all border border-transparent hover:border-[#52493f] shadow-sm ml-2"
                          >
                              <p className="text-xs font-bold text-[#f2ebd4]">Execution Block {idx + 1}</p>
                              <p className={`text-[10px] uppercase tracking-widest mt-1.5 font-bold ${cell.generatedPlan ? 'text-[#a69785]' : 'text-amber-500 animate-pulse'}`}>
                                  {cell.generatedPlan ? '✔ Compiled' : 'Processing...'}
                              </p>
                          </button>
                       </div>
                    ))}
                    {/* Active Draft Node Indicator */}
                    <div className="relative">
                        <span className="absolute -left-[31px] top-2 w-3.5 h-3.5 rounded-full border-[3px] border-[#6b5e4f] bg-[#2c2621]"></span>
                        <div className="p-3 ml-2">
                           <p className="text-[10px] font-bold tracking-widest uppercase text-[#73685a] italic">Active Draft Mode...</p>
                        </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* CENTER: JUPYTER CANVAS (60%) */}
            <div className="lg:col-span-6">
               <DroppableCanvas>
                  <div className="space-y-16">
                     
                     {/* MAPPED COMPLETED CELLS */}
                     {currentDay.cells.map((cell, idx) => (
                         <div key={cell.id} id={`cell-${cell.id}`} className="relative bg-[#332c25] rounded-3xl border border-[#52493f] shadow-xl animate-in fade-in slide-in-from-bottom-4 group">
                             
                             {/* Input Area */}
                             <div className="p-6 md:p-10 border-b border-[#453d34]">
                                {/* Sequence label & Plugins snapshot */}
                                <div className="flex justify-between items-start mb-6">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-[#baa182] flex items-center bg-[#251f1b] px-3 py-1.5 rounded-md border border-[#453d34]">
                                        <span className="text-amber-500 mr-2">In[{idx + 1}]</span>
                                    </p>
                                    <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        {cell.activeContexts.map(ctx => {
                                            if(ctx === 'custom') return <span key={ctx} className="px-2 py-1 bg-[#8f7532] text-[#fffaeb] text-[10px] rounded border border-[#b59645]">Human Override</span>;
                                            return <span key={ctx} className="px-2 py-1 bg-[#4a4034] text-[#d6cab7] text-[10px] rounded border border-[#6b5e4f]">{PLUGINS.find(p => p.id === ctx)?.icon}</span>;
                                        })}
                                    </div>
                                </div>

                                <div className="prose prose-invert prose-stone text-[#f2ebd4] font-serif leading-relaxed text-lg" dangerouslySetInnerHTML={{__html: cell.noteText}} />
                                
                                {/* Custom Snapshot Note Content */}
                                {cell.activeContexts.includes('custom') && cell.customContextText && (
                                    <div className="mt-6 p-4 bg-[#8f7532]/10 border border-[#b59645]/40 rounded-xl">
                                        <p className="text-xs text-[#d9c490] italic">" {cell.customContextText} "</p>
                                    </div>
                                )}
                             </div>

                             {/* Output Area */}
                             <div className="p-6 md:p-10 bg-[#251f1b]/50 rounded-b-3xl relative">
                                {cell.generatedPlan ? (
                                    <div>
                                       {/* Out header row */}
                                       <div className="flex justify-between items-center mb-6">
                                           <p className="text-[10px] font-bold tracking-widest uppercase flex items-center text-amber-500">
                                             Out[{idx + 1}]
                                           </p>
                                           <div className="flex items-center space-x-4">
                                               <span className="text-[10px] text-[#73685a] font-mono">{cell.completedAt ? `${((cell.completedAt - cell.timestamp) / 1000).toFixed(2)}s latency` : ''}</span>
                                               <button onClick={() => toggleCellCollapse(activeTab, cell.id)} className="px-3 py-1 bg-[#3a332a] border border-[#52493f] rounded text-[#baa182] text-xs font-bold hover:bg-[#4a4034] hover:text-[#f2ebd4] transition-colors shadow-sm">
                                                  {cell.isCollapsed ? 'Expand Tree' : 'Collapse Output [-]'}
                                               </button>
                                           </div>
                                       </div>
                                       
                                       {/* Collapsed vs Expanded body */}
                                       {cell.isCollapsed ? (
                                           <div className="py-2 text-[#8c7f6e] text-sm italic font-serif flex items-center">
                                              <Database className="w-3 h-3 mr-2" /> Output safely folded. Expansion required to reveal metrics...
                                           </div>
                                       ) : (
                                           <div className="space-y-10 animate-in fade-in duration-300">
                                              {cell.generatedPlan.blocks?.map((block: any, bi: number) => {
                                                  if (block.type === 'text') {
                                                    return <p key={bi} className="text-lg text-[#e6dccf] leading-relaxed font-serif border-l-4 border-amber-600/50 pl-6 py-2 bg-gradient-to-r from-amber-900/10 to-transparent">{block.content}</p>;
                                                  }
                                                  if (block.type === 'alert') {
                                                    return (
                                                      <div key={bi} className="p-6 rounded-2xl bg-[#54302b] border border-[#9c4a40] flex items-start shadow-md">
                                                        <AlertTriangle className="w-5 h-5 mr-4 shrink-0 text-[#fca5a5]" />
                                                        <div><span className="text-[#fecaca] leading-relaxed text-sm font-medium">{block.content}</span></div>
                                                      </div>
                                                    );
                                                  }
                                                  if (block.type === 'metric') {
                                                    return (
                                                      <div key={bi} className="grid grid-cols-2 lg:grid-cols-3 gap-6 bg-[#42392f] p-8 rounded-2xl border border-[#605244] shadow-md">
                                                         <div><p className="text-[10px] uppercase tracking-widest text-[#baa182] font-bold mb-2">Metrics Core</p><p className="text-2xl font-mono text-[#f2ebd4]">{block.data.target}</p></div>
                                                         <div><p className="text-[10px] uppercase tracking-widest text-[#baa182] font-bold mb-2">Impact State</p><p className="text-2xl font-mono text-amber-500 font-black">{block.data.savings}</p></div>
                                                         <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 lg:border-l border-[#605244] pt-4 lg:pt-0 lg:pl-6"><p className="text-[10px] uppercase tracking-widest text-[#baa182] font-bold mb-2">SLA Protocol</p><p className="text-sm text-[#d6cab7] leading-relaxed">{block.data.reason}</p></div>
                                                      </div>
                                                    );
                                                  }
                                                  if (block.type === 'map') {
                                                    return (
                                                      <div key={bi} className="relative w-full h-[400px] rounded-3xl border border-[#52493f] bg-[#1a1613] overflow-hidden shadow-2xl">
                                                         <div className="absolute top-4 left-4 z-20"><span className="px-4 py-2 rounded-full text-[10px] font-bold tracking-widest bg-[#2c2621]/90 border border-[#52493f] text-amber-500">📍 Z.AI TOPOLOGY ENGINE</span></div>
                                                         <LogisticsMap insight={block.data.status === 'incident' ? true : null} executedOption={cell.executedOptionId} />
                                                      </div>
                                                    );
                                                  }
                                                  if (block.type === 'action_cards') {
                                                     return (
                                                       <div key={bi} className="bg-[#3a332a]/60 p-6 md:p-8 rounded-3xl border border-[#52493f] shadow-inner">
                                                         <div className="space-y-4">
                                                           {block.options?.map((opt: any) => (
                                                             <div key={opt.id} className={`rounded-2xl border transition-colors shadow-md overflow-hidden ${
                                                               opt.recommended
                                                                 ? 'border-amber-500/60 bg-gradient-to-br from-[#4a3e26] to-[#3a3020] ring-1 ring-amber-500/20'
                                                                 : 'border-[#6b5e4f] bg-[#4a4034] hover:bg-[#5c4f40]'
                                                             }`}>
                                                               {opt.recommended && (
                                                                 <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                                                               )}
                                                               <div className="p-5 flex flex-col gap-3">
                                                                 {opt.recommended && (
                                                                   <span className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
                                                                     ⭐ Z.AI Optimal
                                                                   </span>
                                                                 )}
                                                                 <h4 className="font-bold text-[#f2ebd4] text-base leading-snug">{opt.action}</h4>
                                                                 <p className="text-sm text-[#d6cab7] leading-relaxed">{opt.justification}</p>
                                                                 <div className="flex justify-end pt-3 border-t border-white/5">
                                                                   <button
                                                                     onClick={() => handleExecute(cell.id, opt.id, opt.action)}
                                                                     disabled={cell.executedOptionId !== null}
                                                                     className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all tracking-widest ${
                                                                       cell.executedOptionId === opt.id
                                                                         ? "bg-[#253f2c] text-[#86efac] border border-[#166534] ring-1 ring-green-500/30 cursor-default"
                                                                         : cell.executedOptionId !== null
                                                                         ? "bg-[#332c25] text-[#73685a] border border-[#453d34] cursor-not-allowed"
                                                                         : opt.recommended
                                                                         ? "bg-amber-600 hover:bg-amber-500 text-white border border-amber-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-900/40"
                                                                         : "bg-[#6b5e4f] hover:bg-[#7a6a57] text-[#f2ebd4] border border-[#85735f]"
                                                                     }`}
                                                                   >
                                                                     {cell.executedOptionId === opt.id ? "✓ EXECUTED" : opt.recommended ? "EXECUTE OPTIMAL" : "FIRE PAYLOAD"}
                                                                   </button>
                                                                 </div>
                                                               </div>
                                                             </div>
                                                           ))}
                                                         </div>
                                                       </div>
                                                     );
                                                   }
                                                  return null;
                                              })}
                                           </div>
                                       )}
                                    </div>
                                ) : (
                                    <div className="flex items-center text-[#8c7f6e] text-sm animate-pulse py-4 font-mono">
                                        <div className="w-5 h-5 border-2 border-[#8c7f6e] border-t-amber-500 rounded-full animate-spin mr-3"></div>
                                        Z.AI Engine crunching universal records...
                                    </div>
                                )}
                             </div>
                         </div>
                     ))}

                     {/* THE DRAFT CELL (NEW CELL) */}
                     <div id="draft-cell" className="relative group mt-24">
                        
                        {/* Dynamic Floating Contexts Row directly above the Input */}
                        {currentDay.activeContexts.length > 0 && (
                            <div className="mb-4 bg-[#332c25] border border-[#52493f] rounded-2xl p-5 shadow-lg relative bottom-top-in transition-all">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#baa182] mr-2">Attached Modules:</span>
                                    {currentDay.activeContexts.map((id: string) => {
                                       if (id === 'custom') return null;
                                       const p = PLUGINS.find(x => x.id === id);
                                       if(!p) return null;
                                       return (
                                         <span key={p.id} className="inline-flex items-center px-4 py-1.5 bg-[#4a4034] border border-[#6b5e4f] rounded-full text-xs font-bold text-[#f2ebd4] shadow-sm transform hover:scale-105 transition-transform duration-200">
                                            <span className="mr-2 text-sm">{p.icon}</span> {p.label}
                                            <button onClick={() => removeContext(activeTab, p.id)} className="ml-3 text-[#d6cab7] hover:text-red-400 transition-colors"><X className="w-3 h-3"/></button>
                                         </span>
                                       )
                                    })}
                                </div>
                                
                                {currentDay.activeContexts.includes('custom') && (
                                  <div className="mt-4 bg-[#8f7532] rounded-xl border border-[#b59645] shadow-inner p-5 animate-in fade-in">
                                     <div className="flex justify-between items-center mb-3 border-b border-[#cca749]/40 pb-2">
                                        <span className="text-[10px] uppercase tracking-widest font-bold text-[#e8dcb3] flex items-center">
                                           <span className="text-sm mr-2">📝</span> Human-in-the-Loop Override
                                        </span>
                                        <button onClick={() => removeContext(activeTab, 'custom')} className="text-[#fadd91] hover:text-white transition-colors"><X className="w-4 h-4"/></button>
                                     </div>
                                     <textarea
                                        value={currentDay.customContextText}
                                        onChange={(e) => setCustomContextText(activeTab, e.target.value)}
                                        placeholder="Force local context parameters over API limits... (e.g. 'Supplier A is sick, cap run rate to 50%')"
                                        className="w-full bg-transparent border-none focus:ring-0 resize-none text-[#fffaeb] placeholder:text-[#e8dcb3]/80 placeholder:italic focus:outline-none min-h-[50px] font-serif"
                                     />
                                  </div>
                                )}
                            </div>
                        )}

                        <div className="bg-[#2a241f] rounded-3xl border-2 border-amber-600/30 p-8 shadow-[0_0_40px_-15px_rgba(217,119,6,0.1)] ring-1 ring-amber-500/10 focus-within:border-amber-500 focus-within:ring-amber-500/20 transition-all">
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-[#8c7f6e] bg-[#251f1b] border border-[#453d34] px-3 py-1.5 rounded-md">
                                    <span className="text-amber-600 font-black mr-2">In[{currentDay.cells.length + 1}]</span> Awaiting Execution... 
                                </p>
                            </div>
                            
                            <EditorContent editor={editor} onClick={() => editor?.commands.focus()} className="cursor-text min-h-[140px] text-xl" />
                            
                            <div className="flex justify-end mt-8 border-t border-[#453d34] pt-8">
                                <button
                                  onClick={handleGenerateCell}
                                  disabled={loading || !editorContent.trim()}
                                  className={`px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all shadow-lg flex items-center ${
                                    loading || !editorContent.trim()
                                       ? "bg-[#332c25] text-[#73685a] cursor-not-allowed border border-[#453d34]"
                                       : "bg-amber-600 border mx-auto my-auto border-amber-400 text-white hover:bg-amber-500 hover:shadow-amber-900/40 hover:-translate-y-1 hover:shadow-2xl"
                                  }`}
                                >
                                   {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />}
                                   Commit Cell & Run Z.AI
                                </button>
                            </div>
                        </div>
                     </div>

                  </div>
               </DroppableCanvas>
            </div>
            
            {/* RIGHT SIDEBAR PLUGINS — Fixed to viewport, always accessible */}
            <div className="hidden lg:block fixed right-6 top-36 w-64 z-40">
               <h3 className="text-[10px] font-bold tracking-widest uppercase text-amber-500 mb-4 bg-amber-950/40 inline-flex items-center px-4 py-2 rounded-lg border border-amber-900/40 shadow-sm">
                 Z.AI Modifiers
               </h3>                 
               <div className="space-y-4">
                  {PLUGINS.map(p => {
                     if (currentDay.activeContexts.includes(p.id)) return null;
                     return <DraggablePlugin key={p.id} plugin={p} />
                  })}
               </div>
            </div>

        </div>
      </main>
    </DndContext>
  );
}
