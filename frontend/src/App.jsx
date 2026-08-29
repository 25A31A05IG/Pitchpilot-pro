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
  RefreshCw
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <Rocket className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">PitchPilot Pro</h1>
              <p className="text-sm text-slate-400">Autonomous Repo-to-Pitch & VC Simulator</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live
          </div>
        </header>

        {/* Input Bar */}
        <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm">
          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4">
            <input
              type="url"
              placeholder="Paste public GitHub repository URL (e.g. https://github.com/owner/repo)"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Analyzing Codebase...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  Generate Pitch
                </>
              )}
            </button>
          </form>
        </section>

        {/* Results */}
        {pitchData && (
          <div className="space-y-8">
            
            {/* Overview Card */}
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 md:p-8 rounded-2xl shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">Executive 1-Liner</span>
                  <h2 className="text-3xl font-bold mt-1 text-white">{pitchData.project_name}</h2>
                  <p className="text-lg text-indigo-200/90 mt-2 font-medium italic">"{pitchData.tagline}"</p>
                </div>
                
                {/* PPTX Export Button */}
                <button
                  onClick={handleDownloadPPTX}
                  disabled={exportingPPTX}
                  className="self-start md:self-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all text-indigo-300 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  {exportingPPTX ? 'Generating PPTX...' : 'Export Slides (.pptx)'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase">Problem</h4>
                  <p className="text-sm text-slate-200 mt-1">{pitchData.problem_statement}</p>
                </div>
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase">Target Market</h4>
                  <p className="text-sm text-slate-200 mt-1">{pitchData.target_market}</p>
                </div>
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase">Moat</h4>
                  <p className="text-sm text-slate-200 mt-1">{pitchData.competitive_moat}</p>
                </div>
              </div>
            </div>

            {/* Slide Deck */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Presentation className="w-5 h-5 text-indigo-400" />
                  5-Slide Investor Deck
                </h3>
                <span className="text-xs text-slate-400">Slide {activeSlide + 1} of {pitchData.slides?.length || 5}</span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {pitchData.slides?.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      activeSlide === idx 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Slide {s.slide_number}: {s.title}
                  </button>
                ))}
              </div>

              {pitchData.slides && pitchData.slides[activeSlide] && (
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl min-h-[220px]">
                  <span className="text-xs text-indigo-400 font-semibold uppercase">Slide {pitchData.slides[activeSlide].slide_number}</span>
                  <h4 className="text-2xl font-bold text-white mt-1">{pitchData.slides[activeSlide].title}</h4>
                  <ul className="mt-4 space-y-2.5">
                    {pitchData.slides[activeSlide].bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3 text-slate-300 text-sm md:text-base">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Judge Simulation Drill */}
            <div className="bg-slate-900/80 border border-slate-800 p-6 md:p-8 rounded-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareCheck className="w-6 h-6 text-amber-400" />
                  <h3 className="text-xl font-bold">Interactive VC Defense</h3>
                </div>
                <button
                  type="button"
                  onClick={handleSpeakQuestion}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs flex items-center gap-1.5 transition-all"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Read Aloud
                </button>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-sm">
                <span className="font-semibold text-amber-400">Judge Question: </span>
                {judgeQuestion}
              </div>

              <form onSubmit={handleJudgeSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your pitch defense or click the mic button to speak..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`absolute right-3 bottom-4 p-2 rounded-lg transition-all ${
                      isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'
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
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 font-medium rounded-xl text-sm flex items-center gap-2 transition-all"
                  >
                    {judgeLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating Answer...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit Pitch Defense
                      </>
                    )}
                  </button>
                </div>
              </form>

              {judgeFeedback && (
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-semibold text-slate-400">Judge Evaluation</span>
                    <span className="text-sm font-bold text-amber-400">
                      Score: {judgeFeedback.score}/10 ({judgeFeedback.verdict})
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{judgeFeedback.feedback}</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
