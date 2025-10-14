"use client";
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { compressImage } from '../../hooks/optimizedHooks';

export default function MemberRegistrationForm() {
  const router = useRouter();

  // Helper functions
  const calculateEndDate = useCallback((startDate, type) => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    let months = 0;
    
    switch(type) {
      case 'شهري': months = 1; break;
      case '3شهور': months = 3; break;
      case '6شهور': months = 6; break;
      case 'سنوي': months = 12; break;
      default: months = 1;
    }
    
    start.setMonth(start.getMonth() + months);
    return start.toISOString().split('T')[0];
  }, []);

  const getTodayDate = useCallback(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const todayDate = useMemo(() => getTodayDate(), [getTodayDate]);

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

  // Auto-load next ID on component mount
  useEffect(() => {
    const loadNextId = async () => {
      setIsLoadingNextId(true);
      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          const result = await window.electronAPI.getHighestCustomId();
          
          if (result.success && result.highestId) {
            // Extract number from ID and increment
            const currentNumber = parseInt(result.highestId) || 0;
            const nextNumber = currentNumber + 1;
            const nextId = String(nextNumber).padStart(4, '0'); // Format as 0001, 0002, etc.
            
            setFormData(prev => ({
              ...prev,
              custom_id: nextId
            }));
          } else {
            // If no members exist, start with 0001
            setFormData(prev => ({
              ...prev,
              custom_id: '0001'
            }));
          }
        } else {
          // Development mode - suggest 0001
          setFormData(prev => ({
            ...prev,
            custom_id: '0001'
          }));
        }
      } catch (error) {
        console.error('Error loading next ID:', error);
        // On error, suggest 0001
        setFormData(prev => ({
          ...prev,
          custom_id: '0001'
        }));
      } finally {
        setIsLoadingNextId(false);
      }
    };

    loadNextId();
  }, []);

  // Event Handlers
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto update end date
      if (name === 'subscriptionStart' || name === 'subscriptionType') {
        updated.subscriptionEnd = calculateEndDate(
          name === 'subscriptionStart' ? value : prev.subscriptionStart,
          name === 'subscriptionType' ? value : prev.subscriptionType
        );
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

    // Validation
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
      
      // Compress image
      const compressedFile = await compressImage(file, 800, 0.8);
      setFormData(prev => ({ ...prev, photo: compressedFile }));
      
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(compressedFile);
      
      // Show compression success
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

    setIsSubmitting(true);

    try {
      // Convert photo to Base64
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
      setFormData({
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
      setPhotoPreview(null);
    }
  }, [todayDate, calculateEndDate]);

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
                      placeholder="0001"
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
                      : 'هذا الرقم سيُطبع على كارت العضو (يمكنك تعديله)'
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

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    تاريخ البداية *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      name="subscriptionStart"
                      value={formData.subscriptionStart}
                      onChange={handleChange}
                      className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const today = getTodayDate();
                        setFormData(prev => ({
                          ...prev,
                          subscriptionStart: today,
                          subscriptionEnd: calculateEndDate(today, prev.subscriptionType)
                        }));
                      }}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                      title="تعيين تاريخ اليوم"
                    >
                      📅 اليوم
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    تاريخ النهاية
                    <span className="text-xs text-gray-400 mr-2">(تلقائي)</span>
                  </label>
                  <input
                    type="date"
                    name="subscriptionEnd"
                    value={formData.subscriptionEnd}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
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