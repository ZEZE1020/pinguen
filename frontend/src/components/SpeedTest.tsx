import React, { useState } from 'react';

interface SpeedTestResults {
  ping: number;
  download: number;
  upload: number;
}

interface TestState {
  isRunning: boolean;
  currentTest: 'ping' | 'download' | 'upload' | null;
  progress: number;
  error: string | null;
  isConnected: boolean;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080';

const SpeedTest: React.FC = () => {
  const [results, setResults] = useState<SpeedTestResults | null>(null);
  const [testState, setTestState] = useState<TestState>({
    isRunning: false,
    currentTest: null,
    progress: 0,
    error: null,
    isConnected: false,
  });

  // Check server connection on component mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        if (response.ok) {
          setTestState(prev => ({ ...prev, isConnected: true, error: null }));
        } else {
          setTestState(prev => ({ ...prev, isConnected: false, error: 'Server not responding' }));
        }
      } catch (error) {
        setTestState(prev => ({ 
          ...prev, 
          isConnected: false, 
          error: error instanceof Error ? error.message : 'Connection failed' 
        }));
      }
    };

    checkConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const measurePing = async (): Promise<number> => {
    const start = performance.now();
    const response = await fetch(`${API_BASE_URL}/ping`);
    const end = performance.now();
    
    if (!response.ok) {
      throw new Error(`Ping failed: ${response.status}`);
    }
    
    // Parse the response to get server timestamp
    await response.json();
    return end - start;
  };

  const measureDownload = async (): Promise<number> => {
    const startTime = performance.now();
    const response = await fetch(`${API_BASE_URL}/download`);
    const reader = response.body?.getReader();
    
    if (!reader) throw new Error('Could not get reader');

    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      
      // Update progress (assuming 10MB total)
      const progress = (totalBytes / (10 * 1024 * 1024)) * 100;
      setTestState(prev => ({ ...prev, progress }));
    }

    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;
    const speedMbps = (totalBytes * 8) / (1000000 * durationSeconds);
    
    return speedMbps;
  };

  const measureUpload = async (): Promise<number> => {
    // Create a 2MB array of random data in chunks (Web Crypto API limit is 65536 bytes)
    const totalSize = 2 * 1024 * 1024; // 2MB
    const chunkSize = 65536; // 64KB chunks
    const data = new Uint8Array(totalSize);
    
    // Fill the array in chunks
    for (let i = 0; i < totalSize; i += chunkSize) {
      const remainingBytes = Math.min(chunkSize, totalSize - i);
      const chunk = new Uint8Array(remainingBytes);
      crypto.getRandomValues(chunk);
      data.set(chunk, i);
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    const durationSeconds = result.duration / 1000;
    const speedMbps = (result.bytesUploaded * 8) / (1000000 * durationSeconds);

    return speedMbps;
  };

  const runSpeedTest = async () => {
    if (!testState.isConnected) {
      setTestState(prev => ({ ...prev, error: 'Please check your connection to the server' }));
      return;
    }

    setTestState(prev => ({ 
      ...prev, 
      isRunning: true, 
      currentTest: 'ping', 
      progress: 0, 
      error: null 
    }));
    setResults(null);

    try {
      // Measure ping
      const ping = await measurePing();
      
      // Measure download
      setTestState(prev => ({ ...prev, currentTest: 'download', progress: 0 }));
      const download = await measureDownload();
      
      // Measure upload
      setTestState(prev => ({ ...prev, currentTest: 'upload', progress: 0 }));
      const upload = await measureUpload();

      setResults({ ping, download, upload });
      setTestState(prev => ({ ...prev, error: null }));
    } catch (error) {
      console.error('Speed test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Speed test failed';
      setTestState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setTestState(prev => ({ 
        ...prev, 
        isRunning: false, 
        currentTest: null, 
        progress: 0 
      }));
    }
  };

  const formatSpeed = (speed: number): string => {
    return speed.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-4 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 sm:mb-6 shadow-lg">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2 sm:mb-4">
            Pinguen Speed Test
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-4">Test your internet connection speed</p>
          
          {/* Connection Status Bar */}
          <div className="inline-flex items-center bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-md border border-white/20">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${testState.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {testState.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="mx-3 h-4 w-px bg-gray-300"></div>
            <span className="text-xs text-gray-500 font-mono">
              {API_BASE_URL.replace('http://', '').replace('https://', '')}
            </span>
          </div>
        </div>

        {/* Main Test Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8">
          <div className="text-center mb-8 sm:mb-12">
            <div className="relative">
              <button
                onClick={runSpeedTest}
                disabled={testState.isRunning || !testState.isConnected}
                className={`group relative w-full max-w-sm mx-auto py-4 sm:py-5 px-8 sm:px-12 text-white rounded-2xl text-base sm:text-lg font-semibold transition-all duration-300 transform ${
                  testState.isRunning || !testState.isConnected
                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:scale-105 shadow-xl hover:shadow-2xl active:scale-95'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  {testState.isRunning ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-white border-t-transparent"></div>
                      <span>Testing...</span>
                    </div>
                  ) : !testState.isConnected ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 13.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span>Server Unavailable</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Start Speed Test</span>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Error Display */}
            {testState.error && (
              <div className="mt-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl animate-fade-in">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800 mb-1">Connection Error</h4>
                    <p className="text-sm text-red-700">{testState.error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Section */}
          {testState.isRunning && (
            <div className="mb-8 sm:mb-12 animate-fade-in">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-2xl p-6 sm:p-8 border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {testState.currentTest === 'ping' && (
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      )}
                      {testState.currentTest === 'download' && (
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9V16H7z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l3 3 3-3M12 13v9" />
                          </svg>
                        </div>
                      )}
                      {testState.currentTest === 'upload' && (
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9V16H7z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5l-3-3-3 3M12 2v9" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-semibold text-gray-800 capitalize">
                        Testing {testState.currentTest}
                      </div>
                      <div className="text-sm text-gray-500">
                        {testState.currentTest === 'ping' && 'Measuring network latency'}
                        {testState.currentTest === 'download' && 'Downloading test data'}
                        {testState.currentTest === 'upload' && 'Uploading test data'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-800">
                      {Math.round(testState.progress)}%
                    </div>
                    <div className="text-xs text-gray-500">Complete</div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out rounded-full relative"
                      style={{ width: `${testState.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-full"></div>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <div className="inline-flex items-center space-x-1 text-sm text-gray-600">
                      <div className="animate-pulse w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="animate-pulse w-1 h-1 bg-gray-400 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                      <div className="animate-pulse w-1 h-1 bg-gray-400 rounded-full" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {results && (
            <div className="space-y-6 sm:space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Test Complete</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Your Results</h3>
                <p className="text-gray-600">Here's how your connection performed</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Ping Result */}
                <div className="group relative bg-gradient-to-br from-green-50 via-green-50 to-green-100 rounded-2xl p-6 sm:p-8 text-center border border-green-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-green-700 mb-2 uppercase tracking-wide">Ping</div>
                    <div className="text-3xl sm:text-4xl font-bold text-green-800 mb-1">{results.ping.toFixed(1)}</div>
                    <div className="text-sm text-green-600 font-medium mb-3">milliseconds</div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      results.ping < 20 ? 'bg-green-100 text-green-800' :
                      results.ping < 50 ? 'bg-yellow-100 text-yellow-800' :
                      results.ping < 100 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {results.ping < 20 ? '🚀 Excellent' : results.ping < 50 ? '✅ Good' : results.ping < 100 ? '🔶 Fair' : '🔴 Poor'}
                    </div>
                  </div>
                </div>

                {/* Download Result */}
                <div className="group relative bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 rounded-2xl p-6 sm:p-8 text-center border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9V16H7z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19l3 3 3-3M12 13v9" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide">Download</div>
                    <div className="text-3xl sm:text-4xl font-bold text-blue-800 mb-1">{formatSpeed(results.download)}</div>
                    <div className="text-sm text-blue-600 font-medium mb-3">Mbps</div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      results.download > 100 ? 'bg-green-100 text-green-800' :
                      results.download > 25 ? 'bg-yellow-100 text-yellow-800' :
                      results.download > 5 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {results.download > 100 ? '🚀 Excellent' : results.download > 25 ? '✅ Good' : results.download > 5 ? '🔶 Fair' : '🔴 Poor'}
                    </div>
                  </div>
                </div>

                {/* Upload Result */}
                <div className="group relative bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 rounded-2xl p-6 sm:p-8 text-center border border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9V16H7z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5l-3-3-3 3M12 2v9" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-purple-700 mb-2 uppercase tracking-wide">Upload</div>
                    <div className="text-3xl sm:text-4xl font-bold text-purple-800 mb-1">{formatSpeed(results.upload)}</div>
                    <div className="text-sm text-purple-600 font-medium mb-3">Mbps</div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      results.upload > 50 ? 'bg-green-100 text-green-800' :
                      results.upload > 10 ? 'bg-yellow-100 text-yellow-800' :
                      results.upload > 2 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {results.upload > 50 ? '🚀 Excellent' : results.upload > 10 ? '✅ Good' : results.upload > 2 ? '🔶 Fair' : '🔴 Poor'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Again Button */}
              <div className="text-center mt-8">
                <button
                  onClick={runSpeedTest}
                  className="group inline-flex items-center space-x-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 text-gray-700 rounded-2xl text-sm sm:text-base font-semibold transition-all duration-300 shadow-md hover:shadow-lg border border-gray-200/50 hover:-translate-y-0.5"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Test Again</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="group bg-white/70 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-2 text-base sm:text-lg">Ping Test</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Measures network latency - the time it takes for data to travel to the server and back.</p>
              </div>
            </div>
          </div>
          
          <div className="group bg-white/70 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9V16H7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l3 3 3-3M12 13v9" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-2 text-base sm:text-lg">Download Test</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Tests how fast you can receive data from the internet by downloading test files.</p>
              </div>
            </div>
          </div>
          
          <div className="group bg-white/70 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9V16H7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5l-3-3-3 3M12 2v9" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-2 text-base sm:text-lg">Upload Test</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Tests how fast you can send data to the internet by uploading test files.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8 sm:mt-12">
          <p>Powered by Pinguen Speed Test • Built with React & Go</p>
        </div>
      </div>
    </div>
  );
};

export default SpeedTest;
