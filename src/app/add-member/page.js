"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { compressImage } from '../../hooks/optimizedHooks';

export default function MemberRegistrationForm() {
  const router = useRouter();

  // Helper functions
  const calculateEndDate = useCallback((startDate, type) => {
    if (!startDate) return '';
    
    try {
      const start = new Date(startDate);
      
      // Validate date
      if (isNaN(start.getTime())) {
        console.error('Invalid start date:', startDate);
        return '';
      }
      
      let months = 0;
      
      switch(type) {
        case 'شهري': months = 1; break;
        case '3شهور': months = 3; break;
        case '6شهور': months = 6; break;
        case 'سنوي': months = 12; break;
        default: months = 1;
      }
      
      // Safer way to add months
      const year = start.getFullYear();
      const month = start.getMonth();
      const day = start.getDate();
      
      // Calculate new month and year
      const newMonth = month + months;
      const newYear = year + Math.floor(newMonth / 12);
      const finalMonth = newMonth % 12;
      
      // Create new date with adjusted month/year
      const endDate = new Date(newYear, finalMonth, day);
      
      // Handle case where day doesn't exist in new month (e.g., Jan 31 -> Feb 31)
      if (endDate.getDate() !== day) {
        // Set to last day of the month
        endDate.setDate(0);
      }
      
      // Validate result
      if (isNaN(endDate.getTime())) {
        console.error('Invalid calculated end date');
        return '';
      }
      
      return endDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error calculating end date:', error);
      return '';
    }
  }, []);

  const getTodayDate = useCallback(() => {
    try {
      const today = new Date();
      if (isNaN(today.getTime())) {
        // Fallback to a known valid date
        return '2025-01-01';
      }
      return today.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error getting today date:', error);
      return '2025-01-01';
    }
  }, []);

  const todayDate = useMemo(() => getTodayDate(), [getTodayDate]);

  // Refs for auto-focus
  const startMonthRef = useRef(null);
  const startYearRef = useRef(null);
  const endDayRef = useRef(null);
  const endMonthRef = useRef(null);
  const endYearRef = useRef(null);

  // State for date parts
  const [startDate, setStartDate] = useState(() => {
    try {
      const parts = todayDate.split('-');
      if (parts.length === 3) {
        return { year: parts[0], month: parts[1], day: parts[2] };
      }
    } catch (error) {
      console.error('Error initializing start date:', error);
    }
    // Fallback
    return { year: '2025', month: '01', day: '01' };
  });

  const [endDate, setEndDate] = useState(() => {
    try {
      const endDateStr = calculateEndDate(todayDate, 'شهري');
      if (endDateStr) {
        const parts = endDateStr.split('-');
        if (parts.length === 3) {
          return { year: parts[0], month: parts[1], day: parts[2] };
        }
      }
    } catch (error) {
      console.error('Error initializing end date:', error);
    }
    // Fallback
    return { year: '2025', month: '02', day: '01' };
  });

  // State
  const [formData, setFormData] = useState({
    custom_id: '',
    name: '',
    phone: '',
    photo: null,
    subscriptionType: 'شهري',
    subscriptionStart: todayDate,
    subscriptionEnd: calculateEndDate(todayDate, 'شهري'),
    paymentType: 'كاش',
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    notes: ''
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isLoadingNextId, setIsLoadingNextId] = useState(false);

  // Auto-load next ID
  useEffect(() => {
    const loadNextId = async () => {
      setIsLoadingNextId(true);
      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          const result = await window.electronAPI.getHighestCustomId();
          
          if (result.success && result.highestId) {
            const currentNumber = parseInt(result.highestId) || 0;
            const nextNumber = currentNumber + 1;
            const nextId = String(nextNumber);
            
            setFormData(prev => ({
              ...prev,
              custom_id: nextId
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              custom_id: '1'
            }));
          }
        } else {
          setFormData(prev => ({
            ...prev,
            custom_id: '1'
          }));
        }
      } catch (error) {
        console.error('Error loading next ID:', error);
        setFormData(prev => ({
          ...prev,
          custom_id: '1'
        }));
      } finally {
        setIsLoadingNextId(false);
      }
    };

    loadNextId();
  }, []);

  // Handle date changes
  const handleStartDateChange = useCallback((field, value) => {
    setStartDate(prev => {
      const updated = { ...prev, [field]: value };
      
      // Validate components
      const day = parseInt(updated.day) || 1;
      const month = parseInt(updated.month) || 1;
      const year = parseInt(updated.year) || new Date().getFullYear();
      
      // Ensure valid ranges
      const validDay = Math.min(Math.max(day, 1), 31);
      const validMonth = Math.min(Math.max(month, 1), 12);
      const validYear = Math.min(Math.max(year, 2020), 2050);
      
      // Build date string with valid values
      const dayStr = String(validDay).padStart(2, '0');
      const monthStr = String(validMonth).padStart(2, '0');
      const yearStr = String(validYear);
      
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      
      // Validate the constructed date
      const testDate = new Date(dateStr);
      if (!isNaN(testDate.getTime())) {
        // Update form data
        setFormData(prevForm => ({
          ...prevForm,
          subscriptionStart: dateStr,
          subscriptionEnd: calculateEndDate(dateStr, prevForm.subscriptionType)
        }));
        
        // Update end date display
        const newEndDate = calculateEndDate(dateStr, formData.subscriptionType);
        if (newEndDate) {
          const endParts = newEndDate.split('-');
          setEndDate({ year: endParts[0], month: endParts[1], day: endParts[2] });
        }
      }
      
      return updated;
    });
  }, [calculateEndDate, formData.subscriptionType]);

  const handleEndDateChange = useCallback((field, value) => {
    setEndDate(prev => {
      const updated = { ...prev, [field]: value };
      
      // Validate components
      const day = parseInt(updated.day) || 1;
      const month = parseInt(updated.month) || 1;
      const year = parseInt(updated.year) || new Date().getFullYear();
      
      // Ensure valid ranges
      const validDay = Math.min(Math.max(day, 1), 31);
      const validMonth = Math.min(Math.max(month, 1), 12);
      const validYear = Math.min(Math.max(year, 2020), 2050);
      
      // Build date string with valid values
      const dayStr = String(validDay).padStart(2, '0');
      const monthStr = String(validMonth).padStart(2, '0');
      const yearStr = String(validYear);
      
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      
      // Validate the constructed date
      const testDate = new Date(dateStr);
      if (!isNaN(testDate.getTime())) {
        // Update form data
        setFormData(prevForm => ({
          ...prevForm,
          subscriptionEnd: dateStr
        }));
      }
      
      return updated;
    });
  }, []);

  // Auto-focus next field
  const handleDayInput = (e, nextRef) => {
    if (e.target.value.length === 2 && nextRef?.current) {
      nextRef.current.focus();
    }
  };

  const setTodayAsStart = useCallback(() => {
    try {
      const today = getTodayDate();
      const parts = today.split('-');
      
      if (parts.length === 3) {
        setStartDate({ year: parts[0], month: parts[1], day: parts[2] });
        
        setFormData(prev => ({
          ...prev,
          subscriptionStart: today,
          subscriptionEnd: calculateEndDate(today, prev.subscriptionType)
        }));
        
        const newEndDate = calculateEndDate(today, formData.subscriptionType);
        if (newEndDate) {
          const endParts = newEndDate.split('-');
          if (endParts.length === 3) {
            setEndDate({ year: endParts[0], month: endParts[1], day: endParts[2] });
          }
        }
      }
    } catch (error) {
      console.error('Error setting today as start:', error);
      alert('❌ خطأ في تعيين تاريخ اليوم');
    }
  }, [getTodayDate, calculateEndDate, formData.subscriptionType]);

  // Event Handlers
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto update end date when subscription type changes
      if (name === 'subscriptionType') {
        try {
          const newEndDate = calculateEndDate(prev.subscriptionStart, value);
          if (newEndDate) {
            updated.subscriptionEnd = newEndDate;
            
            const endParts = newEndDate.split('-');
            if (endParts.length === 3) {
              setEndDate({ year: endParts[0], month: endParts[1], day: endParts[2] });
            }
          }
        } catch (error) {
          console.error('Error updating end date:', error);
        }
      }
      
      // Auto calculate remaining
      if (name === 'totalAmount' || name === 'paidAmount') {
        const total = name === 'totalAmount' ? parseFloat(value) || 0 : prev.totalAmount;
        const paid = name === 'paidAmount' ? parseFloat(value) || 0 : prev.paidAmount;
        updated.remainingAmount = total - paid;
      }
      
      return updated;
    });
  }, [calculateEndDate]);

  const handlePhotoChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('⚠️ من فضلك اختر صورة فقط');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ حجم الصورة كبير جداً (أقصى حجم 5MB)');
      return;
    }

    try {
      setIsCompressingImage(true);
      
      const compressedFile = await compressImage(file, 800, 0.8);
      setFormData(prev => ({ ...prev, photo: compressedFile }));
      
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(compressedFile);
      
      const originalSize = (file.size / 1024).toFixed(2);
      const compressedSize = (compressedFile.size / 1024).toFixed(2);
      const savings = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
      
      console.log(`✅ Image compressed: ${originalSize}KB → ${compressedSize}KB (${savings}% saved)`);
    } catch (error) {
      console.error('Image compression error:', error);
      alert('❌ خطأ في معالجة الصورة');
    } finally {
      setIsCompressingImage(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!formData.name || !formData.phone || !formData.subscriptionStart) {
      alert('⚠️ من فضلك أكمل البيانات المطلوبة (الاسم، التليفون، تاريخ البداية)');
      return;
    }

    if (formData.phone.length < 11) {
      alert('⚠️ رقم التليفون غير صحيح');
      return;
    }

    // Validate dates
    try {
      const startDateObj = new Date(formData.subscriptionStart);
      if (isNaN(startDateObj.getTime())) {
        alert('⚠️ تاريخ البداية غير صالح\nتأكد من إدخال التاريخ بشكل صحيح');
        return;
      }

      if (formData.subscriptionEnd) {
        const endDateObj = new Date(formData.subscriptionEnd);
        if (isNaN(endDateObj.getTime())) {
          alert('⚠️ تاريخ النهاية غير صالح\nتأكد من إدخال التاريخ بشكل صحيح');
          return;
        }

        // Check if end date is after start date
        if (endDateObj <= startDateObj) {
          alert('⚠️ تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
          return;
        }
      }
    } catch (error) {
      console.error('Date validation error:', error);
      alert('⚠️ خطأ في التحقق من التواريخ\nتأكد من إدخال التواريخ بشكل صحيح');
      return;
    }

    setIsSubmitting(true);

    try {
      let photoBase64 = null;
      if (formData.photo) {
        const reader = new FileReader();
        photoBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(formData.photo);
        });
      }

      const memberData = {
        custom_id: formData.custom_id || null,
        name: formData.name,
        phone: formData.phone,
        photo: photoBase64,
        subscriptionType: formData.subscriptionType,
        subscriptionStart: formData.subscriptionStart,
        subscriptionEnd: formData.subscriptionEnd,
        paymentType: formData.paymentType,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        paidAmount: parseFloat(formData.paidAmount) || 0,
        remainingAmount: parseFloat(formData.remainingAmount) || 0,
        notes: formData.notes || ''
      };

      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.addMember(memberData);

        if (result.success) {
          alert('✅ تم تسجيل العضو بنجاح!\n\nرقم العضو: ' + (formData.custom_id || result.id));
          setTimeout(() => router.push('/members'), 1000);
        } else {
          alert('❌ خطأ في التسجيل: ' + result.error);
        }
      } else {
        console.log('💾 Member data (Development mode):', memberData);
        alert('✅ تم تسجيل العضو بنجاح (وضع التطوير)!');
        setTimeout(() => router.push('/members'), 1000);
      }

    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ حدث خطأ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, router]);

  const handleReset = useCallback(() => {
    if (confirm('هل تريد مسح جميع البيانات المدخلة؟')) {
      try {
        const today = getTodayDate();
        const parts = today.split('-');
        
        if (parts.length === 3) {
          setStartDate({ year: parts[0], month: parts[1], day: parts[2] });
          
          const endDateStr = calculateEndDate(today, 'شهري');
          if (endDateStr) {
            const endParts = endDateStr.split('-');
            if (endParts.length === 3) {
              setEndDate({ year: endParts[0], month: endParts[1], day: endParts[2] });
            }
          }
          
          setFormData({
            custom_id: '',
            name: '',
            phone: '',
            photo: null,
            subscriptionType: 'شهري',
            subscriptionStart: today,
            subscriptionEnd: endDateStr,
            paymentType: 'كاش',
            totalAmount: 0,
            paidAmount: 0,
            remainingAmount: 0,
            notes: ''
          });
          setPhotoPreview(null);
        }
      } catch (error) {
        console.error('Error resetting form:', error);
        alert('❌ خطأ في إعادة تعيين النموذج');
      }
    }
  }, [getTodayDate, calculateEndDate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🏋️ تسجيل عضو جديد</h1>
            <p className="text-gray-400">أدخل بيانات العضو بالكامل</p>
          </div>

          <div className="space-y-6">
            {/* Photo Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-32 h-32 rounded-full bg-gray-700 border-4 border-blue-500 overflow-hidden mb-4 shadow-lg relative">
                {isCompressingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl">
                    👤
                  </div>
                )}
              </div>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition shadow-lg disabled:opacity-50">
                <span>{isCompressingImage ? '⏳ جاري المعالجة...' : '📷 اختر صورة'}</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={isCompressingImage}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">اختياري (سيتم ضغطها تلقائياً)</p>
            </div>

            {/* Custom ID */}
            <div className="bg-blue-900/20 border-2 border-blue-500 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                  🆔
                </div>
                <div className="flex-1">
                  <label className="block text-blue-300 mb-1 font-bold">
                    رقم ID العضو (للكارت)
                    {isLoadingNextId && (
                      <span className="text-xs text-yellow-300 mr-2">
                        ⏳ جاري تحميل الرقم التالي...
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="custom_id"
                      value={formData.custom_id}
                      onChange={handleChange}
                      disabled={isLoadingNextId}
                      className={`w-full px-4 py-3 bg-gray-700 border-2 border-blue-500 rounded-lg text-white text-2xl font-bold text-center focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                        isLoadingNextId ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      placeholder="1"
                      maxLength="10"
                    />
                    {isLoadingNextId && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-blue-300 mt-1 text-center">
                    {isLoadingNextId 
                      ? 'يتم البحث عن آخر رقم موجود...'
                      : 'رقم بسيط بدون أصفار (1, 2, 3...)'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="مثال: أحمد محمد"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">
                  رقم التليفون *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="01xxxxxxxxx"
                  maxLength="11"
                  required
                />
              </div>
            </div>

            {/* Subscription Info */}
            <div className="bg-gray-750 p-6 rounded-xl border border-gray-600">
              <h3 className="text-xl font-bold text-white mb-4">📋 بيانات الاشتراك</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    نوع الاشتراك
                  </label>
                  <select
                    name="subscriptionType"
                    value={formData.subscriptionType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="شهري">شهري (1 شهر)</option>
                    <option value="3شهور">3 شهور</option>
                    <option value="6شهور">6 شهور</option>
                    <option value="سنوي">سنوي (12 شهر)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    نوع الدفع
                  </label>
                  <select
                    name="paymentType"
                    value={formData.paymentType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="كاش">💵 كاش</option>
                    <option value="فيزا">💳 فيزا</option>
                    <option value="انستباي">📱 انستباي</option>
                    <option value="تحويل بنكي">🏦 تحويل بنكي</option>
                  </select>
                </div>

                {/* Start Date - Easy Input */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    تاريخ البداية *
                  </label>
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={startDate.day}
                        onChange={(e) => {
                          let val = e.target.value.slice(0, 2);
                          // Ensure day is between 1 and 31
                          const dayNum = parseInt(val);
                          if (dayNum && (dayNum < 1 || dayNum > 31)) {
                            val = String(Math.min(Math.max(dayNum, 1), 31)).padStart(2, '0');
                          } else if (val.length === 2) {
                            val = val.padStart(2, '0');
                          }
                          handleStartDateChange('day', val);
                          if (val.length === 2) {
                            handleDayInput(e, startMonthRef);
                          }
                        }}
                        placeholder="15"
                        min="1"
                        max="31"
                        className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-400 text-center mt-1">اليوم</p>
                    </div>
                    <div className="flex-1">
                      <select
                        ref={startMonthRef}
                        value={startDate.month}
                        onChange={(e) => handleStartDateChange('month', e.target.value)}
                        className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="01">1 - يناير</option>
                        <option value="02">2 - فبراير</option>
                        <option value="03">3 - مارس</option>
                        <option value="04">4 - أبريل</option>
                        <option value="05">5 - مايو</option>
                        <option value="06">6 - يونيو</option>
                        <option value="07">7 - يوليو</option>
                        <option value="08">8 - أغسطس</option>
                        <option value="09">9 - سبتمبر</option>
                        <option value="10">10 - أكتوبر</option>
                        <option value="11">11 - نوفمبر</option>
                        <option value="12">12 - ديسمبر</option>
                      </select>
                      <p className="text-xs text-gray-400 text-center mt-1">الشهر</p>
                    </div>
                    <div className="flex-1">
                      <input
                        ref={startYearRef}
                        type="number"
                        value={startDate.year}
                        onChange={(e) => {
                          let val = e.target.value.slice(0, 4);
                          // Ensure year is in reasonable range
                          const yearNum = parseInt(val);
                          if (yearNum && (yearNum < 2020 || yearNum > 2050)) {
                            val = String(Math.min(Math.max(yearNum, 2020), 2050));
                          }
                          handleStartDateChange('year', val);
                        }}
                        placeholder="2025"
                        min="2020"
                        max="2050"
                        className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-400 text-center mt-1">السنة</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={setTodayAsStart}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-semibold text-sm"
                  >
                    📅 اليوم
                  </button>
                </div>

                {/* End Date - Easy Input */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    تاريخ النهاية
                    <span className="text-xs text-gray-400 mr-2">(تلقائي)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        ref={endDayRef}
                        type="number"
                        value={endDate.day}
                        onChange={(e) => {
                          let val = e.target.value.slice(0, 2);
                          // Ensure day is between 1 and 31
                          const dayNum = parseInt(val);
                          if (dayNum && (dayNum < 1 || dayNum > 31)) {
                            val = String(Math.min(Math.max(dayNum, 1), 31)).padStart(2, '0');
                          } else if (val.length === 2) {
                            val = val.padStart(2, '0');
                          }
                          handleEndDateChange('day', val);
                          if (val.length === 2) {
                            handleDayInput(e, endMonthRef);
                          }
                        }}
                        placeholder="15"
                        min="1"
                        max="31"
                        className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-400 text-center mt-1">اليوم</p>
                    </div>
                    <div className="flex-1">
                      <select
                        ref={endMonthRef}
                        value={endDate.month}
                        onChange={(e) => handleEndDateChange('month', e.target.value)}
                        className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="01">1 - يناير</option>
                        <option value="02">2 - فبراير</option>
                        <option value="03">3 - مارس</option>
                        <option value="04">4 - أبريل</option>
                        <option value="05">5 - مايو</option>
                        <option value="06">6 - يونيو</option>
                        <option value="07">7 - يوليو</option>
                        <option value="08">8 - أغسطس</option>
                        <option value="09">9 - سبتمبر</option>
                        <option value="10">10 - أكتوبر</option>
                        <option value="11">11 - نوفمبر</option>
                        <option value="12">12 - ديسمبر</option>
                      </select>
                      <p className="text-xs text-gray-400 text-center mt-1">الشهر</p>
                    </div>
                    <div className="flex-1">
                      <input
                        ref={endYearRef}
                        type="number"
                        value={endDate.year}
                        onChange={(e) => {
                          let val = e.target.value.slice(0, 4);
                          // Ensure year is in reasonable range
                          const yearNum = parseInt(val);
                          if (yearNum && (yearNum < 2020 || yearNum > 2050)) {
                            val = String(Math.min(Math.max(yearNum, 2020), 2050));
                          }
                          handleEndDateChange('year', val);
                        }}
                        placeholder="2025"
                        min="2020"
                        max="2050"
                        className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-400 text-center mt-1">السنة</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    إجمالي المبلغ (جنيه)
                  </label>
                  <input
                    type="number"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    المبلغ المدفوع (جنيه)
                  </label>
                  <input
                    type="number"
                    name="paidAmount"
                    value={formData.paidAmount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-2 font-semibold">
                    المبلغ المتبقي (جنيه)
                    <span className="text-xs text-gray-400 mr-2">(تلقائي)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="remainingAmount"
                      value={formData.remainingAmount}
                      readOnly
                      className={`w-full px-4 py-3 border border-gray-600 rounded-lg text-white cursor-not-allowed font-bold ${
                        formData.remainingAmount > 0 
                          ? 'bg-red-900/50 text-red-400' 
                          : formData.remainingAmount === 0 && formData.totalAmount > 0
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-600'
                      }`}
                      placeholder="0.00"
                    />
                    {formData.remainingAmount > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-xl">
                        ⚠️
                      </span>
                    )}
                    {formData.remainingAmount === 0 && formData.totalAmount > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 text-xl">
                        ✅
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                ملاحظات
                <span className="text-xs text-gray-400 mr-2">(اختياري)</span>
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                placeholder="أي ملاحظات إضافية عن العضو..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isCompressingImage}
                className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg ${
                  (isSubmitting || isCompressingImage) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? '⏳ جاري الحفظ...' : '✅ حفظ العضو'}
              </button>
              
              <button
                onClick={handleReset}
                disabled={isSubmitting || isCompressingImage}
                className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
              >
                🔄 مسح
              </button>
              
              <button
                onClick={() => router.push('/members')}
                disabled={isSubmitting || isCompressingImage}
                className="px-6 py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition"
              >
                ❌ إلغاء
              </button>
            </div>

            {/* Warning */}
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
              <p className="text-yellow-400 text-sm">
                <span className="font-bold">⚠️ ملاحظة:</span> الحقول المطلوبة (*): 
                الاسم، رقم التليفون، تاريخ البداية
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}