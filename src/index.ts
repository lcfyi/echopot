import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';
import { env } from 'process';

const app = express();
const port = env.PORT || 3000;
const logEmitter = new EventEmitter();

const resolveIP = (req: Request) => {
  return req.header('CF-Connecting-IP') || req.header('X-Real-IP') || req.ip;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const log = `data: [${new Date().toISOString()}] ${resolveIP(req)} ${req.method} ${req.url} \'${req.headers['user-agent']}\'`;
  logEmitter.emit('log', log);
  console.log(log);
  next();
});

app.get('/.logs', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const logListener = (log: string) => {
    res.write(`${log}\n\n`);
  };
  const interval = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 30_000);

  logEmitter.on('log', logListener);

  req.on('close', () => {
    logEmitter.removeListener('log', logListener);
    clearInterval(interval);
  });
});

// Wildcard route to catch all other requests
app.all(/.*/, (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
