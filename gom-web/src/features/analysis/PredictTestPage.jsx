import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Play, CheckCircle2, AlertCircle, Sparkles, 
  Settings, Code, ExternalLink, Globe, RefreshCw, 
  FileText, ChevronRight, HelpCircle, Activity, Info
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { analysisApi } from './api';
import { historyApi } from '../history/api';
import { getErrorMessage } from '../../lib/utils';

export const PredictTestPage = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lang, setLang] = useState('vi');
  const [endpoint, setEndpoint] = useState('predict'); // 'predict' or 'predictLens'
  const [isAsync, setIsAsync] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0); // 0: Idle, 1: Uploading, 2: API Request, 3: Debate/Lens, 4: Judging, 5: Done
  const [progressText, setProgressText] = useState('');
  
  const [predictionId, setPredictionId] = useState(null);
  const [result, setResult] = useState(null);
  const [rawJson, setRawJson] = useState('');
  const [activeTab, setActiveTab] = useState('verdict'); // verdict, debate, lens, json
  const [pollingStatus, setPollingStatus] = useState('');

  const pollingTimerRef = useRef(null);
  const stepTimerRef = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
    // Reset output when uploading new file
    setResult(null);
    setRawJson('');
    setCurrentStep(0);
    setPredictionId(null);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError('');
    setResult(null);
    setRawJson('');
    setCurrentStep(0);
    setPredictionId(null);
  };

  // Run progress step simulation for sync calls
  const startSyncStepSimulation = () => {
    setCurrentStep(1);
    setProgressText('Đang tải ảnh lên Azure Blob Storage...');
    
    let timeElapsed = 0;
    stepTimerRef.current = setInterval(() => {
      timeElapsed += 1;
      
      if (timeElapsed === 3) {
        setCurrentStep(2);
        setProgressText('Kết nối API Gateway & Khởi chạy AI Server...');
      } else if (timeElapsed === 8) {
        setCurrentStep(3);
        setProgressText(endpoint === 'predict' 
          ? 'Tranh luận đa tác nhân (Historian, Kiln & Global Agents)...' 
          : 'Quét Google Lens & phân tích tìm kiếm ảnh tương đồng...'
        );
      } else if (timeElapsed === 18) {
        setCurrentStep(4);
        setProgressText('AI Trọng tài (Judge) đang tổng hợp phán quyết cuối cùng...');
      }
    }, 1000);
  };

  // Start polling function for Async mode
  const startPolling = (id) => {
    let attempts = 0;
    setPollingStatus('Đang bắt đầu kiểm tra kết quả...');
    setCurrentStep(2);
    setProgressText('Server đang xử lý nền (Async)...');

    pollingTimerRef.current = setInterval(async () => {
      attempts += 1;
      setPollingStatus(`Đang thăm dò trạng thái (Lần ${attempts})...`);

      try {
        const response = await historyApi.detail(id);
        const data = response.data?.data || response.data;
        const label = data.predicted_label || '';

        // Check backend pending labels
        const isPending = label === 'Đang phân tích...' || label === 'Đang phân tích Lens...' || !label;

        // Dynamic step update based on real status
        if (label === 'Đang phân tích...') {
          setCurrentStep(3);
          setProgressText('AI Server đang tranh luận ngầm...');
        } else if (label === 'Đang phân tích Lens...') {
          setCurrentStep(3);
          setProgressText('Google Lens đang quét ngầm...');
        }

        if (!isPending) {
          // Completed
          clearInterval(pollingTimerRef.current);
          setCurrentStep(5);
          setProgressText('Hoàn tất xử lý!');
          setResult(data);
          setRawJson(JSON.stringify(data, null, 2));
          setLoading(false);
          setPollingStatus('');
        }
        
        // Timeout check (approx 5 minutes)
        if (attempts > 150) {
          clearInterval(pollingTimerRef.current);
          setError('Quá thời gian chờ kết quả giám định bất đồng bộ (5 phút).');
          setLoading(false);
          setPollingStatus('');
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Don't stop immediately on network glitch, wait a bit
        if (attempts > 10) {
          clearInterval(pollingTimerRef.current);
          setError('Gặp lỗi khi truy vấn trạng thái xử lý.');
          setLoading(false);
          setPollingStatus('');
        }
      }
    }, 2500);
  };

  const handleExecute = async () => {
    if (!file) {
      setError('Vui lòng chọn hoặc kéo thả một hình ảnh gốm sứ để test.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setRawJson('');
    setPredictionId(null);
    setPollingStatus('');
    
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('lang', lang);
    if (isAsync) {
      formData.append('is_async', 'true');
    }

    try {
      if (!isAsync) {
        startSyncStepSimulation();
      } else {
        setCurrentStep(1);
        setProgressText('Đang tải ảnh & khởi tạo tác vụ ngầm...');
      }

      let res;
      if (endpoint === 'predict') {
        res = await analysisApi.predict(formData);
      } else {
        res = await analysisApi.predictLens(formData);
      }

      // Stop sync simulation timer
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);

      const responseData = res.data;
      const dbId = responseData?.db_id || responseData?.data?.db_id;
      setPredictionId(dbId);

      if (isAsync && dbId) {
        // Start polling history endpoint
        startPolling(dbId);
      } else if (dbId) {
        // Sync completed - Fetch the standard formatted record from DB to ensure correct UI mapping
        try {
          setProgressText('Đang nạp kết quả đã định dạng...');
          const detailRes = await historyApi.detail(dbId);
          const data = detailRes.data?.data || detailRes.data;
          
          setCurrentStep(5);
          setProgressText('Hoàn tất xử lý!');
          setResult(data);
          setRawJson(JSON.stringify(detailRes.data, null, 2));
        } catch (detailErr) {
          console.error('Failed to fetch detailed sync result:', detailErr);
          // Fallback to local raw data structure if detail call fails
          const fallbackData = responseData?.data || responseData;
          setResult(fallbackData);
          setRawJson(JSON.stringify(responseData, null, 2));
          setCurrentStep(5);
          setProgressText('Hoàn tất xử lý (dữ liệu thô)!');
        }
        setLoading(false);
      } else {
        // Direct fallback if no dbId
        const fallbackData = responseData?.data || responseData;
        setResult(fallbackData);
        setRawJson(JSON.stringify(responseData, null, 2));
        setCurrentStep(5);
        setProgressText('Hoàn tất xử lý!');
        setLoading(false);
      }

    } catch (err) {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      
      const msg = getErrorMessage(err, 'Lỗi kết nối hoặc xử lý từ server.');
      setError(msg);
      setCurrentStep(0);
      setLoading(false);
    }
  };

  // Helper to extract accuracy color
  const getCertaintyColor = (score) => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 60) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-navy dark:text-ivory flex items-center gap-2">
          <Activity className="h-8 w-8 text-ceramic animate-pulse" />
          GOM AI - API & Flow Test Console
        </h1>
        <p className="mt-2 text-muted dark:text-dark-text-muted max-w-3xl">
          Công cụ kiểm thử độc lập cho phép tải ảnh gốm sứ lên, tùy chỉnh tham số gửi đi, 
          theo dõi từng bước chạy trong luồng code chính và giám sát dữ liệu API đầu ra trực quan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ================= CẤU HÌNH VÀ INPUT (LỀ TRÁI) ================= */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-stroke dark:border-dark-stroke bg-surface dark:bg-dark-surface shadow-md">
            <CardHeader className="border-b border-stroke/50 dark:border-dark-stroke/50 pb-4 mb-5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-navy dark:text-ceramic" />
                Cấu hình tham số đầu vào
              </CardTitle>
              <CardDescription>Thiết lập thông số gửi tới API</CardDescription>
            </CardHeader>

            <div className="space-y-5">
              {/* Image Uploader */}
              <div>
                <label className="block text-sm font-semibold text-navy dark:text-ivory mb-2">
                  1. Ảnh gốm sứ kiểm thử (image) <span className="text-rose-500">*</span>
                </label>
                
                {!preview ? (
                  <div className="border-2 border-dashed border-stroke dark:border-dark-stroke rounded-xl p-6 hover:border-ceramic dark:hover:border-ceramic transition-colors cursor-pointer relative group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={onFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="text-center space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-surface-alt dark:bg-dark-surface-alt flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6 text-muted" />
                      </div>
                      <p className="text-sm font-medium text-navy dark:text-ivory">Nhấn để chọn hoặc kéo thả ảnh</p>
                      <p className="text-xs text-muted">Hỗ trợ JPG, PNG, WEBP</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-stroke dark:border-dark-stroke bg-surface-alt dark:bg-dark-surface-alt aspect-video flex items-center justify-center group">
                    <img src={preview} alt="Test Preview" className="max-h-full max-w-full object-contain" />
                    <button 
                      onClick={clearFile}
                      className="absolute top-2 right-2 p-2 bg-navy/80 hover:bg-navy dark:bg-dark-surface/80 dark:hover:bg-dark-surface text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-md"
                      title="Clear photo"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Endpoint selection */}
              <div>
                <label className="block text-sm font-semibold text-navy dark:text-ivory mb-2">
                  2. API Route & Engine
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEndpoint('predict')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      endpoint === 'predict' 
                        ? 'border-ceramic bg-ceramic/5 text-ceramic dark:bg-ceramic/10 font-bold' 
                        : 'border-stroke dark:border-dark-stroke hover:bg-surface-alt dark:hover:bg-dark-surface-alt text-muted'
                    }`}
                  >
                    <div className="text-sm text-navy dark:text-ivory font-bold">POST /predict</div>
                    <div className="text-xs mt-1">Multi-Agent Debate</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEndpoint('predictLens')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      endpoint === 'predictLens' 
                        ? 'border-ceramic bg-ceramic/5 text-ceramic dark:bg-ceramic/10 font-bold' 
                        : 'border-stroke dark:border-dark-stroke hover:bg-surface-alt dark:hover:bg-dark-surface-alt text-muted'
                    }`}
                  >
                    <div className="text-sm text-navy dark:text-ivory font-bold">POST /predict/lens</div>
                    <div className="text-xs mt-1">Google Lens Only</div>
                  </button>
                </div>
              </div>

              {/* Language selection */}
              <div>
                <label className="block text-sm font-semibold text-navy dark:text-ivory mb-2 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-muted" />
                  3. Ngôn ngữ trả về (lang)
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-navy dark:text-ivory">
                    <input 
                      type="radio" 
                      name="lang" 
                      value="vi" 
                      checked={lang === 'vi'}
                      onChange={() => setLang('vi')}
                      className="accent-ceramic"
                    />
                    Tiếng Việt (vi)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-navy dark:text-ivory">
                    <input 
                      type="radio" 
                      name="lang" 
                      value="en" 
                      checked={lang === 'en'}
                      onChange={() => setLang('en')}
                      className="accent-ceramic"
                    />
                    English (en)
                  </label>
                </div>
              </div>

              {/* Async/Sync Mode */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-stroke/50 dark:border-dark-stroke/50">
                <div>
                  <div className="text-sm font-semibold text-navy dark:text-ivory flex items-center gap-1.5">
                    Chạy bất đồng bộ (is_async)
                    <HelpCircle className="h-3.5 w-3.5 text-muted" title="Bất đồng bộ giúp giảm thiểu nguy cơ quá hạn mạng (timeout) bằng cách tạo hàng đợi nền." />
                  </div>
                  <div className="text-xs text-muted mt-0.5">Trả ID ngay lập tức và poll kết quả</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isAsync} 
                    onChange={(e) => setIsAsync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stroke dark:bg-dark-stroke rounded-full peer peer-focus:ring-2 peer-focus:ring-ceramic/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ceramic"></div>
                </label>
              </div>

              {/* Error warning */}
              {error && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Execute Button */}
              <Button
                variant="gold"
                size="lg"
                className="w-full justify-center text-navy-dark font-extrabold shadow-glow hover:shadow-lg transition-all"
                onClick={handleExecute}
                loading={loading}
                disabled={!file}
                leftIcon={<Play className="h-4 w-4 fill-current" />}
              >
                {loading ? 'Đang gửi Request...' : 'Bắt Đầu Chạy Test Luồng'}
              </Button>
            </div>
          </Card>

          {/* Stepper Monitor */}
          {loading && (
            <Card className="border border-stroke dark:border-dark-stroke bg-surface dark:bg-dark-surface shadow-md">
              <CardHeader className="pb-3 mb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-ceramic animate-pulse" />
                  Giám sát tiến trình thời gian thực
                </CardTitle>
              </CardHeader>
              
              <div className="space-y-4">
                <div className="text-sm font-semibold text-ceramic px-1 animate-pulse">
                  {progressText}
                </div>
                
                {pollingStatus && (
                  <div className="text-xs text-muted bg-surface-alt dark:bg-dark-surface-alt p-2 rounded-lg border border-stroke/40 dark:border-dark-stroke/40 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-ceramic animate-ping" />
                    {pollingStatus}
                  </div>
                )}

                {/* Progress Visual Timeline */}
                <div className="relative pl-6 border-l-2 border-stroke dark:border-dark-stroke space-y-5 text-sm ml-2">
                  
                  {/* Step 1 */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center border ${
                      currentStep >= 1 ? 'bg-ceramic border-ceramic' : 'bg-surface dark:bg-dark-surface border-stroke dark:border-dark-stroke'
                    }`}>
                      {currentStep > 1 && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                    <div className={currentStep === 1 ? 'text-navy dark:text-ivory font-bold' : 'text-muted'}>
                      1. Upload ảnh & Lưu trữ Blob
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center border ${
                      currentStep >= 2 ? 'bg-ceramic border-ceramic' : 'bg-surface dark:bg-dark-surface border-stroke dark:border-dark-stroke'
                    }`}>
                      {currentStep > 2 && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                    <div className={currentStep === 2 ? 'text-navy dark:text-ivory font-bold' : 'text-muted'}>
                      2. Gửi request Gateway API Laravel
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center border ${
                      currentStep >= 3 ? 'bg-ceramic border-ceramic' : 'bg-surface dark:bg-dark-surface border-stroke dark:border-dark-stroke'
                    }`}>
                      {currentStep > 3 && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                    <div className={currentStep === 3 ? 'text-navy dark:text-ivory font-bold' : 'text-muted'}>
                      3. Chạy AI Engine & Quét Google Lens (FastAPI)
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center border ${
                      currentStep >= 4 ? 'bg-ceramic border-ceramic' : 'bg-surface dark:bg-dark-surface border-stroke dark:border-dark-stroke'
                    }`}>
                      {currentStep > 4 && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                    <div className={currentStep === 4 ? 'text-navy dark:text-ivory font-bold' : 'text-muted'}>
                      4. Tổng hợp phán quyết cuối cùng (Judge Agent)
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center border ${
                      currentStep >= 5 ? 'bg-emerald-500 border-emerald-500' : 'bg-surface dark:bg-dark-surface border-stroke dark:border-dark-stroke'
                    }`}>
                      {currentStep >= 5 && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                    <div className={currentStep === 5 ? 'text-emerald-500 font-bold' : 'text-muted'}>
                      5. Lưu database & Trả dữ liệu thành công
                    </div>
                  </div>

                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ================= DỮ LIỆU ĐẦU RA & KẾT QUẢ (LỀ PHẢI) ================= */}
        <div className="lg:col-span-7">
          <Card className="border border-stroke dark:border-dark-stroke bg-surface dark:bg-dark-surface shadow-md h-full flex flex-col min-h-[500px]">
            
            {/* Header Tabs */}
            <div className="border-b border-stroke/50 dark:border-dark-stroke/50 pb-0 mb-6 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('verdict')}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'verdict'
                      ? 'border-ceramic text-ceramic'
                      : 'border-transparent text-muted hover:text-navy dark:hover:text-ivory'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Kết Luận
                </button>
                <button
                  onClick={() => setActiveTab('debate')}
                  disabled={endpoint === 'predictLens'}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeTab === 'debate'
                      ? 'border-ceramic text-ceramic'
                      : 'border-transparent text-muted hover:text-navy dark:hover:text-ivory'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  Tranh Biện AI
                </button>
                <button
                  onClick={() => setActiveTab('lens')}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'lens'
                      ? 'border-ceramic text-ceramic'
                      : 'border-transparent text-muted hover:text-navy dark:hover:text-ivory'
                  }`}
                >
                  <ExternalLink className="h-4 w-4" />
                  Google Lens
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'json'
                      ? 'border-ceramic text-ceramic'
                      : 'border-transparent text-muted hover:text-navy dark:hover:text-ivory'
                  }`}
                >
                  <Code className="h-4 w-4" />
                  Raw JSON
                </button>
              </div>

              {predictionId && (
                <div className="text-xs font-mono bg-surface-alt dark:bg-dark-surface-alt px-2 py-1 rounded border border-stroke/40 dark:border-dark-stroke/40 text-muted mb-2">
                  ID: {predictionId}
                </div>
              )}
            </div>

            {/* Content Display */}
            <div className="flex-1 flex flex-col justify-start">
              <AnimatePresence mode="wait">
                
                {/* 1. STATE CHƯA CÓ KẾT QUẢ */}
                {!result && !loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-surface-alt dark:bg-dark-surface-alt flex items-center justify-center text-muted">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-heading font-bold text-lg text-navy dark:text-ivory">Chưa có kết quả chạy test</h3>
                      <p className="text-sm text-muted max-w-sm mx-auto">
                        Hãy chọn một bức ảnh gốm sứ bên trái và bấm nút bắt đầu để chạy mô phỏng luồng code hiển thị.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* 2. STATE ĐANG CHỜ PHẢN HỒI (LOADING) */}
                {!result && loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 border-4 border-ceramic/20 border-t-ceramic rounded-full animate-spin" />
                      <Sparkles className="absolute h-6 w-6 text-ceramic animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-heading font-bold text-lg text-navy dark:text-ivory">API đang xử lý...</h3>
                      <p className="text-sm text-muted max-w-sm mx-auto animate-pulse">
                        Đang lấy thông tin phân tích từ máy chủ. Quá trình này có thể tốn từ 20 đến 45 giây tùy thuộc vào tốc độ AI tranh luận.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* 3. HIỂN THỊ KẾT QUẢ THÀNH CÔNG */}
                {result && !loading && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 flex-1 flex flex-col"
                  >
                    
                    {/* TAB KẾT LUẬN CUỐI CÙNG */}
                    {activeTab === 'verdict' && (
                      <div className="space-y-6">
                        
                        {/* Summary metrics card */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* Gauge Certainty */}
                          <div className="p-4 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-stroke/40 dark:border-dark-stroke/40 flex flex-col items-center justify-center text-center">
                            <span className="text-xs uppercase tracking-wider font-semibold text-muted mb-2">Độ Tin Cậy</span>
                            
                            <div className="relative w-24 h-24 flex items-center justify-center">
                              {/* Circle SVG */}
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="stroke-stroke dark:stroke-dark-stroke"
                                  strokeWidth="3"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className={getCertaintyColor(result.confidence || result.certainty || 50)}
                                  strokeDasharray={`${result.confidence || result.certainty || 50}, 100`}
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="absolute text-center">
                                <span className="text-xl font-extrabold text-navy dark:text-ivory">
                                  {result.confidence || result.certainty || 0}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Verdict Summary Info */}
                          <div className="md:col-span-2 p-5 rounded-xl bg-gradient-to-br from-ceramic/5 via-navy/5 to-transparent border border-ceramic/20 flex flex-col justify-center">
                            <div className="text-xs font-semibold uppercase tracking-wider text-ceramic dark:text-ceramic mb-1">
                              KẾT LUẬN CỦA TRỌNG TÀI
                            </div>
                            <h2 className="text-2xl font-black text-navy dark:text-ivory mb-1">
                              {result.predicted_label || result.final_report?.final_prediction || 'Không xác định'}
                            </h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted mt-2">
                              <span><strong>Xuất xứ:</strong> {result.country || result.final_report?.final_country || 'Đang xác minh'}</span>
                              <span>•</span>
                              <span><strong>Niên đại:</strong> {result.era || result.final_report?.final_era || 'Đang xác minh'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Reasoning summary text */}
                        <div className="p-5 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-stroke/40 dark:border-dark-stroke/40 space-y-3">
                          <h4 className="text-sm font-extrabold uppercase tracking-wider text-navy dark:text-ivory flex items-center gap-1.5">
                            <Info className="h-4 w-4 text-ceramic" />
                            Biện luận chi tiết của trọng tài (Reasoning)
                          </h4>
                          <p className="text-sm text-navy dark:text-dark-text leading-relaxed whitespace-pre-wrap">
                            {result.certainty || result.final_report?.reasoning 
                              ? (result.final_report?.reasoning || result.certainty)
                              : 'Không tìm thấy dữ liệu biện luận phán quyết.'
                            }
                          </p>
                        </div>

                        {/* Summary of debate if present */}
                        {result.final_report?.debate_summary && (
                          <div className="p-5 rounded-xl bg-surface-alt dark:bg-dark-surface-alt border border-stroke/40 dark:border-dark-stroke/40 space-y-3">
                            <h4 className="text-sm font-extrabold uppercase tracking-wider text-navy dark:text-ivory flex items-center gap-1.5">
                              Tóm tắt quá trình tranh biện
                            </h4>
                            <p className="text-sm text-muted leading-relaxed">
                              {result.final_report.debate_summary}
                            </p>
                          </div>
                        )}

                      </div>
                    )}

                    {/* TAB TRANH BIỆN AI (DEBATE ROOM LOGS) */}
                    {activeTab === 'debate' && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-extrabold uppercase tracking-wider text-navy dark:text-ivory">
                          Nhật ký tranh luận của các Agents chuyên gia
                        </h4>
                        
                        <div className="space-y-4">
                          {(result.result?.agent_predictions || result.agent_predictions || []).map((agent, index) => (
                            <div 
                              key={index}
                              className="p-4 rounded-xl border border-stroke/50 dark:border-dark-stroke/50 bg-surface dark:bg-dark-surface hover:shadow-sm transition-shadow"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-ceramic" />
                                  <span className="font-bold text-navy dark:text-ivory text-sm">{agent.agent_name || 'Expert Agent'}</span>
                                </div>
                                <span className="text-xs bg-navy/5 dark:bg-dark-surface-alt px-2.5 py-1 rounded-full text-muted font-bold">
                                  Độ tự tin: {Math.round((agent.confidence || 0.5) * 100)}%
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted bg-surface-alt dark:bg-dark-surface-alt p-2 rounded-lg mb-3">
                                <div><strong>Dòng gốm:</strong> {agent.prediction?.ceramic_line || '—'}</div>
                                <div><strong>Nơi làm:</strong> {agent.prediction?.country || '—'}</div>
                                <div><strong>Thời đại:</strong> {agent.prediction?.era || '—'}</div>
                                <div><strong>Kiểu dáng:</strong> {agent.prediction?.style || '—'}</div>
                              </div>

                              <div className="text-sm text-muted leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-ceramic/30">
                                {agent.evidence || 'Không cung cấp bằng chứng rõ ràng.'}
                              </div>

                              {agent.debate_details && (
                                <div className="mt-3 pt-3 border-t border-stroke/20 text-xs text-muted">
                                  <div className="font-semibold mb-1">Hành động trong Debate round:</div>
                                  <div className="pl-3 space-y-1">
                                    {agent.debate_details.critique_on_others && (
                                      <div>• <strong>Phản đối đối thủ:</strong> {agent.debate_details.critique_on_others}</div>
                                    )}
                                    {agent.debate_details.defense_arguments && (
                                      <div>• <strong>Tự bảo vệ:</strong> {agent.debate_details.defense_arguments}</div>
                                    )}
                                    {agent.debate_details.confidence_adjustment !== undefined && (
                                      <div>
                                        • <strong>Tự điều chỉnh độ tin cậy:</strong> 
                                        <span className={agent.debate_details.confidence_adjustment >= 0 ? 'text-emerald-500 font-bold ml-1' : 'text-rose-500 font-bold ml-1'}>
                                          {agent.debate_details.confidence_adjustment > 0 ? `+${agent.debate_details.confidence_adjustment}` : agent.debate_details.confidence_adjustment}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {(!result.result?.agent_predictions && !result.agent_predictions) && (
                            <div className="text-center p-6 text-sm text-muted">
                              Không tìm thấy lịch sử Agent chi tiết trong gói kết quả này.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB GOOGLE LENS REFERENCE */}
                    {activeTab === 'lens' && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-extrabold uppercase tracking-wider text-navy dark:text-ivory flex justify-between">
                          <span>Kết quả quét tương đồng từ Google Lens</span>
                          <span className="text-xs text-muted font-normal">
                            Trạng thái: {result.lens_status?.message || result.result?.lens_status?.message || 'Không có trạng thái'}
                          </span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(result.lens_results || result.result?.lens_results || []).map((item, index) => (
                            <a 
                              key={index}
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-3 rounded-xl border border-stroke/50 dark:border-dark-stroke/50 hover:border-ceramic dark:hover:border-ceramic bg-surface dark:bg-dark-surface hover:shadow-md transition-all flex gap-3 group"
                            >
                              {item.thumbnail && (
                                <div className="w-14 h-14 rounded-lg bg-surface-alt dark:bg-dark-surface-alt overflow-hidden flex-shrink-0 flex items-center justify-center border border-stroke/40 dark:border-dark-stroke/40">
                                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <h5 className="text-sm font-bold text-navy dark:text-ivory line-clamp-2 leading-snug group-hover:text-ceramic transition-colors" title={item.title}>
                                  {item.title}
                                </h5>
                                <div className="flex items-center text-xs text-muted gap-1 mt-1 font-mono truncate">
                                  <Globe className="h-3 w-3 flex-shrink-0" />
                                  {new URL(item.url).hostname}
                                  <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            </a>
                          ))}

                          {(!result.lens_results && !result.result?.lens_results || (result.lens_results?.length === 0)) && (
                            <div className="col-span-2 text-center p-8 text-sm text-muted">
                              Không tìm thấy kết quả ảnh tham chiếu tương tự nào từ Google Lens.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB RAW JSON FOR DEVELOPERS */}
                    {activeTab === 'json' && (
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-muted font-semibold uppercase">Định dạng JSON gốc (Đầu ra API)</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(rawJson)}
                            className="text-xs text-ceramic hover:underline flex items-center gap-1"
                          >
                            Copy JSON
                          </button>
                        </div>
                        <div className="flex-1 overflow-auto rounded-xl border border-stroke/50 dark:border-dark-stroke/50 bg-slate-950 p-4 font-mono text-xs text-slate-200 h-[380px]">
                          <pre className="whitespace-pre-wrap">{rawJson}</pre>
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}

              </AnimatePresence>
            </div>
            
          </Card>
        </div>

      </div>
    </PageContainer>
  );
};

export default PredictTestPage;
