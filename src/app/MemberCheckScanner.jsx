"use client";
import { useState } from 'react';

export default function MemberCheckScanner() {
  const [showModal, setShowModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const playSuccessSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // نغمة أولى مرتفعة
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 880; // A5
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.6, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.3);
    
    // نغمة تانية أعلى بعد شوية
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1108.73; // C#6
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.7, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.4);
    }, 150);
    
    // نغمة تالتة أعلى
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 1318.51; // E6
      osc3.type = 'sine';
      gain3.gain.setValueAtTime(0.8, audioContext.currentTime);
      gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc3.start(audioContext.currentTime);
      osc3.stop(audioContext.currentTime + 0.5);
    }, 300);
  };

  const playErrorSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // صوت خطأ قوي ومميز
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 400;
    osc1.type = 'square';
    gain1.gain.setValueAtTime(0.7, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.15);
    
    // نغمة منخفضة تانية
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 300;
      osc2.type = 'square';
      gain2.gain.setValueAtTime(0.7, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.15);
    }, 150);
    
    // نغمة تالتة للتأكيد
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 250;
      osc3.type = 'square';
      gain3.gain.setValueAtTime(0.8, audioContext.currentTime);
      gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc3.start(audioContext.currentTime);
      osc3.stop(audioContext.currentTime + 0.3);
    }, 300);
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setSearchValue('');
    setScanResult(null);
    setShowResult(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSearchValue('');
    setScanResult(null);
    setShowResult(false);
  };

  const checkMember = async () => {
    if (!searchValue.trim()) {
      return;
    }

    setIsChecking(true);

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
      
      if (result.success) {
        const searchTerm = searchValue.trim().toLowerCase();
        
        // البحث بالـ ID أو الاسم
        const member = result.data.find(m => {
          const matchId = String(m.id) === searchTerm || String(m.custom_id) === searchTerm;
          const matchName = m.name.toLowerCase().includes(searchTerm);
          return matchId || matchName;
        });

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
        setSearchValue('');
      }
    } catch (error) {
      console.error('Error checking member:', error);
      playErrorSound();
      setScanResult({
        success: false,
        message: '❌ خطأ في النظام',
        details: error.message
      });
      setShowResult(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      checkMember();
    }
  };

  return (
    <>
      {/* Floating Check Button */}
      <div className="fixed bottom-8 left-8 z-50">
        <button
          onClick={handleOpenModal}
          className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all transform hover:scale-110 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          title="تشيك على عضو"
        >
          🔍
        </button>
      </div>

      {/* Search Modal */}
      {showModal && !showResult && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-3xl font-bold text-white mb-2">تشيك على عضو</h2>
              <p className="text-gray-400">ادخل اسم العضو أو رقم الـ ID</p>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اسم العضو أو ID..."
                autoFocus
                className="w-full px-6 py-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none text-center"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition text-lg"
              >
                إلغاء
              </button>
              <button
                onClick={checkMember}
                disabled={!searchValue.trim() || isChecking}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold transition text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? '⏳ جاري البحث...' : '✓ تشيك'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResult && scanResult && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div 
            className={`rounded-2xl p-8 shadow-2xl max-w-md w-full transform transition-all ${
              scanResult.success 
                ? scanResult.warning 
                  ? 'bg-gradient-to-br from-yellow-600 to-orange-600' 
                  : 'bg-gradient-to-br from-green-600 to-green-700'
                : 'bg-gradient-to-br from-red-600 to-red-700'
            }`}
          >
            <div className="text-center text-white">
              <div className="text-7xl mb-4">
                {scanResult.success ? (scanResult.warning ? '⏰' : '✅') : '❌'}
              </div>
              
              {scanResult.name && (
                <>
                  <h2 className="text-3xl font-bold mb-2">{scanResult.name}</h2>
                  {scanResult.id && (
                    <p className="text-lg opacity-75 mb-4">ID: {scanResult.id}</p>
                  )}
                </>
              )}
              
              <p className="text-4xl font-bold mb-4">{scanResult.message}</p>
              
              {scanResult.details && (
                <p className="text-xl mb-4 opacity-90">{scanResult.details}</p>
              )}

              {scanResult.phone && (
                <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
                  <p className="text-sm opacity-75 mb-1">التليفون</p>
                  <p className="text-xl font-bold">{scanResult.phone}</p>
                </div>
              )}

              {scanResult.endDate && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {scanResult.subscriptionType && (
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <p className="text-xs opacity-75 mb-1">نوع الاشتراك</p>
                      <p className="text-sm font-bold">{scanResult.subscriptionType}</p>
                    </div>
                  )}
                  <div className="bg-white bg-opacity-20 rounded-lg p-3">
                    <p className="text-xs opacity-75 mb-1">ينتهي في</p>
                    <p className="text-sm font-bold">{scanResult.endDate}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-8 py-3 bg-white text-gray-800 rounded-lg font-bold hover:bg-gray-100 transition text-lg"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => {
                    setShowResult(false);
                    setSearchValue('');
                  }}
                  className="flex-1 px-8 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg font-bold transition text-lg"
                >
                  🔍 تشيك آخر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}