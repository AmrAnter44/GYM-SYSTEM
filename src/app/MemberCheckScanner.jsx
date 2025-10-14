"use client";
import { useState, useCallback, useRef, useEffect } from 'react';

export default function MemberCheckScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [idInput, setIdInput] = useState('');
  const [result, setResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  
  const inputRef = useRef(null);
  const audioRef = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // 🔊 VOICE & SOUND
  // ═══════════════════════════════════════════════════════════
  
  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.2;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const playBeep = useCallback((success) => {
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioRef.current;
    const frequencies = success ? [800, 1000, 1200] : [400, 300];
    
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = success ? 'sine' : 'square';
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }, i * 120);
    });
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🔍 CHECK MEMBER
  // ═══════════════════════════════════════════════════════════
  
  const checkMember = useCallback(async (id) => {
    if (!id || isChecking) return;
    
    setIsChecking(true);
    setResult(null);

    try {
      const response = await window.electronAPI.getMembers();
      
      if (!response.success || !response.data) {
        throw new Error('فشل تحميل البيانات');
      }

      const searchId = id.trim();
      const member = response.data.find(m => 
        String(m.id) === searchId ||
        String(m.custom_id || '') === searchId
      );

      if (!member) {
        playBeep(false);
        speak('لا، العضو غير موجود');
        setResult({
          found: false,
          message: '❌ غير موجود',
          id: searchId
        });
        return;
      }

      const endDate = new Date(member.subscription_end);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      const isExpired = daysLeft < 0;

      if (isExpired) {
        playBeep(false);
        speak(`لا، اشتراك ${member.name} منتهي منذ ${Math.abs(daysLeft)} يوم`);
        setResult({
          found: true,
          active: false,
          member,
          daysLeft,
          message: '⚠️ منتهي'
        });
      } else {
        playBeep(true);
        const daysText = daysLeft === 1 ? 'يوم واحد' : `${daysLeft} يوم`;
        speak(`نعم، ${member.name} مشترك، باقي ${daysText}`);
        setResult({
          found: true,
          active: true,
          member,
          daysLeft,
          warning: daysLeft <= 7,
          message: '✅ مشترك'
        });
      }

    } catch (error) {
      playBeep(false);
      speak('خطأ في النظام');
      setResult({
        found: false,
        message: '❌ خطأ',
        error: error.message
      });
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, playBeep, speak]);

  // ═══════════════════════════════════════════════════════════
  // ⌨️ HANDLERS
  // ═══════════════════════════════════════════════════════════
  
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    if (value && !/^\d+$/.test(value)) return;
    setIdInput(value);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIdInput('');
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIdInput('');
    setResult(null);
    window.speechSynthesis?.cancel();
    
    // ✅ FIX: Return focus to body to prevent focus trap
    setTimeout(() => {
      document.body.focus();
    }, 100);
  }, []);

  const handleNewSearch = useCallback(() => {
    setResult(null);
    setIdInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // ✅ FIX: KEYBOARD HANDLER - ONLY WHEN MODAL IS OPEN
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (!isOpen) return; // Only listen when modal is open

    const handleKeyDown = (e) => {
      // Only handle if modal is actually open
      if (!isOpen) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (idInput.trim() && !result) {
          checkMember(idInput);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (result) {
          handleNewSearch();
        } else {
          handleClose();
        }
      }
    };

    // Add listener
    document.addEventListener('keydown', handleKeyDown);

    // ✅ CLEANUP: Remove listener when modal closes
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, idInput, result, checkMember, handleNewSearch, handleClose]);

  // ═══════════════════════════════════════════════════════════
  // ✅ FIX: CLEANUP ON UNMOUNT
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.close();
        audioRef.current = null;
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════════════════

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-8 left-8 z-50 w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-2xl flex flex-col items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
        title="تشيك ID"
      >
        <span className="text-3xl mb-1">🎯</span>
        <span className="text-xs font-bold">تشيك</span>
      </button>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-gray-900 rounded-3xl shadow-2xl border-2 border-gray-700 w-full max-w-lg overflow-hidden">
        
        {!result ? (
          <>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center">
              <div className="text-7xl mb-4">🎯</div>
              <h2 className="text-white text-3xl font-bold mb-2">تشيك على عضو</h2>
              <p className="text-blue-200">ادخل رقم الـ ID</p>
            </div>

            <div className="p-8">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={idInput}
                onChange={handleInputChange}
                placeholder="123"
                disabled={isChecking}
                autoFocus
                className="w-full px-6 py-6 bg-gray-800 border-3 border-gray-700 rounded-2xl text-white text-4xl text-center font-mono font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/50 focus:outline-none transition-all disabled:opacity-50"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  disabled={isChecking}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => checkMember(idInput)}
                  disabled={!idInput.trim() || isChecking}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChecking ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      جاري...
                    </span>
                  ) : (
                    '✓ تشيك'
                  )}
                </button>
              </div>

              <div className="mt-6 text-center space-y-2">
                <p className="text-gray-500 text-sm">💡 Enter للتشيك • ESC للإلغاء</p>
                <p className="text-gray-600 text-xs">الأرقام فقط</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {result.found && result.active ? (
              <div className={`${
                result.warning 
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                  : 'bg-gradient-to-br from-green-500 to-green-600'
              } p-8`}>
                <div className="text-center text-white">
                  <div className="text-8xl mb-6">{result.warning ? '⏰' : '✅'}</div>
                  
                  <div className="bg-white/20 rounded-2xl p-6 mb-6 backdrop-blur-sm">
                    <p className="text-6xl font-black mb-2">{result.message}</p>
                    <p className="text-3xl font-bold opacity-90">{result.member.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                      <p className="text-sm opacity-75 mb-1">ID</p>
                      <p className="text-2xl font-mono font-bold">
                        {result.member.custom_id || result.member.id}
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                      <p className="text-sm opacity-75 mb-1">باقي</p>
                      <p className="text-2xl font-bold">{result.daysLeft} يوم</p>
                    </div>
                  </div>

                  {result.warning && (
                    <div className="bg-red-600/30 border-2 border-red-400 rounded-xl p-4 mb-6">
                      <p className="text-lg font-bold">⚠️ قريب الانتهاء!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : result.found && !result.active ? (
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-8">
                <div className="text-center text-white">
                  <div className="text-8xl mb-6">❌</div>
                  
                  <div className="bg-white/20 rounded-2xl p-6 mb-6 backdrop-blur-sm">
                    <p className="text-6xl font-black mb-2">{result.message}</p>
                    <p className="text-3xl font-bold opacity-90">{result.member.name}</p>
                  </div>

                  <div className="bg-white/20 rounded-xl p-4 mb-6 backdrop-blur-sm">
                    <p className="text-sm opacity-75 mb-1">انتهى منذ</p>
                    <p className="text-3xl font-bold">{Math.abs(result.daysLeft)} يوم</p>
                  </div>

                  <div className="bg-white/30 border-2 border-white/50 rounded-xl p-4 mb-6">
                    <p className="text-lg font-bold">⚠️ يحتاج تجديد!</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 p-8">
                <div className="text-center text-white">
                  <div className="text-8xl mb-6">🚫</div>
                  
                  <div className="bg-white/10 rounded-2xl p-6 mb-6">
                    <p className="text-5xl font-black mb-2">{result.message}</p>
                    <p className="text-xl opacity-75">ID: {result.id}</p>
                  </div>

                  <div className="bg-red-600/30 border-2 border-red-400 rounded-xl p-4 mb-6">
                    <p className="text-lg">لم يتم العثور على هذا الرقم</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 bg-gray-900 flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl transition-all"
              >
                إغلاق
              </button>
              <button
                onClick={handleNewSearch}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl transition-all"
              >
                🔄 تشيك جديد
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}