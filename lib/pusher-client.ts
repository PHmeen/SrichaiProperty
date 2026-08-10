'use client';

import PusherClient from 'pusher-js';

// Client-side Pusher instance เดียวใช้ร่วมกันทั้งแอป (singleton กันสร้าง connection ซ้ำซ้อน)
let client: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!client) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) {
      throw new Error('Missing NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER');
    }
    client = new PusherClient(key, {
      cluster,
      authEndpoint: '/api/pusher/auth',
    });
  }
  return client;
}
