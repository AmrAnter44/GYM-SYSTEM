"use client";
import { useState, useCallback, useRef, useEffect } from 'react';

export default function MemberCheckScanner() {
  const [showModal, setShowModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [nextSearchValue, setNextSearchValue] = useState('');
  
  const searchInputRef = useRef(null);
  const nextSearchInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const searchIdRef = useRef(0);
  const cancelledSearchesRef = useRef(new Set());

  // Lazy AudioContext initialization
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Focus واحد مدمج - بدون setTimeout
  useEffect(() => {
    if (showModal && !showResult && searchInputRef.current) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    } else if (showResult && !isChecking && nextSearchInputRef.current) {
      requestAnimationFrame(() => {
        nextSearchInputRef.current?.focus();
        nextSearchInputRef.current?.select();
      });
    }
  }, [showModal, showResult, isChecking]);

  // Global keyboard - مبسط
  useEffect(() => {
    if (!showResult) return;

    const handleKeyDown = (e) => {
      const target = e.target;
      const isInput = target === nextSearchInputRef.current;
      
      if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        nextSearchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResult]);

  const playSuccessSound = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const playTone = (freq, delay, duration) => {
      setTimeout(() => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + duration);
        } catch (e) {
          // Silent fail
        }
      }, delay);
    };

    playTone(880, 0, 0.2);
    playTone(1108.73, 100, 0.25);
    playTone(1318.51, 200, 0.3);
  }, [getAudioContext]);

  const playErrorSound = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const playTone = (freq, delay, duration) => {
      setTimeout(() => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'square';
          gain.gain.setValueAtTime(0.6, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + duration);
        } catch (e) {
          // Silent fail
        }
      }, delay);
    };

    playTone(400, 0, 0.12);
    playTone(300, 100, 0.12);
    playTone(250, 200, 0.25);
  }, [getAudioContext]);

  const handleOpenModal = useCallback(() => {
    setShowModal(true);
    setSearchValue('');
    setScanResult(null);
    setShowResult(false);
    setNextSearchValue('');
    searchIdRef.current = 0;
    cancelledSearchesRef.current.clear();
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSearchValue('');
    setScanResult(null);
    setShowResult(false);
    setNextSearchValue('');
    searchIdRef.current = 0;
    cancelledSearchesRef.current.clear();
  }, []);

  const processMemberResult = useCallback((member, searchId) => {
    // تجاهل النتائج الملغاة والقديمة
    if (cancelledSearchesRef.current.has(searchId) || searchId !== searchIdRef.current) {
      return;
    }

    if (!member) {
      playErrorSound();
      setScanResult({
        success: false,
        message: '❌ عضو غير موجود',
        details: 'لم يتم العثور على عضو بهذا الاسم أو الرقم'
      });
      setShowResult(true);
      setIsChecking(false);
      return;
    }

    const endDate = new Date(member.subscription_end || member.subscriptionEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isExpired = endDate < today;
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (isExpired) {
      playErrorSound();
      setScanResult({
        success: false,
        name: member.name,
        id: member.custom_id || member.id,
        message: '⚠️ اشتراك منتهي',
        details: `انتهى منذ ${Math.abs(daysLeft)} يوم`,
        phone: member.phone,
        endDate: member.subscription_end || member.subscriptionEnd,
        subscriptionType: member.subscription_type || member.subscriptionType
      });
    } else {
      playSuccessSound();
      const warningDays = 7;
      setScanResult({
        success: true,
        name: member.name,
        id: member.custom_id || member.id,
        message: '✅ اشتراك صالح',
        details: daysLeft <= warningDays
          ? `⏰ ينتهي خلال ${daysLeft} يوم` 
          : `صالح لمدة ${daysLeft} يوم`,
        phone: member.phone,
        endDate: member.subscription_end || member.subscriptionEnd,
        subscriptionType: member.subscription_type || member.subscriptionType,
        warning: daysLeft <= warningDays
      });
    }
    
    setShowResult(true);
    setIsChecking(false);
  }, [playSuccessSound, playErrorSound]);

  const performSearch = useCallback(async (searchTerm) => {
    // إلغاء البحث السابق
    if (searchIdRef.current > 0) {
      cancelledSearchesRef.current.add(searchIdRef.current);
    }

    // زيادة search ID
    searchIdRef.current += 1;
    const currentSearchId = searchIdRef.current;

    // مسح النتيجة القديمة
    setScanResult(null);

    if (!window.electronAPI) {
      playErrorSound();
      setScanResult({
        success: false,
        message: '❌ خطأ في الاتصال',
        details: 'تأكد من تشغيل التطبيق'
      });
      setShowResult(true);
      setIsChecking(false);
      return;
    }

    try {
      const result = await window.electronAPI.getMembers();
      
      // تأكد إن ده لسه آخر search
      if (currentSearchId !== searchIdRef.current) return;
      
      if (result.success && result.data) {
        const searchLower = searchTerm.toLowerCase();
        
        // بحث محسّن
        const member = result.data.find(m => {
          if (!m) return false;
          return String(m.id || '') === searchLower || 
                 String(m.custom_id || '') === searchLower || 
                 (m.name || '').toLowerCase().includes(searchLower);
        });
        
        processMemberResult(member || null, currentSearchId);
      } else {
        processMemberResult(null, currentSearchId);
      }
    } catch (error) {
      if (currentSearchId !== searchIdRef.current) return;
      
      playErrorSound();
      setScanResult({
        success: false,
        message: '❌ خطأ في النظام',
        details: error.message
      });
      setShowResult(true);
      setIsChecking(false);
    }
  }, [playErrorSound, processMemberResult]);

  const checkMember = useCallback(() => {
    const term = searchValue.trim();
    if (!term || isChecking) return;
    
    setIsChecking(true);
    setSearchValue('');
    performSearch(term);
  }, [searchValue, isChecking, performSearch]);

  const handleNextScan = useCallback(() => {
    const term = nextSearchValue.trim();
    if (!term || isChecking) return;

    setIsChecking(true);
    setNextSearchValue('');
    performSearch(term);
  }, [nextSearchValue, isChecking, performSearch]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkMember();
    }
  }, [checkMember]);

  const handleNextKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNextScan();
    }
  }, [handleNextScan]);

  const handleQuickNext = useCallback(() => {
    if (nextSearchValue.trim()) {
      handleNextScan();
    } else {
      setShowResult(false);
      setScanResult(null);
      setSearchValue('');
      setNextSearchValue('');
    }
  }, [nextSearchValue, handleNextScan]);

  return (
    <>
      {/* Floating Check Button */}
      <div className="fixed bottom-8 left-8 z-50">
        <button
          onClick={handleOpenModal}
          className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all duration-200 transform hover:scale-110 active:scale-95 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          title="تشيك على عضو"
          aria-label="فتح ماسح العضوية"
        >
          🔍
        </button>
      </div>

      {/* Search Modal */}
      {showModal && !showResult && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-md w-full animate-slideUp">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-3xl font-bold text-white mb-2">تشيك على عضو</h2>
              <p className="text-gray-400">ادخل اسم العضو أو رقم الـ ID</p>
            </div>

            <div className="mb-6">
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="اسم العضو أو ID..."
                disabled={isChecking}
                autoFocus
                autoComplete="off"
                className="w-full px-6 py-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none text-center transition-all disabled:opacity-50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                disabled={isChecking}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl font-bold transition-all text-lg disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={checkMember}
                disabled={!searchValue.trim() || isChecking}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:scale-95 text-white rounded-xl font-bold transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? '⏳ جاري...' : '✓ تشيك'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResult && scanResult && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <div 
            className={`rounded-2xl p-6 shadow-2xl max-w-md w-full animate-slideUp ${
              scanResult.success 
                ? scanResult.warning 
                  ? 'bg-gradient-to-br from-yellow-600 to-orange-600' 
                  : 'bg-gradient-to-br from-green-600 to-green-700'
                : 'bg-gradient-to-br from-red-600 to-red-700'
            }`}
          >
            <div className="text-center text-white">
              <div className="text-7xl mb-3 animate-bounce">
                {scanResult.success ? (scanResult.warning ? '⏰' : '✅') : '❌'}
              </div>
              
              {scanResult.name && (
                <>
                  <h2 className="text-3xl font-bold mb-2">{scanResult.name}</h2>
                  {scanResult.id && (
                    <p className="text-lg opacity-75 mb-3">ID: {scanResult.id}</p>
                  )}
                </>
              )}
              
              <p className="text-3xl font-bold mb-3">{scanResult.message}</p>
              
              {scanResult.details && (
                <p className="text-xl mb-3 opacity-90">{scanResult.details}</p>
              )}

              {scanResult.phone && (
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-3">
                  <p className="text-sm opacity-75 mb-1">التليفون</p>
                  <p className="text-lg font-bold">{scanResult.phone}</p>
                </div>
              )}

              {scanResult.endDate && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {scanResult.subscriptionType && (
                    <div className="bg-white bg-opacity-20 rounded-lg p-2">
                      <p className="text-xs opacity-75 mb-1">نوع الاشتراك</p>
                      <p className="text-sm font-bold">{scanResult.subscriptionType}</p>
                    </div>
                  )}
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <p className="text-xs opacity-75 mb-1">ينتهي في</p>
                    <p className="text-sm font-bold">{scanResult.endDate}</p>
                  </div>
                </div>
              )}

              {/* Quick Next Scan */}
              <div className="mb-3">
                <div className="bg-white bg-opacity-25 rounded-xl p-3 border-2 border-white border-opacity-40">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">⚡</span>
                    <p className="text-sm font-bold">ابدأ الكتابة مباشرة!</p>
                  </div>
                  <input
                    ref={nextSearchInputRef}
                    type="text"
                    value={nextSearchValue}
                    onChange={(e) => setNextSearchValue(e.target.value)}
                    onKeyDown={handleNextKeyPress}
                    placeholder="اكتب هنا فورًا..."
                    disabled={isChecking}
                    autoFocus
                    autoComplete="off"
                    className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg text-center font-bold text-lg focus:ring-4 focus:ring-white focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-500"
                  />
                  <p className="text-xs opacity-75 mt-2">💡 اضغط أي مفتاح للكتابة مباشرة</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCloseModal}
                  disabled={isChecking}
                  className="flex-1 px-4 py-3 bg-white text-gray-800 rounded-lg font-bold hover:bg-gray-100 active:scale-95 transition-all text-base disabled:opacity-50"
                >
                  إغلاق
                </button>
                <button
                  onClick={handleQuickNext}
                  disabled={isChecking}
                  className="flex-1 px-4 py-3 bg-white bg-opacity-25 hover:bg-opacity-35 active:scale-95 text-white rounded-lg font-bold transition-all text-base disabled:opacity-50 border-2 border-white border-opacity-40"
                >
                  {isChecking ? '⏳' : nextSearchValue.trim() ? '✓ تشيك' : '🔄 جديد'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.2s ease-out;
        }
        
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .animate-bounce {
          animation: bounce 0.5s ease-in-out;
        }
      `}</style>
    </>
  );
}