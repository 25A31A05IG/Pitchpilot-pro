import React, { useState } from 'react';
import { 
  Rocket, 
  Cpu, 
  MessageSquareCheck, 
  Sparkles, 
  Send, 
  Presentation,
  Download,
  Mic,
  Volume2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Target,
  Layers
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL 
  ? import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '') 
  : 'http://127.0.0.1:5000';

const API_BASE = `${BACKEND_URL}/api`;

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [pitchData, setPitchData] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Judge Simulator State
  const [judgeQuestion, setJudgeQuestion] = useState('How do you plan to scale this system and defend against competitors?');
  const [userAnswer, setUserAnswer] = useState('');
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgeFeedback, setJudgeFeedback] = useState(null);
  
  // Voice & Export State
  const [isListening, setIsListening] = useState(false);
  const [exportingPPTX, setExportingPPTX] = useState(false);

  // 1. Analyze Repo
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;
    setLoading(true);
    setPitchData(null);
    setJudgeFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: repoUrl }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert('Server Error: ' + (data.message || data.detail || JSON.stringify(data)));
        return;
      }

      if (data.status === 'success') {
        setPitchData(data.data);
        if (data.data.initial_judge_question) {
          setJudgeQuestion(data.data.initial_judge_question);
        }
      } else {
        alert('Error parsing pitch data.');
      }
    } catch (err) {
      alert('Failed to connect to backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Judge Evaluation
  const handleJudgeSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer || !pitchData) return;
    setJudgeLoading(true);

    try {
      const res = await fetch(`${API_BASE}/judge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitch_context: pitchData,
          question: judgeQuestion,
          answer: userAnswer,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setJudgeFeedback(data.data);
        if (data.data.follow_up_question) {
          setJudgeQuestion(data.data.follow_up_question);
          setUserAnswer('');
        }
      }
    } catch (err) {
      alert('Error communicating with judge API.');
    } finally {
      setJudgeLoading(false);
    }
  };

  // 3. Export to PowerPoint (.pptx)
  const handleDownloadPPTX = async () => {
    if (!pitchData) return;
    setExportingPPTX(true);
    try {
      const res = await fetch(`${API_BASE}/export-pptx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pitchData),
      });

      if (!res.ok) throw new Error('Failed to generate presentation');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (pitchData.project_name || 'PitchDeck').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanName}_PitchDeck.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('PPTX Export failed: ' + err.message);
    } finally {
      setExportingPPTX(false);
    }
  };

  // 4. Voice-to-Text (Speech Recognition)
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  // 5. Text-to-Speech (Judge Audio)
  const handleSpeakQuestion = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(judgeQuestion);
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-zinc-100 p-6 md:p-12 relative overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800/80 pb-6 backdrop-blur-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 rounded-2xl shadow-lg shadow-indigo-500/25 border border-white/10 ring-1 ring-white/10">
              <Rocket className="w-6 h-6 text-white drop-shadow" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                PitchPilot <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 font-black text-xs px-2 py-0.5 rounded-full border border-cyan-400/30 bg-cyan-950/40">PRO</span>
              </h1>
              <p className="text-xs font-medium text-zinc-400 mt-0.5">Autonomous Codebase-to-Pitch & VC Simulator</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs bg-zinc-900/90 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-400 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-semibold tracking-wide">System Online</span>
          </div>
        </header>

        {/* Input Bar */}
        <section className="bg-zinc-900/50 border border-zinc-800/90 p-5 md:p-6 rounded-3xl shadow-2xl backdrop-blur-xl relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-indigo-500/20 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500 pointer-events-none"></div>
          
          <form onSubmit={handleAnalyze} className="relative flex flex-col md:flex-row gap-3.5">
            <input
              type="url"
              placeholder="Paste public GitHub repository URL (e.g. https://github.com/owner/repo)"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="flex-1 bg-zinc-950/80 border border-zinc-700/60 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 rounded-2xl px-5 py-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all shadow-inner"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 font-semibold rounded-2xl text-sm text-white flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-cyan-200" />
                  <span>Synthesizing Engine...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4 text-cyan-200" />
                  <span>Generate Pitch</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Results Section */}
        {pitchData && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Overview Card */}
            <div className="relative bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-7 md:p-9 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase bg-cyan-950/60 border border-cyan-800/50 px-3 py-1 rounded-full inline-block">
                    Executive 1-Liner
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">{pitchData.project_name}</h2>
                  <p className="text-lg text-indigo-200/90 font-medium italic">"{pitchData.tagline}"</p>
                </div>
                
                {/* PPTX Export Button */}
                <button
                  onClick={handleDownloadPPTX}
                  disabled={exportingPPTX}
                  className="self-start md:self-center px-5 py-3 bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700 hover:border-zinc-600 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition-all text-zinc-100 shadow-lg active:scale-95"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  {exportingPPTX ? 'Packaging Deck...' : 'Export Slides (.pptx)'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-zinc-800/80 relative z-10">
                <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/70 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2 text-rose-400 mb-2">
                    <Target className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Problem</h4>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{pitchData.problem_statement}</p>
                </div>
                
                <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/70 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2 text-cyan-400 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Target Market</h4>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{pitchData.target_market}</p>
                </div>

                <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/70 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Competitive Moat</h4>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{pitchData.competitive_moat}</p>
                </div>
              </div>
            </div>

            {/* Slide Deck Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  5-Slide Investor Deck
                </h3>
                <span className="text-xs font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
                  Slide {activeSlide + 1} of {pitchData.slides?.length || 5}
                </span>
              </div>

              {/* Slide Selector Pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {pitchData.slides?.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                      activeSlide === idx 
                        ? 'bg-indigo-600 text-white border-indigo-400/50 shadow-md shadow-indigo-600/30' 
                        : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    Slide {s.slide_number}: {s.title}
                  </button>
                ))}
              </div>

              {/* Active Slide Canvas */}
              {pitchData.slides && pitchData.slides[activeSlide] && (
                <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/90 p-8 md:p-10 rounded-3xl shadow-xl min-h-[240px] relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
                    <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest">
                      Slide 0{pitchData.slides[activeSlide].slide_number}
                    </span>
                    <Presentation className="w-4 h-4 text-zinc-600" />
                  </div>
                  
                  <h4 className="text-2xl font-bold text-white mt-4">{pitchData.slides[activeSlide].title}</h4>
                  
                  <ul className="mt-6 space-y-3.5">
                    {pitchData.slides[activeSlide].bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3.5 text-zinc-300 text-sm md:text-base leading-relaxed">
                        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 mt-2 shrink-0 shadow-sm shadow-cyan-400/50"></span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Judge Simulation Drill */}
            <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800/90 p-6 md:p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-zinc-800/70 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <MessageSquareCheck className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100">Interactive VC Defense</h3>
                </div>
                <button
                  type="button"
                  onClick={handleSpeakQuestion}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Read Question
                </button>
              </div>

              {/* Question Banner */}
              <div className="p-5 bg-amber-950/20 border border-amber-500/20 rounded-2xl text-amber-200 text-sm leading-relaxed relative">
                <span className="font-bold text-amber-400 block text-xs uppercase tracking-wider mb-1">Incoming Judge Query:</span>
                {judgeQuestion}
              </div>

              {/* Answer Input */}
              <form onSubmit={handleJudgeSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Formulate your pitch defense or click the microphone to speak..."
                    className="w-full bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 focus:ring-2 focus:ring-amber-500/20 pr-12 transition-all resize-none shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`absolute right-3.5 bottom-4 p-2 rounded-xl transition-all ${
                      isListening 
                        ? 'bg-rose-600 text-white ring-4 ring-rose-500/20 animate-pulse' 
                        : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                    }`}
                    title="Speak Answer"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={judgeLoading}
                    className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 font-semibold rounded-xl text-sm text-white flex items-center gap-2.5 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
                  >
                    {judgeLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-200" /> 
                        <span>Benchmarking Defense...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> 
                        <span>Submit Pitch Defense</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Feedback Modal */}
              {judgeFeedback && (
                <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">Scorecard Analysis</span>
                    <span className="text-xs font-black px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full">
                      Score: {judgeFeedback.score}/10 — {judgeFeedback.verdict}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed pt-1">{judgeFeedback.feedback}</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
