"use client";
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { compressImage } from '../../hooks/optimizedHooks';
import cleanupManager, { useCleanup } from '../../utils/cleanupManager';

export default function AddMemberPage() {
  const router = useRouter();
  const { cleanup, safeOperation, wrapHandler } = useCleanup();

  const [formData, setFormData] = useState({
    custom_id: '',
    name: '',
    phone: '',
    photo: null,
    subscriptionType: 'شهري',
    subscriptionStart: new Date().toISOString().split('T')[0],
    subscriptionEnd: '',
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

  const calculateEndDate = useCallback((startDate, type) => {
    if (!startDate) return '';
    try {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return '';
      let months = 1;
      switch(type) {
        case '3شهور': months = 3; break;
        case '6شهور': months = 6; break;
        case 'سنوي': months = 12; break;
      }
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + months);
      return endDate.toISOString().split('T')[0];
    } catch { return ''; }
  }, []);

  // Load next ID on mount
  useEffect(() => {
    const loadNextId = async () => {
      setIsLoadingNextId(true);
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.getHighestCustomId();
          if (result.success && result.highestId) {
            setFormData(prev => ({ ...prev, custom_id: String(parseInt(result.highestId) + 1) }));
          } else {
            setFormData(prev => ({ ...prev, custom_id: '1' }));
          }
        }
      } catch { 
        setFormData(prev => ({ ...prev, custom_id: '1' }));
      } finally {
        setIsLoadingNextId(false);
      }
    };
    loadNextId();
  }, []);

  // Calculate end date when start date or type changes
  useEffect(() => {
    if (formData.subscriptionStart) {
      const endDate = calculateEndDate(formData.subscriptionStart, formData.subscriptionType);
      setFormData(prev => ({ ...prev, subscriptionEnd: endDate }));
    }
  }, [formData.subscriptionStart, formData.subscriptionType, calculateEndDate]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'totalAmount' || name === 'paidAmount') {
        const total = name === 'totalAmount' ? parseFloat(value) || 0 : prev.totalAmount;
        const paid = name === 'paidAmount' ? parseFloat(value) || 0 : prev.paidAmount;
        updated.remainingAmount = total - paid;
      }
      return updated;
    });
  }, []);

  const handlePhotoChange = wrapHandler(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      await safeOperation(() => alert('⚠️ من فضلك اختر صورة فقط'));
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      await safeOperation(() => alert('⚠️ حجم الصورة كبير جداً'));
      return;
    }
    
    try {
      setIsCompressingImage(true);
      const compressedFile = await compressImage(file, 800, 0.8);
      setFormData(prev => ({ ...prev, photo: compressedFile }));
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(compressedFile);
    } catch {
      await safeOperation(() => alert('❌ خطأ في معالجة الصورة'));
    } finally {
      setIsCompressingImage(false);
    }
  });

  const handleSubmit = wrapHandler(async (e) => {
    e?.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.subscriptionStart) {
      await safeOperation(() => alert('⚠️ من فضلك أكمل البيانات المطلوبة'));
      return;
    }
    
    if (formData.phone.length < 11) {
      await safeOperation(() => alert('⚠️ رقم التليفون غير صحيح'));
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

      if (window.electronAPI) {
        const result = await window.electronAPI.addMember(memberData);
        if (result.success) {
          await safeOperation(() => 
            alert('✅ تم تسجيل العضو بنجاح!\n\nرقم العضو: ' + (formData.custom_id || result.id))
          );
          
          // Navigate after cleanup
          setTimeout(() => {
            cleanup();
            router.push('/members');
          }, 200);
        } else {
          await safeOperation(() => alert('❌ خطأ في التسجيل: ' + result.error));
        }
      } else {
        await safeOperation(() => alert('✅ تم تسجيل العضو بنجاح!'));
        setTimeout(() => {
          cleanup();
          router.push('/members');
        }, 200);
      }
    } catch (error) {
      await safeOperation(() => alert('❌ حدث خطأ: ' + error.message));
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleReset = wrapHandler(async () => {
    const confirmed = await safeOperation(() => 
      confirm('هل تريد مسح جميع البيانات المدخلة؟')
    );
    
    if (confirmed) {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        custom_id: formData.custom_id, // Keep the ID
        name: '',
        phone: '',
        photo: null,
        subscriptionType: 'شهري',
        subscriptionStart: today,
        subscriptionEnd: calculateEndDate(today, 'شهري'),
        paymentType: 'كاش',
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        notes: ''
      });
      setPhotoPreview(null);
    }
  });

  const handleCancel = () => {
    cleanup();
    router.push('/members');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🏋️ تسجيل عضو جديد</h1>
            <p className="text-gray-400">أدخل بيانات العضو بالكامل</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-32 h-32 rounded-full bg-gray-700 border-4 border-blue-500 overflow-hidden mb-4 shadow-lg relative">
                {isCompressingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl">👤</div>
                )}
              </div>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
                <span>{isCompressingImage ? '⏳ جاري...' : '📷 اختر صورة'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={isCompressingImage} className="hidden" />
              </label>
            </div>

            {/* Custom ID */}
            <div className="bg-blue-900/20 border-2 border-blue-500 rounded-xl p-4">
              <label className="block text-blue-300 mb-2 font-bold">رقم ID العضو</label>
              <input
                type="text"
                name="custom_id"
                value={formData.custom_id}
                onChange={handleChange}
                disabled={isLoadingNextId}
                className="w-full px-4 py-3 bg-gray-700 border-2 border-blue-500 rounded-lg text-white text-2xl font-bold text-center focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="1"
              />
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">الاسم *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  placeholder="أحمد محمد" 
                  required 
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">التليفون *</label>
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

            {/* Subscription Details */}
            <div className="bg-gray-750 p-6 rounded-xl border border-gray-600">
              <h3 className="text-xl font-bold text-white mb-4">📋 الاشتراك</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2">نوع الاشتراك</label>
                  <select 
                    name="subscriptionType" 
                    value={formData.subscriptionType} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="شهري">شهري</option>
                    <option value="3شهور">3 شهور</option>
                    <option value="6شهور">6 شهور</option>
                    <option value="سنوي">سنوي</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">نوع الدفع</label>
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
                  <label className="block text-gray-300 mb-2">تاريخ البداية *</label>
                  <input 
                    type="date" 
                    name="subscriptionStart" 
                    value={formData.subscriptionStart} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">تاريخ النهاية</label>
                  <input 
                    type="date" 
                    name="subscriptionEnd" 
                    value={formData.subscriptionEnd} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">إجمالي المبلغ</label>
                  <input 
                    type="number" 
                    name="totalAmount" 
                    value={formData.totalAmount} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">المبلغ المدفوع</label>
                  <input 
                    type="number" 
                    name="paidAmount" 
                    value={formData.paidAmount} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-2">المتبقي (تلقائي)</label>
                  <input 
                    type="number" 
                    value={formData.remainingAmount} 
                    readOnly 
                    className={`w-full px-4 py-3 border rounded-lg cursor-not-allowed font-bold ${
                      formData.remainingAmount > 0 ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'
                    }`} 
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-gray-300 mb-2">ملاحظات</label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                rows="4" 
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" 
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button 
                type="submit" 
                disabled={isSubmitting || isCompressingImage} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-lg transition disabled:opacity-50"
              >
                {isSubmitting ? '⏳ جاري...' : '✅ حفظ'}
              </button>
              
              <button 
                type="button" 
                onClick={handleReset} 
                disabled={isSubmitting} 
                className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
              >
                🔄 مسح
              </button>
              
              <button 
                type="button" 
                onClick={handleCancel} 
                disabled={isSubmitting} 
                className="px-6 py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition"
              >
                ❌ إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}