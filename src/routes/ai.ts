import { Router, Request, Response } from 'express';

const router = Router();

const ELEVATICS_CHAT_URL = process.env.ELEVATICS_CHAT_URL || '';

// POST /api/ai/v3/chat  — proxy to elevatics.online, streams SSE back
router.post('/v3/chat', async (req: Request, res: Response): Promise<void> => {
  const { message, thread_id, device_id, device_name } = req.body as {
    message: string;
    thread_id?: string;
    device_id?: string;
    device_name?: string;
  };

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  try {
    const upstream = await fetch(ELEVATICS_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, thread_id, device_id, device_name }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      console.error('Elevatics upstream error:', upstream.status, text);
      res.status(upstream.status).json({ error: text || 'AI service error' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) { res.end(); break; }
      res.write(value);
    }
  } catch (err) {
    console.error('Elevatics proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
