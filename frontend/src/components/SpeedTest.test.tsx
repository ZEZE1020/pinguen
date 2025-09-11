import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SpeedTest from './SpeedTest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;
global.performance.now = vi.fn();

describe('SpeedTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the initial status check to simulate connected state
    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      })
    );
  });

  it('renders initial state correctly', async () => {
    render(<SpeedTest />);
    
    expect(screen.getByText('Pinguen Speed Test')).toBeInTheDocument();
    
    // Wait for connection check to complete
    await waitFor(() => {
      expect(screen.getByText('Start Speed Test')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Testing...')).not.toBeInTheDocument();
  });

  it('handles successful speed test', async () => {
    // Mock timing functions
    let currentTime = 0;
    (performance.now as any).mockImplementation(() => currentTime);

    // Mock successful API responses
    mockFetch
      // Initial status check (already mocked in beforeEach)
      // Ping
      .mockImplementationOnce(() => {
        currentTime += 50; // Simulate 50ms ping
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ timestamp: Date.now() })
        });
      })
      // Download
      .mockImplementationOnce(() => {
        currentTime += 1000; // Simulate 1s download
        return Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: () => Promise.resolve({
                done: true,
                value: new Uint8Array(10 * 1024 * 1024)
              })
            })
          }
        });
      })
      // Upload
      .mockImplementationOnce(() => {
        currentTime += 500; // Simulate 500ms upload
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            bytesUploaded: 2 * 1024 * 1024,
            duration: 500
          })
        });
      });

    render(<SpeedTest />);
    
    // Wait for connection check to complete first
    await waitFor(() => {
      expect(screen.getByText('Start Speed Test')).toBeInTheDocument();
    });
    
    // Start the test
    fireEvent.click(screen.getByText('Start Speed Test'));

    // Verify loading states
    expect(screen.getByText('Testing...')).toBeInTheDocument();

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('50.0')).toBeInTheDocument(); // Ping
      expect(screen.getAllByText(/\d+\.\d+/)).toHaveLength(3); // Should have ping, download, and upload values
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock failed API response for the speed test (ping will fail)
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<SpeedTest />);
    
    // Wait for connection check to complete first
    await waitFor(() => {
      expect(screen.getByText('Start Speed Test')).toBeInTheDocument();
    });
    
    // Start the test
    fireEvent.click(screen.getByText('Start Speed Test'));

    // Verify loading state
    expect(screen.getByText('Testing...')).toBeInTheDocument();

    // Wait for error handling
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Speed test failed:', expect.any(Error));
      expect(screen.getByText('Start Speed Test')).toBeEnabled();
    });

    consoleSpy.mockRestore();
  });
});
