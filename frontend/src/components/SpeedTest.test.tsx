import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SpeedTest from './SpeedTest';

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

describe('SpeedTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial state correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    render(<SpeedTest />);

    expect(screen.getByText('Pinguen Speed Test')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    expect(screen.getByText('Start Speed Test')).toBeInTheDocument();
    expect(screen.queryByText('Testing...')).not.toBeInTheDocument();
  });

  it('handles successful speed test', async () => {
    // Mock successful API responses: status, ping, download, upload
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ timestamp: Date.now() }),
      })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => {
            let sent = false;
            return {
              read: async () => {
                if (sent) {
                  return { done: true, value: undefined };
                }
                sent = true;
                return { done: false, value: new Uint8Array(10 * 1024 * 1024) };
              },
            };
          },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          bytesUploaded: 2 * 1024 * 1024,
          duration: 500,
        }),
      });

    render(<SpeedTest />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    // Start the test
    fireEvent.click(screen.getByText('Start Speed Test'));

    // Verify loading states
    expect(screen.getByText('Testing...')).toBeInTheDocument();

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Test Complete')).toBeInTheDocument();
      expect(screen.getByText('Ping')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<SpeedTest />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    // Start the test
    fireEvent.click(screen.getByText('Start Speed Test'));

    // Verify loading state
    expect(screen.getByText('Testing...')).toBeInTheDocument();

    // Wait for error handling
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Speed test failed:', expect.any(Error));
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Start Speed Test')).toBeEnabled();
    });

    consoleSpy.mockRestore();
  });
});
