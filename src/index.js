#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'hhc-std-mcp',
  version: '1.0.0',
});

// --- Search standards ---
server.tool(
  'search_standards',
  'Search Chinese industry standards (行业标准) from the National Standards Information Public Service Platform. Returns standard number, name, industry, status, and dates.',
  {
    keyword: z.string().optional().describe('Search keyword (e.g., "通信管道", "光纤", "GB 50374")'),
    industry: z.string().optional().describe('Industry filter (e.g., "通信", "电力", "建筑")'),
    ministry: z.string().optional().describe('Ministry filter (e.g., "工业和信息化部")'),
    status: z.string().optional().describe('Status: "现行" (current), "即将实施" (upcoming), "废止" (abolished). Default: all.'),
    page: z.number().int().min(1).optional().describe('Page number (default 1)'),
    size: z.number().int().min(1).max(50).optional().describe('Results per page (default 15, max 50)'),
  },
  async (args) => {
    const { keyword, industry, ministry, status, page, size } = args;
    const p = page || 1;
    const s = size || 15;
    const params = new URLSearchParams();
    params.set('current', String(p));
    params.set('size', String(s));
    if (keyword) params.set('key', keyword);
    if (industry) params.set('industry', industry);
    if (ministry) params.set('ministry', ministry);
    if (status) {
      for (const s of status.split(',')) {
        params.append('status[]', s.trim());
      }
    } else {
      params.append('status[]', '即将实施');
      params.append('status[]', '现行');
    }

    const res = await fetch('https://hbba.sacinfo.org.cn/stdQueryList', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Search API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const records = data.records || [];

    const lines = records.map((r, i) => {
      const num = i + 1 + (p - 1) * s;
      return `${num}. ${r.code} | ${r.chName} | ${r.industry || ''} | ${r.chargeDept || ''} | 发布:${formatDate(r.issueDate)} 实施:${formatDate(r.actDate)}`;
    });

    return {
      content: [{
        type: 'text',
        text: `共 ${data.pages} 页，当前第 ${data.current} 页，${records.length} 条结果:\n\n${lines.join('\n')}\n\n提示: 使用 download_standard 工具可下载 PDF，需提供标准 ID (从 API 返回的 _id 字段获取)。`,
      }],
    };
  }
);

// --- Download standard PDF ---
server.tool(
  'download_standard',
  'Download a standard document as PDF from the National Standards Platform. Returns the PDF as base64-encoded data.',
  {
    id: z.string().describe('The standard ID (the _id field from search results, a long hex string)'),
  },
  async ({ id }) => {
    const res = await fetch(`https://hbba.sacinfo.org.cn/portal/download/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('pdf')) {
      const text = await res.text();
      throw new Error(`Expected PDF but got ${ct}: ${text.substring(0, 200)}`);
    }

    const arrayBuf = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString('base64');
    const sizeMB = (arrayBuf.byteLength / 1024 / 1024).toFixed(2);

    return {
      content: [
        {
          type: 'text',
          text: `PDF downloaded successfully (${sizeMB} MB)`,
        },
        {
          type: 'image',
          data: base64,
          mimeType: 'application/pdf',
        },
      ],
    };
  }
);

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toISOString().split('T')[0];
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('hhc-std-mcp running on stdio');
