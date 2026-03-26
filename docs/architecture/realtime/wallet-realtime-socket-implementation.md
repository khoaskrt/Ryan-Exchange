# Wallet Realtime Socket Implementation (MVP)

Reference FRS: `docs/product/frs/frs-wallet-overview-usdt-deposit-vi.md`

## 1. Goal

Cập nhật trạng thái deposit và balance near real-time cho dashboard theo yêu cầu FRS (Section 14).

## 2. Components

- `server.mjs`: chạy Next.js + Socket.IO trong cùng process.
- `features/wallet/hooks/use-wallet-realtime.ts`: client hook subscribe realtime event.
- `lib/server/realtime.ts`: bridge để backend emit event vào room user.
- `app/api/internal/wallet/realtime/deposit/route.ts`: internal endpoint cho indexer/webhook bắn event.
- `lib/socket/events.ts`: event names + payload contract dùng chung.

## 3. Auth and Room Model

- Socket auth dùng cookie session `kv_session`.
- Server verify JWT từ cookie bằng `AUTH_SECRET`.
- Sau khi xác thực, socket join room: `user:{userId}`.

## 4. Event Contract

Event name: `wallet:deposit-updated`

Payload:

```json
{
  "txId": "TX-20260325-123",
  "assetCode": "USDT",
  "networkCode": "BSC",
  "amount": 100,
  "status": "PENDING",
  "txHash": "0xabc...",
  "occurredAt": "2026-03-25T13:35:00.000Z"
}
```

`status` hỗ trợ: `PENDING`, `COMPLETED`, `FAILED`.

## 5. Internal Emit API

Endpoint:

- `POST /api/internal/wallet/realtime/deposit`
- Header: `x-internal-secret: <INTERNAL_SOCKET_SECRET>`

Sample:

```bash
curl -X POST http://localhost:3000/api/internal/wallet/realtime/deposit \
  -H 'Content-Type: application/json' \
  -H 'x-internal-secret: your-secret' \
  -d '{
    "userId":"<user-id>",
    "txId":"TX-20260325-123",
    "assetCode":"USDT",
    "networkCode":"BSC",
    "amount":100,
    "status":"COMPLETED",
    "txHash":"0xabc123"
  }'
```

## 6. UI Behavior

- Dashboard hiển thị trạng thái kết nối realtime: `connecting|connected|disconnected|error`.
- Khi nhận event `PENDING/FAILED`: cập nhật transaction status.
- Khi nhận event `COMPLETED`: cập nhật transaction status và cộng `available` balance đúng asset/network.
- Cơ chế chống cộng trùng theo `txId` ở client.

## 7. Ops Notes

- Bắt buộc cấu hình `AUTH_SECRET` và `INTERNAL_SOCKET_SECRET`.
- Endpoint internal chỉ dùng service-to-service, không public.
- Ở production, nên đặt gateway/WAF hoặc private network cho endpoint internal.
