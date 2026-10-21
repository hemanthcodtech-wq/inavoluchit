import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, RotateCcw, Check, RefreshCw, Image as ImageIcon } from 'lucide-react';

const compressImage = (file, maxDim = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressed);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const ProofUploader = ({
  onFileSelected,
  label = 'Payment Receipt / Proof',
  required = false,
  description = 'Upload receipt image or capture live photo with camera'
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // default back camera for documents
  const [cameraError, setCameraError] = useState('');
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera when unmounting or deactivated
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError('');
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const startCamera = async (facing = cameraFacing) => {
    stopCamera();
    setCameraError('');
    setIsCameraActive(true);
    setCameraFacing(facing);

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      // Fallback without ideal facingMode constraint
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        setCameraError('Unable to access camera. Please check permissions or upload a file.');
        setIsCameraActive(false);
      }
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    setProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      stopCamera();

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setProcessing(false);
          return;
        }
        const rawFile = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const compressed = await compressImage(rawFile);
        const url = URL.createObjectURL(compressed);

        setSelectedFile(compressed);
        setPreviewUrl(url);
        if (onFileSelected) onFileSelected(compressed);
        setProcessing(false);
      }, 'image/jpeg', 0.85);
    } catch (err) {
      console.error('Photo capture error:', err);
      setProcessing(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const compressed = await compressImage(file);
      const url = URL.createObjectURL(compressed);
      setSelectedFile(compressed);
      setPreviewUrl(url);
      if (onFileSelected) onFileSelected(compressed);
    } catch (err) {
      console.error('File compression error:', err);
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      if (onFileSelected) onFileSelected(file);
    } finally {
      setProcessing(false);
    }
  };

  const clearSelection = () => {
    stopCamera();
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onFileSelected) onFileSelected(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1f2937' }}>
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
        {description && (
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{description}</span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* State 1: Image Selected Preview */}
      {previewUrl && (
        <div style={{
          position: 'relative',
          padding: '0.75rem',
          backgroundColor: '#f8fafc',
          border: '1.5px solid #22c55e',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 2px 6px rgba(34, 197, 94, 0.1)'
        }}>
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              width: '72px',
              height: '72px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '1px solid #cbd5e1'
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}>
              <Check size={16} />
              <span>Proof Attached</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedFile?.name || 'receipt.jpg'} ({selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : ''})
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <X size={14} />
            <span>Remove</span>
          </button>
        </div>
      )}

      {/* State 2: Active Camera View */}
      {isCameraActive && !previewUrl && (
        <div style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          border: '2px solid #2563eb'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              maxHeight: '260px',
              objectFit: 'cover',
              display: 'block'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0 1rem'
          }}>
            <button
              type="button"
              onClick={() => startCamera(cameraFacing === 'user' ? 'environment' : 'user')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Switch Camera"
            >
              <RefreshCw size={18} />
            </button>

            <button
              type="button"
              onClick={capturePhoto}
              disabled={processing}
              style={{
                backgroundColor: '#22c55e',
                color: '#ffffff',
                border: '3px solid #ffffff',
                borderRadius: '9999px',
                padding: '0.6rem 1.6rem',
                fontSize: '0.9rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
              }}
            >
              <Camera size={18} />
              <span>{processing ? 'Processing...' : 'Take Photo'}</span>
            </button>

            <button
              type="button"
              onClick={stopCamera}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Cancel Camera"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* State 3: Default Selection Buttons */}
      {!previewUrl && !isCameraActive && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '10px',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.backgroundColor = '#eff6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
          >
            <Upload size={17} color="#2563eb" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={() => startCamera('environment')}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '10px',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#16a34a';
              e.currentTarget.style.backgroundColor = '#f0fdf4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
          >
            <Camera size={17} color="#16a34a" />
            <span>Take Photo (Live)</span>
          </button>
        </div>
      )}

      {cameraError && (
        <p style={{ fontSize: '0.75rem', color: '#dc2626', margin: '0.25rem 0 0 0' }}>{cameraError}</p>
      )}
    </div>
  );
};

export default ProofUploader;
