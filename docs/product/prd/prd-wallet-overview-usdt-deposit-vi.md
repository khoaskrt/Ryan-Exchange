# 1. Document Information

**Product Name:** Ryan Exchange

**Feature Name:** Wallet Overview Dashboard & USDT Deposit

**Document Type:** Product Requirements Document (PRD)

**Version:** v1.0

**Status:** Draft for BA / Architecture / Engineering breakdown

**Owner:** Product Manager

**Target Release:** MVP Phase 1

## 2. Product Background

Ryan Exchange cần một lớp trải nghiệm đầu tiên sau khi người dùng đăng nhập thành công, đóng vai trò là điểm vào của toàn bộ hệ thống wallet trước khi mở rộng sang trading. Ở giai đoạn MVP, hệ thống chưa ưu tiên độ phức tạp của portfolio đa tài sản mà tập trung vào một hành vi cốt lõi: người dùng truy cập dashboard, xem thông tin tài khoản và số dư, sau đó có thể nạp USDT từ ví ngoài vào hệ thống một cách rõ ràng, dễ hiểu và an toàn.

Feature này không chỉ là một màn hình hiển thị số dư. Về bản chất, đây là lớp nền tảng để tạo ra một vòng đời tài sản cơ bản trong exchange, gồm hiển thị tài sản, cung cấp địa chỉ nạp, theo dõi trạng thái giao dịch nạp, và cập nhật số dư theo thời gian thực sau khi giao dịch đủ điều kiện được ghi nhận.

---

## 3. Product Objective

Mục tiêu của feature này là tạo ra một dashboard wallet đủ rõ ràng để người dùng có thể:

- nhận biết tình trạng tài khoản của mình ngay sau đăng nhập,
- xem tổng giá trị tài sản quy đổi theo VNĐ,
- xem số dư tài sản theo từng coin,
- nạp USDT từ external wallet qua các network được hỗ trợ,
- theo dõi lịch sử và trạng thái deposit,
- và có một trải nghiệm đủ ổn định để làm nền cho giai đoạn trading sau này.

Về mặt business, feature này phải giúp hệ thống hoàn thành bước “funding before trading”, tức là đưa người dùng từ trạng thái chỉ có account sang trạng thái đã có tài sản trong sàn.

---

## 4. Problem Statement

Nếu sau khi đăng nhập người dùng chưa có nơi để xem tài khoản và chưa có cơ chế nạp tài sản vào hệ thống, thì exchange không thể hình thành hành vi sử dụng thực tế. User sẽ không biết mình có thể làm gì tiếp theo, không có entry point để fund account, và toàn bộ luồng trading phía sau sẽ bị chặn.

Do đó, Wallet Overview Dashboard không phải là một tiện ích phụ, mà là một thành phần cốt lõi của onboarding và asset funding.

---

## 5. Product Scope

### 5.1 In Scope for MVP

Trong phiên bản MVP, feature sẽ bao gồm các khả năng sau:

Dashboard phải hiển thị tổng tài sản của người dùng, đồng thời hiển thị giá trị tài sản theo từng coin. Ở giai đoạn này, hệ thống chỉ hỗ trợ **USDT**, do đó phần asset list thực tế chỉ bao gồm USDT, nhưng cấu trúc giao diện cần được thiết kế theo hướng có thể mở rộng cho nhiều asset về sau.

Hệ thống phải hiển thị giá trị quy đổi neo theo **Việt Nam Đồng (VNĐ)**. Nghĩa là mỗi khi user xem số dư USDT, hệ thống cũng hiển thị giá trị quy đổi ước tính tương ứng bằng VNĐ.

Người dùng có thể thực hiện deposit USDT thông qua hai network được hỗ trợ trong MVP là **BEP-20 trên BNB Smart Chain** và **Polygon PoS**. BNB Smart Chain hiện có block time rất ngắn và hỗ trợ fast finality; Polygon PoS cũng có cơ chế finalized block và mô tả simple L2 transfer có finality gần như tức thời. Dù vậy, sản phẩm vẫn sẽ dùng ngưỡng confirmation nội bộ trước khi ghi có số dư để tăng độ an toàn vận hành. ([BNB Chain](https://docs.bnbchain.org/bnb-smart-chain/introduction/?utm_source=chatgpt.com))

Mỗi user sẽ có **một địa chỉ ví cố định cho mỗi asset-network**, gắn với UID nội bộ của hệ thống. Với scope hiện tại, điều đó tương ứng với:

- 1 địa chỉ cố định cho USDT trên BEP-20
- 1 địa chỉ cố định cho USDT trên Polygon

Dashboard phải cho phép user xem địa chỉ deposit, QR code, copy địa chỉ ví, xem warning note theo từng network, xem lịch sử deposit, và xem trạng thái giao dịch deposit theo ba trạng thái chính là **Pending**, **Completed**, và **Failed**.

Sau khi deposit hoàn tất và đủ điều kiện ghi nhận, balance trên dashboard phải được cập nhật theo **real-time** hoặc near real-time từ góc nhìn người dùng.

Layout của dashboard phải chừa sẵn vị trí cho các action mở rộng về sau gồm **Deposit, Withdraw, Transfer, Trade, History**, tuy nhiên trong MVP chỉ **Deposit** được enable.

---

### 5.2 Out of Scope for MVP

Các nội dung sau không nằm trong phạm vi MVP của tài liệu này:

- Multi-asset deposit ngoài USDT
- Support thêm network ngoài BEP-20 và Polygon
- Withdraw flow
- Internal transfer
- Trading execution
- Advanced compliance rule engine
- Manual recovery flow cho sai network hoặc sai token
- Fee model cho deposit
- On-chain memo/tag requirement hiển thị ra cho người dùng như một phần bắt buộc của UX

Lưu ý rằng memo/tag nếu được team kỹ thuật sử dụng cho mục đích quản trị hoặc đối soát nội bộ thì có thể tồn tại ở tầng triển khai, nhưng không phải là phần product requirement bắt buộc trong MVP.

---

## 6. Target Users

Feature này phục vụ người dùng đã hoàn thành bước tạo tài khoản và đăng nhập vào hệ thống Ryan Exchange, có nhu cầu nạp USDT từ external wallet để chuẩn bị giao dịch trên sàn trong các bước tiếp theo.

---

## 7. User Stories

Người dùng cần một dashboard sau login để hiểu tài khoản của mình đang ở trạng thái nào.

Người dùng cần thấy tổng số tài sản và giá trị quy đổi ra VNĐ để nhanh chóng nắm được bức tranh tài chính của account.

Người dùng cần thấy chi tiết tài sản theo từng coin để biết mình đang nắm bao nhiêu USDT.

Người dùng cần chọn network deposit phù hợp, lấy địa chỉ ví, quét QR hoặc copy địa chỉ để chuyển tiền từ ví ngoài.

Người dùng cần theo dõi trạng thái giao dịch deposit để biết tiền đã được nhận chưa, còn đang chờ xác nhận hay đã thất bại.

Người dùng cần thấy số dư được cập nhật nhanh sau khi giao dịch đủ confirmation để có thể tiếp tục các thao tác khác trong hệ thống.

---

## 8. Dashboard Functional Structure

### 8.1 Account Information Block

Dashboard phải hiển thị các thông tin tài khoản cơ bản gồm:

- User ID hoặc account email
- Verification status
- Security status
- Last login hoặc device information nếu hệ thống có sẵn dữ liệu

Khối này có mục tiêu giúp user xác nhận mình đang ở đúng account và tạo cảm giác minh bạch về tình trạng xác thực, bảo mật.

---

### 8.2 Asset Overview Block

Dashboard phải hiển thị:

- Total portfolio balance
- Giá trị quy đổi tương ứng bằng VNĐ
- Danh sách asset đang nắm giữ
- Available balance
- Locked balance
- Total balance

Mặc dù PM đã chốt balance model hiển thị theo **Total balance**, phần layout vẫn nên thiết kế đủ chỗ cho Available / Locked / Total để phục vụ mở rộng sang trading. Trong MVP, nếu chưa có cơ chế lock tài sản thì Available có thể bằng Total, còn Locked mặc định là 0.

Nếu market pricing khả dụng, dashboard có thể hiển thị thêm 24h change. Tuy nhiên đây là phần tùy chọn của MVP, không được làm chậm tiến độ core deposit flow.

---

### 8.3 Deposit Block

Dashboard phải có một điểm vào rõ ràng cho hành động Deposit. Khi user chọn Deposit, hệ thống phải cho phép:

- chọn asset,
- chọn network,
- hiển thị địa chỉ ví tương ứng,
- hiển thị QR code,
- cho phép copy địa chỉ,
- hiển thị warning note theo network,
- hiển thị trạng thái deposit gần nhất hoặc recent deposits.

Vì MVP chỉ hỗ trợ USDT, trường chọn asset có thể được preset là USDT hoặc vẫn hiển thị dropdown nhưng chỉ có một lựa chọn. Trường chọn network phải cho phép user chọn giữa BEP-20 và Polygon.

---

### 8.4 Activity / Deposit History Block

Dashboard phải hiển thị danh sách các giao dịch deposit gần đây. Mỗi record tối thiểu phải bao gồm:

- Time
- Asset
- Network
- Amount
- Tx Hash
- Status

Tx hash nên có thể click để mở blockchain explorer trong tương lai, nhưng việc đó có thể được xem là optional nếu MVP cần tối giản.

---

### 8.5 Navigation Placeholder Block

Để chuẩn bị cho giai đoạn scale-up, dashboard phải có bố cục hoặc khu vực điều hướng dành cho:

- Deposit
- Withdraw
- Transfer
- Trade
- History

Tuy nhiên trong MVP, chỉ Deposit là action được kích hoạt. Các action còn lại có thể hiển thị disabled hoặc chỉ là placeholder UI.

---

## 9. Asset and Network Scope

### 9.1 Asset Scope

Hệ thống chỉ hỗ trợ **USDT** trong giai đoạn đầu.

### 9.2 Network Scope

Hệ thống hỗ trợ:

- **BEP-20 on BNB Smart Chain**
- **Polygon PoS**

BNB Smart Chain là một EVM chain với block time rất ngắn và tài liệu chính thức mô tả finality có thể đạt rất nhanh khi fast finality hoạt động. Polygon PoS là một EVM-compatible PoS sidechain; tài liệu chính thức cho biết finalized block có thể được truy xuất trực tiếp và simple L2 transactions có state finality gần như tức thời. ([BNB Chain](https://docs.bnbchain.org/bnb-smart-chain/introduction/?utm_source=chatgpt.com))

---

## 10. Deposit Address Strategy

Mỗi user sẽ có một địa chỉ ví cố định cho mỗi asset-network. Với MVP hiện tại, điều này dẫn đến mô hình:

- User A có một địa chỉ USDT-BEP20 cố định
- User A có một địa chỉ USDT-Polygon cố định

Địa chỉ deposit phải được persist trong hệ thống và gắn với UID của user. Khi user quay lại dashboard trong các lần sau, hệ thống phải trả về đúng địa chỉ cũ thay vì generate lại địa chỉ mới, trừ khi có một chính sách nội bộ đặc biệt do hệ thống quản trị thực hiện.

Mô hình fixed address per user per network giúp UX ổn định hơn, giảm nhầm lẫn, và thuận tiện cho việc người dùng lưu lại địa chỉ ví để nạp nhiều lần.

---

## 11. Confirmation and Status Rules

### 11.1 Product Principle

Hệ thống chỉ được credit số dư cho user khi giao dịch deposit đã đạt đủ confirmation threshold theo network tương ứng.

### 11.2 Recommended Confirmation Threshold

Dựa trên đặc điểm finality của hai chain và để cân bằng giữa UX và an toàn vận hành, PRD này đề xuất ngưỡng confirmation nội bộ như sau:

- **USDT on BEP-20:** Completed sau **12 block confirmations**
- **USDT on Polygon:** Completed sau **64 block confirmations**

Đây là quyết định product theo hướng bảo thủ vừa phải, không phải là yêu cầu cứng của chain protocol. Tài liệu chain cho thấy finality nền tảng có thể đến nhanh hơn rất nhiều, nhưng vận hành exchange thường vẫn nên dùng confirmation threshold nội bộ để giảm rủi ro từ reorg, indexing delay, webhook delay hoặc edge case hạ tầng. ([BNB Chain](https://docs.bnbchain.org/bnb-smart-chain/introduction/?utm_source=chatgpt.com))

### 11.3 Deposit Status Model

Deposit phải được hiển thị theo ba trạng thái chính:

- **Pending**: giao dịch đã được phát hiện nhưng chưa đủ confirmation threshold
- **Completed**: giao dịch đã đủ confirmation threshold và số dư đã được credit vào tài khoản user
- **Failed**: giao dịch không thể được ghi nhận thành công do lỗi hệ thống, lỗi parsing, hoặc một lý do vận hành khác được hệ thống xác định là không thể xử lý thành công

Lưu ý rằng “Failed” trong MVP không nhất thiết bao phủ mọi tình huống on-chain bất thường như sai token hoặc sai network. Những trường hợp đó cần được BA mô tả chi tiết hơn ở phần exception handling trong FRS.

---

## 12. Balance Model

Dashboard hiển thị balance theo **Total balance** là chỉ số chính.

Tuy nhiên, về cấu trúc dữ liệu và UI, hệ thống nên có khả năng mở rộng để hiển thị đồng thời:

- Available balance
- Locked balance
- Total balance

Trong giai đoạn MVP, nếu user chưa có các hành vi gây lock tài sản như order placement hoặc withdrawal hold, thì Available balance có thể bằng Total balance và Locked balance bằng 0.

Giá trị hiển thị bằng VNĐ phải được xem là giá trị quy đổi tham chiếu, không phải cam kết thanh toán hoặc settlement value.

---

## 13. Deposit Crediting Rule

Hệ thống chỉ được cộng tiền thật vào số dư của user khi giao dịch deposit đã:

- được phát hiện hợp lệ,
- được xác định đúng asset và đúng network được hỗ trợ,
- và đạt đủ số block confirmation theo threshold nội bộ của hệ thống.

Ngay sau khi credit thành công, total balance trên dashboard phải được cập nhật theo real-time hoặc near real-time. Điều này có thể được thực hiện thông qua websocket, server push, hoặc polling ngắn chu kỳ tùy giải pháp kỹ thuật mà team kiến trúc lựa chọn.

---

## 14. Network Warning Rules

Trong input gốc có câu cảnh báo “send only USDT on TRC20”, nhưng vì MVP không hỗ trợ TRC20 mà chỉ hỗ trợ BEP-20 và Polygon, PRD này chuẩn hóa lại warning theo đúng network scope đã chốt.

Hệ thống phải hiển thị warning note tương ứng với network mà user chọn. Ví dụ:

- Khi user chọn **BEP-20**, warning phải nêu rõ: chỉ gửi USDT qua mạng BNB Smart Chain (BEP-20) đến địa chỉ này.
- Khi user chọn **Polygon**, warning phải nêu rõ: chỉ gửi USDT qua mạng Polygon đến địa chỉ này.
- Hệ thống phải cảnh báo rằng việc gửi sai network hoặc sai asset có thể dẫn đến mất tiền hoặc cần quy trình xử lý thủ công, và Ryan Exchange không đảm bảo hỗ trợ recovery trong MVP.

---

## 15. Real-Time Update Requirement

Sau khi deposit đạt trạng thái Completed, dashboard phải phản ánh số dư mới trong thời gian gần như tức thời từ góc nhìn người dùng.

Để bảo đảm trải nghiệm, hệ thống nên đặt mục tiêu cập nhật UI trong vòng vài giây sau khi backend hoàn tất crediting event. Giải pháp triển khai cụ thể không thuộc phạm vi PRD, nhưng đây là yêu cầu chức năng bắt buộc.

---

## 16. Non-Functional Expectations

Feature phải ưu tiên tính rõ ràng, ổn định và dễ hiểu hơn là độ phức tạp chức năng.

Dashboard phải load đủ nhanh để user có thể hiểu trạng thái tài khoản ngay sau login. Deposit flow phải hạn chế tối đa khả năng user chọn sai network hoặc hiểu sai địa chỉ ví. Lịch sử giao dịch phải nhất quán với trạng thái balance để tránh user nhìn thấy completed deposit nhưng balance chưa đổi.

---

## 17. BA Follow-up Scope

PM đã xác nhận rằng phần exception handling sẽ do BA chủ động đề xuất sau khi đọc PRD. Do đó, BA cần phát triển tiếp các tình huống ngoại lệ tối thiểu gồm:

- user gửi sai network,
- user gửi sai token,
- user gửi số lượng quá nhỏ,
- user copy sai địa chỉ,
- giao dịch bị pending quá lâu,
- backend nhận webhook chậm hoặc trùng lặp,
- tx hash không parse được,
- deposit đã detect nhưng không credit được,
- user refresh dashboard trong lúc trạng thái giao dịch đang thay đổi.

Những case này không cần đóng chi tiết trong PRD, nhưng bắt buộc phải xuất hiện trong FRS và QA test case sau đó.

---

## 18. Security and Compliance

Ở thời điểm hiện tại, PM chưa đặt rule riêng cho security và compliance trong phạm vi feature này. Vì vậy, PRD này không thêm các gate như KYC requirement, KYT screening hay deposit limit rule.

Tuy nhiên, điều này không có nghĩa là engineering được bỏ qua các chuẩn tối thiểu về auth, permission check, audit logging, rate limiting hoặc an toàn dữ liệu người dùng. Các yêu cầu đó nên được xử lý ở tầng kiến trúc và implementation standard của hệ thống.

---

## 19. Success Criteria

Feature được xem là đạt yêu cầu khi người dùng có thể:

- vào dashboard sau login,
- nhìn thấy thông tin tài khoản và total balance,
- xem giá trị quy đổi sang VNĐ,
- lấy đúng địa chỉ nạp USDT theo network,
- hoàn tất một giao dịch deposit từ external wallet,
- theo dõi trạng thái Pending → Completed,
- và thấy số dư trên dashboard được cập nhật sau khi deposit đủ confirmation.

---

## 20. Open Product Notes

Việc hiển thị 24h price change chỉ nên triển khai nếu market pricing source đã ổn định. Nếu chưa có, feature không nên bị chậm vì thành phần này.

Memo/tag không phải là user-facing requirement trong MVP. Nếu team kỹ thuật cần sử dụng cho internal management thì có thể xử lý ở tầng hệ thống.

Withdraw, Transfer, Trade và History đầy đủ chưa nằm trong phạm vi release này, nhưng cần được chừa layout để giảm refactor UI về sau.

---

# Notion-ready Summary

## Wallet Overview Dashboard & USDT Deposit — PRD Summary

**Objective**

Build the first post-login wallet experience so users can review account information, view total balance and per-coin balance, deposit USDT from external wallets, and prepare for future trading.

**MVP scope**

Support only USDT on BEP-20 and Polygon. Each user has one fixed deposit address per asset-network. Dashboard shows total balance, asset value in VNĐ, deposit entry point, and recent deposit history.

**Deposit rules**

Funds are credited only after sufficient confirmations. Recommended internal thresholds: 12 confirmations for BEP-20 and 64 confirmations for Polygon. Status model: Pending, Completed, Failed. Chain docs indicate very fast finality on both networks, but the product still uses conservative internal confirmation thresholds for safer exchange operations. ([BNB Chain](https://docs.bnbchain.org/bnb-smart-chain/introduction/?utm_source=chatgpt.com))

**Dashboard blocks**

Account information, asset overview, deposit section, recent deposit history, and future navigation placeholders for Withdraw, Transfer, Trade, and History.

**Next documentation**

BA should now convert this PRD into:

1. FRS — Wallet Overview
2. FRS — Deposit Flow
3. Exception Handling Matrix
4. FE/BE Jira-ready task breakdown
5. QA test scenarios
