
import React, { useState, useEffect, useMemo } from 'react';
import { CATEGORIES, UNITS, WIRE_TABLE, PHYSICAL_CONSTANTS, STEAM_TABLE_DATA, API_526_ORIFICES, MATERIALS, PIPE_SCHEDULE_DATA, TUBING_DATA, FLANGE_DATA, TORQUE_DATA } from './constants';
import { Category, CalculationLog } from './types';
import { askEngineeringAssistant } from './geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Category>('Pressure');
  const [inputValue, setInputValue] = useState<string>('1');
  const [fromUnitId, setFromUnitId] = useState<string>('');
  const [toUnitId, setToUnitId] = useState<string>('');
  const [history, setHistory] = useState<CalculationLog[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Module specific states
  const [steamPressureUnit, setSteamPressureUnit] = useState<string>('psi');
  const [materialUnitSystem, setMaterialUnitSystem] = useState<'SI' | 'IMP'>('SI');
  const [materialSearch, setMaterialSearch] = useState('');
  const [psvFlow, setPsvFlow] = useState<string>('50000');
  const [psvSetP, setPsvSetP] = useState<string>('100');
  const [psvTemp, setPsvTemp] = useState<string>('150');
  const [psvMW, setPsvMW] = useState<string>('28.9');
  const [psvK, setPsvK] = useState<string>('1.4');
  const [psvZ, setPsvZ] = useState<string>('1.0');
  const [vAmps, setVAmps] = useState<string>('10');
  const [vVolts, setVVolts] = useState<string>('24');
  const [systemType, setSystemType] = useState<'DC' | 'AC1' | 'AC3'>('DC');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isBaconDark, setIsBaconDark] = useState(false);
  const [flip, setFlip] = useState(false);

  // Ideal Gas Law states
  const [gasP, setGasP] = useState<string>('101325'); // Pa
  const [gasV, setGasV] = useState<string>('0.0224'); // m3
  const [gasN, setGasN] = useState<string>('1'); // mol
  const [gasT, setGasT] = useState<string>('273.15'); // K
  const [gasSolveFor, setGasSolveFor] = useState<'P' | 'V' | 'n' | 'T'>('P');

  // Wire Size states
  const [selectedAWG, setSelectedAWG] = useState<string>('12');

  // Pipe Schedule states
  const [pipeMode, setPipeMode] = useState<'Pipe' | 'Tubing'>('Pipe');
  const [selectedNPS, setSelectedNPS] = useState<string>('1/2');
  const [selectedSch, setSelectedSch] = useState<string>('40');
  const [selectedTubingOD, setSelectedTubingOD] = useState<string>('1/2');
  const [selectedTubingWall, setSelectedTubingWall] = useState<string>('0.049');

  // Flange states
  const [selectedFlangeNPS, setSelectedFlangeNPS] = useState<string>('2');
  const [selectedFlangeClass, setSelectedFlangeClass] = useState<number>(150);

  // Torque states
  const [selectedBoltSize, setSelectedBoltSize] = useState<string>('3/4');
  const [selectedFrictionFactor, setSelectedFrictionFactor] = useState<string>('0.15');

  useEffect(() => {
    if (UNITS[activeTab]) {
      setFromUnitId(UNITS[activeTab][0].id);
      setToUnitId(UNITS[activeTab][1].id);
    }
  }, [activeTab]);

  const convertedValue = useMemo(() => {
    if (!UNITS[activeTab]) return null;
    const units = UNITS[activeTab];
    const fromUnit = units.find(u => u.id === fromUnitId);
    const toUnit = units.find(u => u.id === toUnitId);
    const val = parseFloat(inputValue);
    if (!fromUnit || !toUnit || isNaN(val)) return '0';
    if (activeTab === 'Temperature') {
      let celsiusVal = 0;
      if (fromUnit.id === 'c') celsiusVal = val;
      else if (fromUnit.id === 'f') celsiusVal = (val - 32) / 1.8;
      else if (fromUnit.id === 'k') celsiusVal = val - 273.15;
      else if (fromUnit.id === 'r') celsiusVal = (val - 491.67) / 1.8;
      if (toUnit.id === 'c') return celsiusVal.toFixed(4);
      if (toUnit.id === 'f') return (celsiusVal * 1.8 + 32).toFixed(4);
      if (toUnit.id === 'k') return (celsiusVal + 273.15).toFixed(4);
      if (toUnit.id === 'r') return (celsiusVal * 1.8 + 491.67).toFixed(4);
    }
    const baseValue = val / fromUnit.factor;
    return (baseValue * toUnit.factor).toFixed(6);
  }, [activeTab, inputValue, fromUnitId, toUnitId]);

  useEffect(() => {
    if (convertedValue && convertedValue !== '0' && UNITS[activeTab]) {
      const fromUnit = UNITS[activeTab].find(u => u.id === fromUnitId);
      const toUnit = UNITS[activeTab].find(u => u.id === toUnitId);
      const log: CalculationLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        module: activeTab,
        input: `${inputValue} ${fromUnit?.name}`,
        result: `${convertedValue} ${toUnit?.name}`
      };
      setHistory(prev => [log, ...prev].slice(0, 5));
    }
  }, [convertedValue]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BCN Engineering Suite',
          text: 'Shared from BCN: A professional-grade engineering toolkit.',
          url: window.location.origin + window.location.pathname,
        });
      } catch (err) {}
    } else {
      copyToClipboard(window.location.href, 'share');
      alert('Link copied to clipboard!');
    }
  };

  const handleAiAsk = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    const response = await askEngineeringAssistant(aiQuery);
    setAiResponse(response);
    setIsAiLoading(false);
  };

  const calculateMaxFeet = (amps: number, volts: number, resistancePer1kft: number) => {
    if (amps <= 0 || volts <= 0 || resistancePer1kft <= 0) return 0;
    const maxDrop = 0.03 * volts; 
    const factor = systemType === 'AC3' ? Math.sqrt(3) : 2;
    return (maxDrop * 1000) / (amps * resistancePer1kft * factor);
  };

  const psvResults = useMemo(() => {
    const W = parseFloat(psvFlow);
    const Pset = parseFloat(psvSetP);
    const T = parseFloat(psvTemp) + 459.67; 
    const M = parseFloat(psvMW);
    const k = parseFloat(psvK);
    const Z = parseFloat(psvZ);
    if (!W || !Pset || !T || !M || !k) return null;
    const C = 520 * Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1)));
    const P1 = Pset * 1.1 + 14.7;
    const Kd = 0.975;
    const area = (W / (C * Kd * P1 * 1.0 * 1.0)) * Math.sqrt((T * Z) / M);
    const orifice = API_526_ORIFICES.find(o => o.area >= area) || { letter: 'N/A', area: 0 };
    return { area, letter: orifice.letter };
  }, [psvFlow, psvSetP, psvTemp, psvMW, psvK, psvZ]);

  const formattedSteamData = useMemo(() => {
    const selectedUnit = UNITS.Pressure.find(u => u.id === steamPressureUnit) || UNITS.Pressure[0];
    return STEAM_TABLE_DATA.map(row => ({
      ...row,
      displayPressure: (row.pressurePSIG * selectedUnit.factor).toFixed(selectedUnit.id === 'psi' ? 1 : 2)
    }));
  }, [steamPressureUnit]);

  const gasResult = useMemo(() => {
    const P = parseFloat(gasP);
    const V = parseFloat(gasV);
    const n = parseFloat(gasN);
    const T = parseFloat(gasT);
    const R = 8.31446; // J/(mol·K)

    if (gasSolveFor === 'P') return ((n * R * T) / V).toFixed(2);
    if (gasSolveFor === 'V') return ((n * R * T) / P).toFixed(4);
    if (gasSolveFor === 'n') return ((P * V) / (R * T)).toFixed(4);
    if (gasSolveFor === 'T') return ((P * V) / (n * R)).toFixed(2);
    return '0';
  }, [gasP, gasV, gasN, gasT, gasSolveFor]);

  const wireSizeResult = useMemo(() => {
    const entry = WIRE_TABLE.find(w => w.awg === selectedAWG);
    if (!entry) return null;
    const diameterMM = 2 * Math.sqrt(entry.area / Math.PI);
    const diameterIN = diameterMM / 25.4;
    return {
      mm: diameterMM.toFixed(3),
      inches: diameterIN.toFixed(4),
      area: entry.area.toFixed(3)
    };
  }, [selectedAWG]);

  const pipeResult = useMemo(() => {
    const entry = PIPE_SCHEDULE_DATA.find(p => p.nps === selectedNPS);
    if (!entry) return null;
    const schData = entry.schedules[selectedSch];
    if (!schData) return { od: entry.od, wall: 0, id: 0 };
    return {
      od: entry.od,
      wall: schData.wall,
      id: schData.id
    };
  }, [selectedNPS, selectedSch]);

  const tubingResult = useMemo(() => {
    const entry = TUBING_DATA.find(t => t.od === selectedTubingOD && t.wall === selectedTubingWall);
    return entry || null;
  }, [selectedTubingOD, selectedTubingWall]);

  const flangeResult = useMemo(() => {
    return FLANGE_DATA.find(f => f.nps === selectedFlangeNPS && f.class === selectedFlangeClass) || null;
  }, [selectedFlangeNPS, selectedFlangeClass]);

  const torqueResult = useMemo(() => {
    const entry = TORQUE_DATA.find(t => t.boltSize === selectedBoltSize);
    return entry?.torques[selectedFrictionFactor] || 0;
  }, [selectedBoltSize, selectedFrictionFactor]);

  const handleBaconClick = () => {
    setIsBaconDark(!isBaconDark);
    setFlip(true);
    setTimeout(() => setFlip(false), 600);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50 text-slate-900 overflow-hidden">
      <style>{`
        @keyframes flip {
          0% { transform: rotateY(0); }
          100% { transform: rotateY(360deg); }
        }
        .animate-flip {
          animation: flip 0.6s ease-in-out;
        }
      `}</style>
      <nav className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-col h-auto md:h-full z-50 shrink-0">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBaconClick}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-lg transition-all duration-300 ${
                isBaconDark ? 'bg-rose-900 shadow-rose-900/20' : 'bg-rose-600 shadow-rose-100'
              } ${flip ? 'animate-flip' : 'hover:scale-110 active:scale-95'}`}
              title="Flip!"
            >
              <i className="fa-solid fa-bacon"></i>
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">BCN</h1>
          </div>
          <button onClick={handleShare} className="md:hidden p-2 text-slate-400 hover:text-blue-600 transition-colors">
            <i className="fa-solid fa-share-nodes"></i>
          </button>
        </div>
        
        <div className="flex-1 space-y-1 custom-scrollbar overflow-y-auto pr-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === cat.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <i className={`fa-solid ${cat.icon} w-5`}></i>
              {cat.label}
            </button>
          ))}
        </div>

        <div className="hidden md:block mt-6 pt-6 border-t border-slate-100">
          <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all">
            <i className="fa-solid fa-share-nodes"></i> Share Toolkit
          </button>
        </div>

        {history.length > 0 && (
          <div className="hidden md:block mt-6">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recent Activity</h4>
            <div className="space-y-2">
              {history.map(log => (
                <div key={log.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[9px]">
                  <div className="flex justify-between text-slate-400 mb-0.5 font-bold uppercase tracking-tighter">
                    <span>{log.module}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="text-blue-700 font-bold truncate">{log.result}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto pt-6 border-t border-slate-100 text-[9px] text-slate-400 font-mono uppercase tracking-widest text-center flex items-center justify-center gap-2">
          <button 
            onClick={handleBaconClick} 
            className={`transition-all duration-300 ${flip ? 'animate-flip' : 'hover:scale-125 active:scale-90'} cursor-pointer`} 
            title="Flip!"
          >
            <i className={`fa-solid fa-bacon ${isBaconDark ? 'text-rose-900' : 'text-rose-300'}`}></i>
          </button>
          BCN SUITE v1.8.9
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              {CATEGORIES.find(c => c.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Engineering Module</p>
          </div>
          <button 
            onClick={handleBaconClick}
            className={`transition-all duration-300 ${isBaconDark ? 'text-rose-900' : 'text-rose-200/50'} ${flip ? 'animate-flip' : 'hover:text-rose-400 hover:scale-110 active:scale-95'} cursor-pointer`}
            title="Flip!"
          >
            <i className="fa-solid fa-bacon fa-2x"></i>
          </button>
        </header>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10 min-h-[400px]">
          {/* Conversion Modules */}
          {UNITS[activeTab] && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Value</label>
                  <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="w-full text-4xl font-light bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none pb-4" />
                  <select value={fromUnitId} onChange={(e) => setFromUnitId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold">
                    {UNITS[activeTab].map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Converted Result</label>
                  <div className="flex items-center gap-4 group">
                    <div className="text-4xl font-bold text-blue-700 border-b-2 border-transparent pb-4 truncate flex-1">{convertedValue}</div>
                    <button 
                      onClick={() => copyToClipboard(convertedValue || '', 'conv')}
                      className="p-3 text-slate-300 hover:text-blue-600 transition-colors"
                      title="Copy result"
                    >
                      <i className={`fa-solid ${copiedId === 'conv' ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                    </button>
                  </div>
                  <select value={toUnitId} onChange={(e) => setToUnitId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold">
                    {UNITS[activeTab].map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Electrical' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Line Voltage (V)</h4>
                  <input type="number" value={vVolts} onChange={(e) => setVVolts(e.target.value)} className="w-full text-4xl font-light bg-transparent border-b border-slate-200 outline-none pb-2" />
                </div>
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Current (Amps)</h4>
                  <input type="number" value={vAmps} onChange={(e) => setVAmps(e.target.value)} className="w-full text-4xl font-light bg-transparent border-b border-slate-200 outline-none pb-2" />
                </div>
                <div className="p-8 bg-blue-700 rounded-2xl text-white shadow-xl flex flex-col justify-between">
                  <h4 className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Power (Watts)</h4>
                  <div className="text-4xl font-bold">{(parseFloat(vVolts) * parseFloat(vAmps) || 0).toLocaleString()} <span className="text-xl font-light">W</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Tables' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-xl w-fit">
                {['DC', 'AC1', 'AC3'].map(t => (
                  <button key={t} onClick={() => setSystemType(t as any)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${systemType === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amp Setting (Amps)</label>
                  <input type="number" value={vAmps} onChange={(e) => setVAmps(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Voltage Setting (Volts)</label>
                  <input type="number" value={vVolts} onChange={(e) => setVVolts(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs border-collapse">
                  <thead><tr className="bg-slate-50/50">
                    <th className="p-4 font-bold text-slate-400 uppercase tracking-widest border-b">AWG</th>
                    <th className="p-4 font-bold text-slate-600 uppercase border-b">Ampacity (A)</th>
                    <th className="p-4 text-right font-bold text-blue-700 uppercase tracking-widest border-b">Max Run (ft @ 3% Drop)</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {WIRE_TABLE.map(row => {
                      const isOverloaded = parseFloat(vAmps) > row.ampacity;
                      return (
                        <tr key={row.awg} className={`hover:bg-blue-50/30 transition-colors ${isOverloaded ? 'bg-red-50/30' : ''}`}>
                          <td className={`p-4 font-bold ${isOverloaded ? 'text-red-700' : 'text-slate-700'}`}>{row.awg}</td>
                          <td className={`p-4 font-bold ${isOverloaded ? 'text-red-600' : 'text-slate-500'}`}>
                            {row.ampacity}A
                            {isOverloaded && <span className="ml-2 text-[8px] uppercase tracking-tighter bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse">Overload</span>}
                          </td>
                          <td className={`p-4 text-right font-mono font-bold ${isOverloaded ? 'text-red-600' : 'text-slate-800'}`}>
                            {calculateMaxFeet(parseFloat(vAmps), parseFloat(vVolts), row.resistance).toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[9px] text-slate-400 mt-2">* Calculations based on NEC/IEEE standards for 3% maximum voltage drop. Red rows indicate current exceeding wire safety rating.</p>
            </div>
          )}

          {activeTab === 'Materials' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <input type="text" placeholder="Search materials..." value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm flex-1" />
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setMaterialUnitSystem('SI')} className={`px-4 py-1 text-[10px] font-bold uppercase rounded-lg ${materialUnitSystem === 'SI' ? 'bg-white text-blue-700' : 'text-slate-500'}`}>SI</button>
                  <button onClick={() => setMaterialUnitSystem('IMP')} className={`px-4 py-1 text-[10px] font-bold uppercase rounded-lg ${materialUnitSystem === 'IMP' ? 'bg-white text-blue-700' : 'text-slate-500'}`}>IMP</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MATERIALS.filter(m => m.name.toLowerCase().includes(materialSearch.toLowerCase())).map((m, i) => (
                  <div key={i} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/30 hover:bg-white hover:border-blue-200 transition-all shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-2">{m.name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                      <div>Density: {materialUnitSystem === 'SI' ? `${m.density.si} kg/m³` : `${m.density.imp} lb/ft³`}</div>
                      <div>Expansion: {materialUnitSystem === 'SI' ? `${m.expansion.si} µm/m-C` : `${m.expansion.imp} µin/in-F`}</div>
                      <div>Modulus: {materialUnitSystem === 'SI' ? `${m.modulus.si} GPa` : `${m.modulus.imp} Mpsi`}</div>
                      <div className="font-bold text-blue-600">{m.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Constants' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
              {PHYSICAL_CONSTANTS.map((c, i) => (
                <div key={i} className="p-6 border border-slate-100 rounded-2xl bg-slate-50/30 hover:shadow-lg transition-all relative group">
                  <div className="text-[10px] font-bold text-blue-500 uppercase mb-2">{c.name}</div>
                  <div className="text-lg font-mono font-bold text-slate-800 break-all">{c.value}</div>
                  <div className="text-[9px] text-slate-400 mt-2">{c.unit}</div>
                  <div className="text-[8px] text-slate-300 mt-1 uppercase tracking-tight">{c.description}</div>
                  <button 
                    onClick={() => copyToClipboard(c.value, `const-${i}`)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-blue-600 transition-all"
                  >
                    <i className={`fa-solid ${copiedId === `const-${i}` ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Steam' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800">Saturated Steam Reference</h4>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] text-slate-400 font-bold uppercase">Unit:</span>
                   <select value={steamPressureUnit} onChange={e => setSteamPressureUnit(e.target.value)} className="text-xs border border-slate-200 p-1 rounded font-bold bg-slate-50 text-blue-700">
                     {UNITS.Pressure.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                   </select>
                </div>
              </div>
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50"><tr><th className="p-4 border-b">Pressure ({steamPressureUnit})</th><th className="p-4 text-right border-b">Temp (°F)</th><th className="p-4 text-right border-b">Latent Heat (BTU/lb)</th><th className="p-4 text-right border-b">Total Enthalpy</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {formattedSteamData.map((s, i) => (
                      <tr key={i} className="hover:bg-blue-50/20">
                        <td className="p-4 font-bold text-slate-700">{s.displayPressure}</td>
                        <td className="p-4 text-right font-mono">{s.tempF}</td>
                        <td className="p-4 text-right text-slate-400 font-mono">{s.latentHeatBTU}</td>
                        <td className="p-4 text-right text-blue-700 font-bold font-mono">{s.totalEnthalpyBTU}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'PSV' && (
            <div className="space-y-10 animate-in slide-in-from-bottom">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Mass Flow (lb/hr)</label><input type="number" value={psvFlow} onChange={e => setPsvFlow(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Set P (psig)</label><input type="number" value={psvSetP} onChange={e => setPsvSetP(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Temp (°F)</label><input type="number" value={psvTemp} onChange={e => setPsvTemp(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Mol Weight</label><input type="number" value={psvMW} onChange={e => setPsvMW(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">k (Cp/Cv)</label><input type="number" value={psvK} onChange={e => setPsvK(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Z (Comp)</label><input type="number" value={psvZ} onChange={e => setPsvZ(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" /></div>
                  </div>
                </div>
                <div className="bg-blue-700 rounded-3xl p-8 text-white flex flex-col justify-center space-y-6 shadow-xl shadow-blue-100">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-widest mb-2">Required Area (API 520)</div>
                    <div className="text-5xl font-bold">{psvResults?.area.toFixed(4)} <span className="text-xl font-light">in²</span></div>
                  </div>
                  <div className="pt-6 border-t border-blue-500">
                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-widest mb-2">Recommended API 526 Orifice</div>
                    <div className="text-6xl font-black italic">"{psvResults?.letter}"</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'IdealGas' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Pressure (Pa)</label>
                      <input type="number" disabled={gasSolveFor === 'P'} value={gasP} onChange={e => setGasP(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Volume (m³)</label>
                      <input type="number" disabled={gasSolveFor === 'V'} value={gasV} onChange={e => setGasV(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Amount (mol)</label>
                      <input type="number" disabled={gasSolveFor === 'n'} value={gasN} onChange={e => setGasN(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Temp (K)</label>
                      <input type="number" disabled={gasSolveFor === 'T'} value={gasT} onChange={e => setGasT(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Solve For</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                      {['P', 'V', 'n', 'T'].map(v => (
                        <button key={v} onClick={() => setGasSolveFor(v as any)} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg ${gasSolveFor === v ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col justify-center space-y-4 shadow-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Calculated {gasSolveFor}</div>
                  <div className="text-5xl font-bold text-blue-400">{gasResult}</div>
                  <div className="text-[10px] text-slate-500 font-mono italic">PV = nRT (R = 8.314 J/mol·K)</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'WireSize' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select AWG Size</label>
                  <select 
                    value={selectedAWG} 
                    onChange={(e) => setSelectedAWG(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xl font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  >
                    {WIRE_TABLE.map(w => <option key={w.awg} value={w.awg}>{w.awg} AWG</option>)}
                  </select>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Cross Section</span>
                      <span className="text-sm font-mono font-bold text-slate-700">{wireSizeResult?.area} mm²</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-700 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-center">
                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-widest mb-2">Diameter (Metric)</div>
                    <div className="text-5xl font-bold">{wireSizeResult?.mm} <span className="text-xl font-light">mm</span></div>
                  </div>
                  <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Diameter (Imperial)</div>
                    <div className="text-5xl font-bold text-blue-400">{wireSizeResult?.inches} <span className="text-xl font-light text-slate-400">in</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PipeSchedules' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button onClick={() => setPipeMode('Pipe')} className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${pipeMode === 'Pipe' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>PIPE (NPS)</button>
                <button onClick={() => setPipeMode('Tubing')} className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${pipeMode === 'Tubing' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>TUBING</button>
              </div>

              {pipeMode === 'Pipe' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">NPS Size</label>
                        <select value={selectedNPS} onChange={e => setSelectedNPS(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                          {PIPE_SCHEDULE_DATA.map(p => <option key={p.nps} value={p.nps}>{p.nps}" NPS</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Schedule</label>
                        <select value={selectedSch} onChange={e => setSelectedSch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                          {Object.keys(PIPE_SCHEDULE_DATA.find(p => p.nps === selectedNPS)?.schedules || {}).map(s => <option key={s} value={s}>Sch {s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Actual OD</span>
                        <span className="text-sm font-mono font-bold text-slate-700">{pipeResult?.od.toFixed(3)}"</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Wall Thickness</span>
                        <span className="text-sm font-mono font-bold text-slate-700">{pipeResult?.wall.toFixed(3)}"</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-700 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-center">
                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-widest mb-2">Internal Diameter (ID)</div>
                    <div className="text-6xl font-bold">{pipeResult?.id.toFixed(3)} <span className="text-2xl font-light">in</span></div>
                    <div className="mt-4 text-[10px] text-blue-200 font-mono uppercase">Metric: {(pipeResult?.id ? pipeResult.id * 25.4 : 0).toFixed(2)} mm</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tubing OD</label>
                        <select value={selectedTubingOD} onChange={e => setSelectedTubingOD(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                          {Array.from(new Set(TUBING_DATA.map(t => t.od))).map(od => <option key={od} value={od}>{od}" OD</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Wall Thickness</label>
                        <select value={selectedTubingWall} onChange={e => setSelectedTubingWall(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                          {TUBING_DATA.filter(t => t.od === selectedTubingOD).map(t => <option key={t.wall} value={t.wall}>{t.wall}" Wall</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Internal Diameter (ID)</div>
                    <div className="text-6xl font-bold text-blue-400">{tubingResult?.id.toFixed(3)} <span className="text-2xl font-light text-slate-400">in</span></div>
                    <div className="mt-4 text-[10px] text-slate-500 font-mono uppercase">Metric: {(tubingResult?.id ? tubingResult.id * 25.4 : 0).toFixed(2)} mm</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Flanges' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">NPS Size</label>
                      <select value={selectedFlangeNPS} onChange={e => setSelectedFlangeNPS(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                        {Array.from(new Set(FLANGE_DATA.map(f => f.nps))).map(nps => <option key={nps} value={nps}>{nps}" NPS</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Pressure Class</label>
                      <select value={selectedFlangeClass} onChange={e => setSelectedFlangeClass(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                        {Array.from(new Set(FLANGE_DATA.map(f => f.class))).sort((a, b) => a - b).map(cls => <option key={cls} value={cls}>Class {cls}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Stud Quantity</span>
                      <span className="text-sm font-mono font-bold text-slate-700">{flangeResult?.studQty || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Stud Size</span>
                      <span className="text-sm font-mono font-bold text-slate-700">{flangeResult?.studSize ? `${flangeResult.studSize}"` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nut Size (Heavy Hex)</span>
                      <span className="text-sm font-mono font-bold text-slate-700">{flangeResult?.nutSize ? `${flangeResult.nutSize}"` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-center space-y-6">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Bolting Summary</div>
                    <div className="text-4xl font-bold text-blue-400">
                      {flangeResult ? (
                        <>
                          {flangeResult.studQty} x {flangeResult.studSize}" <span className="text-xl font-light text-slate-400">Studs</span>
                        </>
                      ) : 'No Data Available'}
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Standards Reference</div>
                    <div className="text-sm font-mono text-slate-500">ASME B16.5-2020 Pipe Flanges and Flanged Fittings</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Torque' && (
            <div className="space-y-10 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Bolt Size (in)</label>
                      <select value={selectedBoltSize} onChange={e => setSelectedBoltSize(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                        {TORQUE_DATA.map(t => <option key={t.boltSize} value={t.boltSize}>{t.boltSize}"</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Bolt Condition (μ)</label>
                      <select value={selectedFrictionFactor} onChange={e => setSelectedFrictionFactor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                        <option value="0.15">0.15 (Coated Bolts)</option>
                        <option value="0.20">0.20 (Noncoated Bolts)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Bolt Diameter</span>
                      <span className="text-sm font-mono font-bold text-slate-700">{selectedBoltSize}"</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Friction Coefficient</span>
                      <span className="text-sm font-mono font-bold text-slate-700">{selectedFrictionFactor}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-700 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-center space-y-6">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-widest mb-2">Target Torque (50 ksi Root Area)</div>
                    <div className="text-6xl font-bold">
                      {torqueResult} <span className="text-2xl font-light text-blue-200">ft-lb</span>
                    </div>
                    <div className="mt-4 text-[10px] text-blue-200 font-mono uppercase">Metric: {(torqueResult * 1.35582).toFixed(1)} N·m</div>
                  </div>
                  <div className="pt-6 border-t border-blue-500">
                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-widest mb-2">Standards Reference</div>
                    <div className="text-sm font-mono text-blue-100 italic">ASME PCC-1 Table 1 (Target 50 ksi Bolt Stress)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'AI' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex gap-3">
                <input type="text" placeholder="Ask BCN Engineering Assistant..." value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium shadow-inner" />
                <button onClick={handleAiAsk} disabled={isAiLoading || !aiQuery.trim()} className="bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100">
                  {isAiLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-sparkles"></i>}
                </button>
              </div>
              {aiResponse && (
                <div className="mt-8 p-8 bg-slate-50 rounded-3xl border border-slate-100 prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed shadow-sm relative group">
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><i className="fa-solid fa-microchip"></i></div>
                      <div className="flex-1 pt-1 whitespace-pre-wrap">{aiResponse}</div>
                   </div>
                   <button 
                    onClick={() => copyToClipboard(aiResponse, 'ai-res')}
                    className="absolute top-6 right-6 p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                    title="Copy response"
                   >
                     <i className={`fa-solid ${copiedId === 'ai-res' ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                   </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
