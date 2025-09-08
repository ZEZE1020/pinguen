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
}

const API_BASE_URL = 'http://localhost:8080';

const SpeedTest: React.FC = () => {
  const [results, setResults] = useState<SpeedTestResults | null>(null);
  const [testState, setTestState] = useState<TestState>({
    isRunning: false,
    currentTest: null,
    progress: 0,
  });

  const measurePing = async (): Promise<number> => {
    const start = performance.now();
    await fetch(`${API_BASE_URL}/ping`);
    const end = performance.now();
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
    // Create a 2MB array of random data
    const data = new Uint8Array(2 * 1024 * 1024);
    crypto.getRandomValues(data);

    const startTime = performance.now();
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: data,
    });
    const endTime = performance.now();

    const result = await response.json();
    const durationSeconds = result.duration / 1000;
    const speedMbps = (result.bytesUploaded * 8) / (1000000 * durationSeconds);

    return speedMbps;
  };

  const runSpeedTest = async () => {
    setTestState({ isRunning: true, currentTest: 'ping', progress: 0 });
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
    } catch (error) {
      console.error('Speed test failed:', error);
    } finally {
      setTestState({ isRunning: false, currentTest: null, progress: 0 });
    }
  };

  const formatSpeed = (speed: number): string => {
    return speed.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Internet Speed Test</h1>
        
        <button
          onClick={runSpeedTest}
          disabled={testState.isRunning}
          className={`w-full py-3 px-6 text-white rounded-lg text-lg font-semibold transition-colors ${
            testState.isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {testState.isRunning ? 'Testing...' : 'Test My Speed'}
        </button>

        {testState.isRunning && (
          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Testing {testState.currentTest}...
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${testState.progress}%` }}
              />
            </div>
          </div>
        )}

        {results && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Ping</div>
              <div className="text-2xl font-bold">{results.ping.toFixed(1)}</div>
              <div className="text-xs text-gray-500">ms</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Download</div>
              <div className="text-2xl font-bold">{formatSpeed(results.download)}</div>
              <div className="text-xs text-gray-500">Mbps</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Upload</div>
              <div className="text-2xl font-bold">{formatSpeed(results.upload)}</div>
              <div className="text-xs text-gray-500">Mbps</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeedTest;
