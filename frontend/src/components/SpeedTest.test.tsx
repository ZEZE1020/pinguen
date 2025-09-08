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
  });

  it('renders initial state correctly', () => {
    render(<SpeedTest />);
    
    expect(screen.getByText('Internet Speed Test')).toBeInTheDocument();
    expect(screen.getByText('Test My Speed')).toBeInTheDocument();
    expect(screen.queryByText('Testing...')).not.toBeInTheDocument();
  });

  it('handles successful speed test', async () => {
    // Mock timing functions
    let currentTime = 0;
    performance.now.mockImplementation(() => currentTime);

    // Mock successful API responses
    mockFetch
      // Ping
      .mockImplementationOnce(() => {
        currentTime += 50; // Simulate 50ms ping
        return Promise.resolve();
      })
      // Download
      .mockImplementationOnce(() => {
        currentTime += 1000; // Simulate 1s download
        return Promise.resolve({
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
          json: () => Promise.resolve({
            bytesUploaded: 2 * 1024 * 1024,
            duration: 500
          })
        });
      });

    render(<SpeedTest />);
    
    // Start the test
    fireEvent.click(screen.getByText('Test My Speed'));

    // Verify loading states
    expect(screen.getByText('Testing...')).toBeInTheDocument();

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('50.0')).toBeInTheDocument(); // Ping
      expect(screen.getByText(/\d+\.\d+/)).toBeInTheDocument(); // Download
      expect(screen.getByText(/\d+\.\d+/)).toBeInTheDocument(); // Upload
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock failed API response
    mockFetch.mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<SpeedTest />);
    
    // Start the test
    fireEvent.click(screen.getByText('Test My Speed'));

    // Verify loading state
    expect(screen.getByText('Testing...')).toBeInTheDocument();

    // Wait for error handling
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Speed test failed:', expect.any(Error));
      expect(screen.getByText('Test My Speed')).toBeEnabled();
    });

    consoleSpy.mockRestore();
  });
});
