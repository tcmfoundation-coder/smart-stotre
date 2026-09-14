import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReportsPage from '@/app/dashboard/reports/page';
import { useReports, useGenerateReport, useDownloadReport, useDeleteReport } from '@/hooks/useReports';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Amy Admin', email: 'amy@smartmart.com', role: 'admin' } },
  }),
  signOut: jest.fn(),
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: jest.fn() }),
}));

jest.mock('@/hooks/useReports', () => ({
  useReports: jest.fn(),
  useGenerateReport: jest.fn(),
  useDownloadReport: jest.fn(),
  useDeleteReport: jest.fn(),
  generateReportCSV: jest.fn(() => 'csv'),
}));

global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: true, count: 0 }) }) as any;

const idleMutation = { mutate: jest.fn(), isPending: false };

function mockReports(overrides: Partial<ReturnType<typeof useReports>> = {}) {
  (useReports as jest.Mock).mockReturnValue({
    data: [
      {
        _id: 'report-1',
        name: 'Sales Report - Jan 1',
        type: 'sales',
        generatedBy: 'Amy Admin',
        generatedAt: new Date('2024-01-01').toISOString(),
        status: 'completed',
        metadata: { totalRevenue: 1000 },
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  });
  (useGenerateReport as jest.Mock).mockReturnValue(idleMutation);
  (useDownloadReport as jest.Mock).mockReturnValue(idleMutation);
  (useDeleteReport as jest.Mock).mockReturnValue(idleMutation);
}

describe('ReportsPage "View" action', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render a "coming soon" placeholder for the View action', () => {
    mockReports();
    const markup = renderToStaticMarkup(React.createElement(ReportsPage));

    expect(markup.toLowerCase()).not.toContain('coming soon');
    expect(markup).toContain('View');
  });

  it('renders a distinct error state (not the empty-list message) when the report list fails to load', () => {
    mockReports({ data: undefined, error: new Error('Forbidden - Insufficient permissions') as any });
    const markup = renderToStaticMarkup(React.createElement(ReportsPage));

    expect(markup).toContain('Unable to load reports');
    expect(markup).not.toContain('No reports found');
  });

  it('renders the genuine empty state only when there is no error and no data', () => {
    mockReports({ data: [] });
    const markup = renderToStaticMarkup(React.createElement(ReportsPage));

    expect(markup).toContain('No reports found');
    expect(markup).not.toContain('Unable to load reports');
  });
});
