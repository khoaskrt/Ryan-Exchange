# FRS-WALLET-01: Wallet Overview Dashboard & USDT Deposit (MVP)

Role: Business Analyst  
Type: Functional Requirements Specification (FRS)

## 1. Document Control

| Field | Value |
| --- | --- |
| Project Name | Ryan Exchange |
| Document Title | Functional Requirements Specification - Wallet Overview Dashboard & USDT Deposit |
| Document ID | FRS-WALLET-01 |
| Version | v1.0 |
| Status | Draft |
| Language | Vietnamese |
| Primary Owner | Product Manager / Business Analyst |
| Target Release | MVP Phase 1 |
| Reference PRD | `docs/product/prd/prd-wallet-overview-usdt-deposit-vi.md` |

---

## 2. Purpose of Document

Tài liệu này chuyển hóa PRD Wallet Overview Dashboard & USDT Deposit thành đặc tả chức năng có thể triển khai cho FE/BE/QA.

Mục tiêu của FRS là:

- xác định rõ hành vi hệ thống sau login,
- định nghĩa chi tiết luồng deposit USDT trên BEP-20 và Polygon,
- chuẩn hóa rule trạng thái Pending / Completed / Failed,
- định nghĩa điều kiện crediting, cập nhật số dư, và hành vi realtime/near realtime,
- cung cấp acceptance criteria có thể test được.

---

## 3. Business Context

Wallet Dashboard là entry point của hành vi "funding before trading" trong MVP. User sau khi đăng nhập cần có khả năng:

- xác nhận trạng thái account,
- xem tổng tài sản và quy đổi VNĐ,
- lấy địa chỉ nạp USDT đúng network,
- theo dõi trạng thái giao dịch nạp,
- nhìn thấy balance cập nhật sau khi đủ confirmation.

Feature này là nền tảng bắt buộc trước khi mở rộng sang Withdraw, Transfer và Trade.

---

## 4. Scope

### 4.1 In Scope (MVP)

- Wallet Overview Dashboard sau login.
- Chỉ hỗ trợ asset `USDT`.
- Chỉ hỗ trợ network:
  - `BEP20_BSC` (BNB Smart Chain)
  - `POLYGON_POS` (Polygon)
- Mỗi user có địa chỉ nạp cố định theo `asset + network`.
- Hiển thị deposit address + QR + copy action + warning note.
- Hiển thị lịch sử deposit gần đây.
- Trạng thái deposit gồm `Pending`, `Completed`, `Failed`.
- Crediting theo confirmation threshold nội bộ.
- Cập nhật balance realtime hoặc near realtime sau credit.
- Bố cục có placeholder cho `Withdraw`, `Transfer`, `Trade`, `History` (disabled).

### 4.2 Out of Scope (MVP)

- Multi-asset ngoài USDT.
- Network khác ngoài BSC/Polygon.
- Withdraw flow.
- Internal transfer.
- Trading execution.
- Deposit fee model.
- Manual recovery flow (sai network/sai token) ở mức xử lý nghiệp vụ đầy đủ.
- KYC/KYT/deposit limit rule riêng cho feature này.

---

## 5. Actor Definitions

| Actor | Description |
| --- | --- |
| End User | Người dùng đã đăng nhập, cần nạp USDT để chuẩn bị giao dịch |
| Wallet Service | Dịch vụ backend quản lý ví, địa chỉ nạp, trạng thái giao dịch |
| Chain Indexer / Webhook Processor | Thành phần ingest sự kiện on-chain và cập nhật trạng thái xác nhận |
| Admin/Ops (internal) | Vận hành hệ thống, theo dõi lỗi xử lý deposit |

---

## 6. High-Level Functional Flow

### 6.1 Wallet Dashboard Entry

1. User đăng nhập thành công.
2. User vào Dashboard.
3. Hệ thống trả về Account Info + Balance + Asset list + Recent deposits.
4. Nếu chưa có dữ liệu deposit, recent list có thể rỗng.

### 6.2 Deposit Address Retrieval

1. User chọn `USDT` + network (`BEP20_BSC` hoặc `POLYGON_POS`).
2. Hệ thống tra cứu địa chỉ deposit đã persist theo `userId + asset + network`.
3. Nếu đã có, trả đúng địa chỉ cũ.
4. Nếu chưa có, hệ thống tạo mới qua wallet provider, persist, rồi trả về.

### 6.3 Deposit Crediting

1. On-chain transfer vào địa chỉ deposit được detect.
2. Hệ thống tạo/ cập nhật bản ghi deposit ở trạng thái `Pending`.
3. Hệ thống theo dõi confirmations.
4. Khi đạt threshold theo network, chuyển `Completed` và credit balance.
5. UI được đẩy cập nhật hoặc polling ngắn chu kỳ để phản ánh balance mới.

---

## 7. Screen-Level Functional Requirements

## 7.1 Account Information Block

| Req ID | Requirement |
| --- | --- |
| FR-ACC-001 | Hệ thống phải hiển thị User ID hoặc email account. |
| FR-ACC-002 | Hệ thống phải hiển thị Verification status. |
| FR-ACC-003 | Hệ thống phải hiển thị Security status (nếu dữ liệu có sẵn). |
| FR-ACC-004 | Hệ thống phải hiển thị Last login hoặc device info (nếu có). |

## 7.2 Asset Overview Block

| Req ID | Requirement |
| --- | --- |
| FR-AST-001 | Hệ thống phải hiển thị Total portfolio balance. |
| FR-AST-002 | Hệ thống phải hiển thị giá trị quy đổi VNĐ của tổng tài sản. |
| FR-AST-003 | Hệ thống phải hiển thị danh sách asset (MVP: chỉ USDT). |
| FR-AST-004 | Hệ thống phải hỗ trợ hiển thị `Available`, `Locked`, `Total` cho asset. |
| FR-AST-005 | Trong MVP, nếu không có lock rule, `Locked = 0`, `Available = Total`. |
| FR-AST-006 | Nếu dữ liệu giá thị trường chưa ổn định, 24h change có thể ẩn mà không ảnh hưởng core flow. |

## 7.3 Deposit Block

| Req ID | Requirement |
| --- | --- |
| FR-DEP-001 | Hệ thống phải có entry point rõ ràng cho action `Deposit`. |
| FR-DEP-002 | Asset selector trong MVP phải mặc định `USDT` (dropdown tùy chọn 1 giá trị). |
| FR-DEP-003 | Network selector phải cho chọn `BEP20_BSC` và `POLYGON_POS`. |
| FR-DEP-004 | Hệ thống phải hiển thị địa chỉ deposit đúng theo `user + asset + network`. |
| FR-DEP-005 | Hệ thống phải hiển thị QR code tương ứng địa chỉ deposit. |
| FR-DEP-006 | Hệ thống phải cho phép copy địa chỉ deposit. |
| FR-DEP-007 | Hệ thống phải hiển thị warning note theo network đang chọn. |
| FR-DEP-008 | Hệ thống phải hiển thị danh sách recent deposits hoặc trạng thái giao dịch gần nhất. |
| FR-DEP-009 | Địa chỉ deposit trả về cho cùng user + asset + network phải nhất quán giữa các lần truy cập. |

## 7.4 Deposit History Block

| Req ID | Requirement |
| --- | --- |
| FR-HIS-001 | Hệ thống phải hiển thị danh sách deposit gần đây. |
| FR-HIS-002 | Mỗi record tối thiểu gồm: Time, Asset, Network, Amount, Tx Hash, Status. |
| FR-HIS-003 | Trạng thái hiển thị phải thuộc tập `Pending`, `Completed`, `Failed`. |
| FR-HIS-004 | Tx hash có thể là plain text trong MVP; mở explorer là optional. |

## 7.5 Navigation Placeholder Block

| Req ID | Requirement |
| --- | --- |
| FR-NAV-001 | UI phải chừa khu vực điều hướng cho Deposit, Withdraw, Transfer, Trade, History. |
| FR-NAV-002 | Trong MVP chỉ Deposit được enable; các action còn lại ở trạng thái disabled/placeholder. |

---

## 8. Business Rules

| Rule ID | Business Rule |
| --- | --- |
| BR-WAL-001 | Hệ thống chỉ hỗ trợ `USDT` trong MVP của feature này. |
| BR-WAL-002 | Network hỗ trợ chỉ gồm `BEP20_BSC` và `POLYGON_POS`. |
| BR-WAL-003 | Mỗi user có địa chỉ cố định theo `asset + network`; không generate lại mỗi lần mở màn hình. |
| BR-WAL-004 | Chỉ credit balance khi deposit hợp lệ và đủ confirmation threshold nội bộ. |
| BR-WAL-005 | Warning note phải tương ứng network user chọn để giảm lỗi sai mạng. |
| BR-WAL-006 | Deposit sai network/sai token không bắt buộc xử lý recovery trong MVP. |
| BR-WAL-007 | Dữ liệu balance và lịch sử deposit phải nhất quán theo sự kiện crediting cuối cùng. |

---

## 9. Deposit Confirmation & Status Rules

### 9.1 Confirmation Threshold

| Network | Threshold | Completed Condition |
| --- | --- | --- |
| USDT on BEP20_BSC | 12 confirmations | Tx hợp lệ, amount hợp lệ, confirmations >= 12 |
| USDT on POLYGON_POS | 64 confirmations | Tx hợp lệ, amount hợp lệ, confirmations >= 64 |

### 9.2 Status Definition

| Status | Definition | Balance Impact |
| --- | --- | --- |
| Pending | Đã phát hiện tx nhưng chưa đủ confirmation threshold | Chưa cộng balance |
| Completed | Đã đủ confirmation threshold và credit thành công | Đã cộng balance |
| Failed | Không thể xử lý thành công do lỗi parsing/hệ thống/vận hành | Không cộng balance |

### 9.3 State Transition Rule

- `Pending -> Completed`: khi đủ confirmations và crediting transaction thành công.
- `Pending -> Failed`: khi tx không thể xử lý thành công hoặc bị reject ở tầng xử lý nội bộ.
- `Completed` là trạng thái terminal trong MVP.
- `Failed` là trạng thái terminal trong MVP.

---

## 10. Deposit Address Strategy Requirements

| Req ID | Requirement |
| --- | --- |
| FR-ADR-001 | Hệ thống phải persist địa chỉ deposit theo khóa duy nhất `userId + assetCode + networkCode`. |
| FR-ADR-002 | Nếu địa chỉ đã tồn tại ở trạng thái Active, hệ thống phải trả lại địa chỉ cũ. |
| FR-ADR-003 | Nếu chưa tồn tại, hệ thống phải tạo mới qua wallet provider và lưu DB trước khi trả về UI. |
| FR-ADR-004 | Hệ thống không được hiển thị private key hoặc seed phrase cho người dùng. |
| FR-ADR-005 | Hệ thống phải hỗ trợ trạng thái địa chỉ (Active/Disabled) để phục vụ vận hành sau này. |

---

## 11. API-Level Functional Requirements

Gợi ý contract chức năng cho MVP (endpoint cụ thể có thể tinh chỉnh theo kiến trúc hiện tại).

### 11.1 Wallet Overview API

- Method: `GET`
- Path: `/api/wallet/overview`
- Auth: Required
- Response (200):
  - account info,
  - total balance,
  - vnd converted value,
  - assets summary,
  - recent deposits.

Requirements:

| Req ID | Requirement |
| --- | --- |
| FR-API-001 | API phải trả dữ liệu đủ để render Account + Asset + Recent Deposit. |
| FR-API-002 | API phải chỉ trả dữ liệu của user đã auth. |

### 11.2 Get-or-Create Deposit Address API

- Method: `GET` hoặc `POST`
- Path: `/api/wallet/deposit-address`
- Auth: Required
- Input:
  - `assetCode` (MVP: `USDT`)
  - `networkCode` (`BEP20_BSC` hoặc `POLYGON_POS`)

Requirements:

| Req ID | Requirement |
| --- | --- |
| FR-API-003 | API phải validate asset/network thuộc phạm vi hỗ trợ MVP. |
| FR-API-004 | API phải trả địa chỉ cũ nếu đã có. |
| FR-API-005 | API phải tạo mới và persist nếu chưa có địa chỉ. |
| FR-API-006 | API phải trả warning note tương ứng network để FE hiển thị đồng bộ. |

### 11.3 Deposit History API

- Method: `GET`
- Path: `/api/wallet/deposits`
- Auth: Required
- Query: `page`, `limit`, `status` (optional)

Requirements:

| Req ID | Requirement |
| --- | --- |
| FR-API-007 | API phải trả danh sách deposit theo user, sort mới nhất trước. |
| FR-API-008 | API phải trả đủ trường Time/Asset/Network/Amount/TxHash/Status. |

### 11.4 Internal Deposit Event Ingestion API (System-to-system)

- Method: `POST`
- Path: `/api/internal/wallet/deposit-events`
- Auth: Internal secret/signature

Requirements:

| Req ID | Requirement |
| --- | --- |
| FR-API-009 | Hệ thống phải hỗ trợ ingest event detect tx mới để tạo/cập nhật trạng thái Pending. |
| FR-API-010 | Hệ thống phải idempotent theo `txHash + logIndex` (hoặc định danh tương đương). |
| FR-API-011 | Hệ thống phải cập nhật confirmations và trigger credit khi đạt threshold. |

---

## 12. Validation Rules

### 12.1 Deposit Input Validation (User-facing)

| Field | Rule |
| --- | --- |
| Asset | Bắt buộc, phải là `USDT` |
| Network | Bắt buộc, chỉ nhận `BEP20_BSC` hoặc `POLYGON_POS` |
| Address display | Chỉ hiển thị khi backend trả về hợp lệ |

### 12.2 Deposit Event Validation (Backend)

| Field | Rule |
| --- | --- |
| Tx Hash | Bắt buộc, format tx hash hợp lệ |
| To Address | Phải match địa chỉ deposit đang active trong hệ thống |
| Token Contract | Phải match contract USDT của network tương ứng (config) |
| Amount | > 0 và parse được theo decimals của token |
| Network | Thuộc danh sách network hỗ trợ |

---

## 13. Warning Notes (UI Content Rules)

| Network | Mandatory Warning Message Intent |
| --- | --- |
| BEP20_BSC | Chỉ gửi USDT qua mạng BNB Smart Chain (BEP-20) đến địa chỉ này |
| POLYGON_POS | Chỉ gửi USDT qua mạng Polygon đến địa chỉ này |

Additional mandatory warning:

- Gửi sai network hoặc sai token có thể mất tiền hoặc cần xử lý thủ công.
- Ryan Exchange không đảm bảo recovery trong MVP.

---

## 14. Real-time / Near Real-time Update Requirements

| Req ID | Requirement |
| --- | --- |
| FR-RT-001 | Sau khi deposit chuyển Completed, balance trên dashboard phải cập nhật trong vài giây từ góc nhìn user. |
| FR-RT-002 | Giải pháp có thể là websocket, server push hoặc polling ngắn chu kỳ. |
| FR-RT-003 | Nếu realtime channel lỗi, hệ thống phải có fallback polling để tránh stale balance kéo dài. |

---

## 15. Error Handling Requirements

| Req ID | Scenario | Expected Behavior |
| --- | --- | --- |
| FR-ERR-001 | Unauthorized request | Trả 401, không lộ dữ liệu ví |
| FR-ERR-002 | Asset/network không hỗ trợ | Trả 400 với message chuẩn hóa |
| FR-ERR-003 | Không tạo được địa chỉ deposit | Trả lỗi có trace id; không tạo record nửa vời |
| FR-ERR-004 | Event duplicate | Xử lý idempotent, không credit trùng |
| FR-ERR-005 | Tx detect nhưng parse thất bại | Đưa vào Failed hoặc queue retry theo rule vận hành |
| FR-ERR-006 | Pending quá lâu | Vẫn hiển thị Pending, cho phép BA/OPS định nghĩa escalation ở tài liệu exception matrix |
| FR-ERR-007 | Completed nhưng UI chưa cập nhật | Fallback refresh/poll để đồng bộ lại số dư |

---

## 16. Security & Audit Requirements

| Req ID | Requirement |
| --- | --- |
| FR-SEC-001 | Tất cả API user-facing phải yêu cầu auth hợp lệ. |
| FR-SEC-002 | Chỉ cho phép truy cập dữ liệu wallet thuộc chính user session. |
| FR-SEC-003 | Endpoint internal phải có cơ chế xác thực riêng (secret/signature/IP policy). |
| FR-SEC-004 | Hệ thống phải lưu audit log cho các sự kiện: cấp địa chỉ, detect deposit, credit success, credit failure. |
| FR-SEC-005 | Không log plaintext thông tin nhạy cảm ngoài mức cần thiết để điều tra vận hành. |

---

## 17. Non-Functional Requirements

| NFR ID | Requirement |
| --- | --- |
| NFR-001 | Dashboard phải hiển thị dữ liệu khả dụng nhanh sau login (mục tiêu UX: vài giây). |
| NFR-002 | API deposit address và deposit history phải ổn định, không trả dữ liệu mâu thuẫn. |
| NFR-003 | Crediting flow phải đảm bảo tính nhất quán dữ liệu (transaction + ledger + balance). |
| NFR-004 | Hệ thống phải có cơ chế retry/idempotency để chống credit trùng khi event trễ hoặc lặp. |
| NFR-005 | UI cần rõ ràng và giảm khả năng user thao tác sai network. |

---

## 18. Acceptance Criteria (UAT)

### 18.1 Dashboard

- User đã login truy cập dashboard thấy account info + total balance + VNĐ conversion.
- Asset list hiển thị USDT với cấu trúc Available/Locked/Total.

### 18.2 Deposit Address

- Khi chọn `USDT + BEP20_BSC`, hệ thống trả đúng một địa chỉ cố định.
- Khi chọn `USDT + POLYGON_POS`, hệ thống trả đúng một địa chỉ cố định khác (hoặc theo chính sách ví).
- Khi reload hoặc quay lại sau, địa chỉ không thay đổi nếu không có thao tác quản trị đặc biệt.

### 18.3 Deposit Status & Crediting

- Tx mới detect vào địa chỉ hợp lệ hiển thị `Pending`.
- Tx đạt threshold (`12` với BSC, `64` với Polygon) chuyển `Completed`.
- Khi `Completed`, balance user tăng đúng amount được credit.
- Nếu lỗi xử lý không recover được, status là `Failed`, balance không đổi.

### 18.4 Warning & Safety

- UI luôn hiển thị warning đúng network user đang chọn.
- Có cảnh báo rõ ràng về rủi ro gửi sai network/sai token.

---

## 19. Traceability Matrix (PRD -> FRS)

| PRD Area | FRS Coverage |
| --- | --- |
| Dashboard account/asset overview | Section 7.1, 7.2 |
| USDT + BSC/Polygon scope | Section 4, 8, 12 |
| Fixed deposit address strategy | Section 10 |
| Pending/Completed/Failed status | Section 7.4, 9 |
| Confirmation threshold recommendation | Section 9.1 |
| Real-time balance update | Section 14 |
| Warning notes by network | Section 13 |
| Out-of-scope constraints | Section 4.2 |
| BA exception follow-up | Section 15 + tài liệu exception matrix tách riêng |

---

## 20. Open Items for BA / Architecture Follow-up

1. Chốt source giá quy đổi VNĐ và chính sách fallback khi mất feed giá.
2. Chốt giới hạn hiển thị recent deposits (số bản ghi, phân trang).
3. Chốt cơ chế realtime chính thức (websocket hay polling-first).
4. Chốt chính sách timeout/escalation cho Pending quá lâu.
5. Chốt format dữ liệu explorer link cho từng network ở phase sau.

